/**
 * La llave del aparato del local para fichar, guardada **en ese aparato** (0068).
 *
 * Es lo que le dice a Estook de qué local es esta tablet sin que nadie haya entrado.
 * Del lado de Estook solo queda su huella; si se borra de aquí, el aparato deja de
 * saber de dónde es y hay que volver a ponerlo desde Ajustes.
 *
 * En `localStorage`, como el token de la sesión, y dentro de un `try` porque en
 * navegación privada escribir puede fallar.
 */
const DONDE_VIVE = 'estook.aparato-para-fichar';

export interface LlaveDelAparato {
  readonly llave: string;
  readonly nombre: string;
}

export function leerLaLlave(): LlaveDelAparato | null {
  try {
    const guardada = window.localStorage.getItem(DONDE_VIVE);
    if (guardada === null) return null;
    const leida = JSON.parse(guardada) as Partial<LlaveDelAparato>;
    return typeof leida.llave === 'string' && typeof leida.nombre === 'string'
      ? { llave: leida.llave, nombre: leida.nombre }
      : null;
  } catch {
    return null;
  }
}

export function guardarLaLlave(llave: LlaveDelAparato | null): void {
  try {
    if (llave === null) window.localStorage.removeItem(DONDE_VIVE);
    else window.localStorage.setItem(DONDE_VIVE, JSON.stringify(llave));
  } catch {
    // Sin donde guardarla, el aparato solo sirve hasta que se recargue.
  }
}

/** La dirección de la pantalla de fichar: `/app/#/aparato-para-fichar`. */
export const RUTA_DEL_APARATO = '#/aparato-para-fichar';

export function esLaPantallaDelAparato(hash: string): boolean {
  return hash === RUTA_DEL_APARATO || hash.startsWith(`${RUTA_DEL_APARATO}?`);
}
