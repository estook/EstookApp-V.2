import { describe, expect, it } from 'vitest';
import { curvaMonotona, elDiaMasCerca, formasDeLaLineaViva } from './formasDeLaLineaViva.ts';

/**
 * La línea viva (0084): la gráfica pequeña de cada widget, a mano y sin Recharts.
 */

/** Todos los números de un trazado, de dos en dos: las coordenadas por las que pasa. */
function coordenadas(d: string): { x: number; y: number }[] {
  const numeros = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pares: { x: number; y: number }[] = [];
  for (let k = 0; k + 1 < numeros.length; k += 2) {
    pares.push({ x: numeros[k] ?? 0, y: numeros[k + 1] ?? 0 });
  }
  return pares;
}

describe('la curva', () => {
  it('no se pasa: entre dos días no inventa un pico ni baja del suelo', () => {
    // Una semana con un día alto en medio: una curva cualquiera se pasaría por
    // encima del pico y por debajo de cero a los lados.
    const puntos = [0, 0, 0, 100, 0, 0, 0].map((v, i) => ({ x: i * 10, y: 100 - v }));
    for (const { y } of coordenadas(curvaMonotona(puntos))) {
      expect(y).toBeGreaterThanOrEqual(0 - 1e-6);
      expect(y).toBeLessThanOrEqual(100 + 1e-6);
    }
  });

  it('pasa por cada punto', () => {
    const puntos = [
      { x: 0, y: 40 },
      { x: 50, y: 10 },
      { x: 100, y: 30 },
    ];
    const d = curvaMonotona(puntos);
    expect(d.startsWith('M0.00,40.00')).toBe(true);
    expect(d).toContain('50.00,10.00');
    expect(d.endsWith('100.00,30.00')).toBe(true);
  });
});

describe('las formas', () => {
  it('la línea gris del periodo anterior sale si hay al menos dos días con dato', () => {
    const conAntes = formasDeLaLineaViva([1, 2, 3], [3, null, 1], 60, 'area');
    expect(conAntes.anterior).not.toBeNull();
    expect(formasDeLaLineaViva([1, 2, 3], [null, null, 1], 60, 'area').anterior).toBeNull();
    expect(formasDeLaLineaViva([1, 2, 3], undefined, 60, 'area').anterior).toBeNull();
  });

  it('las dos líneas comparten escala: la de antes, más alta, no se sale del dibujo', () => {
    const formas = formasDeLaLineaViva([10, 10], [100, 100], 60, 'area');
    for (const { y } of coordenadas(formas.anterior ?? '')) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(60);
    }
  });

  it('un día sin dato no es cero: no tiene punto que señalar', () => {
    const formas = formasDeLaLineaViva([5, null, 7], undefined, 60, 'area');
    expect(formas.puntos[1]).toBeNull();
    expect(formas.puntos[2]?.valor).toBe(7);
  });

  it('las barras salen del suelo y no bajan de él', () => {
    const formas = formasDeLaLineaViva([0, 4, 8], undefined, 60, 'barras');
    expect(formas.barras).toHaveLength(3);
    for (const barra of formas.barras) {
      for (const { y } of coordenadas(barra.d)) expect(y).toBeLessThanOrEqual(60);
    }
  });
});

describe('el dedo', () => {
  it('señala el día más cerca, y no se sale por los bordes', () => {
    const xs = formasDeLaLineaViva([1, 2, 3, 4, 5], undefined, 60, 'area').xDeCadaDia;
    expect(elDiaMasCerca(xs, 0)).toBe(0);
    expect(elDiaMasCerca(xs, 0.49)).toBe(2);
    expect(elDiaMasCerca(xs, 1)).toBe(4);
    expect(elDiaMasCerca(xs, -3)).toBe(0);
    expect(elDiaMasCerca(xs, 7)).toBe(4);
    expect(elDiaMasCerca([], 0.5)).toBeNull();
  });
});
