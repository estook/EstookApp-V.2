import { describe, expect, it } from 'vitest';
import { laDireccionDeAhora } from './direccionesViejas.ts';

describe('las direcciones de antes del 25-sep', () => {
  it('lo de Inventario va al Almacén, con todo lo que llevaba detrás', () => {
    expect(laDireccionDeAhora('/inventario')).toBe('/almacen');
    expect(laDireccionDeAhora('/inventario/resumen')).toBe('/almacen/resumen');
    expect(laDireccionDeAhora('/inventario/productos/bajo-minimo')).toBe(
      '/almacen/productos/bajo-minimo',
    );
  });

  it('y el Recuento es ahora el Inventario', () => {
    expect(laDireccionDeAhora('/inventario/movimientos/recuento')).toBe(
      '/almacen/movimientos/inventario',
    );
  });

  it('lo que no es de antes no se toca', () => {
    expect(laDireccionDeAhora('/almacen/resumen')).toBeNull();
    expect(laDireccionDeAhora('/inventarios')).toBeNull();
    expect(laDireccionDeAhora('/')).toBeNull();
  });
});
