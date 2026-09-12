import { describe, expect, it } from 'vitest';
import { centimos } from './dinero.ts';
import { comoEstaElMargen, ivaDeVentaPorDefecto, margenDe } from './margen.ts';

describe('lo que se gana con lo que se vende', () => {
  it('el IVA del precio de carta no es margen', () => {
    // Una caña a 2,50 € que cuesta 0,45 €. Lo que entra de verdad son 2,27 €.
    const margen = margenDe(centimos(250), 0.1, centimos(45));
    expect(margen).not.toBeNull();
    expect(margen?.baseCentimos).toBe(227);
    expect(margen?.margenCentimos).toBe(182);
    // Y no 2,05 €, que es lo que sale de restar sin quitar el impuesto.
    expect(margen?.margenCentimos).not.toBe(205);
  });

  it('el margen y el coste del género reparten el cien por cien', () => {
    const margen = margenDe(centimos(1100), 0.1, centimos(300));
    expect(margen).not.toBeNull();
    if (margen === null) return;
    expect(margen.baseCentimos).toBe(1000);
    expect(margen.foodCostPorcentaje).toBeCloseTo(0.3, 6);
    expect(margen.margenPorcentaje + margen.foodCostPorcentaje).toBeCloseTo(1, 6);
  });

  it('vender por debajo de lo que cuesta sale en negativo, no en cero', () => {
    const margen = margenDe(centimos(110), 0.1, centimos(300));
    expect(margen?.margenCentimos).toBe(-200);
    expect(margen === null ? null : comoEstaElMargen(margen)).toBe('mal');
  });

  it('un food cost por encima del 35 % pide mirarlo', () => {
    const justo = margenDe(centimos(1100), 0.1, centimos(350));
    const pasado = margenDe(centimos(1100), 0.1, centimos(360));
    expect(justo === null ? null : comoEstaElMargen(justo)).toBe('bien');
    expect(pasado === null ? null : comoEstaElMargen(pasado)).toBe('atencion');
  });

  it('sin precio no hay margen que enseñar', () => {
    expect(margenDe(centimos(0), 0.1, centimos(45))).toBeNull();
  });

  it('donde no es IVA no se supone un tipo', () => {
    expect(ivaDeVentaPorDefecto('peninsula_y_baleares')).toBe(0.1);
    expect(ivaDeVentaPorDefecto('canarias')).toBeNull();
    expect(ivaDeVentaPorDefecto('ceuta')).toBeNull();
  });
});
