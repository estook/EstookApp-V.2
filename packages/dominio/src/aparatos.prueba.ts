import { describe, expect, it } from 'vitest';
import {
  BLOQUEO_DE_FABRICA,
  dondeCae,
  elCodigoDeLaDireccion,
  esPinFacil,
  inicialesDe,
  leerElTokenDelAparato,
  minutosDelBloqueo,
  nombrePropuesto,
  tokenDelAparato,
} from './aparatos.ts';

/** T1 · La puerta de Estook TPV (0107; Anexo 11.3 y 11.4). */
describe('los aparatos de Estook TPV', () => {
  it('el PIN que se adivina: todas iguales o una escalera, hacia arriba o hacia abajo', () => {
    for (const facil of [
      '111111',
      '000000',
      '123456',
      '654321',
      '890123',
      '210987',
      '1234',
      '4321',
    ]) {
      expect(esPinFacil(facil), facil).toBe(true);
    }
    for (const bueno of ['482913', '112233', '135791', '121212', '000001', '987650']) {
      expect(esPinFacil(bueno), bueno).toBe(false);
    }
  });

  it('el token de Estook TPV lleva el turno y la llave, y se lee igual', () => {
    const turno = 'a'.repeat(43);
    const llave = 'B_-'.repeat(15);
    expect(leerElTokenDelAparato(tokenDelAparato(turno, llave))).toEqual({ turno, llave });
    // Un token de sesión de Estook no es de un aparato.
    expect(leerElTokenDelAparato('x'.repeat(43))).toBeNull();
    expect(leerElTokenDelAparato(`tpv.${turno}`)).toBeNull();
  });

  it('el nombre se propone solo, y no repite', () => {
    expect(nombrePropuesto('caja', [])).toBe('Caja 1');
    expect(nombrePropuesto('caja', ['Caja 1'])).toBe('Caja 2');
    expect(nombrePropuesto('comandero', ['Caja 1'])).toBe('Comandero 1');
    expect(nombrePropuesto('comandero', [], 'Sara')).toBe('Móvil de Sara');
    expect(nombrePropuesto('comandero', ['móvil de sara'], 'Sara')).toBe('Móvil de Sara 2');
    expect(nombrePropuesto('fichar', [])).toBe('Fichar');
    expect(nombrePropuesto('cocina', ['Pantalla de cocina'])).toBe('Pantalla de cocina 2');
  });

  it('el bloqueo: 2 minutos la caja y la tablet, 10 el móvil, nunca la cocina', () => {
    expect(minutosDelBloqueo('caja', false, BLOQUEO_DE_FABRICA)).toBe(2);
    expect(minutosDelBloqueo('comandero', false, BLOQUEO_DE_FABRICA)).toBe(2);
    expect(minutosDelBloqueo('comandero', true, BLOQUEO_DE_FABRICA)).toBe(10);
    expect(minutosDelBloqueo('cocina', false, BLOQUEO_DE_FABRICA)).toBeNull();
    expect(minutosDelBloqueo('barra', false, BLOQUEO_DE_FABRICA)).toBeNull();
  });

  it('el primero del día cae en el inicio; el siguiente, en las mesas si las hay', () => {
    expect(dondeCae('caja', true, true)).toBe('inicio');
    expect(dondeCae('caja', false, true)).toBe('mesas');
    expect(dondeCae('caja', false, false)).toBe('inicio');
    // El comandero, siempre a la sala (0115): el inicio es de la caja.
    expect(dondeCae('comandero', true, true)).toBe('mesas');
    expect(dondeCae('comandero', true, false)).toBe('mesas');
  });

  it('el código del QR va detrás del #, y solo en la dirección de vincular', () => {
    expect(elCodigoDeLaDireccion({ pathname: '/tpv/vincular/', hash: '#482913' })).toBe('482913');
    expect(elCodigoDeLaDireccion({ pathname: '/tpv/vincular', hash: '#482913' })).toBe('482913');
    expect(elCodigoDeLaDireccion({ pathname: '/tpv/', hash: '#482913' })).toBeNull();
    expect(elCodigoDeLaDireccion({ pathname: '/tpv/vincular/', hash: '#4829' })).toBeNull();
  });

  it('las iniciales de cada uno', () => {
    expect(inicialesDe('Sara')).toBe('SA');
    expect(inicialesDe('Jon Mikel')).toBe('JM');
    expect(inicialesDe('  ')).toBe('?');
  });
});
