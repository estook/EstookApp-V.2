import type { PGlite } from '@electric-sql/pglite';
import {
  crearDespachador,
  type Despachador,
  type Resultado,
} from '../../servidor/aplicacion/index.ts';
import { resolverLaSesion } from '../../servidor/infraestructura/quien-llama.ts';
import { anotar, recordar } from '../../servidor/infraestructura/idempotencia.ts';
import type { SesionViva, Sql } from '../../servidor/infraestructura/postgres.ts';
import type { LugaresDeGoogle } from '../../servidor/infraestructura/google.ts';
import type { CorreoSaliente } from '../../servidor/infraestructura/correo.ts';
import type { IdentidadDeGoogle } from '../../servidor/infraestructura/identidad-de-google.ts';
import type { AlmacenDeFicheros } from '../../servidor/infraestructura/almacen.ts';
import type { Pagos } from '../../servidor/infraestructura/stripe.ts';
import type { MotorDePdf } from '../../servidor/infraestructura/pdf.ts';
import type { MovilSaliente } from '../../servidor/infraestructura/movil.ts';
import type { AlSegundo } from '../../servidor/infraestructura/al-segundo.ts';
import type { ModeloDeFogon } from '../../servidor/ia/modelo.ts';

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
    /** Lo hecho sin conexión (0070): cuántos milisegundos hace, como lo manda el móvil. */
    opciones?: { readonly hechoHaceMs?: number | null },
  ): Promise<Resultado>;
  /** Como `ejecutar`, llegando desde una dirección: para los límites por dirección. */
  ejecutarDesde(
    desde: string,
    token: string | null,
    nombre: string,
    entrada: unknown,
  ): Promise<Resultado>;
  /** El despachador entero, para lo que no trae persona: el aviso de Stripe y el reloj (0048). */
  readonly despachador: Despachador;
  /**
   * **Un aparato para fichar**, vinculado como desde T1 (0107): quien lleva el local
   * entra con su correo en el aparato y lo vincula con la función «Fichar». Devuelve su
   * llave. Se hace en una sesión aparte, que se cierra al vincular.
   */
  vincularParaFichar(correo: string, localId: string, nombre: string): Promise<string>;
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

export function montarLaApi(
  bd: PGlite,
  opciones: {
    readonly google?: LugaresDeGoogle | null;
    readonly correo?: CorreoSaliente | null;
    readonly identidadDeGoogle?: IdentidadDeGoogle | null;
    /** El almacén de ficheros: sin decir nada, no hay (como en la API sin credenciales). */
    readonly almacen?: AlmacenDeFicheros | null;
    /** El pago (0048): sin decir nada, no hay (como en la API sin clave de Stripe). */
    readonly pagos?: Pagos | null;
    /** El motor de los PDF (0068): sin decir nada, no hay (como en la API sin Cloudflare). */
    readonly pdf?: MotorDePdf | null;
    /** Los avisos al móvil (0070): sin decir nada, no hay (como en la API sin claves VAPID). */
    readonly movil?: MovilSaliente | null;
    /** El toque del chat al segundo (0073): sin decir nada, no hay. */
    readonly alSegundo?: AlSegundo | null;
    /** El modelo de Fogón (0097): sin decir nada, no hay (como en la API sin clave). */
    readonly fogon?: ModeloDeFogon | null;
    /** La hora que ve la API, para probar lo que depende de los días que pasan. */
    readonly ahora?: () => Date;
  } = {},
): ApiDePrueba {
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

          // Quién llama, igual que la API de verdad: con `quien-llama.ts`.
          const sesion: SesionViva | null =
            quien.tokenDeSesion === null
              ? null
              : await resolverLaSesion(
                  async (texto, valores) =>
                    (await bd.query<Record<string, unknown>>(texto, [...valores])).rows,
                  quien.tokenDeSesion,
                );

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
            almacen: opciones.almacen ?? null,
            google: opciones.google ?? null,
            correo: opciones.correo ?? null,
            identidadDeGoogle: opciones.identidadDeGoogle ?? null,
            pagos: opciones.pagos ?? null,
            pdf: opciones.pdf ?? null,
            movil: opciones.movil ?? null,
            alSegundo: opciones.alSegundo ?? null,
            fogon: opciones.fogon ?? null,
            correlacionId: quien.correlacionId,
            desde: quien.desde ?? null,
            ahora: opciones.ahora?.() ?? new Date(Date.now()),
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
    async vincularParaFichar(correo, localId, nombre) {
      const resultado = await despachador.ejecutar(
        quien(await this.entrar(correo)),
        'vincular_el_primer_aparato',
        { local_id: localId, funcion: 'fichar', nombre },
        crypto.randomUUID(),
      );
      if (resultado.estado !== 'ok') {
        throw new Error(`No se ha podido vincular el aparato: ${JSON.stringify(resultado)}`);
      }
      return (resultado.datos as { llave: string }).llave;
    },

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

    ejecutar: (token, nombre, entrada, clave = crypto.randomUUID(), opciones = {}) =>
      despachador.ejecutar(quien(token), nombre, entrada, clave, opciones),

    ejecutarDesde: (desde, token, nombre, entrada) =>
      despachador.ejecutar({ ...quien(token), desde }, nombre, entrada, crypto.randomUUID()),

    despachador,
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
