import type { CodigoDeError } from '@estook/dominio';
import type { SesionViva } from '../infraestructura/postgres.ts';
import { FalloDeAplicacion, type Contexto, type Puertas } from './contrato.ts';
import { catalogo } from './catalogo.ts';

/**
 * El despachador (M2, con las puertas de M4).
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
 *
 * ── Lo que M4 añade, y por qué está aquí y no en cada operación ──────────────
 *
 * Tres estados en los que dejar pasar sería un fallo: sin sesión, con la sesión
 * a medias esperando el segundo factor, y con una contraseña que puso otra
 * persona. Se comprueban **en un solo sitio, antes de ejecutar nada**, y la
 * excepción se declara en la operación.
 *
 * Es la misma idea que las políticas de M1: la regla no se cumple porque quien
 * escribe se acuerde de comprobarla, se cumple porque no hay camino que la
 * rodee. Si mañana alguien añade la operación número cuarenta y se olvida de
 * mirar la sesión, el despachador la mira por él.
 */

export interface QuienLlama {
  /**
   * El token de sesión que trajo la petición, o nulo. **Ya no es la persona**:
   * desde M4 quien llama no dice quién es, lo demuestra (regla 4).
   *
   * Viaja como texto y no se registra en ningún sitio. Convertirlo en la huella
   * que guarda la base de datos es cosa de la infraestructura.
   */
  readonly tokenDeSesion: string | null;
  readonly correlacionId: string;
}

/** Los puertos. La implementación de verdad se inyecta. */
export interface Puertos {
  /** Abre una transacción como `estook_api`, resolviendo antes la sesión. */
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

/**
 * Las tres puertas, en orden.
 *
 * Devuelve el código de error si no se pasa, y nulo si se pasa. Se llama **dentro
 * de la transacción**, porque hasta entonces no se sabe si el token valía.
 */
function porQueNoPasa(puertas: Puertas, sesion: SesionViva | null): CodigoDeError | null {
  if (sesion === null) {
    return puertas.sinSesion ? null : 'sin_sesion';
  }

  // Una sesión abierta pero sin superar el segundo factor no vale para nada más
  // que superarlo o irse. Si valiera, exigir doble factor sería decorativo.
  if (!sesion.dobleFactorSuperado && !puertas.aunSinDobleFactor) {
    return 'falta_doble_factor';
  }

  // La contraseña que te dio otra persona la sabe otra persona. Se puede mirar,
  // pero no cambiar nada hasta ponerse una propia.
  if (sesion.debeCambiarClave && !puertas.aunConClavePorCambiar) {
    return 'clave_por_cambiar';
  }

  return null;
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
        puertos.enTransaccion(quien, async (contexto): Promise<Resultado> => {
          // Leer con la contraseña por cambiar sí se puede: lo que no se puede
          // es cambiar nada. Por eso la puerta de la clave no aplica a consultas.
          const cerrada = porQueNoPasa(
            { ...laConsulta, aunConClavePorCambiar: true },
            contexto.sesion,
          );
          if (cerrada) return { estado: 'fallo', codigo: cerrada };

          return { estado: 'ok', datos: await laConsulta.ejecutar(contexto, validada.data) };
        }),
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
          const cerrada = porQueNoPasa(elComando, contexto.sesion);
          if (cerrada) return { estado: 'fallo', codigo: cerrada };

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
