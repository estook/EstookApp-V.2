import { DONDE_SE_DESCARGA, elPuenteDeLaCaja, type PuenteDeLaCaja } from '@estook/impresion';

/**
 * **La caja para Windows** desde la web (T5 · 1, decisión 0119). Dentro del programa, el puente
 * está en la ventana; fuera, no hay, y la web sigue valiendo igual (para imprimir, se descarga).
 */
export function laCajaParaWindows(): PuenteDeLaCaja | null {
  return typeof window === 'undefined' ? null : elPuenteDeLaCaja(window);
}

/** Si esta caja web está en un PC con Windows: es donde se ofrece descargarla. */
export function esUnPcConWindows(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Windows NT/i.test(navigator.userAgent);
}

export { DONDE_SE_DESCARGA };

const CERRADA = 'estook.tpv.caja-para-windows.ahora-no';

/** «Ahora no» en la franja de descargar: se recuerda en este aparato, una semana. */
export function laFranjaSeCerro(ahora = Date.now()): boolean {
  try {
    const cuando = Number(window.localStorage.getItem(CERRADA) ?? '0');
    return ahora - cuando < 7 * 24 * 60 * 60_000;
  } catch {
    return false;
  }
}

export function cerrarLaFranja(ahora = Date.now()): void {
  try {
    window.localStorage.setItem(CERRADA, String(ahora));
  } catch {
    // Sin dónde guardarlo, la franja vuelve al recargar: no pasa nada.
  }
}
