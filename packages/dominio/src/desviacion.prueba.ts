import { describe, expect, it } from 'vitest';
import {
  causaProbable,
  cuadra,
  faltaComoParaAvisar,
  foodCostReal,
  jornadasEntre,
  loGastado,
  primeraJornadaTrasContar,
  type CuentaDelFoodCost,
  type LoQueSeSabeDeLaDesviacion,
} from './desviacion.ts';
import { horaDeCorte, type FechaOperativa } from './tiempo.ts';

const fecha = (texto: string) => texto as FechaOperativa;
const CORTE = horaDeCorte('05:00');

describe('lo gastado de verdad', () => {
  it('es lo que había + lo que entró − lo que queda (el pulpo del plan)', () => {
    // Entre dos lunes había 10 kg, entraron 12 y quedan 8: se gastaron 14.
    expect(loGastado(10, 12, 8)).toBe(14);
  });

  it('negativo es que sobra', () => {
    expect(loGastado(5, 0, 6)).toBe(-1);
  });

  it('un 2 % de lo gastado cuadra; más, no', () => {
    expect(cuadra(0.2, 14)).toBe(true);
    expect(cuadra(0.3, 14)).toBe(false);
    expect(cuadra(0, 0)).toBe(true);
  });
});

describe('qué días de caja van con cada inventario', () => {
  it('contar por la mañana es contar antes de abrir: las ventas del día van después', () => {
    // Lunes 12-oct a las 08:00 en Madrid (06:00 UTC).
    expect(primeraJornadaTrasContar(new Date('2026-10-12T06:00:00Z'), 'Europe/Madrid', CORTE)).toBe(
      '2026-10-12',
    );
  });

  it('contar de noche es contar después: las ventas del día van antes', () => {
    // Lunes 12-oct a las 23:30 en Madrid.
    expect(primeraJornadaTrasContar(new Date('2026-10-12T21:30:00Z'), 'Europe/Madrid', CORTE)).toBe(
      '2026-10-13',
    );
  });

  it('contar de madrugada, después de cerrar, es de la jornada de antes y va después de ella', () => {
    // Martes 13-oct a las 03:00 en Madrid: jornada del lunes, ya cerrada.
    expect(primeraJornadaTrasContar(new Date('2026-10-13T01:00:00Z'), 'Europe/Madrid', CORTE)).toBe(
      '2026-10-13',
    );
  });

  it('las jornadas entre dos días, sin el último', () => {
    expect(jornadasEntre(fecha('2026-10-12'), fecha('2026-10-15'))).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ]);
    expect(jornadasEntre(fecha('2026-10-12'), fecha('2026-10-12'))).toEqual([]);
  });
});

describe('el food cost real (Manifiesto 12, hallazgo 3)', () => {
  const cuenta: CuentaDelFoodCost = {
    habia: 120_000,
    compras: 80_000,
    queda: 110_000,
    traspasos: 2_000,
    aparte: 5_000,
    ventasConImpuesto: 330_000,
    tipoDeImpuesto: 0.1,
    diasDelPeriodo: 7,
    diasConCaja: 7,
  };

  it('(había + compras − queda − traspasos − aparte) ÷ ventas sin IVA', () => {
    const real = foodCostReal(cuenta);
    // 1.200 + 800 − 1.100 − 20 − 50 = 830 €; 3.300 con IVA son 3.000 sin él: 27,7 %.
    expect(real.consumoReal).toBe(83_000);
    expect(real.ventasSinImpuesto).toBe(300_000);
    expect(real.real).toBe(27.7);
    expect(real.exacto).toBe(true);
  });

  it('con días sin caja no se da por exacto, y dice cuántos faltan', () => {
    const real = foodCostReal({ ...cuenta, diasConCaja: 4 });
    expect(real.faltanDiasDeCaja).toBe(3);
    expect(real.exacto).toBe(false);
  });

  it('sin saber el impuesto, ni sin ventas, no hay porcentaje: no se inventa', () => {
    expect(foodCostReal({ ...cuenta, tipoDeImpuesto: null }).real).toBeNull();
    expect(foodCostReal({ ...cuenta, ventasConImpuesto: 0 }).real).toBeNull();
  });
});

describe('la causa probable (hallazgo 4)', () => {
  const base: LoQueSeSabeDeLaDesviacion = {
    desviacion: 16,
    gastado: 120,
    unidad: 'ud',
    hay: 40,
    decia: 56,
    factor: 1,
    diasSinCaja: 0,
    otrosNombres: [],
    albaranesConIncidencias: 0,
    entradasAMano: [],
  };

  it('si cuadra, no hay causa', () => {
    expect(causaProbable({ ...base, desviacion: 1 })).toBeNull();
  });

  it('la Coca-Cola del plan: faltan 16 y no hay otra explicación', () => {
    const causa = causaProbable(base);
    expect(causa?.causa).toBe('sin_apuntar');
    expect(causa?.porque).toBe(
      'Faltan 16 ud: lo más probable, comida del personal, invitaciones o roturas sin apuntar.',
    );
  });

  it('contado en cajas donde iban unidades', () => {
    // Cajas de 24: se escribió 2 donde había 48.
    expect(causaProbable({ ...base, desviacion: 46, hay: 2, decia: 48, factor: 24 })?.causa).toBe(
      'unidad_de_conteo',
    );
  });

  it('sobra: entró sin apuntarse', () => {
    expect(causaProbable({ ...base, desviacion: -10 })?.causa).toBe('entrada_sin_apuntar');
  });

  it('faltan días de caja antes que culpar a nadie', () => {
    expect(causaProbable({ ...base, diasSinCaja: 2 })?.porque).toBe(
      'Faltan 2 días de caja: lo vendido esos días no está en la cuenta.',
    );
  });

  it('se vende con otro nombre en la caja', () => {
    expect(causaProbable({ ...base, otrosNombres: ['Coca Cola Zero'] })?.porque).toBe(
      'En la caja hay «Coca Cola Zero» sin emparejar: si es este producto, emparéjalo y se cuenta.',
    );
  });

  it('una entrada a mano que coincide con lo que falta', () => {
    expect(causaProbable({ ...base, entradasAMano: [24, 15] })?.causa).toBe('recepcion');
  });

  it('un albarán con incidencias', () => {
    expect(causaProbable({ ...base, albaranesConIncidencias: 1 })?.causa).toBe('recepcion');
  });
});

describe('el aviso al cerrar: desde un 3 % de lo gastado', () => {
  it('64 € de 1.000 avisa; 20 € no', () => {
    expect(faltaComoParaAvisar(6_400, 100_000)).toBe(true);
    expect(faltaComoParaAvisar(2_000, 100_000)).toBe(false);
    expect(faltaComoParaAvisar(0, 0)).toBe(false);
  });
});
