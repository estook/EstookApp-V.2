import { sinDatosPersonales, type AvisadorDeFallos } from './fallos.ts';

/**
 * Sentry para la API (repaso del 10-oct · decisión 0082).
 *
 * Lo mismo que hacen las apps (`@estook/utiles/observabilidad`), del lado del
 * servidor: **sin datos personales, con el entorno y la versión**. Se monta en el
 * punto de entrada de la función de Supabase con el SDK oficial para Deno
 * (`npm:@sentry/deno`, la misma versión 8 que `@sentry/browser` en las apps), y solo
 * si está el secreto `SENTRY_DSN`. Aquí no se importa el SDK: se recibe, para que el
 * servidor siga corriendo en Node (las pruebas, la API de pruebas) sin arrastrar una
 * librería de Deno, y para poder probar qué se manda sin mandar nada.
 *
 * ── Lo que dice la guía de Supabase, y por qué se sigue ──────────────────────
 *
 * «Monitoring with Sentry» (supabase.com/docs/guides/functions/examples/sentry-
 * monitoring): el SDK de Deno **no separa las peticiones** de `Deno.serve`, así que
 * todo lo de una va dentro de `withScope`; las **integraciones de fábrica, apagadas**
 * (son las que mezclan lo de una petición con la siguiente); y **`flush` antes de
 * contestar**, porque una función que ya ha contestado puede pararse con el aviso a
 * medio salir. Lo de medir tiempos (`tracesSampleRate`) no se enciende: tampoco en
 * las apps.
 */

/** Lo poco del SDK que se usa. Es un trozo de la forma de `@sentry/deno` 8. */
export interface SdkDeSentry {
  init(opciones: {
    readonly dsn: string;
    readonly environment: string;
    readonly release: string;
    readonly defaultIntegrations: false;
    readonly sendDefaultPii: false;
    readonly beforeSend: (evento: EventoDeSentry) => EventoDeSentry | null;
    readonly beforeBreadcrumb: () => null;
  }): unknown;
  withScope(hacer: (ambito: AmbitoDeSentry) => void): void;
  captureException(fallo: unknown): unknown;
  flush(espera: number): PromiseLike<boolean>;
}

export interface AmbitoDeSentry {
  setTag(clave: string, valor: string): unknown;
  setExtra(clave: string, valor: unknown): unknown;
}

/** Lo que se toca de un evento antes de mandarlo. */
export interface EventoDeSentry {
  message?: string;
  exception?: { values?: { value?: string; type?: string }[] };
  request?: unknown;
  user?: unknown;
  server_name?: string;
  breadcrumbs?: unknown;
  extra?: Record<string, unknown>;
  [otra: string]: unknown;
}

export interface OpcionesDeSentry {
  readonly dsn: string;
  /** `produccion`, `desarrollo`… lo que diga el secreto `ENTORNO`. */
  readonly entorno: string;
  /** El commit desplegado: «api@<commit>», para saber qué cambio lo trajo. */
  readonly version: string;
}

/** Cuánto se espera a que el aviso salga antes de contestar: dos segundos, como dice Supabase. */
export const ESPERA_DEL_AVISO_MS = 2000;

/**
 * El evento, sin nada de nadie: fuera la petición (cabeceras, cookies, cuerpo), quién
 * era, el nombre de la máquina y las migas; y el texto de cada fallo, limpio.
 */
export function eventoSinDatosPersonales(evento: EventoDeSentry): EventoDeSentry {
  const limpio: EventoDeSentry = { ...evento };
  delete limpio.request;
  delete limpio.user;
  delete limpio.server_name;
  delete limpio.breadcrumbs;
  if (typeof limpio.message === 'string') limpio.message = sinDatosPersonales(limpio.message);
  if (limpio.exception?.values) {
    limpio.exception = {
      ...limpio.exception,
      values: limpio.exception.values.map((v) => ({
        ...v,
        ...(typeof v.value === 'string' ? { value: sinDatosPersonales(v.value) } : {}),
      })),
    };
  }
  if (limpio.extra) {
    limpio.extra = Object.fromEntries(
      Object.entries(limpio.extra).map(([clave, valor]) => [
        clave,
        typeof valor === 'string' ? sinDatosPersonales(valor) : valor,
      ]),
    );
  }
  return limpio;
}

export function conectarSentry(sdk: SdkDeSentry, opciones: OpcionesDeSentry): AvisadorDeFallos {
  sdk.init({
    dsn: opciones.dsn,
    environment: opciones.entorno,
    release: `api@${opciones.version}`,
    defaultIntegrations: false,
    sendDefaultPii: false,
    beforeSend: eventoSinDatosPersonales,
    beforeBreadcrumb: () => null,
  });

  return {
    async avisar(fallo, datos) {
      sdk.withScope((ambito) => {
        ambito.setTag('aplicacion', 'api');
        ambito.setTag('que', datos.mensaje);
        if (datos.correlacionId !== null) ambito.setTag('correlacion_id', datos.correlacionId);
        for (const [clave, valor] of Object.entries(datos.extra ?? {})) {
          ambito.setExtra(clave, typeof valor === 'string' ? sinDatosPersonales(valor) : valor);
        }
        sdk.captureException(fallo instanceof Error ? fallo : new Error(String(fallo)));
      });
      await sdk.flush(ESPERA_DEL_AVISO_MS);
    },
  };
}
