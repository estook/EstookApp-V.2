import type { FormaDeMesa } from '@estook/dominio';

/**
 * **Las sillas de cada mesa** (el rediseño, 0148; Richi, 17-nov: «que salgan sillas dependiendo de
 * las sillas que hay en esa mesa, es algo normal»). Cálculo puro, sin pintar: dónde va cada silla
 * alrededor de la mesa, en tanto por ciento de su caja, y hacia dónde mira.
 *
 *   · **redonda y ovalada**: repartidas alrededor, empezando arriba; la de dos, a los lados
 *   · **cuadrada**: una por lado, y las que sobran, otra vez por los lados
 *   · **rectangular y alargada**: en los dos lados largos; desde seis, una en cada cabecera
 *   · **taburete**: ninguna, que ya es un asiento
 *
 * El giro es el de la silla para que su lado largo vaya pegado a la mesa: 0 arriba, 90 a la
 * derecha, 180 abajo y 270 a la izquierda. Más de 16 no caben a la vista: se pintan 16.
 */
export interface Silla {
  /** El centro de la silla, en el borde de la mesa: 0 es la izquierda y 100 la derecha. */
  readonly x: number;
  /** 0 es arriba y 100 abajo. */
  readonly y: number;
  /** Hacia fuera: 0 arriba, 90 derecha, 180 abajo, 270 izquierda. */
  readonly giro: number;
}

const MAXIMO = 16;

/** Un tanto por ciento para `style`, sin los decimales que deja el seno. */
function conDosDecimales(n: number): number {
  // eslint-disable-next-line no-restricted-syntax -- posiciones en pantalla, no dinero
  return Math.round(n * 100) / 100;
}

/** Las de un lado, repartidas a lo largo: «2 arriba» son el 25 % y el 75 %. */
function enUnLado(cuantas: number, lado: 'arriba' | 'derecha' | 'abajo' | 'izquierda'): Silla[] {
  return Array.from({ length: cuantas }, (_, i) => {
    const t = ((i + 0.5) / cuantas) * 100;
    switch (lado) {
      case 'arriba':
        return { x: t, y: 0, giro: 0 };
      case 'abajo':
        return { x: t, y: 100, giro: 180 };
      case 'izquierda':
        return { x: 0, y: t, giro: 270 };
      case 'derecha':
        return { x: 100, y: t, giro: 90 };
    }
  });
}

/**
 * @param apaisada si se ve más ancha que alta en la pantalla (el plano es 16 por 10, así que se
 *   mide en la pantalla y no en las unidades del plano).
 */
export function lasSillas(forma: FormaDeMesa, plazas: number, apaisada: boolean): readonly Silla[] {
  const n = Math.max(0, Math.min(MAXIMO, Math.floor(plazas)));
  if (n === 0 || forma === 'taburete') return [];

  if (forma === 'redonda' || forma === 'ovalada') {
    return Array.from({ length: n }, (_, i) => {
      // La de dos, a los lados; las demás, empezando arriba y en el sentido del reloj.
      const angulo = n === 2 ? (i === 0 ? 180 : 0) : -90 + (360 / n) * i;
      const rad = (angulo * Math.PI) / 180;
      return {
        x: conDosDecimales(50 + 50 * Math.cos(rad)),
        y: conDosDecimales(50 + 50 * Math.sin(rad)),
        giro: (((angulo + 90) % 360) + 360) % 360,
      };
    });
  }

  if (forma === 'cuadrada') {
    const lados = ['arriba', 'abajo', 'izquierda', 'derecha'] as const;
    const porLado = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) porLado[i % 4] = (porLado[i % 4] ?? 0) + 1;
    return lados.flatMap((lado, i) => enUnLado(porLado[i] ?? 0, lado));
  }

  // Rectangular y alargada: los lados largos, y las cabeceras desde seis.
  const cabeceras = n >= 6 ? 2 : 0;
  const resto = n - cabeceras;
  const unLado = Math.ceil(resto / 2);
  const otroLado = resto - unLado;
  return apaisada
    ? [
        ...enUnLado(unLado, 'arriba'),
        ...enUnLado(otroLado, 'abajo'),
        ...(cabeceras > 0 ? [...enUnLado(1, 'izquierda'), ...enUnLado(1, 'derecha')] : []),
      ]
    : [
        ...enUnLado(unLado, 'izquierda'),
        ...enUnLado(otroLado, 'derecha'),
        ...(cabeceras > 0 ? [...enUnLado(1, 'arriba'), ...enUnLado(1, 'abajo')] : []),
      ];
}
