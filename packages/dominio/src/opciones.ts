/**
 * **Las opciones y los extras de un plato** (T3 · 2, decisión 0113; Anexo 10.3 y 11.11).
 *
 * Un **grupo** se usa en muchos platos: la guarnición, los extras de la hamburguesa, el «¿Con
 * qué?» de las copas. Dice **cuántas se eligen** —obligatoria y una, opcional y hasta tres— y
 * cada **opción** lleva su precio (que suma al del plato, o resta en una sustitución que sale
 * más barata) y lo que **gasta del almacén**: añade un producto («doble de queso», +30 g de
 * queso), quita un ingrediente del escandallo («sin cebolla»), cambia uno por otro («pan sin
 * gluten»), o nada (el extra libre, que no se sabe qué es). **Nunca el punto de la carne**: eso
 * va en la nota (0106).
 *
 * Lo mismo lo usan el TPV, al pedir, y la API, que lo vuelve a mirar: no se pide un plato sin
 * contestar lo obligatorio.
 */

import { porCantidad, suma, type Centimos } from './dinero.ts';

export interface GrupoParaElegir {
  readonly id: string;
  readonly nombre: string;
  /** 0: opcional. */
  readonly minimo: number;
  readonly maximo: number;
  readonly opciones: readonly { readonly id: string; readonly precioCentimos: number }[];
}

/** Los topes de un grupo: hasta veinte opciones elegidas a la vez. */
export const TOPES_DEL_GRUPO = { maximo: 20, opciones: 40 } as const;

/** Cómo se dice lo que pide un grupo: «obligatoria, una», «opcional, hasta 3». */
export function cuantasSeEligen(grupo: {
  readonly minimo: number;
  readonly maximo: number;
}): string {
  const cuantas = (n: number) => (n === 1 ? 'una' : String(n));
  if (grupo.minimo === 0) {
    return grupo.maximo === 1 ? 'opcional, una' : `opcional, hasta ${cuantas(grupo.maximo)}`;
  }
  if (grupo.minimo === grupo.maximo) {
    return `obligatoria${grupo.minimo === 1 ? ', una' : `s, ${cuantas(grupo.minimo)}`}`;
  }
  return `obligatorias, de ${cuantas(grupo.minimo)} a ${cuantas(grupo.maximo)}`;
}

/**
 * **Qué falta o qué sobra** al elegir las opciones de un plato: el primer grupo con menos de
 * su mínimo o más de su máximo, y por qué. Nulo, si está bien. Una opción que no es de ninguno
 * de sus grupos, también es un fallo.
 */
export function loQueFaltaPorElegir(
  grupos: readonly GrupoParaElegir[],
  elegidas: readonly string[],
): { readonly grupo: string; readonly porque: 'falta' | 'sobra' | 'no_es_suya' } | null {
  const suyas = new Map(grupos.flatMap((g) => g.opciones.map((o) => [o.id, g] as const)));
  for (const id of elegidas) {
    if (!suyas.has(id)) return { grupo: '', porque: 'no_es_suya' };
  }
  for (const g of grupos) {
    const cuantas = elegidas.filter((id) => suyas.get(id)?.id === g.id).length;
    if (cuantas < g.minimo) return { grupo: g.nombre, porque: 'falta' };
    if (cuantas > g.maximo) return { grupo: g.nombre, porque: 'sobra' };
  }
  return null;
}

/** El precio del plato con sus opciones: el de la carta y lo que suma (o resta) cada una. */
export function elPrecioConLasOpciones(
  precio: Centimos,
  opciones: readonly { readonly precioCentimos: number }[],
): Centimos {
  return suma(precio, ...opciones.map((o) => o.precioCentimos as Centimos));
}

/**
 * **Si con un toque basta**: un solo grupo, obligatorio y de una (el «¿Con qué?» de una copa):
 * al tocar la opción se apunta, sin «Añadir». Dos toques en total (10.13).
 */
export function conUnToqueBasta(grupos: readonly GrupoParaElegir[]): boolean {
  const [solo, ...otros] = grupos;
  return solo !== undefined && otros.length === 0 && solo.minimo === 1 && solo.maximo === 1;
}

// ── Lo que se vende a peso ───────────────────────────────────────────────────

/** Lo que puede pesar una ración: de 1 g a 100 kg. */
export const PESO_DE_UNA_RACION = { minimo: 1, maximo: 100_000 } as const;

/** El precio de lo que pesa: el del kilo por los gramos (120 g a 120 €/kg, 14,40 €). */
export function elPrecioAPeso(precioDelKilo: Centimos, gramos: number): Centimos {
  return porCantidad(precioDelKilo, gramos / 1000);
}

/** «120 g», «1,25 kg». */
export function comoSeLeeElPeso(gramos: number): string {
  if (gramos < 1000) return `${String(gramos)} g`;
  return `${(gramos / 1000).toLocaleString('es-ES', { maximumFractionDigits: 3 })} kg`;
}
