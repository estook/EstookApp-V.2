import { describe, expect, it } from 'vitest';
import { deEurosACentimos, enLaCasilla } from './dinero.ts';

describe('lo que se escribe en euros (0144)', () => {
  it('perdona el punto de los miles y la coma o el punto de los céntimos', () => {
    expect(deEurosACentimos('1.284,60')).toBe(128460);
    expect(deEurosACentimos('1284,60')).toBe(128460);
    expect(deEurosACentimos('1284.60')).toBe(128460);
    expect(deEurosACentimos('50')).toBe(5000);
    expect(deEurosACentimos('50,5')).toBe(5050);
    expect(deEurosACentimos(' 35 € ')).toBe(3500);
  });

  it('lo que no es un importe, nulo', () => {
    expect(deEurosACentimos('')).toBeNull();
    expect(deEurosACentimos('doce')).toBeNull();
    expect(deEurosACentimos('12,345')).toBeNull();
    expect(deEurosACentimos('-5')).toBeNull();
  });

  it('en la casilla, con coma y dos decimales', () => {
    expect(enLaCasilla(128460)).toBe('1.284,60');
    expect(deEurosACentimos(enLaCasilla(128460))).toBe(128460);
    expect(enLaCasilla(5)).toBe('0,05');
  });
});
