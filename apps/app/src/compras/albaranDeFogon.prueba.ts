import { describe, expect, it } from 'vitest';
import { conLoLeidoDelAlbaran, type LineaAlRecibir } from './albaranDeFogon.ts';
import type { LineaLeidaDelAlbaran, ProductoLeido } from '../fogon/contrato.ts';

/**
 * Lo que lee Fogón en la foto del albarán, puesto en las líneas de la puerta (0098). Lo
 * que importa: no apuntar de menos sin decirlo, y no enseñar precios a quien no los edita.
 */

function linea(
  clave: string,
  productoId: string,
  que: Partial<LineaAlRecibir> = {},
): LineaAlRecibir {
  return {
    clave,
    lineaDePedidoId: clave,
    productoId,
    producto: productoId,
    formato: 'Caja',
    factor: 6,
    unidadDeUso: 'ud',
    pesoVariable: false,
    pedida: 2,
    formatos: 2,
    kilos: '',
    precio: 1000,
    importe: null,
    rechazada: false,
    lote: '',
    caducaEl: '',
    nota: '',
    conDetalle: false,
    ...que,
  };
}

function producto(id: string, que: Partial<ProductoLeido> = {}): ProductoLeido {
  return {
    id,
    nombre: id,
    formato: 'Caja',
    factor: 6,
    unidadDeUso: 'ud',
    pesoVariable: false,
    ...que,
  };
}

function leida(que: Partial<LineaLeidaDelAlbaran>): LineaLeidaDelAlbaran {
  return {
    texto: 'algo',
    producto: null,
    formatos: null,
    cantidad: null,
    lote: null,
    caducaEl: null,
    ...que,
  };
}

describe('lo leído del albarán, en las líneas de la puerta', () => {
  const pedido = [linea('a', 'Leche'), linea('b', 'Huevos')];

  it('rellena lo del pedido con lo que dice el papel, y lo marca', () => {
    const deja = conLoLeidoDelAlbaran(
      pedido,
      {
        lineas: [
          leida({
            producto: producto('Leche'),
            formatos: 3,
            precioCentimos: 1250,
            lote: 'L-1',
            caducaEl: '2026-11-02',
          }),
        ],
      },
      true,
    );
    expect(deja.lineas[0]).toMatchObject({
      formatos: 3,
      precio: 1250,
      lote: 'L-1',
      caducaEl: '2026-11-02',
      conDetalle: true,
    });
    expect([...deja.deFogon]).toEqual(['a']);
  });

  it('lo del pedido que no sale en la foto se marca y no se toca', () => {
    const deja = conLoLeidoDelAlbaran(
      pedido,
      { lineas: [leida({ producto: producto('Leche'), formatos: 2 })] },
      true,
    );
    expect([...deja.noSalen]).toEqual(['b']);
    expect(deja.lineas[1]?.formatos).toBe(2);
  });

  it('lo que no estaba en el pedido y es tuyo, como línea nueva', () => {
    const deja = conLoLeidoDelAlbaran(
      pedido,
      { lineas: [leida({ producto: producto('Harina'), formatos: 1 })] },
      true,
    );
    expect(deja.lineas).toHaveLength(3);
    expect(deja.lineas[2]).toMatchObject({ productoId: 'Harina', pedida: null, formatos: 1 });
  });

  it('lo que no se sabe qué es, se dice', () => {
    const deja = conLoLeidoDelAlbaran(
      pedido,
      { lineas: [leida({ texto: 'Servilletas', formatos: 4 })] },
      true,
    );
    expect(deja.sinCasar).toEqual(['Servilletas']);
    // Sin nada casado, no se marca nada como «no sale»: la foto no era de esto.
    expect(deja.noSalen.size).toBe(0);
  });

  it('a quien no edita precios, no se le pone ningún precio', () => {
    const deja = conLoLeidoDelAlbaran(
      [linea('a', 'Leche', { precio: null })],
      { lineas: [leida({ producto: producto('Leche'), formatos: 3, precioCentimos: 999 })] },
      false,
    );
    expect(deja.lineas[0]?.precio).toBeNull();
  });

  it('lo que va a peso, en kilos y escrito con coma', () => {
    const deja = conLoLeidoDelAlbaran(
      [linea('p', 'Lubina', { pesoVariable: true, unidadDeUso: 'kg' })],
      {
        lineas: [
          leida({
            producto: producto('Lubina', { pesoVariable: true, unidadDeUso: 'kg' }),
            cantidad: 2.35,
            importeCentimos: 4230,
          }),
        ],
      },
      true,
    );
    expect(deja.lineas[0]).toMatchObject({ kilos: '2,35', importe: 4230 });
  });
});
