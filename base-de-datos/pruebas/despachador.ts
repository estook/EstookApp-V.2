import type { PGlite } from '@electric-sql/pglite';
import { crearDespachador, type Resultado } from '../../servidor/aplicacion/index.ts';
import { huellaDeToken } from '../../servidor/dominio/secretos.ts';
import { anotar, recordar } from '../../servidor/infraestructura/idempotencia.ts';
import type { SesionViva, Sql } from '../../servidor/infraestructura/postgres.ts';

/**
 * El despachador de verdad, contra la base efímera de las pruebas (M7).
 *
 * ── Por qué hace falta, si ya existe la API de pruebas ───────────────────────
 *
 * La API de pruebas (`api-de-pruebas.mjs`) sirve a Playwright, y lo que pasa por
 * ahí se prueba **pulsando botones**. Un ciclo de compras —pedir, mandar,
 * recibir con cambios, facturar con diferencia, devolver— son veinte pasos con
 * cuentas en cada uno, y probarlos solo desde la pantalla es lento, frágil y
 * difícil de leer cuando falla.
 *
 * Esto es **exactamente lo mismo que monta la API de pruebas**, sin el HTTP: los
 * mismos comandos, las mismas puertas, las mismas políticas y la misma
 * transacción, en el mismo orden que `postgres.ts` (disfraz, sesión, identidad).
 * Si el orden cambiara aquí, estas pruebas comprobarían otra cosa distinta de lo
 * que hace la API de verdad.
 */

export interface ApiDePrueba {
  /** Entra con la contraseña de las personas de ejemplo y devuelve el token. */
  entrar(correo: string): Promise<string>;
  /** Como un `GET`: todo llega como texto, igual que por la dirección. */
  consultar(
    token: string | null,
    nombre: string,
    entrada?: Record<string, string>,
  ): Promise<Resultado>;
  ejecutar(
    token: string | null,
    nombre: string,
    entrada: unknown,
    clave?: string,
  ): Promise<Resultado>;
}

const CLAVE_DE_EJEMPLO = 'estook en desarrollo';

/** De una plantilla etiquetada a texto con parámetros numerados, como la API de pruebas. */
function adaptador(bd: PGlite): Sql {
  const sql = async (trozos: TemplateStringsArray, ...valores: unknown[]) => {
    if (!Array.isArray(trozos)) {
      throw new Error('Las pruebas solo entienden `sql` como plantilla etiquetada.');
    }
    const texto = trozos.reduce((junto, trozo, i) => `${junto}$${i}${trozo}`);
    const { rows } = await bd.query(texto, valores);
    return rows;
  };
  return sql as unknown as Sql;
}

export function montarLaApi(bd: PGlite): ApiDePrueba {
  // PGlite es una sola conexión: las transacciones van de una en una.
  let laCola: Promise<unknown> = Promise.resolve();
  function deUnaEnUna<T>(hacer: () => Promise<T>): Promise<T> {
    const mio = laCola.then(hacer, hacer);
    laCola = mio.then(
      () => undefined,
      () => undefined,
    );
    return mio;
  }

  const despachador = crearDespachador({
    enTransaccion: (quien, hacer) =>
      deUnaEnUna(async () => {
        await bd.exec('begin');
        try {
          await bd.exec('set local role estook_api');

          let sesion: SesionViva | null = null;
          if (quien.tokenDeSesion !== null) {
            const { rows } = await bd.query<{
              sesion_id: string;
              persona_id: string;
              organizacion_id: string | null;
              local_id: string | null;
              doble_factor_superado: boolean;
              debe_cambiar_clave: boolean;
              es_demostracion: boolean;
            }>('select * from estook.sesion_activa($1)', [
              await huellaDeToken(quien.tokenDeSesion),
            ]);
            const fila = rows[0];
            if (fila) {
              sesion = {
                id: fila.sesion_id,
                personaId: fila.persona_id,
                organizacionId: fila.organizacion_id,
                localId: fila.local_id,
                dobleFactorSuperado: fila.doble_factor_superado,
                debeCambiarClave: fila.debe_cambiar_clave,
                esDemostracion: fila.es_demostracion,
              };
            }
          }

          await bd.query("select set_config('estook.persona_id', $1, true)", [
            sesion?.personaId ?? '',
          ]);
          await bd.query("select set_config('estook.correlacion_id', $1, true)", [
            quien.correlacionId,
          ]);

          const salida = await hacer({
            sql: adaptador(bd),
            personaId: sesion?.personaId ?? null,
            sesion,
            almacen: null,
            correlacionId: quien.correlacionId,
            ahora: new Date(Date.now()),
          });

          await bd.exec('commit');
          return salida;
        } catch (fallo) {
          await bd.exec('rollback');
          throw fallo;
        }
      }),

    recordar: async (contexto, clave, comando, entrada) => {
      const recuerdo = await recordar(contexto.sql, clave, comando, entrada);
      return recuerdo.estado === 'repetida'
        ? { estado: 'repetida' as const, respuesta: recuerdo.respuesta }
        : { estado: recuerdo.estado };
    },

    anotar: async (contexto, clave, comando, entrada, respuesta) => {
      const organizaciones = await contexto.sql<{ organizacion_id: string }[]>`
        select organizacion_id from estook.organizaciones_visibles() limit 1
      `;
      const laOrganizacion = organizaciones[0]?.organizacion_id;
      if (!laOrganizacion) return;
      await anotar(
        contexto.sql,
        clave,
        comando,
        entrada,
        laOrganizacion,
        contexto.personaId,
        respuesta,
        200,
      );
    },
  });

  const quien = (token: string | null) => ({
    tokenDeSesion: token,
    correlacionId: crypto.randomUUID(),
  });

  return {
    async entrar(correo) {
      const entrada = await despachador.ejecutar(
        quien(null),
        'entrar',
        { correo, contrasena: CLAVE_DE_EJEMPLO },
        crypto.randomUUID(),
      );
      if (entrada.estado !== 'ok') throw new Error(`No se ha podido entrar como ${correo}`);
      return (entrada.datos as { token: string }).token;
    },

    consultar: (token, nombre, entrada = {}) =>
      despachador.consultar(quien(token), nombre, entrada),

    ejecutar: (token, nombre, entrada, clave = crypto.randomUUID()) =>
      despachador.ejecutar(quien(token), nombre, entrada, clave),
  };
}

/** Los datos de un resultado bueno, o un error que dice qué ha fallado. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- la forma la afirma quien llama, igual que el `consultar<T>` de las pruebas de extremo a extremo
export function losDatos<T>(resultado: Resultado): T {
  if (resultado.estado === 'fallo') {
    throw new Error(
      `Ha fallado con «${resultado.codigo}»: ${JSON.stringify(resultado.detalle ?? {})}`,
    );
  }
  return resultado.datos as T;
}

/** El código de un resultado que tenía que fallar. */
export function elFallo(resultado: Resultado): string {
  return resultado.estado === 'fallo' ? resultado.codigo : `no ha fallado (${resultado.estado})`;
}
