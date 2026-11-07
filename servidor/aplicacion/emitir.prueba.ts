import { describe, expect, it } from 'vitest';
import { loQueTocaRepasar, tocaPreguntar, type PorRepasar } from './emitir.ts';

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

describe('qué toca repasar en este latido (0138)', () => {
  const ahora = new Date('2026-11-07T12:00:30Z');
  const hace = (minutos: number) => new Date(ahora.getTime() - minutos * MINUTO).toISOString();

  const pendiente = (id: string, minutos: number): PorRepasar => ({
    id,
    preparadoEn: hace(minutos),
    primerEnvio: hace(minutos),
    ultimoRegistro: hace(minutos),
  });

  it('lo recién hecho se deja a quien lo está mandando: así no se pierde el papel del ticket', () => {
    const recien: PorRepasar = {
      id: 'recien',
      preparadoEn: hace(1),
      primerEnvio: null,
      ultimoRegistro: null,
    };
    expect(loQueTocaRepasar([recien], ahora)).toEqual([]);
  });

  it('cincuenta atascados a los que no les toca no tapan a los demás', () => {
    const atascados = Array.from({ length: 50 }, (_, i) => pendiente(`viejo-${String(i)}`, 90));
    expect(loQueTocaRepasar([...atascados, pendiente('nuevo', 2)], ahora)).toEqual(['nuevo']);
  });

  it('lo que no está registrado va primero, y nunca más de los que caben', () => {
    const sinRegistrar: PorRepasar = {
      id: 'sin-registrar',
      preparadoEn: hace(3),
      primerEnvio: hace(3),
      ultimoRegistro: null,
    };
    const muchos = Array.from({ length: 60 }, (_, i) => pendiente(`p-${String(i)}`, 2));
    const tocan = loQueTocaRepasar([...muchos, sinRegistrar], ahora);
    expect(tocan[0]).toBe('sin-registrar');
    expect(tocan).toHaveLength(50);
  });

  it('lo que no llega a Verifacti se reintenta cada vez menos: cada intento queda apuntado', () => {
    const caido = (minutos: number): PorRepasar => ({
      id: 'caido',
      preparadoEn: hace(minutos),
      primerEnvio: hace(minutos),
      ultimoRegistro: null,
    });
    expect(loQueTocaRepasar([caido(3)], ahora)).toEqual(['caido']);
    expect(loQueTocaRepasar([caido(7)], ahora)).toEqual([]);
    expect(loQueTocaRepasar([caido(10)], ahora)).toEqual(['caido']);
    expect(loQueTocaRepasar([caido(90)], ahora)).toEqual([]);
    expect(loQueTocaRepasar([caido(120)], ahora)).toEqual(['caido']);
  });
});
