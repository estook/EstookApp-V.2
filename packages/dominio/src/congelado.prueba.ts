import { describe, expect, it } from 'vitest';
import {
  DIAS_PARA_GASTAR_LO_DESCONGELADO,
  comoEstaLoCongelado,
  sePuedeDescongelarHasta,
  tituloDeLoCongelado,
} from './congelado.ts';

describe('lo congelado', () => {
  it('avisa por lo que lleva en el congelador, en singular y en plural', () => {
    expect(tituloDeLoCongelado('Bacon', 3)).toBe('Bacon cumple 3 meses congelado');
    expect(tituloDeLoCongelado('Gambas', 1)).toBe('Gambas cumple 1 mes congelado');
  });

  it('una semana antes empieza a avisar, y el día que se cumple ya se ha pasado', () => {
    expect(comoEstaLoCongelado(30)).toBeNull();
    expect(comoEstaLoCongelado(8)).toBeNull();
    expect(comoEstaLoCongelado(7)).toBe('pronto');
    expect(comoEstaLoCongelado(1)).toBe('pronto');
    expect(comoEstaLoCongelado(0)).toBe('se_ha_pasado');
    expect(comoEstaLoCongelado(-40)).toBe('se_ha_pasado');
  });
});

describe('sacarlo del congelador (repaso del 10-oct)', () => {
  it('se propone gastarlo mañana', () => {
    expect(DIAS_PARA_GASTAR_LO_DESCONGELADO).toBe(1);
  });

  it('la caducidad de lo descongelado va de hoy a una semana, ni antes ni después', () => {
    expect(sePuedeDescongelarHasta('2026-10-10', '2026-10-10')).toBe(true);
    expect(sePuedeDescongelarHasta('2026-10-10', '2026-10-17')).toBe(true);
    expect(sePuedeDescongelarHasta('2026-10-10', '2026-10-18')).toBe(false);
    expect(sePuedeDescongelarHasta('2026-10-10', '2026-10-09')).toBe(false);
    expect(sePuedeDescongelarHasta('2026-10-10', 'mañana')).toBe(false);
  });
});
