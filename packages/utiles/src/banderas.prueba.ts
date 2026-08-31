import { describe, expect, it } from 'vitest';
import { banderaEncendida, estadoDeLasBanderas } from './banderas.ts';

describe('banderas de funcion', () => {
  it('el modo demostracion nunca esta encendido por defecto en produccion', () => {
    expect(banderaEncendida('modo_demostracion', 'produccion')).toBe(false);
    expect(banderaEncendida('modo_demostracion', 'desarrollo')).toBe(true);
  });

  it('una variable de entorno pisa el valor del catalogo', () => {
    expect(
      banderaEncendida('modo_demostracion', 'produccion', { VITE_BANDERA_MODO_DEMOSTRACION: '1' }),
    ).toBe(true);
    expect(
      banderaEncendida('registro_detallado', 'desarrollo', { BANDERA_REGISTRO_DETALLADO: 'no' }),
    ).toBe(false);
  });

  it('un valor que no se entiende no enciende nada por accidente', () => {
    expect(
      banderaEncendida('modo_demostracion', 'produccion', {
        VITE_BANDERA_MODO_DEMOSTRACION: 'quiza',
      }),
    ).toBe(false);
  });

  it('el estado completo devuelve todas las banderas del catalogo', () => {
    const estado = estadoDeLasBanderas('pruebas');
    expect(Object.keys(estado).sort()).toEqual(['modo_demostracion', 'registro_detallado']);
  });
});
