/**
 * El aparato del local, sin wifi (I · decisión 0070; Richi: «elige la mejor»).
 *
 * Sin conexión el PIN no se puede comprobar: su huella no sale del servidor (0068).
 * Así que el aparato **guarda lo que se teclea, cifrado** con la llave pública que le
 * dio Estook al prepararlo, y lo manda al volver la señal. En la tablet no queda
 * ningún PIN legible: solo Estook, con la privada, lo puede leer.
 *
 * Lo cifrado lleva **un número de un solo uso** dentro: si alguien copiara un cifrado
 * de la tablet y lo volviera a mandar, Estook no lo apunta dos veces.
 *
 * Y para arrancar sin wifi, el aparato recuerda lo suyo: su nombre, su local, si allí
 * se fichan las pausas y su llave pública.
 */

export interface LoDelAparato {
  readonly nombre: string;
  readonly local: string;
  readonly pausasEnUso: boolean;
  readonly clavePublica: string | null;
}

const DONDE_VIVE = 'estook.aparato-para-fichar.datos';

export function leerLoDelAparato(): LoDelAparato | null {
  try {
    const guardado = window.localStorage.getItem(DONDE_VIVE);
    if (guardado === null) return null;
    const leido = JSON.parse(guardado) as Partial<LoDelAparato>;
    if (typeof leido.nombre !== 'string' || typeof leido.local !== 'string') return null;
    return {
      nombre: leido.nombre,
      local: leido.local,
      pausasEnUso: leido.pausasEnUso !== false,
      clavePublica: typeof leido.clavePublica === 'string' ? leido.clavePublica : null,
    };
  } catch {
    return null;
  }
}

export function guardarLoDelAparato(datos: LoDelAparato | null): void {
  try {
    if (datos === null) window.localStorage.removeItem(DONDE_VIVE);
    else window.localStorage.setItem(DONDE_VIVE, JSON.stringify(datos));
  } catch {
    // Sin donde guardarlo, el aparato necesitará señal para arrancar.
  }
}

/** El PIN, cifrado para Estook con su número de un solo uso (vive en `@estook/cliente-api`). */
export { cifrarElPin } from '@estook/cliente-api/pin-cifrado';
