/**
 * **Lo último que leyó el aparato, guardado en él** (T5 · 2 · 1, Anexo 3.4): el aparato, el
 * plano, la botonera y las mesas que ha abierto. Sin internet, Estook TPV abre con esto en
 * vez de quedarse en «No llegamos a Estook»; con internet, se lee de la API como siempre y
 * se vuelve a guardar.
 *
 * Es del aparato, no de quien lo usa: se borra al desvincularlo. Las mesas, solo las de las
 * últimas horas, para que el aparato no se llene servicio tras servicio.
 */

const PREFIJO = 'estook.tpv.copia.';
const MESAS = `${PREFIJO}mesas`;
/** Una mesa guardada vale un servicio largo, como el turno. */
const UNA_MESA_DURA_MS = 16 * 60 * 60 * 1000;
const MESAS_COMO_MUCHO = 80;

export type LoQueSeGuarda = 'aparato' | 'el_plano' | 'la_carta' | 'impresoras' | 'la_cocina';

export function guardarLaCopia(que: LoQueSeGuarda, datos: unknown): void {
  try {
    window.localStorage.setItem(`${PREFIJO}${que}`, JSON.stringify(datos));
  } catch {
    // Sin sitio, sin internet abrirá con lo que hubiera.
  }
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- la forma de lo guardado la afirma quien lo lee, que es quien lo guardó
export function leerLaCopia<T>(que: LoQueSeGuarda): T | undefined {
  try {
    const guardada = window.localStorage.getItem(`${PREFIJO}${que}`);
    return guardada === null ? undefined : (JSON.parse(guardada) as T);
  } catch {
    return undefined;
  }
}

type LasMesas = Record<string, { readonly en: number; readonly datos: unknown }>;

function lasMesas(): LasMesas {
  try {
    const guardadas = window.localStorage.getItem(MESAS);
    return guardadas === null ? {} : (JSON.parse(guardadas) as LasMesas);
  } catch {
    return {};
  }
}

export function guardarLaMesa(cuentaId: string, datos: unknown): void {
  const ahora = Date.now();
  const vivas = Object.entries({ ...lasMesas(), [cuentaId]: { en: ahora, datos } })
    .filter(([, m]) => ahora - m.en < UNA_MESA_DURA_MS)
    .sort(([, a], [, b]) => b.en - a.en)
    .slice(0, MESAS_COMO_MUCHO);
  try {
    window.localStorage.setItem(MESAS, JSON.stringify(Object.fromEntries(vivas)));
  } catch {
    // Sin sitio: esta mesa, sin internet, no se podrá abrir aquí.
  }
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- como `leerLaCopia`
export function leerLaMesa<T>(cuentaId: string): T | undefined {
  const guardada = lasMesas()[cuentaId];
  if (guardada === undefined || Date.now() - guardada.en >= UNA_MESA_DURA_MS) return undefined;
  return guardada.datos as T;
}

/** Al desvincular: nada del local se queda en un aparato que ya no es suyo. */
export function borrarLasCopias(): void {
  try {
    for (const clave of Object.keys(window.localStorage)) {
      if (clave.startsWith(PREFIJO)) window.localStorage.removeItem(clave);
    }
  } catch {
    // Nada que borrar.
  }
}
