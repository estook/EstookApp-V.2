import { describe, expect, it } from 'vitest';
import { tocaPreguntar } from './emitir.ts';

const MINUTO = 60_000;

/** Lo que vio Richi en IKATZ el 6-nov: Hacienda lo tenía y Estook seguía en «En Hacienda». */
describe('cuándo se pregunta por lo que sigue pendiente (prueba 17)', () => {
  it('en cada latido hasta los cinco minutos', () => {
    expect(tocaPreguntar(1.5 * MINUTO)).toBe(false);
    for (const m of [2, 3, 4, 5]) expect(tocaPreguntar((m + 0.5) * MINUTO)).toBe(true);
  });

  it('luego, cada cinco; y desde la hora, cada hora', () => {
    expect(tocaPreguntar(6.5 * MINUTO)).toBe(false);
    expect(tocaPreguntar(10.5 * MINUTO)).toBe(true);
    expect(tocaPreguntar(59.5 * MINUTO)).toBe(false);
    expect(tocaPreguntar(60.5 * MINUTO)).toBe(true);
    expect(tocaPreguntar(75.5 * MINUTO)).toBe(false);
  });

  it('un latido que se retrasa no se salta la pregunta de la hora', () => {
    // A los 59:59 todavía no toca, y el siguiente latido llega a los 61:01.
    expect(tocaPreguntar(61.02 * MINUTO)).toBe(true);
  });
});
