import { describe, expect, it } from 'vitest';
import { hastaCuandoEstaAgotado, sigueAgotado } from './agotado.ts';
import { horaDeCorte } from './tiempo.ts';

const MADRID = 'Europe/Madrid';
const CINCO = horaDeCorte('05:00');

describe('hasta cuándo está agotado', () => {
  it('marcado a las 22:00 vuelve al empezar la jornada siguiente, a las 05:00', () => {
    // 20-oct-2026 a las 22:00 en Madrid (horario de verano: UTC+2).
    const hasta = hastaCuandoEstaAgotado(
      new Date('2026-10-20T20:00:00Z'),
      MADRID,
      CINCO,
      'jornada',
    );
    expect(hasta?.toISOString()).toBe('2026-10-21T03:00:00.000Z');
  });

  it('marcado a las 02:30 es aún la jornada de ayer: vuelve esa misma mañana a las 05:00', () => {
    const hasta = hastaCuandoEstaAgotado(
      new Date('2026-10-21T00:30:00Z'),
      MADRID,
      CINCO,
      'jornada',
    );
    expect(hasta?.toISOString()).toBe('2026-10-21T03:00:00.000Z');
  });

  it('el día del cambio de hora, vuelve a las 05:00 de la hora nueva', () => {
    // Sábado 24-oct a las 23:00 (UTC+2); el domingo 25 ya es UTC+1.
    const hasta = hastaCuandoEstaAgotado(
      new Date('2026-10-24T21:00:00Z'),
      MADRID,
      CINCO,
      'jornada',
    );
    expect(hasta?.toISOString()).toBe('2026-10-25T04:00:00.000Z');
  });

  it('sin fecha no vuelve solo', () => {
    expect(
      hastaCuandoEstaAgotado(new Date('2026-10-20T20:00:00Z'), MADRID, CINCO, 'sin_fecha'),
    ).toBeNull();
    expect(sigueAgotado(null, new Date('2099-01-01T00:00:00Z'))).toBe(true);
  });

  it('pasado su instante ya no está agotado', () => {
    const hasta = new Date('2026-10-21T03:00:00Z');
    expect(sigueAgotado(hasta, new Date('2026-10-21T02:59:59Z'))).toBe(true);
    expect(sigueAgotado(hasta, new Date('2026-10-21T03:00:00Z'))).toBe(false);
  });
});
