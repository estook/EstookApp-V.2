import { describe, expect, it } from 'vitest';
import {
  PLANTILLAS_DE_SALA,
  alIman,
  dentroDelPlano,
  elGiroConIman,
  elNombreDeLaSiguiente,
  lasGuias,
  loQuePoneLaPlantilla,
  tamanoDeLaMesa,
  unSitioLibre,
} from './plano.ts';

/** El plano dibujado a ojo en Estook TPV (T2, Anexo 11.9 y 11.15). */
describe('el plano', () => {
  it('una mesa de 6 plazas nace más grande que una de 2, sin escribir un número', () => {
    for (const forma of ['cuadrada', 'redonda', 'rectangular', 'ovalada', 'alargada'] as const) {
      const de2 = tamanoDeLaMesa(forma, 2);
      const de6 = tamanoDeLaMesa(forma, 6);
      expect(de6.ancho * de6.fondo, forma).toBeGreaterThan(de2.ancho * de2.fondo);
    }
  });

  it('la cuadrada se ve cuadrada en un plano apaisado (16:10)', () => {
    const { ancho, fondo } = tamanoDeLaMesa('cuadrada', 4);
    expect(fondo / ancho).toBeCloseTo(1.6, 1);
  });

  it('el giro se queda solo en 0°, 45° y 90° si se pasa cerca, y si no, donde se suelta', () => {
    expect(elGiroConIman(3)).toBe(0);
    expect(elGiroConIman(-4)).toBe(0);
    expect(elGiroConIman(358)).toBe(0);
    expect(elGiroConIman(48)).toBe(45);
    expect(elGiroConIman(93)).toBe(90);
    expect(elGiroConIman(30)).toBe(30);
    expect(elGiroConIman(450)).toBe(90);
  });

  it('el imán pega a la rejilla, y lo puesto en la esquina no se sale', () => {
    expect(alIman(123)).toBe(120);
    expect(alIman(126)).toBe(130);
    expect(dentroDelPlano({ x: 990, y: -20, ancho: 120, fondo: 192 })).toEqual({
      x: 880,
      y: 0,
      ancho: 120,
      fondo: 192,
    });
  });

  it('las guías la ponen en fila con la de al lado', () => {
    const otra = { x: 100, y: 100, ancho: 120, fondo: 192 };
    const { x, y, guias } = lasGuias({ x: 300, y: 105, ancho: 120, fondo: 192 }, [otra]);
    expect(y).toBe(100);
    expect(x).toBe(300);
    expect(guias).toContainEqual({ eje: 'y', en: 100 });
  });

  it('la mesa nueva nace con el número siguiente, contando todas las salas', () => {
    expect(elNombreDeLaSiguiente(['1', '2', '12', 'Terraza 3'])).toBe('13');
    expect(elNombreDeLaSiguiente([])).toBe('1');
    expect(elNombreDeLaSiguiente(['A', 'B'])).toBe('3');
  });

  it('un sitio libre no pisa lo que ya hay', () => {
    const tamano = tamanoDeLaMesa('cuadrada', 4);
    const sitio = unSitioLibre(tamano, [{ x: 40, y: 40, ...tamano }]);
    expect(sitio).not.toEqual({ x: 40, y: 40 });
  });

  it('cada plantilla cabe en el plano y sus mesas siguen a las que ya hay', () => {
    for (const plantilla of PLANTILLAS_DE_SALA) {
      const puesto = loQuePoneLaPlantilla(plantilla, ['1', '2']);
      const mesas = puesto.filter((c) => c.nombre !== null);
      expect(mesas.length, plantilla.clave).toBeGreaterThan(0);
      expect(mesas[0]?.nombre).toBe('3');
      for (const cosa of puesto) {
        expect(cosa.caja.x + cosa.caja.ancho).toBeLessThanOrEqual(1000);
        expect(cosa.caja.y + cosa.caja.fondo).toBeLessThanOrEqual(1000);
      }
    }
    const bar = PLANTILLAS_DE_SALA.find((p) => p.clave === 'bar');
    expect(bar?.nombre).toBe('Bar con barra y 6 mesas');
  });
});
