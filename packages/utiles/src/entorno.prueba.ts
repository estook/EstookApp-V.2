import { describe, expect, it } from 'vitest';
import { esEntorno, esProduccion, resolverEntorno } from './entorno.ts';

describe('entorno', () => {
  it('reconoce los cuatro entornos y rechaza cualquier otro', () => {
    expect(esEntorno('produccion')).toBe(true);
    expect(esEntorno('demostracion')).toBe(true);
    expect(esEntorno('preproduccion')).toBe(false);
  });

  it('sin variable declarada cae en desarrollo', () => {
    expect(resolverEntorno({})).toBe('desarrollo');
    expect(resolverEntorno({ VITE_ENTORNO: 'inventado' })).toBe('desarrollo');
  });

  it('la variable del cliente manda sobre la del servidor', () => {
    expect(resolverEntorno({ VITE_ENTORNO: 'pruebas', ENTORNO: 'produccion' })).toBe('pruebas');
    expect(esProduccion(resolverEntorno({ ENTORNO: 'produccion' }))).toBe(true);
  });
});
