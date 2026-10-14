import { describe, expect, it } from 'vitest';
import type { WidgetPuesto } from './catalogo.ts';
import { colocarEnFilas, columnasParaElAncho } from './rejilla.ts';

/**
 * Filas completas, sin huecos (las bases firmes, 0084).
 *
 * «Dejan huecos entre ellos y están muy descolocados» (Richi, 14-oct): en el móvil, la
 * merma (pequeña) se quedaba sola con media fila en blanco porque detrás venía un
 * ancho. Aquí se comprueba lo que promete `colocarEnFilas`: **cada fila suma sus
 * columnas exactas**, el orden se respeta todo lo que se puede y un pequeño solo
 * ocupa la fila.
 */
const chico = (id: string): WidgetPuesto => ({ id, tamano: 'chico' });
const ancho = (id: string): WidgetPuesto => ({ id, tamano: 'ancho' });

/** Las filas que salen, como listas de «id:columnas». */
function filas(puestos: readonly WidgetPuesto[], columnas: number): string[][] {
  const resultado: string[][] = [];
  let fila: string[] = [];
  let suma = 0;
  for (const { puesto, columnas: ocupa } of colocarEnFilas(puestos, columnas)) {
    fila.push(`${puesto.id}:${String(ocupa)}`);
    suma += ocupa;
    if (suma === columnas) {
      resultado.push(fila);
      fila = [];
      suma = 0;
    }
  }
  // Si quedara una fila a medias, sale aquí y la prueba que la mira falla.
  if (fila.length > 0) resultado.push([...fila, `faltan ${String(columnas - suma)}`]);
  return resultado;
}

describe('colocar en filas', () => {
  it('el pequeño que se quedaba solo en el móvil sube a hacer pareja', () => {
    // El Panel de fábrica de Richi: Tu jornada, Ventas, Objetivos, Merma…
    expect(
      filas([chico('fichar'), ancho('ventas'), ancho('objetivos'), chico('merma')], 2),
    ).toEqual([['fichar:1', 'merma:1'], ['ventas:2'], ['objetivos:2']]);
  });

  it('un pequeño sin pareja ocupa la fila entera, sin media fila en blanco', () => {
    expect(filas([ancho('ventas'), chico('merma'), ancho('equipo')], 2)).toEqual([
      ['ventas:2'],
      ['merma:2'],
      ['equipo:2'],
    ]);
  });

  it('en cuatro columnas, ninguna fila se queda a medias', () => {
    const panel = [
      chico('fichar'),
      ancho('ventas'),
      ancho('objetivos'),
      chico('merma'),
      chico('valor'),
      ancho('bajo-minimo'),
      ancho('fichajes'),
      ancho('pedidos'),
      ancho('caducidades'),
      ancho('calendario'),
    ];
    for (const columnas of [2, 3, 4]) {
      for (const fila of filas(panel, columnas)) {
        expect(fila.join(' '), `en ${String(columnas)} columnas`).not.toMatch(/faltan/);
      }
    }
  });

  it('el orden guardado se respeta: solo sube lo que tapa un hueco', () => {
    const orden = colocarEnFilas(
      [ancho('a'), ancho('b'), chico('c'), chico('d'), ancho('e')],
      4,
    ).map((c) => c.puesto.id);
    expect(orden).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('no se pierde ni se repite ninguno', () => {
    const panel = [chico('a'), ancho('b'), chico('c'), ancho('d'), chico('e'), chico('f')];
    for (const columnas of [2, 3, 4]) {
      const ids = colocarEnFilas(panel, columnas).map((c) => c.puesto.id);
      expect([...ids].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    }
  });

  it('las columnas, por lo que mide el Panel: dos, tres y cuatro como mucho', () => {
    expect(columnasParaElAncho(24)).toBe(2);
    expect(columnasParaElAncho(46)).toBe(3);
    expect(columnasParaElAncho(68)).toBe(4);
    expect(columnasParaElAncho(140)).toBe(4);
  });
});
