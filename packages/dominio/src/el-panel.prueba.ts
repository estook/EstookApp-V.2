import { describe, expect, it } from 'vitest';
import {
  dondeDeberiasIr,
  elCanalDeLaCuenta,
  elObjetivoDelDia,
  laParteDelDiaQueSueleIrVendida,
  laPrevisionDelCierre,
  losPesosDeLaSemana,
  elLunesDe,
  type DiaDeLaSemana,
  type VentaDelDia,
} from './el-panel.ts';

/** Semanas enteras desde un lunes, con lo que vende cada día de lunes a domingo. */
function semanas(lunes: string, cuantas: number, deCadaDia: readonly number[]): VentaDelDia[] {
  const dias: VentaDelDia[] = [];
  const inicio = new Date(`${lunes}T12:00:00Z`);
  for (let s = 0; s < cuantas; s += 1) {
    for (let d = 0; d < 7; d += 1) {
      const fecha = new Date(inicio);
      fecha.setUTCDate(inicio.getUTCDate() + s * 7 + d);
      dias.push({
        fecha: fecha.toISOString().slice(0, 10),
        diaDeLaSemana: (d + 1) as DiaDeLaSemana,
        ventas: deCadaDia[d] ?? 0,
      });
    }
  }
  return dias;
}

describe('el objetivo de hoy, repartido por días (0148, entrega 3)', () => {
  it('con historial, cada día pesa lo que vende: el sábado más que el martes', () => {
    // Cerrado el lunes; flojo entre semana y fuerte el fin de semana.
    const pesos = losPesosDeLaSemana(
      semanas('2026-10-05', 4, [0, 1000, 1000, 1500, 2500, 3000, 1000]),
    );
    expect(pesos.reparto).toBe('historial');
    expect(pesos.pesos[0]).toBe(0);
    expect(pesos.pesos.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 10);
    expect(elObjetivoDelDia(1_000_000, pesos, 6)).toBe(300_000);
    expect(elObjetivoDelDia(1_000_000, pesos, 2)).toBe(100_000);
  });

  it('con menos de tres semanas, a partes iguales entre los días que abre', () => {
    const pesos = losPesosDeLaSemana(semanas('2026-11-02', 2, [0, 500, 500, 500, 500, 500, 500]));
    expect(pesos.reparto).toBe('igual');
    expect(pesos.pesos[0]).toBe(0);
    expect(elObjetivoDelDia(600_000, pesos, 3)).toBe(100_000);
  });

  it('sin haber vendido nunca, entre los siete días', () => {
    const pesos = losPesosDeLaSemana([]);
    expect(pesos.reparto).toBe('igual');
    expect(elObjetivoDelDia(700_000, pesos, 1)).toBe(100_000);
  });

  it('un día que no siempre abre se promedia con los que sí: no baja por las semanas cerradas', () => {
    const dias = semanas('2026-10-05', 4, [1000, 1000, 1000, 1000, 1000, 1000, 1000]);
    // Un domingo sin ventas (cerró por vacaciones) no cuenta como un domingo de cero.
    const sinUnDomingo = dias.map((d) => (d.fecha === '2026-10-11' ? { ...d, ventas: 0 } : d));
    const pesos = losPesosDeLaSemana(sinUnDomingo);
    expect(pesos.pesos[6]).toBeCloseTo(1 / 7, 10);
  });
});

describe('la curva del día y la previsión al cierre', () => {
  const curva = [
    { hora: 13, media: 30_000 },
    { hora: 14, media: 30_000 },
    { hora: 21, media: 40_000 },
  ];

  it('a las 14:30 un día normal lleva el 45 %', () => {
    expect(laParteDelDiaQueSueleIrVendida(curva, 14, 30)).toBeCloseTo(0.45, 10);
  });

  it('sin curva no se sabe', () => {
    expect(laParteDelDiaQueSueleIrVendida([], 14, 0)).toBeNull();
  });

  it('prevé con la curva, no con una regla de tres', () => {
    // A las 15:00 lleva 600 €: el 60 % de un día normal. Cerrará en 1.000 €, no en 960 €.
    const parte = laParteDelDiaQueSueleIrVendida(curva, 15, 0);
    expect(laPrevisionDelCierre(60_000, parte, 4)).toBe(100_000);
  });

  it('no prevé sin historial bastante ni antes del 10 % del día', () => {
    expect(laPrevisionDelCierre(60_000, 0.6, 2)).toBeNull();
    expect(laPrevisionDelCierre(5_000, 0.05, 8)).toBeNull();
    expect(laPrevisionDelCierre(0, 0.6, 8)).toBeNull();
  });

  it('nunca prevé menos de lo ya vendido', () => {
    expect(laPrevisionDelCierre(120_000, 1, 8)).toBe(120_000);
  });
});

describe('dónde deberías ir en la semana', () => {
  const pesos = { pesos: [0, 0.1, 0.1, 0.15, 0.25, 0.3, 0.1], reparto: 'historial' as const };

  it('el jueves a media tarde: martes y miércoles enteros y la parte de hoy', () => {
    // 0 + 0,1 + 0,1 + 0,15 × 0,4 = 0,26 de 10.000 €.
    expect(dondeDeberiasIr(1_000_000, pesos, 4, 0.4, 17, 0)).toBe(260_000);
  });

  it('sin curva, la parte de hoy va por el reloj', () => {
    // A las 12:00, medio día de lo que pesa el lunes (que no abre): 0.
    expect(dondeDeberiasIr(1_000_000, pesos, 1, null, 12, 0)).toBe(0);
    expect(dondeDeberiasIr(1_000_000, pesos, 2, null, 12, 0)).toBe(50_000);
  });
});

describe('los canales y las semanas', () => {
  it('cada tipo de cuenta, su canal', () => {
    expect(elCanalDeLaCuenta('mesa')).toBe('sala');
    expect(elCanalDeLaCuenta('barra')).toBe('barra');
    expect(elCanalDeLaCuenta('para_llevar')).toBe('para_llevar');
    expect(elCanalDeLaCuenta('reparto')).toBe('reparto');
  });

  it('el lunes de cualquier día', () => {
    expect(elLunesDe('2026-11-21')).toBe('2026-11-16');
    expect(elLunesDe('2026-11-16')).toBe('2026-11-16');
    expect(elLunesDe('2026-11-22')).toBe('2026-11-16');
  });
});
