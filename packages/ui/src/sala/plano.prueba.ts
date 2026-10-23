import { describe, expect, it } from 'vitest';
import { dentroDelPlano, elSitioDeLaMesa, unSitioLibre } from './plano.ts';

describe('la mesa en el plano', () => {
  it('se pinta en tanto por ciento, donde se puso', () => {
    expect(elSitioDeLaMesa('cuadrada', 300, 200)).toEqual({
      izquierda: 30,
      arriba: 20,
      ancho: 13,
      alto: 16.6,
    });
  });

  it('una puesta en la esquina no se sale', () => {
    expect(dentroDelPlano('alargada', 990, 990)).toEqual({ x: 740, y: 834 });
    expect(dentroDelPlano('redonda', -20, -5)).toEqual({ x: 0, y: 0 });
  });

  it('una mesa nueva no pisa a las que hay', () => {
    expect(unSitioLibre('cuadrada', [])).toEqual({ x: 40, y: 40 });
    expect(unSitioLibre('cuadrada', [{ forma: 'cuadrada', x: 40, y: 40 }])).toEqual({
      x: 210,
      y: 40,
    });
  });
});
