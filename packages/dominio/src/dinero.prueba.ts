import { describe, expect, it } from 'vitest';
import {
  centimos,
  conSimbolo,
  desdeEuros,
  enEuros,
  porCantidad,
  porFraccion,
  repartir,
  repartirEnPartesIguales,
  resta,
  suma,
} from './dinero.ts';

describe('centimos enteros', () => {
  it('rechaza la coma flotante, que es la regla 9', () => {
    expect(() => centimos(12.5)).toThrow(/centimos enteros/i);
  });

  it('convierte euros a centimos al entrar', () => {
    expect(desdeEuros(1.6)).toBe(160);
    expect(desdeEuros(0.01)).toBe(1);
    expect(desdeEuros(1234.56)).toBe(123456);
  });

  it('no se come el centimo de los numeros que la coma flotante representa mal', () => {
    // 8,115 en binario es 8,114999..., y un redondeo directo daria 811.
    expect(desdeEuros(8.115)).toBe(812);
    expect(desdeEuros(1.005)).toBe(101);
    expect(desdeEuros(2.675)).toBe(268);
  });

  it('sumar tres decimas no se desvia, que es de lo que protege la regla', () => {
    // En coma flotante 0.1 + 0.2 !== 0.3. En centimos no hay discusion.
    expect(suma(desdeEuros(0.1), desdeEuros(0.2))).toBe(desdeEuros(0.3));
  });

  it('resta y admite negativos, porque un abono lo es', () => {
    expect(resta(centimos(500), centimos(750))).toBe(-250);
  });
});

describe('multiplicar', () => {
  it('por una cantidad con decimales, como los gramos de una ficha', () => {
    // 0,39 €/100 g × 235 g
    expect(porCantidad(centimos(39), 2.35)).toBe(92);
  });

  it('por una fraccion, como un tipo impositivo', () => {
    expect(porFraccion(centimos(1000), 0.21)).toBe(210);
    expect(porFraccion(centimos(160), 0.1)).toBe(16);
  });

  it('redondea al centimo mas cercano, ni al alza ni a la baja siempre', () => {
    expect(porFraccion(centimos(101), 0.5)).toBe(51);
    expect(porFraccion(centimos(103), 0.5)).toBe(52);
  });
});

describe('repartir sin perder ni ganar un centimo', () => {
  it('lo que sobra va siempre a la primera linea', () => {
    // 10 centimos entre 3 no cabe exacto: 4 + 3 + 3.
    expect(repartirEnPartesIguales(centimos(10), 3)).toEqual([4, 3, 3]);
  });

  it('la suma de las partes es siempre el total, pase lo que pase', () => {
    for (const total of [1, 7, 100, 101, 999, 1234, 100000]) {
      for (const partes of [1, 2, 3, 7, 11, 13]) {
        const reparto = repartirEnPartesIguales(centimos(total), partes);
        const sumado = reparto.reduce<number>((s, x) => s + x, 0);
        expect(sumado, `${total} entre ${partes}`).toBe(total);
        expect(reparto).toHaveLength(partes);
      }
    }
  });

  it('reparte proporcionalmente a unos pesos, como un prorrateo', () => {
    // 100 € entre tres platos que pesan 1, 2 y 3.
    expect(repartir(centimos(10000), [1, 2, 3])).toEqual([1667, 3333, 5000]);
  });

  it('la suma tambien cuadra con pesos raros', () => {
    const reparto = repartir(centimos(1000), [0.333, 0.333, 0.334]);
    expect(reparto.reduce<number>((s, x) => s + x, 0)).toBe(1000);
  });

  it('es determinista: dos ejecuciones dan lo mismo', () => {
    const una = repartir(centimos(9999), [7, 3, 11, 2]);
    const otra = repartir(centimos(9999), [7, 3, 11, 2]);
    expect(una).toEqual(otra);
  });

  it('sin pesos, a partes iguales', () => {
    expect(repartir(centimos(10), [0, 0, 0])).toEqual([4, 3, 3]);
  });

  it('no se reparte entre cero', () => {
    expect(() => repartir(centimos(100), [])).toThrow(/cero partes/i);
  });

  it('ni con pesos negativos', () => {
    expect(() => repartir(centimos(100), [1, -1])).toThrow(/negativos/i);
  });
});

describe('presentar', () => {
  it('en euros, con coma decimal y punto de millares, que es lo de aqui', () => {
    expect(enEuros(centimos(160))).toBe('1,60');
    expect(enEuros(centimos(5))).toBe('0,05');
    expect(enEuros(centimos(123456))).toBe('1.234,56');
    expect(enEuros(centimos(100000000))).toBe('1.000.000,00');
  });

  it('los negativos llevan el signo delante', () => {
    expect(enEuros(centimos(-250))).toBe('-2,50');
  });

  it('con el simbolo detras y con espacio, como se escribe en Espana', () => {
    expect(conSimbolo(centimos(160))).toBe('1,60 €');
  });
});
