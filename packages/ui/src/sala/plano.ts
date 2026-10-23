/**
 * Dónde y cómo de grande se pinta una mesa en el plano (M20A · 1 · 2, decisión 0106): lo
 * mismo en Ajustes › Sala, donde se dibuja, y en Estook TPV, donde se sirve. Una sola
 * función para que la mesa no salga en otro sitio del que se puso.
 *
 * El plano mide 1000 por 1000 en los dos ejes (como `mesa.x` y `mesa.y` en la base) y
 * se pinta apaisado, 16:10. Las medidas están en esas mismas unidades: una mesa
 * cuadrada ocupa 130 de ancho y 166 de alto, que en 16:10 es casi cuadrada de verdad.
 */

export type FormaDeMesa = 'cuadrada' | 'redonda' | 'alargada';

/** El plano se pinta así de apaisado: ancho entre alto. */
export const PROPORCION_DEL_PLANO = 16 / 10;

const MEDIDAS: Readonly<Record<FormaDeMesa, { readonly ancho: number; readonly alto: number }>> = {
  cuadrada: { ancho: 130, alto: 166 },
  redonda: { ancho: 105, alto: 168 },
  alargada: { ancho: 260, alto: 166 },
};

export interface SitioEnElPlano {
  /** En tanto por ciento del plano, para `left`, `top`, `width` y `height`. */
  readonly izquierda: number;
  readonly arriba: number;
  readonly ancho: number;
  readonly alto: number;
}

/** Que la mesa quepa entera: una puesta en la esquina no se sale. */
export function dentroDelPlano(forma: FormaDeMesa, x: number, y: number): { x: number; y: number } {
  const { ancho, alto } = MEDIDAS[forma];
  return {
    x: Math.trunc(Math.min(Math.max(x, 0), 1000 - ancho)),
    y: Math.trunc(Math.min(Math.max(y, 0), 1000 - alto)),
  };
}

export function elSitioDeLaMesa(forma: FormaDeMesa, x: number, y: number): SitioEnElPlano {
  const { ancho, alto } = MEDIDAS[forma];
  const dentro = dentroDelPlano(forma, x, y);
  return { izquierda: dentro.x / 10, arriba: dentro.y / 10, ancho: ancho / 10, alto: alto / 10 };
}

/**
 * Un sitio libre para una mesa nueva: la primera casilla de una rejilla en la que no
 * pise a ninguna. Así «Añadir mesa» la pone a la vista, y luego se arrastra.
 */
export function unSitioLibre(
  forma: FormaDeMesa,
  mesas: readonly { readonly forma: FormaDeMesa; readonly x: number; readonly y: number }[],
): { x: number; y: number } {
  const { ancho, alto } = MEDIDAS[forma];
  const pisa = (x: number, y: number) =>
    mesas.some((m) => {
      const otra = MEDIDAS[m.forma];
      return x < m.x + otra.ancho && x + ancho > m.x && y < m.y + otra.alto && y + alto > m.y;
    });
  for (let y = 40; y + alto <= 1000; y += 200) {
    for (let x = 40; x + ancho <= 1000; x += 170) {
      if (!pisa(x, y)) return { x, y };
    }
  }
  return dentroDelPlano(forma, 40, 40);
}
