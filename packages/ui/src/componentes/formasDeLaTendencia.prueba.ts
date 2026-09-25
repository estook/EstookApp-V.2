import { describe, expect, it } from 'vitest';
import { formasDeLaTendencia } from './formasDeLaTendencia.ts';

/**
 * La línea de las cifras con huecos: la de Ventas · 7 días de Richi (25-sep), con
 * dos días seguidos, un hueco, un día suelto y otro hueco hasta hoy.
 */
const DE_RICHI = [1420, 1180, null, 1310, null, null, null];

describe('las formas de la tendencia', () => {
  it('un día suelto va con su punto, fuera del dibujo que se estira', () => {
    const formas = formasDeLaTendencia(DE_RICHI, 52);
    // Antes era un círculo dentro del SVG estirado: una raya corta, que parecía un fallo.
    expect(formas?.puntos.map((p) => p.i)).toEqual([3]);
    expect(formas?.puntos[0]?.x).toBe(50);
  });

  it('los días seguidos van enteros, y el hueco en discontinuo', () => {
    const formas = formasDeLaTendencia(DE_RICHI, 52);
    expect(formas?.tramos).toHaveLength(1);
    expect(formas?.puentes).toHaveLength(1);
    // El puente va del último día con dato al siguiente: del 1 al 3.
    expect(formas?.puentes[0]).toMatch(/^M16\.67,[\d.]+ L50\.00,[\d.]+$/);
  });

  it('el área va de lado a lado de lo que tiene dato, sin bajar a cero en el hueco', () => {
    const area = formasDeLaTendencia(DE_RICHI, 52)?.area ?? '';
    // Tres puntos con dato y los dos del suelo: ni uno más.
    expect(area.match(/[ML]/g)).toHaveLength(5);
  });

  it('sin huecos no hay puentes, y solo se marca el último', () => {
    const formas = formasDeLaTendencia([1, 2, 3, 4], 32);
    expect(formas?.puentes).toEqual([]);
    expect(formas?.puntos.map((p) => p.i)).toEqual([3]);
  });

  it('sin dato, o con un solo día, no hay línea', () => {
    expect(formasDeLaTendencia([null, null], 32)).toBeNull();
    expect(formasDeLaTendencia([5], 32)).toBeNull();
  });
});
