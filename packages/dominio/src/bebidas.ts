/**
 * **«Monta tus bebidas»** (T3 · 2 · 2, decisión 0114; 0106, puntos 19 a 23; Anexo 11.11): las
 * bebidas del almacén, puestas en el TPV con su precio de una vez.
 *
 * Todo lo que se vende sale de la carta, y todo lo de la carta del almacén (0106, 19). Una
 * bebida se vende de tres formas, y **eso propone Estook por su nombre y su unidad**:
 *
 *   · **entera**: la lata, el botellín, el agua (una unidad)
 *   · **a raciones**: la caña, la doble y la jarra del mismo barril; la copa de vino (150 ml,
 *     la de la casa) y la botella entera
 *   · **con receta**: las copas, que se hacen solas (50 ml de su botella, la dosis de la casa, y
 *     el «¿Con qué?»), y los cafés, que vienen hechos
 *
 * Lo que guarda es lo de siempre: el plato en la carta y su escandallo, «tal cual» o con su
 * receta. Por eso el almacén descontará igual.
 */

import type { UnidadDeUso } from './referencia.ts';
import { sinAcentos } from './parecido.ts';

/** Las dosis de la casa (0106, punto 6; Richi, 25-oct: «sí»). Cada local las cambia una vez. */
export const DOSIS_DE_FABRICA = { copaMl: 50, copaDeVinoMl: 150 } as const;

/** Lo que se puede poner de dosis: de un chupito a una copa doble. */
export const TOPES_DE_LA_DOSIS = { minimoMl: 10, maximoMl: 500 } as const;

export interface ProductoQueSeMira {
  readonly nombre: string;
  readonly unidad: UnidadDeUso;
  readonly categoria: string | null;
  /** Lo que trae cada unidad, si lo dice su ficha: la botella de vino, 750 ml. */
  readonly contenido?: { readonly cantidad: number; readonly unidad: UnidadDeUso } | null;
}

export interface RacionQueSePropone {
  readonly nombre: string;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
  /** Encendida al proponerla (la jarra, no: se añade con un toque). */
  readonly puesta: boolean;
}

export type QueEsLaBebida = 'bebida' | 'botella_para_copas' | 'cafe' | 'no_es_bebida';

const DESTILADO =
  /(ginebra|^gin |ron |^ron$|whisky|whiskey|vodka|brandy|cognac|coñac|licor|tequila|orujo|pacharan|anis|aguardiente|ratafia|hierbas)/;
const DE_BARRIL = /(barril|grifo|de tirador)/;
const CERVEZA = /(cerveza|caña|lager|ipa|tercio|quinto|botellin)/;
const VINO =
  /(vino|cava|champan|champagne|rioja|ribera|verdejo|albarino|godello|rosado|crianza|reserva|txakoli|txacoli|tinto|blanco)/;
const AGUA = /(^agua|agua mineral|agua con gas|agua sin gas)/;
const REFRESCO =
  /(refresco|cola|tonica|limon|naranja|gaseosa|bitter|zumo|nestea|aquarius|ginger|soda|red bull|energetica)/;

function esDeBebidas(categoria: string | null): boolean {
  return categoria !== null && sinAcentos(categoria).startsWith('bebidas');
}

/** Qué es un producto del almacén para «Monta tus bebidas». */
export function queEsLaBebida(producto: ProductoQueSeMira): QueEsLaBebida {
  const categoria = sinAcentos(producto.categoria ?? '');
  if (categoria.startsWith('cafe')) return 'cafe';
  if (!esDeBebidas(producto.categoria)) return 'no_es_bebida';
  const nombre = sinAcentos(producto.nombre);
  // El vino de cocinar está en las bebidas del almacén, pero no se vende.
  if (/cocinar|cocina$/.test(nombre)) return 'no_es_bebida';
  if (DESTILADO.test(`${nombre} `) && !VINO.test(nombre) && !CERVEZA.test(nombre)) {
    return 'botella_para_copas';
  }
  return 'bebida';
}

/** Si se puede medir en mililitros: en ml, o por unidades que dicen lo que traen en ml. */
function enMililitros(producto: ProductoQueSeMira): boolean {
  if (producto.unidad === 'ml' || producto.unidad === 'l') return true;
  const contenido = producto.contenido ?? null;
  return contenido !== null && (contenido.unidad === 'ml' || contenido.unidad === 'l');
}

/**
 * **Cómo se propone venderla** (0106, 19): sus raciones, con su nombre y lo que lleva cada una.
 * Una botella de vino que no dice lo que trae se vende entera: para venderla por copas, su ficha
 * del almacén tiene que decirlo (no se adivina, Plan, M9).
 */
export function lasRacionesQueSeProponen(
  producto: ProductoQueSeMira,
  copaDeVinoMl: number = DOSIS_DE_FABRICA.copaDeVinoMl,
): readonly RacionQueSePropone[] {
  const nombre = sinAcentos(producto.nombre);
  const ml = enMililitros(producto);
  if (CERVEZA.test(nombre) && (DE_BARRIL.test(nombre) || producto.unidad === 'ml')) {
    return [
      { nombre: 'Caña', cantidad: 200, unidad: 'ml', puesta: true },
      { nombre: 'Doble', cantidad: 330, unidad: 'ml', puesta: true },
      { nombre: 'Jarra', cantidad: 500, unidad: 'ml', puesta: false },
    ];
  }
  if (VINO.test(nombre)) {
    const botella: RacionQueSePropone =
      producto.unidad === 'ud'
        ? { nombre: 'Botella', cantidad: 1, unidad: 'ud', puesta: true }
        : { nombre: 'Botella', cantidad: 750, unidad: 'ml', puesta: false };
    return ml
      ? [{ nombre: 'Copa', cantidad: copaDeVinoMl, unidad: 'ml', puesta: true }, botella]
      : [botella];
  }
  if (producto.unidad === 'ud') {
    return [{ nombre: 'Entera', cantidad: 1, unidad: 'ud', puesta: true }];
  }
  // Lo que se lleva a granel: el vermut, de 100 ml; el zumo, un vaso. Se cambia al montarlo.
  if (/(vermut|vermouth)/.test(nombre)) {
    return [{ nombre: 'Vaso', cantidad: 100, unidad: 'ml', puesta: true }];
  }
  return [{ nombre: 'Vaso', cantidad: 200, unidad: 'ml', puesta: true }];
}

/** El nombre del botón de cada ración: «Caña», «Rioja crianza · copa», «Coca-Cola». */
export function elNombreDeLaRacion(
  producto: string,
  racion: RacionQueSePropone,
  cuantas: number,
): string {
  if (racion.nombre === 'Entera' || cuantas === 1) return producto;
  if (racion.nombre === 'Caña' || racion.nombre === 'Doble' || racion.nombre === 'Jarra') {
    return racion.nombre;
  }
  return `${producto} · ${racion.nombre.toLocaleLowerCase('es')}`;
}

/** En qué página del TPV va: Refrescos, Cervezas, Vinos… El agua, a «Pan y agua» (0112). */
export function laPaginaDeLaBebida(producto: ProductoQueSeMira): string {
  const nombre = sinAcentos(producto.nombre);
  if (AGUA.test(nombre)) return 'Pan y agua';
  if (CERVEZA.test(nombre)) return 'Cervezas';
  if (VINO.test(nombre)) return 'Vinos';
  if (REFRESCO.test(nombre)) return 'Refrescos';
  return 'Bebidas';
}

/** Si un producto sirve para el «¿Con qué?» de las copas: un refresco que se cuenta por unidades. */
export function sirveParaLasCopas(producto: ProductoQueSeMira): boolean {
  const nombre = sinAcentos(producto.nombre);
  return (
    esDeBebidas(producto.categoria) &&
    producto.unidad === 'ud' &&
    REFRESCO.test(nombre) &&
    !AGUA.test(nombre)
  );
}

// ── Los cafés, que vienen hechos (0106, 23) ─────────────────────────────────────

export interface CafeDeSerie {
  readonly clave: string;
  readonly nombre: string;
  /** Lo que lleva, por lo que se busca en el almacén. */
  readonly lleva: readonly {
    readonly que: 'cafe' | 'descafeinado' | 'leche' | 'cacao' | 'te' | 'manzanilla' | 'poleo';
    readonly cantidad: number;
    readonly unidad: UnidadDeUso;
  }[];
  /** Lo que cuesta, más o menos, si falta algo en el almacén (0106: que.es, la leche a 1 €/l). */
  readonly aproximadoCentimos: number | null;
  /** Encendido al proponerlo: lo que sirve casi cualquier bar. */
  readonly puesto: boolean;
}

const CAFE = { que: 'cafe', cantidad: 7.5, unidad: 'g' } as const;

/** Los cafés de serie, con sus cantidades típicas (7,5 g de café; 30, 120 o 180 ml de leche). */
export const CAFES_DE_SERIE: readonly CafeDeSerie[] = [
  { clave: 'solo', nombre: 'Café solo', lleva: [CAFE], aproximadoCentimos: 17, puesto: true },
  {
    clave: 'cortado',
    nombre: 'Cortado',
    lleva: [CAFE, { que: 'leche', cantidad: 30, unidad: 'ml' }],
    aproximadoCentimos: 20,
    puesto: true,
  },
  {
    clave: 'con_leche',
    nombre: 'Café con leche',
    lleva: [CAFE, { que: 'leche', cantidad: 120, unidad: 'ml' }],
    aproximadoCentimos: 29,
    puesto: true,
  },
  {
    clave: 'con_leche_vaso',
    nombre: 'Café con leche en vaso',
    lleva: [CAFE, { que: 'leche', cantidad: 180, unidad: 'ml' }],
    aproximadoCentimos: 35,
    puesto: false,
  },
  { clave: 'americano', nombre: 'Americano', lleva: [CAFE], aproximadoCentimos: 17, puesto: true },
  {
    clave: 'descafeinado',
    nombre: 'Descafeinado',
    lleva: [{ que: 'descafeinado', cantidad: 7.5, unidad: 'g' }],
    aproximadoCentimos: 17,
    puesto: true,
  },
  // La leche condensada no se adivina: se añade en Escandallos si se quiere su coste.
  { clave: 'bombon', nombre: 'Bombón', lleva: [CAFE], aproximadoCentimos: null, puesto: false },
  {
    clave: 'te',
    nombre: 'Té',
    lleva: [{ que: 'te', cantidad: 1, unidad: 'ud' }],
    aproximadoCentimos: null,
    puesto: true,
  },
  {
    clave: 'manzanilla',
    nombre: 'Manzanilla',
    lleva: [{ que: 'manzanilla', cantidad: 1, unidad: 'ud' }],
    aproximadoCentimos: null,
    puesto: true,
  },
  {
    clave: 'poleo',
    nombre: 'Poleo menta',
    lleva: [{ que: 'poleo', cantidad: 1, unidad: 'ud' }],
    aproximadoCentimos: null,
    puesto: false,
  },
  {
    clave: 'cola_cao',
    nombre: 'Cola Cao',
    lleva: [
      { que: 'leche', cantidad: 180, unidad: 'ml' },
      { que: 'cacao', cantidad: 15, unidad: 'g' },
    ],
    aproximadoCentimos: null,
    puesto: false,
  },
];

const BUSCA: Readonly<Record<CafeDeSerie['lleva'][number]['que'], RegExp>> = {
  cafe: /^cafe(?!.*descafeinado)/,
  descafeinado: /descafeinado/,
  leche: /^leche (entera|semi|desnatada)|^leche$/,
  cacao: /(cacao|cola ?cao)/,
  te: /^te( |$)|te negro|te verde/,
  manzanilla: /manzanilla/,
  poleo: /poleo/,
};

/** El producto del almacén que hace de cada cosa de un café: el primero que se llama así. */
export function elProductoDelCafe<T extends { readonly nombre: string }>(
  que: CafeDeSerie['lleva'][number]['que'],
  productos: readonly T[],
): T | null {
  return productos.find((p) => BUSCA[que].test(sinAcentos(p.nombre))) ?? null;
}
