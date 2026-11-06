import { describe, expect, it } from 'vitest';
import { compararConLaZona, cuandoSePuedeOtraVez } from './tu-zona.ts';

describe('tu precio frente a la zona', () => {
  it('las bravas a 7 € con la calle a 5,50 €, por encima', () => {
    expect(compararConLaZona(700, [500, 550, 600])).toEqual({
      cuantos: 3,
      mediaCentimos: 550,
      desdeCentimos: 500,
      hastaCentimos: 600,
      diferenciaCentimos: 150,
      como: 'por_encima',
    });
  });

  it('a unos céntimos de la media, en la media', () => {
    expect(compararConLaZona(1350, [1200, 1350, 1500])?.como).toBe('en_la_media');
    expect(compararConLaZona(1300, [1200, 1350, 1500])?.como).toBe('en_la_media');
  });

  it('más barato que la zona, por debajo', () => {
    expect(compararConLaZona(400, [550, 600, 650, 500])?.como).toBe('por_debajo');
  });

  it('con menos de tres precios, o sin el tuyo, no se juzga', () => {
    expect(compararConLaZona(700, [500, 600])).toBeNull();
    expect(compararConLaZona(null, [500, 600, 700])).toBeNull();
    expect(compararConLaZona(700, [500, 0, 600])).toBeNull();
  });
});

describe('una vez cada diez días (0135)', () => {
  const elDiaUno = new Date('2026-11-01T08:00:00Z');

  it('antes de los diez días, dice cuándo', () => {
    expect(cuandoSePuedeOtraVez(elDiaUno, new Date('2026-11-10T07:00:00Z'))).toEqual(
      new Date('2026-11-11T08:00:00Z'),
    );
  });

  it('pasados, o sin ninguno antes, ya se puede', () => {
    expect(cuandoSePuedeOtraVez(elDiaUno, new Date('2026-11-11T08:00:00Z'))).toBeNull();
    expect(cuandoSePuedeOtraVez(null, new Date('2026-11-11T08:00:00Z'))).toBeNull();
  });
});
