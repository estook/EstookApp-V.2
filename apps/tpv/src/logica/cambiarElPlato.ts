import type { LaCartaDeLaSala, PlatoDeLaSala } from '../datos/tipos.ts';
import type { LineaALaVista } from './laCuenta.ts';

/**
 * **Por qué se puede cambiar un plato** (R2 · 2, decisión 0132), sin pintar nada.
 *
 *   · **de la carta**: primero los de su misma página (otro entrante por un entrante, que es lo
 *     normal); el buscador, en toda la carta
 *   · **de un menú**: solo los de su sección de hoy en ese menú, con su suplemento (Estook lo
 *     vuelve a mirar: tiene que estar hoy en el menú)
 *
 * Nunca él mismo: para cambiar cómo lo quieren está la nota.
 */
export interface ParaCambiar {
  readonly id: string;
  readonly nombre: string;
  /** Lo que vale; en un menú, su suplemento. */
  readonly precioCentimos: number;
  readonly agotado: boolean;
  /** El de la carta, para preguntar lo suyo al pedirlo (la guarnición, lo que pesa). */
  readonly plato: PlatoDeLaSala | null;
}

function deLaCarta(p: PlatoDeLaSala): ParaCambiar {
  return {
    id: p.id,
    nombre: p.nombre,
    precioCentimos: p.precioCentimos,
    agotado: p.agotado,
    plato: p,
  };
}

export function lasOpcionesParaCambiar(
  carta: LaCartaDeLaSala,
  linea: LineaALaVista,
): { readonly cercanos: ParaCambiar[]; readonly todos: ParaCambiar[] } {
  if (linea.menuDelPlato !== null) {
    const menu = carta.menus.find((m) => m.id === linea.menuDelPlato);
    const seccion = menu?.secciones.find((s) => s.platos.some((p) => p.platoId === linea.platoId));
    const suyos = (seccion?.platos ?? [])
      .filter((p) => p.platoId !== linea.platoId)
      .map((p) => ({
        id: p.platoId,
        nombre: p.nombre,
        precioCentimos: p.suplementoCentimos,
        agotado: p.agotado,
        plato: null,
      }));
    return { cercanos: suyos, todos: suyos };
  }
  const vistos = new Set<string>();
  const todos: ParaCambiar[] = [];
  for (const pagina of carta.paginas) {
    for (const p of pagina.platos) {
      if (p.id === linea.platoId || vistos.has(p.id)) continue;
      vistos.add(p.id);
      todos.push(deLaCarta(p));
    }
  }
  const suPagina = carta.paginas.find((g) => g.platos.some((p) => p.id === linea.platoId));
  const cercanos = (suPagina?.platos ?? []).filter((p) => p.id !== linea.platoId).map(deLaCarta);
  return { cercanos: cercanos.length > 0 ? cercanos : todos, todos };
}
