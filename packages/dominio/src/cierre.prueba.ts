import { describe, expect, it } from 'vitest';
import { claveDePlato, importeDeLinea, precioPorUnidad } from './cierre.ts';

/**
 * El importe de cada plato del cierre, propuesto y no pedido (M6½).
 *
 * «Pones el importe de cada plato a mano: poner el que tiene en la carta, y que
 * se pueda cambiar.» Hasta que exista la carta, sale de la última vez que se
 * apuntó ese plato. Estas son las tres piezas de esa cuenta.
 */
describe('el precio de cada plato, sacado del último cierre', () => {
  it('tres raciones por 37,50 € son 12,50 € la ración', () => {
    expect(precioPorUnidad(3750, 3)).toBe(1250);
  });

  it('sin importe o sin unidades no hay precio, y no es cero', () => {
    expect(precioPorUnidad(null, 3)).toBeNull();
    expect(precioPorUnidad(0, 3)).toBeNull();
    expect(precioPorUnidad(1250, 0)).toBeNull();
  });

  it('redondea al céntimo, una sola vez', () => {
    // 10 € entre 3 son 3,333…: se queda en 3,33.
    expect(precioPorUnidad(1000, 3)).toBe(333);
  });
});

describe('y el importe que se propone con él', () => {
  it('cuántos por lo que cuesta cada uno', () => {
    expect(importeDeLinea(1250, 4)).toBe(5000);
  });

  it('con medias raciones, redondeado al céntimo', () => {
    expect(importeDeLinea(1250, 1.5)).toBe(1875);
    expect(importeDeLinea(333, 0.5)).toBe(167);
  });

  it('una cantidad negativa no da un importe negativo', () => {
    expect(importeDeLinea(1250, -2)).toBe(0);
  });
});

describe('el mismo plato, escrito de otra forma', () => {
  it('sin acentos, en minúsculas y sin espacios en los bordes', () => {
    expect(claveDePlato('  Croquetas de JAMÓN ')).toBe('croquetas de jamon');
    expect(claveDePlato('Pulpo á feira')).toBe(claveDePlato('pulpo a feira'));
  });
});
