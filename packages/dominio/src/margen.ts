import { resta, type Centimos } from './dinero.ts';
import { sinIva } from './iva.ts';

/**
 * Lo que se gana con lo que se vende (M7, repaso).
 *
 * ── La cuenta, y las dos trampas que tiene ──────────────────────────────────
 *
 * Un producto que se vende tal cual —una caña, un botellín, una botella de
 * vino— tiene un precio de carta y un coste. Lo que se gana es la resta. Y la
 * resta está mal dos veces si no se tiene cuidado:
 *
 *   1. **El precio de carta lleva IVA y el coste no.** Lo que se cobra por una
 *      caña de 2,50 € no son 2,50 € para el negocio: son 2,27 €, porque los
 *      0,23 € del impuesto se ingresan a Hacienda. Restar 2,50 menos el coste es
 *      regalarse el IVA como si fuera margen, y es el error más repetido que hay
 *      en una hoja de cálculo de un bar.
 *   2. **El IVA que se paga al comprar no es coste.** Se recupera. Por eso los
 *      precios de compra se guardan sin él (0033) y por eso aquí se restan dos
 *      cifras que ya están las dos sin impuesto.
 *
 * Con las dos cosas puestas, las tres cifras que importan salen solas: lo que
 * queda, qué parte del precio es ganancia y qué parte se va en género.
 *
 * ── Y el food cost, que es la misma cifra al revés ──────────────────────────
 *
 * «Qué parte de lo que cobro se va en género» es la cifra con la que se manda un
 * bar. Un 30 % es un buen número en cocina; por encima del 35 % hay algo que
 * revisar. Se calcula sobre la base sin IVA, igual que el margen, porque si no
 * cambia según el tipo impositivo y deja de poder compararse.
 */

export interface Margen {
  /** Lo que se cobra, sin el impuesto: la base. */
  readonly baseCentimos: Centimos;
  /** Lo que cuesta el género, sin el impuesto. */
  readonly costeCentimos: Centimos;
  /** Base menos coste. Puede ser negativo: se vende con pérdida y hay que verlo. */
  readonly margenCentimos: Centimos;
  /** Qué parte de la base queda, en fracción: 0,68 es un 68 %. */
  readonly margenPorcentaje: number;
  /** Qué parte de la base se va en género, en fracción: 0,32 es un 32 %. */
  readonly foodCostPorcentaje: number;
}

/**
 * El tipo que se repercute al vender en un local de hostelería.
 *
 * En península y Baleares, un servicio de restauración va al 10 % **sea lo que
 * sea lo que se sirva**: la cerveza servida en barra también, porque lo que se
 * vende es el servicio, no la botella. Lo dice el mismo principio que ordena el
 * motor fiscal: «un producto no tiene un tipo impositivo; lo tiene la operación»
 * ([0006](docs/decisiones/0006-el-motor-fiscal.md)).
 *
 * Y donde no es IVA —Canarias, Ceuta y Melilla— **no se supone nada**, igual que
 * en las compras: se devuelve nulo y quien lo sepa lo escribe. Inventarse un tipo
 * es inventarse el margen de todos los platos.
 */
export function ivaDeVentaPorDefecto(territorio: string): number | null {
  return territorio === 'peninsula_y_baleares' ? 0.1 : null;
}

/**
 * Lo que se gana vendiendo una unidad.
 *
 * `precioDeVenta` es lo que se cobra, **con impuesto**, que es lo que está
 * escrito en la pizarra. `coste` es lo que cuesta esa misma unidad, sin impuesto,
 * que es como se guarda.
 */
export function margenDe(
  precioDeVenta: Centimos,
  ivaDeVenta: number,
  coste: Centimos,
): Margen | null {
  const base = sinIva(precioDeVenta, ivaDeVenta);
  if (base <= 0) return null;

  const margen = resta(base, coste);
  return {
    baseCentimos: base,
    costeCentimos: coste,
    margenCentimos: margen,
    margenPorcentaje: margen / base,
    foodCostPorcentaje: coste / base,
  };
}

/** A partir de aquí, el género se lleva demasiado de lo que se cobra. */
export const FOOD_COST_QUE_PREOCUPA = 0.35;

/**
 * Cómo está ese margen, en una palabra.
 *
 * No es una nota: es lo que decide el color de la cifra, y un color sin palabra
 * no se lee en blanco y negro (B8).
 */
export function comoEstaElMargen(margen: Margen): 'bien' | 'atencion' | 'mal' {
  if (margen.margenCentimos < 0) return 'mal';
  return margen.foodCostPorcentaje > FOOD_COST_QUE_PREOCUPA ? 'atencion' : 'bien';
}
