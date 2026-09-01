/**
 * Motor fiscal (M2). Tres piezas:
 *
 *   vocabulario  los catalogos cerrados de los que se componen las reglas
 *   resolucion   elegir la regla que corresponde a una operacion
 *   desglose     repartir un ticket por tratamiento fiscal y calcular la cuota
 *
 * El principio, y lo que cambia todo: **un producto no tiene un tipo impositivo.
 * Lo tiene la operacion.** El mismo botellin lleva un impuesto servido en barra y
 * otro vendido en caja para llevar de una tienda.
 *
 * Y lo que NO hace, a proposito: **no prorratea el impuesto de los ingredientes
 * de una receta**. Una hamburguesa no tributa por la media del pan, la carne y el
 * queso: tributa como lo que es, un servicio de restauracion. La fiscalidad de
 * las compras y la de las ventas son dos mundos separados.
 *
 * El diseno entero, con sus porques, esta en docs/decisiones/0006-el-motor-fiscal.md
 */
export * from './vocabulario.ts';
export * from './resolucion.ts';
export * from './desglose.ts';
