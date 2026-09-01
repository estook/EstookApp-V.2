import { centimos, type Centimos } from './dinero.ts';

/**
 * Motor de unidades y coste (M2).
 *
 * La fórmula de la que cuelga todo el dinero de Estook (Auditoría, parte 1):
 *
 *     coste por unidad de uso  =  precio de compra ÷ (factor × rendimiento)
 *
 * Con el ejemplo del propio documento: una caja de 3 kg a 10 €, con un 85 % de
 * rendimiento, sale a 0,0039 €/g. Se compra en cajas y se cocina en gramos; el
 * factor convierte, y el rendimiento descuenta lo que se va en la merma de
 * limpieza. Confundir la unidad de compra con la de uso es, según el documento,
 * «la primera causa de escandallos falsos».
 *
 * ── La trampa de precisión ───────────────────────────────────────────────────
 *
 * 0,0039 €/g **no cabe en céntimos enteros**: es menos de medio céntimo. Y la
 * regla 9 prohíbe la coma flotante para el dinero. Así que aquí hay dos tipos
 * distintos, y el compilador no deja mezclarlos:
 *
 *   Centimos    dinero de verdad. El coste de una línea, el precio de un plato.
 *   Milesimas   un precio POR UNIDAD. Milésimas de céntimo, en entero.
 *               1 céntimo = 1.000 milésimas. Una milésima es 0,00001 €.
 *
 * Y una regla que las une: **se redondea una sola vez, al final**. El coste de una
 * línea se calcula entero y se redondea a céntimos al terminar, nunca a mitad.
 */

/** Milésimas de céntimo, en entero. Es un precio por unidad, no dinero. */
export type Milesimas = number & { readonly __milesimas: unique symbol };

/** Cantidades con cuatro decimales (Auditoría, parte 7). */
export type Cantidad = number & { readonly __cantidad: unique symbol };

const MILESIMAS_POR_CENTIMO = 1000;
const DECIMALES_DE_CANTIDAD = 4;

export function milesimas(valor: number): Milesimas {
  if (!Number.isInteger(valor)) {
    throw new Error(`Las milesimas van en entero y ha llegado ${valor}.`);
  }
  if (!Number.isSafeInteger(valor)) {
    throw new Error(`La cifra ${valor} se sale de lo que se puede contar sin perder precision.`);
  }
  return valor as Milesimas;
}

export function cantidad(valor: number): Cantidad {
  if (!Number.isFinite(valor)) {
    throw new Error(`«${valor}» no es una cantidad.`);
  }
  return Number(valor.toFixed(DECIMALES_DE_CANTIDAD)) as Cantidad;
}

export const SIN_EXISTENCIAS = cantidad(0);

/**
 * Cuando falta el factor o el rendimiento se asume 1, y el producto queda
 * marcado como «sin verificar»: un rendimiento mal puesto es, según la
 * Auditoría, «el error más caro del sistema».
 */
export const FACTOR_SIN_VERIFICAR = 1;
export const RENDIMIENTO_SIN_VERIFICAR = 1;

export interface Conversion {
  /** Cuántas unidades de uso trae una unidad de compra. Una caja de 3 kg: 3000. */
  readonly factor: number;
  /** Qué proporción se aprovecha. Un 85 % es 0,85. */
  readonly rendimiento: number;
}

function comprobarConversion({ factor, rendimiento }: Conversion): void {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error(`El factor tiene que ser mayor que cero y ha llegado ${factor}.`);
  }
  if (!Number.isFinite(rendimiento) || rendimiento <= 0 || rendimiento > 1) {
    throw new Error(
      `El rendimiento va entre 0 y 1, donde 0,85 es un 85 %. Ha llegado ${rendimiento}.`,
    );
  }
}

/**
 * `precio ÷ (factor × rendimiento)`, en milésimas de céntimo.
 *
 * Una caja de 3 kg a 10 € con un 85 % de rendimiento: 0,0039 €/g, que son
 * 392 milésimas de céntimo por gramo.
 */
export function costePorUnidadDeUso(precioDeCompra: Centimos, conversion: Conversion): Milesimas {
  comprobarConversion(conversion);
  const unidadesUtiles = conversion.factor * conversion.rendimiento;
  return milesimas(Math.round((precioDeCompra * MILESIMAS_POR_CENTIMO) / unidadesUtiles));
}

/**
 * Lo que cuesta usar una cantidad de algo. **Aquí sí se redondea**, porque el
 * resultado ya es dinero.
 */
export function costeDeLinea(coste: Milesimas, cuanto: Cantidad): Centimos {
  return centimos(Math.round(Number(((coste * cuanto) / MILESIMAS_POR_CENTIMO).toFixed(6))));
}

/**
 * El atajo honrado: del precio de compra al coste de una línea, sin pasar por un
 * redondeo intermedio. Es lo que se usa cuando se tienen los tres datos a mano.
 */
export function costeDeLineaDesdeCompra(
  precioDeCompra: Centimos,
  conversion: Conversion,
  cuanto: Cantidad,
): Centimos {
  comprobarConversion(conversion);
  const unidadesUtiles = conversion.factor * conversion.rendimiento;
  return centimos(Math.round(Number(((precioDeCompra * cuanto) / unidadesUtiles).toFixed(6))));
}

/**
 * Precio medio ponderado, recalculado en cada entrada.
 *
 * «El último precio se guarda y se enseña, pero el que descuenta es el medio: es
 * lo único que evita que el margen salte cada vez que llega un albarán caro»
 * (Manifiesto, Inventario).
 */
export interface Existencias {
  readonly cantidad: Cantidad;
  readonly coste: Milesimas;
}

export function precioMedioPonderado(actual: Existencias, entrada: Existencias): Milesimas {
  if (actual.cantidad < 0 || entrada.cantidad < 0) {
    throw new Error('Una entrada de genero no puede ser negativa.');
  }

  const total = actual.cantidad + entrada.cantidad;

  // Primera entrada, o stock a cero: manda el precio que acaba de llegar.
  if (total === 0) return entrada.coste;
  if (actual.cantidad === 0) return entrada.coste;
  if (entrada.cantidad === 0) return actual.coste;

  const valorActual = actual.coste * actual.cantidad;
  const valorEntrada = entrada.coste * entrada.cantidad;
  return milesimas(Math.round(Number(((valorActual + valorEntrada) / total).toFixed(6))));
}

/** Lo que vale lo que hay en cámara. Esto ya es dinero. */
export function valorDeLasExistencias(existencias: Existencias): Centimos {
  return costeDeLinea(existencias.coste, existencias.cantidad);
}

/**
 * Para enseñarlo: «0,0039 €/g». Devuelve texto, para que no se pueda seguir
 * calculando con ello.
 */
export function comoPrecioPorUnidad(coste: Milesimas, unidad: string): string {
  const euros = coste / (MILESIMAS_POR_CENTIMO * 100);
  return `${euros.toFixed(4).replace('.', ',')} €/${unidad}`;
}
