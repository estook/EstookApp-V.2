import { describe, expect, it } from 'vitest';
import { lasSillas } from './sillas.ts';

/** Las sillas de cada mesa (0148): tantas como plazas, pegadas a la mesa y mirando hacia fuera. */
describe('las sillas de una mesa (0148)', () => {
  it('tantas como plazas, y el taburete ninguna', () => {
    expect(lasSillas('redonda', 4, true)).toHaveLength(4);
    expect(lasSillas('rectangular', 10, true)).toHaveLength(10);
    expect(lasSillas('cuadrada', 5, true)).toHaveLength(5);
    expect(lasSillas('taburete', 1, true)).toHaveLength(0);
    expect(lasSillas('redonda', 0, true)).toHaveLength(0);
  });

  it('más de 16 no caben: se pintan 16', () => {
    expect(lasSillas('alargada', 40, true)).toHaveLength(16);
  });

  it('la redonda de dos, una a cada lado', () => {
    const [a, b] = lasSillas('redonda', 2, true);
    expect(a).toMatchObject({ x: 0, y: 50, giro: 270 });
    expect(b?.x).toBeCloseTo(100);
    expect(b?.y).toBeCloseTo(50);
    expect(b?.giro).toBe(90);
  });

  it('la cuadrada de cuatro, una por lado', () => {
    const lados = lasSillas('cuadrada', 4, true)
      .map((s) => s.giro)
      .sort();
    expect(lados).toEqual([0, 180, 270, 90].sort());
  });

  it('la rectangular de diez apaisada: cuatro arriba, cuatro abajo y una en cada cabecera', () => {
    const sillas = lasSillas('rectangular', 10, true);
    expect(sillas.filter((s) => s.y === 0)).toHaveLength(4);
    expect(sillas.filter((s) => s.y === 100)).toHaveLength(4);
    expect(sillas.filter((s) => s.x === 0 && s.y === 50)).toHaveLength(1);
    expect(sillas.filter((s) => s.x === 100 && s.y === 50)).toHaveLength(1);
  });

  it('la rectangular de pie, a los lados', () => {
    const sillas = lasSillas('rectangular', 4, false);
    expect(sillas.every((s) => s.x === 0 || s.x === 100)).toBe(true);
  });

  it('todas en el borde de la mesa', () => {
    for (const s of lasSillas('ovalada', 7, true)) {
      const enElBorde = Math.hypot(s.x - 50, s.y - 50);
      expect(enElBorde).toBeCloseTo(50);
    }
  });
});
