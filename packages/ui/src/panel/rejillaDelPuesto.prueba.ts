import { describe, expect, it } from 'vitest';
import { FIJOS_DEL_PUESTO, type Puesto } from './catalogo.ts';
import { colocarLosFijos, elModoDelAncho, type ModoDelPanel } from './rejillaDelPuesto.ts';

const PUESTOS: readonly Puesto[] = ['gerente', 'jefe-cocina', 'jefe-sala', 'cocina', 'sala'];
const MODOS: readonly ModoDelPanel[] = ['pc', 'tablet', 'tablet-vertical', 'movil'];

/** Las filas de doce que salen, para mirar que no queda ningún hueco. */
function filas(colocados: readonly { columnas: number }[]): number[][] {
  const todas: number[][] = [];
  let suma = 12;
  for (const c of colocados) {
    if (suma + c.columnas > 12) {
      todas.push([]);
      suma = 0;
    }
    todas[todas.length - 1]?.push(c.columnas);
    suma += c.columnas;
  }
  return todas;
}

describe('los fijos de cada puesto, sin huecos en ninguna pantalla (0148)', () => {
  for (const puesto of PUESTOS) {
    for (const modo of MODOS) {
      it(`${puesto} en ${modo}: cada fila suma doce y el orden no cambia`, () => {
        const colocados = colocarLosFijos(FIJOS_DEL_PUESTO[puesto], modo);
        expect(colocados.map((c) => c.fijo.id)).toEqual(FIJOS_DEL_PUESTO[puesto].map((f) => f.id));
        for (const fila of filas(colocados)) expect(fila.reduce((s, c) => s + c, 0)).toBe(12);
      });
    }
  }

  it('el PC es la maqueta: cuatro cifras, la gráfica en siete y lo de su lado en cinco', () => {
    const pc = colocarLosFijos(FIJOS_DEL_PUESTO.gerente, 'pc').map((c) => c.columnas);
    expect(pc.slice(0, 6)).toEqual([3, 3, 3, 3, 7, 5]);
  });

  it('en el móvil, las cifras de dos en dos y lo demás a lo ancho', () => {
    const movil = colocarLosFijos(FIJOS_DEL_PUESTO.gerente, 'movil').map((c) => c.columnas);
    expect(movil.slice(0, 4)).toEqual([6, 6, 6, 6]);
    expect(movil.slice(4).every((c) => c === 12)).toBe(true);
  });

  it('tres listas en una tablet en vertical: dos y la tercera a lo ancho', () => {
    const tablet = colocarLosFijos(FIJOS_DEL_PUESTO['jefe-cocina'], 'tablet-vertical');
    const listas = tablet.filter((c) => c.fijo.forma === 'tercio').map((c) => c.columnas);
    expect(listas).toEqual([6, 6, 12]);
  });

  it('el modo sale del ancho del Panel', () => {
    expect(elModoDelAncho(75)).toBe('pc');
    expect(elModoDelAncho(56)).toBe('tablet');
    expect(elModoDelAncho(42)).toBe('tablet-vertical');
    expect(elModoDelAncho(22)).toBe('movil');
  });
});
