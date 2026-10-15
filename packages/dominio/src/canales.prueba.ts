import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CANALES_DE_VENTA,
  CODIGOS_DE_CANAL,
  comisionDe,
  comoEsElCanal,
  precioEnElCanal,
} from './canales.ts';

/** Los canales de venta (0086): todos programados, hoy Sala y Uber Eats. */
describe('los canales de venta', () => {
  it('hoy se pueden activar Sala y Uber Eats, y los demás están programados', () => {
    expect(CANALES_DE_VENTA.filter((c) => c.disponible).map((c) => c.canal)).toEqual([
      'sala',
      'uber_eats',
    ]);
    expect(CODIGOS_DE_CANAL).toEqual(expect.arrayContaining(['glovo', 'just_eat', 'para_llevar']));
  });

  it('son los mismos que sabe la base (estook.canal_de_venta, 0068)', () => {
    const migracion = readFileSync(
      new URL('../../../base-de-datos/migraciones/0068_el_plato_y_tu_carta.sql', import.meta.url),
      'utf-8',
    );
    const enum_ = /create type estook\.canal_de_venta as enum \(([^)]*)\)/.exec(migracion)?.[1];
    const deLaBase = (enum_ ?? '').split(',').map((v) => v.trim().replace(/'/g, ''));
    expect([...deLaBase].sort()).toEqual([...CODIGOS_DE_CANAL].sort());
  });

  it('sin precio propio en un canal, vale el de sala, y se dice', () => {
    expect(precioEnElCanal(1490, null)).toEqual({ centimos: 1490, igualQueSala: true });
    expect(precioEnElCanal(1490, 1750)).toEqual({ centimos: 1750, igualQueSala: false });
    expect(precioEnElCanal(null, undefined)).toEqual({ centimos: null, igualQueSala: true });
  });

  it('la comisión sale del precio con IVA, al céntimo', () => {
    expect(comisionDe(1750, 30)).toBe(525);
    expect(comisionDe(999, 30)).toBe(300);
    expect(comisionDe(1750, null)).toBe(0);
  });

  it('un canal que no existe no se inventa', () => {
    expect(() => comoEsElCanal('telepizza' as never)).toThrow();
  });
});
