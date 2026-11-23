import { describe, expect, it } from 'vitest';
import { centimos } from './dinero.ts';
import {
  foodCostReal,
  laBrechaDelFoodCost,
  loQueSeEscapa,
  loQueSeEscapaDeUnProducto,
  seSaleDelMargen,
  type CuentaDelFoodCost,
} from './desviacion.ts';

/**
 * M20 · 2 (0151): lo que se escapa y el food cost de tus escandallos. Las cifras son las de la
 * maqueta (`docs/maquetas/m20-2-lo-que-se-escapa.html`), para que lo que se enseñó sea lo que sale.
 */

// 9,80 €/kg, 1,62 €/l y 24,50 €/kg, en milésimas de céntimo por unidad de uso.
const CARNE = 980_000;
const CERVEZA = 162_000;
const PULPO = 2_450_000;

describe('lo que se escapa de un producto', () => {
  it('es lo gastado menos lo que el libro sabe por qué salió', () => {
    // Había 6 kg, entraron 10, quedan 0,10: se gastaron 15,90. El libro sabe de 14,20.
    const carne = loQueSeEscapaDeUnProducto({
      id: 'carne',
      gastado: 15.9,
      apuntado: 14.2,
      costeMilesimas: CARNE,
    });
    expect(carne.falta).toBe(1.7);
    expect(carne.debiaSalir).toBe(14.2);
    expect(carne.centimos).toBe(1666);
    expect(carne.parte).toBe(0.1197);
    expect(carne.seSale).toBe(true);
  });

  it('lo que sobra no se sale nunca, valga lo que valga', () => {
    const sobra = loQueSeEscapaDeUnProducto({
      id: 'atun',
      gastado: 8,
      apuntado: 10,
      costeMilesimas: PULPO,
    });
    expect(sobra.falta).toBe(-2);
    expect(sobra.centimos).toBe(-4900);
    expect(sobra.seSale).toBe(false);
  });

  it('sin nada apuntado, la parte no existe y no se divide entre cero', () => {
    const p = loQueSeEscapaDeUnProducto({
      id: 'x',
      gastado: 1,
      apuntado: 0,
      costeMilesimas: CARNE,
    });
    expect(p.parte).toBeNull();
    expect(p.seSale).toBe(true);
  });
});

describe('el margen: hasta un 5 % o 5 €, nadie pesa al gramo', () => {
  it('justo el 5 % es normal; un poco más, no', () => {
    expect(seSaleDelMargen(0.5, 10, centimos(10_000))).toBe(false);
    expect(seSaleDelMargen(0.51, 10, centimos(10_000))).toBe(true);
  });

  it('por debajo de 5 € no se enseña, aunque sea mucho porcentaje', () => {
    // 30 g de perejil de 100 g: un 30 %, pero 0,60 €.
    expect(seSaleDelMargen(0.03, 0.1, centimos(60))).toBe(false);
    expect(seSaleDelMargen(0.03, 0.1, centimos(499))).toBe(false);
    expect(seSaleDelMargen(0.03, 0.1, centimos(500))).toBe(true);
  });

  it('sin precio, manda solo el porcentaje', () => {
    expect(seSaleDelMargen(1, 10, null)).toBe(true);
    expect(seSaleDelMargen(0.4, 10, null)).toBe(false);
  });

  it('si no falta nada, nada', () => {
    expect(seSaleDelMargen(0, 10, centimos(0))).toBe(false);
  });
});

describe('lo que se escapa del almacén (la maqueta)', () => {
  const productos = [
    { id: 'pulpo', gastado: 7.02, apuntado: 6.4, costeMilesimas: PULPO },
    { id: 'carne', gastado: 15.9, apuntado: 14.2, costeMilesimas: CARNE },
    { id: 'cerveza', gastado: 127.4, apuntado: 118, costeMilesimas: CERVEZA },
    // Dentro del margen: un 2 %.
    { id: 'tomate', gastado: 10.2, apuntado: 10, costeMilesimas: 250_000 },
    // Un 20 %, pero 1,50 €.
    { id: 'perejil', gastado: 0.6, apuntado: 0.5, costeMilesimas: 1_500_000 },
  ];

  it('solo salen los que se salen del margen, el que más dinero se lleva primero', () => {
    const escapa = loQueSeEscapa(productos);
    expect(escapa.vigilados).toBe(5);
    expect(escapa.seSalen.map((p) => [p.id, p.falta, p.centimos])).toEqual([
      ['carne', 1.7, 1666],
      ['cerveza', 9.4, 1523],
      ['pulpo', 0.62, 1519],
    ]);
    // La suma es la de las filas: 16,66 + 15,23 + 15,19.
    expect(escapa.centimos).toBe(4708);
  });

  it('sin precios, se ordena por la parte que falta y no hay suma', () => {
    const escapa = loQueSeEscapa(productos.map((p) => ({ ...p, costeMilesimas: null })));
    expect(escapa.seSalen.map((p) => p.id)).toEqual(['perejil', 'carne', 'pulpo', 'cerveza']);
    expect(escapa.centimos).toBeNull();
  });

  it('sin nada vigilado, nada se sale', () => {
    expect(loQueSeEscapa([])).toEqual({ vigilados: 0, seSalen: [], centimos: 0 });
  });
});

describe('el food cost de tus escandallos, junto al real', () => {
  // El mes de la maqueta: 4.212,40 € en género de 13.540,00 € sin IVA (14.894,00 € con el 10 %).
  const cuenta: CuentaDelFoodCost = {
    habia: 300_000,
    compras: 421_240,
    queda: 300_000,
    traspasos: 0,
    aparte: 0,
    ventasConImpuesto: 1_489_400,
    tipoDeImpuesto: 0.1,
    diasDelPeriodo: 22,
    diasConCaja: 22,
  };
  const real = foodCostReal(cuenta);

  it('la maqueta: 31,1 % frente a 27,6 %, 3,5 puntos y 476,62 €', () => {
    expect(real.real).toBe(31.1);
    const brecha = laBrechaDelFoodCost(real, {
      coste: 343_780,
      ventasConCoste: 1_246_000,
      ventas: 1_354_000,
    });
    expect(brecha).toEqual({
      coste: 343_780,
      ventasConCoste: 1_246_000,
      ventas: 1_354_000,
      teorico: 27.6,
      parteConEscandallo: 0.9202,
      puntos: 3.5,
      centimos: 47_662,
      dentroDeLoNormal: false,
    });
  });

  it('3 puntos justos es lo normal, por arriba y por abajo', () => {
    // 2.000 € de 10.000 €: 20,0 % real. Escandallos al 17,0 % y al 23,0 %.
    const veinte = foodCostReal({
      ...cuenta,
      compras: 200_000,
      ventasConImpuesto: 1_100_000,
    });
    expect(veinte.real).toBe(20);
    const arriba = laBrechaDelFoodCost(veinte, {
      coste: 170_000,
      ventasConCoste: 1_000_000,
      ventas: 1_000_000,
    });
    expect(arriba?.puntos).toBe(3);
    expect(arriba?.dentroDeLoNormal).toBe(true);
    const abajo = laBrechaDelFoodCost(veinte, {
      coste: 231_000,
      ventasConCoste: 1_000_000,
      ventas: 1_000_000,
    });
    expect(abajo?.puntos).toBe(-3.1);
    expect(abajo?.dentroDeLoNormal).toBe(false);
  });

  it('sin nada vendido con escandallo no hay con qué comparar', () => {
    expect(laBrechaDelFoodCost(real, { coste: 0, ventasConCoste: 0, ventas: 50_000 })).toBeNull();
  });

  it('sin ventas en la caja, el de los escandallos y nada más', () => {
    const sinCaja = foodCostReal({ ...cuenta, ventasConImpuesto: 0 });
    expect(
      laBrechaDelFoodCost(sinCaja, { coste: 2_000, ventasConCoste: 10_000, ventas: 10_000 }),
    ).toEqual({
      coste: 2_000,
      ventasConCoste: 10_000,
      ventas: 10_000,
      teorico: 20,
      parteConEscandallo: 1,
      puntos: null,
      centimos: null,
      dentroDeLoNormal: null,
    });
  });

  it('si no cuadra el real (gasto en negativo), tampoco se compara', () => {
    const negativo = foodCostReal({ ...cuenta, compras: -10_000 });
    expect(negativo.consumoReal).toBeLessThan(0);
    expect(
      laBrechaDelFoodCost(negativo, { coste: 2_000, ventasConCoste: 10_000, ventas: 10_000 })
        ?.puntos,
    ).toBeNull();
  });
});
