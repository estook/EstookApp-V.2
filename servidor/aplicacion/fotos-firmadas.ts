import { SEGUNDOS_DEL_ENLACE_DE_LA_FOTO } from '../infraestructura/almacen.ts';
import type { Contexto } from './contrato.ts';

/**
 * Los enlaces de unas fotos, firmados **de una vez** (entrega V, punto 5; aquí desde
 * la experiencia, 0083, que la usan también las caras del equipo).
 *
 * Una lista de cincuenta productos —o de treinta personas— no puede costar cincuenta
 * viajes al almacén: se piden todos en una tanda. Y **nunca rompe la lista**: si el
 * almacén no está o no contesta, vuelve vacío, y cada uno sale con sus iniciales, que
 * es como se veía antes de que hubiera fotos.
 */
export async function firmarLasFotos(
  contexto: Contexto,
  claves: readonly (string | null)[],
): Promise<ReadonlyMap<string, string>> {
  const deVerdad = [...new Set(claves.filter((clave): clave is string => clave !== null))];
  if (deVerdad.length === 0 || contexto.almacen === null) return new Map();
  try {
    return await contexto.almacen.enlaces(deVerdad, SEGUNDOS_DEL_ENLACE_DE_LA_FOTO);
  } catch {
    return new Map();
  }
}

/** La foto firmada de una clave, o nada. */
export function laFirmada(
  firmadas: ReadonlyMap<string, string>,
  clave: string | null | undefined,
): string | null {
  return clave === null || clave === undefined ? null : (firmadas.get(clave) ?? null);
}
