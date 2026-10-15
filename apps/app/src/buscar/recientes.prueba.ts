import { describe, expect, it } from 'vitest';
import { CUANTOS_RECIENTES, conElNuevo, leidos, type Reciente } from './recientes.ts';

/** Los recientes del buscador (0085): lo último abierto, delante y sin repetirse. */
function uno(id: string, tipo = 'producto'): Reciente {
  return { tipo, id, titulo: `Cosa ${id}`, subtitulo: '', local_id: null };
}

describe('los recientes del buscador', () => {
  it('lo último abierto va delante', () => {
    expect(conElNuevo([uno('a'), uno('b')], uno('c')).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('abrir otra vez lo mismo lo sube, no lo repite', () => {
    expect(conElNuevo([uno('a'), uno('b'), uno('c')], uno('c')).map((r) => r.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('el mismo id de dos tipos distintos son dos cosas', () => {
    expect(conElNuevo([uno('a', 'pedido')], uno('a', 'factura'))).toHaveLength(2);
  });

  it(`no pasan de ${CUANTOS_RECIENTES}`, () => {
    let lista: readonly Reciente[] = [];
    for (let i = 0; i < 10; i += 1) lista = conElNuevo(lista, uno(String(i)));
    expect(lista).toHaveLength(CUANTOS_RECIENTES);
    expect(lista[0]?.id).toBe('9');
  });

  it('lo guardado que no tiene su forma no sale, y no rompe nada', () => {
    expect(leidos('esto no es JSON')).toEqual([]);
    expect(leidos('{"no":"es una lista"}')).toEqual([]);
    expect(leidos(JSON.stringify([{ tipo: 'producto' }, uno('a')]))).toEqual([uno('a')]);
    expect(leidos(null)).toEqual([]);
  });
});
