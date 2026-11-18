import type { PlatoDeLaCuenta } from '../datos/tipos.ts';
import type { LineaNueva } from './comanda.ts';

/**
 * **Repetir pedido** (el rediseño, 0148; Richi, 18-nov: «repetir pedido, no otra ronda: las cosas
 * con profesionalidad», y que vaya en «⋯ Más opciones»). Cálculo puro: **lo último que se mandó a la
 * vez**, listo para pedirlo otra vez como nuevo. Se mete en lo que se pide, para quitar o cambiar
 * algo antes de mandarlo: no se manda solo.
 *
 * Lo que no se repite, porque pedirlo otra vez a ciegas saldría mal:
 *   · lo quitado y lo de un cambio (era otra cosa)
 *   · los menús y sus platos (cada uno elige de nuevo)
 *   · lo que lleva opciones o se vende a peso (se elige o se pesa otra vez)
 */
export function loUltimoPedido(platos: readonly PlatoDeLaCuenta[]): readonly PlatoDeLaCuenta[] {
  const mandados = platos.filter((p) => p.mandadaEn !== undefined && p.mandadaEn !== null);
  const ultima = mandados
    .map((p) => p.mandadaEn as string)
    .sort()
    .at(-1);
  if (ultima === undefined) return [];
  return mandados.filter(
    (p) =>
      p.mandadaEn === ultima &&
      p.estado !== 'quitado' &&
      p.platoId !== null &&
      p.menuId === null &&
      p.parteDe === null &&
      (p.opciones ?? []).length === 0 &&
      (p.pesoGramos === null || p.pesoGramos === undefined),
  );
}

/** Lo de la última ronda, como líneas nuevas: con su id nuevo, sin pase y sin la nota de entonces. */
export function comoLineasNuevas(
  platos: readonly PlatoDeLaCuenta[],
  idNuevo: () => string = () => crypto.randomUUID(),
): readonly LineaNueva[] {
  return platos.map((p) => ({
    id: idNuevo(),
    platoId: p.platoId,
    menuId: null,
    parteDe: null,
    nombre: p.nombre,
    cantidad: p.cantidad,
    precioCentimos: p.precioCentimos,
    destino: p.destino,
    pase: null,
    nota: null,
  }));
}

/** «2 Caña · 1 Agua»: lo que se va a pedir otra vez, para decirlo antes. */
export function loQueSeRepite(platos: readonly PlatoDeLaCuenta[]): string {
  return platos.map((p) => `${String(p.cantidad)} ${p.nombre}`).join(' · ');
}
