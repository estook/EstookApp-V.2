import { describe, expect, it } from 'vitest';
import { sePuedeTirar } from './merma.ts';

/** Nunca se tira más de lo que hay (23-sep-2026, lo pidió Richi). */
describe('sePuedeTirar', () => {
  it('se puede tirar lo que hay, o menos', () => {
    expect(sePuedeTirar(5, 5, 'kg').sePuede).toBe(true);
    expect(sePuedeTirar(5, 2.5, 'kg').sePuede).toBe(true);
  });

  it('no se puede tirar más, y se dice cuánto queda y cuánto se tira', () => {
    const r = sePuedeTirar(2, 5, 'kg');
    expect(r.sePuede).toBe(false);
    if (r.sePuede) return;
    expect(r.porque).toContain('Quedan 2 kg');
    expect(r.porque).toContain('5 kg');
    expect(r.porque).toContain('inventario');
  });

  it('sin nada en cámara, tampoco, y lo dice de otra forma', () => {
    for (const hay of [0, -3]) {
      const r = sePuedeTirar(hay, 1, 'ud');
      expect(r.sePuede).toBe(false);
      if (r.sePuede) continue;
      expect(r.porque).toContain('no queda nada');
    }
  });

  it('con la precisión con la que se guardan, lo mismo es lo mismo', () => {
    // Las cantidades se guardan con cuatro decimales: 1,99995 y 2 son lo mismo.
    expect(sePuedeTirar(1.99996, 2, 'l').sePuede).toBe(true);
    expect(sePuedeTirar(1.999, 2, 'l').sePuede).toBe(false);
  });
});
