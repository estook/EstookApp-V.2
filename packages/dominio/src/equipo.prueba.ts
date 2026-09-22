import { describe, expect, it } from 'vitest';
import { MARGEN_DE_RETRASO_DE_FABRICA, MARGENES_DE_RETRASO, llegoTarde } from './equipo.ts';

describe('llegar tarde (0040)', () => {
  it('de fábrica, cinco minutos', () => {
    expect(MARGEN_DE_RETRASO_DE_FABRICA).toBe(5);
    expect(MARGENES_DE_RETRASO).toContain(MARGEN_DE_RETRASO_DE_FABRICA);
  });

  it('es retraso pasar del margen, no llegar a él', () => {
    // Turno de las 9:00 y cinco minutos: las 9:05 es a tiempo; las 9:06, tarde.
    expect(llegoTarde(5, 5)).toBe(false);
    expect(llegoTarde(6, 5)).toBe(true);
  });

  it('llegar antes nunca es retraso', () => {
    expect(llegoTarde(-20, 5)).toBe(false);
    expect(llegoTarde(-1, 0)).toBe(false);
  });

  it('sin margen, un minuto ya es tarde', () => {
    expect(llegoTarde(0, 0)).toBe(false);
    expect(llegoTarde(1, 0)).toBe(true);
  });

  it('un margen negativo no convierte en tarde a quien llega a su hora', () => {
    expect(llegoTarde(0, -10)).toBe(false);
  });
});
