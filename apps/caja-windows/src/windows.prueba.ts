import { describe, expect, it } from 'vitest';
import { leerLoQueDiceWindows } from './windows.ts';

/**
 * **Lo que dice Windows** (T5 · 2 · 2 · 2, 0124): lo que contestaría PowerShell en cada caso,
 * con los números de Windows (red pública 0, privada 1; wifi 9, cable 14; deja 2, bloquea 4;
 * perfil de dominio 1, privado 2, público 4).
 */

const CABLE = { i: 8, medio: 14, ips: ['192.168.1.20'] };
const WIFI = { i: 12, medio: 9, ips: ['192.168.1.21'] };

function dice(lo: { perfiles?: unknown; redes?: unknown; reglas?: unknown }) {
  return leerLoQueDiceWindows(JSON.stringify({ perfiles: [], redes: [], reglas: [], ...lo }));
}

describe('lo que dice Windows de la red del local', () => {
  it('Windows aún no ha preguntado: no hay ninguna regla del programa', () => {
    expect(
      dice({ perfiles: [{ i: 12, nombre: 'Wifi Bar Pepe', categoria: 1 }], redes: [WIFI] }),
    ).toEqual({
      red: { nombre: 'Wifi Bar Pepe', por: 'wifi', publica: false },
      cortafuegos: 'sin_preguntar',
    });
  });

  it('se contestó «Permitir acceso» con redes privadas, en una red privada: deja', () => {
    expect(
      dice({
        perfiles: [{ i: 12, nombre: 'Wifi Bar Pepe', categoria: 1 }],
        redes: [WIFI],
        reglas: [{ accion: 2, perfil: 2 }],
      }).cortafuegos,
    ).toBe('deja');
  });

  it('se dejó solo para redes privadas, pero Windows tiene el wifi como público: no deja', () => {
    expect(
      dice({
        perfiles: [{ i: 12, nombre: 'Wifi Bar Pepe', categoria: 0 }],
        redes: [WIFI],
        reglas: [{ accion: 2, perfil: 2 }],
      }),
    ).toEqual({
      red: { nombre: 'Wifi Bar Pepe', por: 'wifi', publica: true },
      cortafuegos: 'no_deja',
    });
  });

  it('se tocó «Cancelar»: la regla que bloquea gana a la que deja', () => {
    expect(
      dice({
        perfiles: [{ i: 12, nombre: 'Wifi Bar Pepe', categoria: 1 }],
        redes: [WIFI],
        reglas: [
          { accion: 2, perfil: 2 },
          { accion: 4, perfil: 6 },
        ],
      }).cortafuegos,
    ).toBe('no_deja');
  });

  it('una regla para todos los perfiles (0) vale para cualquier red', () => {
    expect(
      dice({
        perfiles: [{ i: 8, nombre: 'Red 2', categoria: 0 }],
        redes: [CABLE],
        reglas: [{ accion: 2, perfil: 0 }],
      }),
    ).toEqual({ red: { nombre: 'Red 2', por: 'cable', publica: true }, cortafuegos: 'deja' });
  });

  it('con cable y wifi a la vez, la red del local es la del cable', () => {
    expect(
      dice({
        perfiles: [
          { i: 12, nombre: 'Wifi Bar Pepe', categoria: 0 },
          { i: 8, nombre: 'Red 2', categoria: 1 },
        ],
        redes: [WIFI, CABLE],
        reglas: [{ accion: 2, perfil: 2 }],
      }),
    ).toEqual({ red: { nombre: 'Red 2', por: 'cable', publica: false }, cortafuegos: 'deja' });
  });

  it('PowerShell 5 deja sueltas las listas de uno; una tarjeta sin red del local no cuenta', () => {
    expect(
      dice({
        perfiles: { i: 12, nombre: 'Wifi Bar Pepe', categoria: 1 },
        redes: [
          { i: 3, medio: 14, ips: '169.254.10.2' },
          { ...WIFI, ips: '192.168.1.21' },
        ],
        reglas: { accion: 2, perfil: 2 },
      }),
    ).toEqual({
      red: { nombre: 'Wifi Bar Pepe', por: 'wifi', publica: false },
      cortafuegos: 'deja',
    });
  });

  it('si no se puede leer, o no hay red del local, no se sabe', () => {
    expect(leerLoQueDiceWindows('')).toEqual({ red: null, cortafuegos: 'no_se_sabe' });
    expect(leerLoQueDiceWindows('no es JSON')).toEqual({ red: null, cortafuegos: 'no_se_sabe' });
    expect(dice({ perfiles: [{ i: 99, nombre: 'Otra', categoria: 1 }], redes: [WIFI] })).toEqual({
      red: null,
      cortafuegos: 'no_se_sabe',
    });
  });
});
