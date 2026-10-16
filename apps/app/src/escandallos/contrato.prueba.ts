import { describe, expect, it } from 'vitest';
import { laRacionQueViaja, losDelAlmacen, type LoQuePuedeLlevar } from './contrato.ts';

const lo: LoQuePuedeLlevar = {
  productos: [
    { id: '1', nombre: 'Refresco de cola', unidad: 'ud', categoria: 'Bebidas', alergenos: [] },
    { id: '2', nombre: 'Entrecot de ternera', unidad: 'g', categoria: 'Carnes', alergenos: [] },
    { id: '3', nombre: 'Dorada', unidad: 'g', categoria: 'Pescados', alergenos: ['pescado'] },
    { id: '4', nombre: 'Helado de vainilla', unidad: 'ml', categoria: null, alergenos: [] },
  ],
  elaboraciones: [],
};

describe('lo del Almacén que se vende tal cual (lección 190)', () => {
  it('sale todo, no solo lo que va por unidades: el entrecot y la dorada van en gramos', () => {
    expect(losDelAlmacen(lo, '').map((p) => p.nombre)).toEqual([
      'Refresco de cola',
      'Entrecot de ternera',
      'Dorada',
      'Helado de vainilla',
    ]);
  });

  it('se busca sin acentos ni mayúsculas', () => {
    expect(losDelAlmacen(lo, 'ENTRECÓT').map((p) => p.id)).toEqual(['2']);
  });

  it('lo que va por unidades no pide ración; lo demás, sí', () => {
    expect(laRacionQueViaja('ud', { cantidad: '', unidad: 'ud' })).toBe('por_unidades');
    expect(laRacionQueViaja('g', { cantidad: '', unidad: 'g' })).toBeNull();
    expect(laRacionQueViaja('g', { cantidad: 'mucho', unidad: 'g' })).toBeNull();
    expect(laRacionQueViaja('kg', { cantidad: '0,35', unidad: 'kg' })).toEqual({
      cantidad: 0.35,
      unidad: 'kg',
    });
  });
});
