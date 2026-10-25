import { describe, expect, it } from 'vitest';
import {
  CAFES_DE_SERIE,
  elNombreDeLaRacion,
  elProductoDelCafe,
  laPaginaDeLaBebida,
  lasRacionesQueSeProponen,
  queEsLaBebida,
  sirveParaLasCopas,
  type ProductoQueSeMira,
} from './bebidas.ts';

const producto = (
  nombre: string,
  unidad: ProductoQueSeMira['unidad'],
  categoria = 'Bebidas con alcohol',
  contenido: ProductoQueSeMira['contenido'] = null,
): ProductoQueSeMira => ({ nombre, unidad, categoria, contenido });

describe('«Monta tus bebidas» (T3 · 2 · 2)', () => {
  it('sabe qué es cada producto del almacén', () => {
    expect(queEsLaBebida(producto('Ron', 'ml'))).toBe('botella_para_copas');
    expect(queEsLaBebida(producto('Ginebra Beefeater', 'ml'))).toBe('botella_para_copas');
    expect(queEsLaBebida(producto('Licor de hierbas', 'ml'))).toBe('botella_para_copas');
    expect(queEsLaBebida(producto('Cerveza de barril', 'ml'))).toBe('bebida');
    expect(queEsLaBebida(producto('Vino tinto crianza', 'ud'))).toBe('bebida');
    expect(queEsLaBebida(producto('Vino blanco de cocinar', 'ml'))).toBe('no_es_bebida');
    expect(queEsLaBebida(producto('Café en grano', 'g', 'Café e infusiones'))).toBe('cafe');
    expect(queEsLaBebida(producto('Tomate', 'g', 'Verduras'))).toBe('no_es_bebida');
  });

  it('propone las raciones: la caña, la doble y la jarra; la copa de vino y la botella', () => {
    expect(
      lasRacionesQueSeProponen(producto('Cerveza de barril', 'ml')).map((r) => [
        r.nombre,
        r.cantidad,
        r.puesta,
      ]),
    ).toEqual([
      ['Caña', 200, true],
      ['Doble', 330, true],
      ['Jarra', 500, false],
    ]);
    // La botella de vino que dice lo que trae, por copas; la que no, entera (no se adivina).
    expect(
      lasRacionesQueSeProponen(
        producto('Rioja crianza', 'ud', 'Bebidas con alcohol', { cantidad: 750, unidad: 'ml' }),
      ).map((r) => [r.nombre, r.cantidad, r.unidad]),
    ).toEqual([
      ['Copa', 150, 'ml'],
      ['Botella', 1, 'ud'],
    ]);
    expect(
      lasRacionesQueSeProponen(producto('Vino tinto joven', 'ud')).map((r) => r.nombre),
    ).toEqual(['Botella']);
    expect(
      lasRacionesQueSeProponen(producto('Refresco de cola', 'ud', 'Bebidas sin alcohol')).map(
        (r) => r.nombre,
      ),
    ).toEqual(['Entera']);
    expect(lasRacionesQueSeProponen(producto('Vermut', 'ml'))[0]?.cantidad).toBe(100);
    // La copa de vino de la casa, si el local la cambió.
    expect(
      lasRacionesQueSeProponen(
        producto('Verdejo', 'ud', 'Bebidas con alcohol', { cantidad: 750, unidad: 'ml' }),
        120,
      )[0]?.cantidad,
    ).toBe(120);
  });

  it('nombra cada botón y elige su página', () => {
    const [cana] = lasRacionesQueSeProponen(producto('Cerveza de barril', 'ml'));
    if (cana === undefined) throw new Error('sin caña');
    expect(elNombreDeLaRacion('Cerveza de barril', cana, 3)).toBe('Caña');
    expect(
      elNombreDeLaRacion(
        'Rioja crianza',
        { nombre: 'Copa', cantidad: 150, unidad: 'ml', puesta: true },
        2,
      ),
    ).toBe('Rioja crianza · copa');
    expect(
      elNombreDeLaRacion(
        'Coca-Cola',
        { nombre: 'Entera', cantidad: 1, unidad: 'ud', puesta: true },
        1,
      ),
    ).toBe('Coca-Cola');
    expect(laPaginaDeLaBebida(producto('Agua mineral 50 cl', 'ud', 'Bebidas sin alcohol'))).toBe(
      'Pan y agua',
    );
    expect(laPaginaDeLaBebida(producto('Cerveza en botellín', 'ud'))).toBe('Cervezas');
    expect(laPaginaDeLaBebida(producto('Vino rosado', 'ud'))).toBe('Vinos');
    expect(laPaginaDeLaBebida(producto('Tónica', 'ud', 'Bebidas sin alcohol'))).toBe('Refrescos');
  });

  it('el «¿Con qué?» de las copas: los refrescos por unidades, sin el agua', () => {
    expect(sirveParaLasCopas(producto('Refresco de cola', 'ud', 'Bebidas sin alcohol'))).toBe(true);
    expect(sirveParaLasCopas(producto('Tónica', 'ud', 'Bebidas sin alcohol'))).toBe(true);
    expect(sirveParaLasCopas(producto('Agua con gas', 'ud', 'Bebidas sin alcohol'))).toBe(false);
    expect(sirveParaLasCopas(producto('Zumo de naranja', 'ml', 'Bebidas sin alcohol'))).toBe(false);
  });

  it('los cafés de serie buscan su café y su leche en el almacén', () => {
    const almacen = [
      { nombre: 'Café descafeinado' },
      { nombre: 'Café en grano natural' },
      { nombre: 'Leche entera' },
      { nombre: 'Leche condensada' },
    ];
    expect(elProductoDelCafe('cafe', almacen)?.nombre).toBe('Café en grano natural');
    expect(elProductoDelCafe('descafeinado', almacen)?.nombre).toBe('Café descafeinado');
    expect(elProductoDelCafe('leche', almacen)?.nombre).toBe('Leche entera');
    expect(elProductoDelCafe('te', almacen)).toBeNull();
    expect(CAFES_DE_SERIE.find((c) => c.clave === 'con_leche')?.aproximadoCentimos).toBe(29);
  });
});
