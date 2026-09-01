import { describe, expect, it } from 'vitest';
import { centimos, desdeEuros } from './dinero.ts';
import {
  cantidad,
  comoPrecioPorUnidad,
  costeDeLinea,
  costeDeLineaDesdeCompra,
  costePorUnidadDeUso,
  milesimas,
  precioMedioPonderado,
  valorDeLasExistencias,
} from './coste.ts';

/** El ejemplo que trae la propia Auditoria de flujos. */
const CAJA_DE_ACEITE = { factor: 3000, rendimiento: 0.85 };

describe('coste por unidad de uso', () => {
  it('reproduce el ejemplo del documento: caja de 3 kg, 85 % de rendimiento', () => {
    // 10 € ÷ (3.000 g × 0,85) = 0,0039 €/g
    const coste = costePorUnidadDeUso(desdeEuros(10), CAJA_DE_ACEITE);
    expect(comoPrecioPorUnidad(coste, 'g')).toBe('0,0039 €/g');
  });

  it('sin factor ni rendimiento, el precio es el precio', () => {
    const coste = costePorUnidadDeUso(desdeEuros(2.5), { factor: 1, rendimiento: 1 });
    expect(coste).toBe(250_000);
  });

  it('el rendimiento encarece: lo que se tira lo pagan los que quedan', () => {
    const entero = costePorUnidadDeUso(desdeEuros(10), { factor: 1000, rendimiento: 1 });
    const conMerma = costePorUnidadDeUso(desdeEuros(10), { factor: 1000, rendimiento: 0.5 });
    expect(conMerma).toBe(entero * 2);
  });

  it('rechaza un factor o un rendimiento imposibles', () => {
    expect(() => costePorUnidadDeUso(desdeEuros(10), { factor: 0, rendimiento: 1 })).toThrow(
      /factor/i,
    );
    expect(() => costePorUnidadDeUso(desdeEuros(10), { factor: 100, rendimiento: 0 })).toThrow(
      /rendimiento/i,
    );
    expect(() => costePorUnidadDeUso(desdeEuros(10), { factor: 100, rendimiento: 1.5 })).toThrow(
      /rendimiento/i,
    );
  });
});

describe('coste de una linea de escandallo', () => {
  it('235 g de ese aceite', () => {
    const coste = costePorUnidadDeUso(desdeEuros(10), CAJA_DE_ACEITE);
    expect(costeDeLinea(coste, cantidad(235))).toBe(92);
  });

  it('el atajo desde la compra da lo mismo, sin redondeo intermedio', () => {
    const porPasos = costeDeLinea(
      costePorUnidadDeUso(desdeEuros(10), CAJA_DE_ACEITE),
      cantidad(235),
    );
    const directo = costeDeLineaDesdeCompra(desdeEuros(10), CAJA_DE_ACEITE, cantidad(235));
    expect(directo).toBe(porPasos);
  });

  it('con cantidades muy pequenas no se va a cero', () => {
    // 2 g de azafran a 3.000 € el kilo.
    const azafran = costePorUnidadDeUso(desdeEuros(3000), { factor: 1000, rendimiento: 1 });
    expect(costeDeLinea(azafran, cantidad(2))).toBe(600);
  });

  it('una racion entera de un plato de veinte ingredientes cuadra', () => {
    // Veinte lineas de 5 centimos cada una: 1 euro clavado, sin desvio.
    const linea = milesimas(5000);
    const total = Array.from({ length: 20 }, () => costeDeLinea(linea, cantidad(1))).reduce<number>(
      (s, x) => s + x,
      0,
    );
    expect(total).toBe(100);
  });
});

describe('precio medio ponderado', () => {
  it('la primera entrada manda', () => {
    const medio = precioMedioPonderado(
      { cantidad: cantidad(0), coste: milesimas(0) },
      { cantidad: cantidad(10), coste: milesimas(200_000) },
    );
    expect(medio).toBe(200_000);
  });

  it('mezcla en proporcion a lo que hay de cada', () => {
    // 10 kg a 2 €/kg y entran 10 kg a 4 €/kg -> 3 €/kg
    const medio = precioMedioPonderado(
      { cantidad: cantidad(10), coste: milesimas(200_000) },
      { cantidad: cantidad(10), coste: milesimas(400_000) },
    );
    expect(medio).toBe(300_000);
  });

  it('un albaran caro sobre mucho stock apenas mueve el medio', () => {
    // Es justo para lo que existe: que el margen no salte con cada albaran.
    const medio = precioMedioPonderado(
      { cantidad: cantidad(100), coste: milesimas(200_000) },
      { cantidad: cantidad(1), coste: milesimas(1_000_000) },
    );
    // Sube de 2,00 a 2,079 €/kg, no a 4.
    expect(medio).toBe(207_921);
  });

  it('una entrada de cero no cambia nada', () => {
    const antes = { cantidad: cantidad(10), coste: milesimas(200_000) };
    expect(precioMedioPonderado(antes, { cantidad: cantidad(0), coste: milesimas(999) })).toBe(
      200_000,
    );
  });

  it('no admite entradas negativas', () => {
    expect(() =>
      precioMedioPonderado(
        { cantidad: cantidad(10), coste: milesimas(1) },
        { cantidad: cantidad(-1), coste: milesimas(1) },
      ),
    ).toThrow(/negativa/i);
  });
});

describe('valor de lo que hay en camara', () => {
  it('cantidad por su coste medio', () => {
    const valor = valorDeLasExistencias({ cantidad: cantidad(12.5), coste: milesimas(200_000) });
    expect(valor).toBe(centimos(2500));
  });
});

describe('cantidades', () => {
  it('se guardan con cuatro decimales', () => {
    expect(cantidad(1.23456789)).toBe(1.2346);
    expect(cantidad(0.00004)).toBe(0);
  });
});
