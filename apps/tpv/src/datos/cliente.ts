import { crearCliente, type ClienteApi, type Respuesta } from '@estook/cliente-api';
import { marcarLaConexion } from '../sinInternet/laConexion.ts';

/**
 * El cliente de la API de Estook TPV (T1 · La puerta, 0107).
 *
 * **Estook TPV solo funciona en un aparato vinculado** (Anexo 11.3): no entra con la
 * sesión de Estook. Lo que se queda en el aparato es **su llave**, aquí; y lo que dura
 * mientras alguien lo usa es **su turno**, que vive solo en la memoria (`LaPuerta`): al
 * recargar, el aparato vuelve a su función, bloqueado (Anexo 3.4). Cada petición lleva
 * los dos (`tokenDelAparato`).
 */
export const DIRECCION_DE_LA_API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

export const hayApi = DIRECCION_DE_LA_API !== '';

/** La versión que se manda en el latido, para verla en Ajustes del TPV › Aparatos. */
export const LA_VERSION = (
  (import.meta.env['VITE_VERSION'] as string | undefined) ?? 'desarrollo'
).slice(0, 40);

/**
 * **Aparte de la sesión de Estook** (`estook.sesion`): un mismo navegador puede tener
 * las dos sin mezclarlas (Anexo 11.3, punto 4).
 */
const DONDE_VIVE_LA_LLAVE = 'estook.tpv.llave';

export function leerLaLlave(): string | null {
  try {
    return window.localStorage.getItem(DONDE_VIVE_LA_LLAVE);
  } catch {
    return null;
  }
}

export function guardarLaLlave(llave: string | null): void {
  try {
    if (llave === null) window.localStorage.removeItem(DONDE_VIVE_LA_LLAVE);
    else window.localStorage.setItem(DONDE_VIVE_LA_LLAVE, llave);
  } catch {
    // Sin dónde guardarla (navegación privada), el aparato vale hasta que se recargue.
  }
}

// ── El aparato para fichar ───────────────────────────────────────────────────

/**
 * La pantalla de fichar ya existe, con su modo sin conexión (0068, 0070), y vive en
 * Estook: `estook.com/app/#/aparato-para-fichar`, con su llave en este nombre. Los que se
 * vincularon así siguen allí; **ya no se vinculan nuevos** (0115): se ficha en la caja.
 */
const DONDE_VIVE_LA_DEL_QUIOSCO = 'estook.aparato-para-fichar';

export function laDelQuiosco(): string | null {
  try {
    const guardada = window.localStorage.getItem(DONDE_VIVE_LA_DEL_QUIOSCO);
    if (guardada === null) return null;
    const leida = JSON.parse(guardada) as { llave?: unknown };
    return typeof leida.llave === 'string' ? leida.llave : null;
  } catch {
    return null;
  }
}

/**
 * El cliente de siempre, que además **dice si llegamos a Estook** con cada respuesta (T5 · 2 ·
 * 1): de eso salen la franja de «sin conexión» y cuándo subir lo guardado.
 */
export function crearClienteDelTpv(opciones: {
  readonly token: () => string | null;
  readonly alCaducar?: () => void;
}): ClienteApi {
  const cliente = crearCliente({
    base: DIRECCION_DE_LA_API,
    token: opciones.token,
    juntar: true,
    ...(opciones.alCaducar === undefined ? {} : { alCaducarLaSesion: opciones.alCaducar }),
  });
  const mirar = <T>(respuesta: Respuesta<T>): Respuesta<T> => {
    marcarLaConexion(respuesta.ok || respuesta.error.codigo !== 'sin_conexion');
    return respuesta;
  };
  return {
    consultar: async (nombre, parametros) => mirar(await cliente.consultar(nombre, parametros)),
    ejecutar: async (nombre, entrada, opcionesDeLlamada) =>
      mirar(await cliente.ejecutar(nombre, entrada, opcionesDeLlamada)),
  };
}
