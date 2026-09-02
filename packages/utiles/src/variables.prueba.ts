import { afterEach, describe, expect, it } from 'vitest';
import { variable, variablesDelEntorno } from './variables.ts';

/**
 * Estas pruebas existen por un despliegue que se cayo.
 *
 * El servidor corre en Node cuando se prueba y en Deno cuando esta desplegado,
 * y hasta M4 leia `process.env` a pelo: funcionaba en las pruebas y era una
 * apuesta en el despliegue. Lo malo de esa apuesta es que no se pierde al
 * desplegar —que se veria— sino al atender la primera peticion.
 *
 * Aqui se finge un Deno para comprobar que se le hace caso, porque en Node de
 * verdad nunca se ejercitaria esa rama.
 */
const conDeno = globalThis as { Deno?: unknown };

afterEach(() => {
  delete conDeno.Deno;
  delete process.env['SOLO_PARA_LA_PRUEBA'];
});

describe('leer una variable de entorno', () => {
  it('en Node la coge de process.env', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'de node';
    expect(variable('SOLO_PARA_LA_PRUEBA')).toBe('de node');
  });

  it('la que no esta no esta, y no revienta', () => {
    expect(variable('ESTA_NO_EXISTE_EN_NINGUN_SITIO')).toBeUndefined();
  });

  it('donde hay Deno, manda Deno', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'de node';
    conDeno.Deno = {
      env: { get: (n: string) => (n === 'SOLO_PARA_LA_PRUEBA' ? 'de deno' : undefined) },
    };
    expect(variable('SOLO_PARA_LA_PRUEBA')).toBe('de deno');
  });

  it('si Deno no la tiene, se sigue mirando en Node', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'de node';
    conDeno.Deno = { env: { get: () => undefined } };
    expect(variable('SOLO_PARA_LA_PRUEBA')).toBe('de node');
  });

  it('un Deno sin permiso de entorno no tumba nada', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'de node';
    conDeno.Deno = {
      env: {
        get: () => {
          throw new Error('Requires env access');
        },
      },
    };
    // Una variable que no se puede leer es una variable que no esta, no un fallo.
    expect(variable('SOLO_PARA_LA_PRUEBA')).toBe('de node');
  });

  it('el mapa para resolverEntorno sale con lo que haya y nada mas', () => {
    process.env['SOLO_PARA_LA_PRUEBA'] = 'algo';
    expect(variablesDelEntorno(['SOLO_PARA_LA_PRUEBA', 'ESTA_NO_EXISTE_EN_NINGUN_SITIO'])).toEqual({
      SOLO_PARA_LA_PRUEBA: 'algo',
      ESTA_NO_EXISTE_EN_NINGUN_SITIO: undefined,
    });
  });
});
