import type { Dentro } from '../datos/tipos.ts';

/**
 * **Recargar no echa a quien está dentro** (la Ampliación, 0153, fallo 4). Hasta ahora el turno
 * vivía solo en la memoria de la pestaña: al recargar, el PIN otra vez. Ahora se guarda **en la
 * pestaña** (`sessionStorage`: se va al cerrarla y no lo ve otra pestaña), con la hora del último
 * toque y los minutos del bloqueo de este aparato. Al recargar se vuelve a entrar solo **si no habría
 * saltado ya el bloqueo**; si no, el PIN, como siempre.
 */

interface LoGuardado {
  readonly dentro: Dentro;
  /** El último toque, en milisegundos. */
  readonly tocadoEn: number;
  /** Los minutos del bloqueo de este aparato; nulo, nunca se bloquea. */
  readonly minutos: number | null;
}

const DONDE = 'estook.tpv.dentro.';

function laClave(llave: string): string {
  // La llave no se escribe tal cual: basta con distinguir un aparato de otro en la misma pestaña.
  let h = 0;
  for (const letra of llave) h = (Math.imul(h, 31) + letra.charCodeAt(0)) | 0;
  return `${DONDE}${String(h >>> 0)}`;
}

/** Quien estaba dentro antes de recargar, si el bloqueo no habría saltado ya. */
export function leerQuienEstaDentro(llave: string, ahora = Date.now()): Dentro | null {
  try {
    const crudo = window.sessionStorage.getItem(laClave(llave));
    if (crudo === null) return null;
    const leido = JSON.parse(crudo) as LoGuardado;
    if (typeof leido.tocadoEn !== 'number' || typeof leido.dentro.turno !== 'string') return null;
    if (leido.minutos !== null && ahora - leido.tocadoEn >= leido.minutos * 60_000) {
      window.sessionStorage.removeItem(laClave(llave));
      return null;
    }
    return leido.dentro;
  } catch {
    return null;
  }
}

export function guardarQuienEstaDentro(
  llave: string,
  dentro: Dentro,
  minutos: number | null,
  ahora = Date.now(),
): void {
  try {
    const guardado: LoGuardado = { dentro, tocadoEn: ahora, minutos };
    window.sessionStorage.setItem(laClave(llave), JSON.stringify(guardado));
  } catch {
    // Sin poder guardar, al recargar se pide el PIN: lo de antes.
  }
}

export function olvidarQuienEstaDentro(llave: string): void {
  try {
    window.sessionStorage.removeItem(laClave(llave));
  } catch {
    // Nada que olvidar.
  }
}
