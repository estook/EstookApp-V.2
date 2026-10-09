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

  it('y las mermas tienen su propio destino (26-sep), vengan de Almacén o de Inventario', () => {
    expect(laDireccionDeAhora('/almacen/movimientos/mermas')).toBe('/almacen/mermas');
    expect(laDireccionDeAhora('/inventario/movimientos/mermas')).toBe('/almacen/mermas');
    expect(laDireccionDeAhora('/almacen/mermas')).toBeNull();
  });

  it('y las cinco pestañas del libro son ahora Historial, con su filtro (9-oct)', () => {
    expect(laDireccionDeAhora('/almacen/movimientos/todo')).toBe('/almacen/movimientos/historial');
    expect(laDireccionDeAhora('/almacen/movimientos/entradas')).toBe(
      '/almacen/movimientos/historial?tipo=entradas',
    );
    expect(laDireccionDeAhora('/inventario/movimientos/ajustes')).toBe(
      '/almacen/movimientos/historial?tipo=ajustes',
    );
    expect(laDireccionDeAhora('/almacen/movimientos/desviacion')).toBe(
      '/almacen/movimientos/consumo',
    );
    expect(laDireccionDeAhora('/almacen/movimientos/historial')).toBeNull();
    expect(laDireccionDeAhora('/almacen/movimientos/inventario')).toBeNull();
  });

  it('lo que no es de antes no se toca', () => {
    expect(laDireccionDeAhora('/almacen/resumen')).toBeNull();
    expect(laDireccionDeAhora('/inventarios')).toBeNull();
    expect(laDireccionDeAhora('/')).toBeNull();
  });
});
