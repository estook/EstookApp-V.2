/**
 * Con qué se pinta un dibujo (entrega V, punto 4).
 *
 * Cuatro clases, y todas salen de las fichas: `stroke-texto-suave` compila a
 * `stroke: var(--color-texto-suave)`, así que **el mismo dibujo sale bien en claro y
 * en oscuro sin hacer dos**, que es lo que pedía el plan. Nadie escribe un color a
 * mano dentro de un dibujo: el único color propio es el acento, y llega de fuera
 * como `currentColor` (el de la app, o el naranja).
 */

/** El trazo de lo que se dibuja: se lee sin gritar, en los dos temas. */
export const LINEA = 'stroke-texto-suave';

/** Lo de fondo: baldas, renglones, marcas. Un escalón por debajo de la línea. */
export const TENUE = 'stroke-borde-fuerte';

/** El relleno de los objetos: el mismo papel que la tarjeta donde viven. */
export const PAPEL = 'fill-superficie';

/** Los dos juntos, que es como va casi todo. */
export const OBJETO = `${PAPEL} ${LINEA}`;
