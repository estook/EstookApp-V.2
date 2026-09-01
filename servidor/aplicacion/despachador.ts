import type { CodigoDeError } from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { catalogo } from './catalogo.ts';

/**
 * El despachador (M2).
 *
 * Aquí vive la orquestación: abrir la transacción, mirar la idempotencia,
 * ejecutar el caso de uso y anotar el resultado. Es el corazón de M2.
 *
 * **No conoce Postgres.** Recibe sus puertos desde fuera, así que la capa de
 * aplicación habla con contratos y no con una base de datos concreta, tal como
 * pide la regla A4. Quien los enchufa es `servidor/index.ts`, que es el único
 * sitio del servidor donde se juntan las capas.
 *
 * Y **no conoce HTTP**: devuelve un resultado, no una respuesta. Traducirlo a
 * códigos y cabeceras es cosa de `servidor/api`.
 */

export interface QuienLlama {
  readonly personaId: string | null;
  readonly correlacionId: string;
}

/** Los puertos. La implementación de verdad se inyecta. */
export interface Puertos {
  /** Abre una transacción como `estook_api`, en nombre de quien llama. */
  enTransaccion<T>(quien: QuienLlama, hacer: (contexto: Contexto) => Promise<T>): Promise<T>;

  /** Mira si esa clave ya se usó. */
  recordar(
    contexto: Contexto,
    clave: string,
    comando: string,
    entrada: unknown,
  ): Promise<
    | { estado: 'nueva' }
    | { estado: 'repetida'; respuesta: unknown }
    | { estado: 'clave_reutilizada' }
  >;

  /** Guarda el resultado, en la misma transacción que el comando. */
  anotar(
    contexto: Contexto,
    clave: string,
    comando: string,
    entrada: unknown,
    respuesta: unknown,
  ): Promise<void>;
}

export type Resultado =
  | { readonly estado: 'ok'; readonly datos: unknown }
  /** Ya se había hecho. No se ha ejecutado nada. */
  | { readonly estado: 'repetida'; readonly datos: unknown }
  | {
      readonly estado: 'fallo';
      readonly codigo: CodigoDeError;
      readonly detalle?: Record<string, unknown>;
    };

export interface Despachador {
  consultar(quien: QuienLlama, nombre: string, entrada: unknown): Promise<Resultado>;
  ejecutar(
    quien: QuienLlama,
    nombre: string,
    entrada: unknown,
    claveDeIdempotencia: string,
  ): Promise<Resultado>;
}

export function crearDespachador(puertos: Puertos): Despachador {
  return {
    async consultar(quien, nombre, entrada) {
      const laConsulta = catalogo.consultas[nombre];
      if (!laConsulta) return { estado: 'fallo', codigo: 'no_existe' };

      const validada = laConsulta.entrada.safeParse(entrada);
      if (!validada.success) {
        return {
          estado: 'fallo',
          codigo: 'faltan_datos',
          detalle: { campos: validada.error.issues.map((i) => i.path.join('.')) },
        };
      }

      return conFallosTraducidos(async () =>
        puertos.enTransaccion(quien, async (contexto) => ({
          estado: 'ok' as const,
          datos: await laConsulta.ejecutar(contexto, validada.data),
        })),
      );
    },

    async ejecutar(quien, nombre, entrada, claveDeIdempotencia) {
      const elComando = catalogo.comandos[nombre];
      if (!elComando) return { estado: 'fallo', codigo: 'no_existe' };

      if (!claveDeIdempotencia) {
        return {
          estado: 'fallo',
          codigo: 'faltan_datos',
          detalle: {
            porque:
              'Todo comando necesita su clave de idempotencia, para que reintentarlo no lo haga dos veces.',
          },
        };
      }

      const validada = elComando.entrada.safeParse(entrada);
      if (!validada.success) {
        return {
          estado: 'fallo',
          codigo: 'faltan_datos',
          detalle: { campos: validada.error.issues.map((i) => i.path.join('.')) },
        };
      }

      return conFallosTraducidos(async () =>
        puertos.enTransaccion(quien, async (contexto): Promise<Resultado> => {
          const recuerdo = await puertos.recordar(
            contexto,
            claveDeIdempotencia,
            nombre,
            validada.data,
          );

          // Ni se ejecuta: se devuelve lo de la primera vez, tal cual.
          if (recuerdo.estado === 'repetida') {
            return { estado: 'repetida', datos: recuerdo.respuesta };
          }

          if (recuerdo.estado === 'clave_reutilizada') {
            return {
              estado: 'fallo',
              codigo: 'faltan_datos',
              detalle: {
                porque:
                  'Esa clave ya se usó para otra cosa distinta. Una clave no puede significar dos cosas.',
              },
            };
          }

          const datos = await elComando.ejecutar(contexto, validada.data);

          // En la MISMA transacción que el comando: si el comando se cae, la
          // clave queda libre para el reintento.
          await puertos.anotar(contexto, claveDeIdempotencia, nombre, validada.data, datos);

          return { estado: 'ok', datos };
        }),
      );
    },
  };
}

/**
 * Un fallo previsto es un resultado, no una excepción. Lo que no está previsto
 * se convierte en «se nos ha roto algo por dentro» y se registra por dentro,
 * pero nunca sale una traza ni un nombre de tabla.
 */
async function conFallosTraducidos(hacer: () => Promise<Resultado>): Promise<Resultado> {
  try {
    return await hacer();
  } catch (fallo) {
    if (fallo instanceof FalloDeAplicacion) {
      return {
        estado: 'fallo',
        codigo: fallo.codigo,
        ...(fallo.detalle ? { detalle: fallo.detalle } : {}),
      };
    }
    throw fallo;
  }
}
