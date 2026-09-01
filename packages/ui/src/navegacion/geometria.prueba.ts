import { describe, expect, it } from 'vitest';
import { anguloDe, caminoDeSector, puntoEn, sectorEn, sectores, type Sector } from './geometria.ts';

/**
 * El primer sector de una rueda de N apps.
 *
 * Existe para no tener que poner `!` en cada prueba. El proyecto los prohibe, y
 * con razon: un `!` de mas es un fallo esperando, y una prueba que se lo permite
 * a si misma acaba enseñando a hacerlo en el codigo de verdad.
 */
function elPrimero(cuantos: number): Sector {
  const sector = sectores(cuantos)[0];
  if (!sector) throw new Error(`sectores(${cuantos}) no ha devuelto ninguno`);
  return sector;
}

/**
 * M3 · la geometria de la rueda de apps.
 *
 * Lo que se comprueba aqui es el criterio de terminado de B5: «las apps que el
 * rol no tiene **no aparecen y los sectores se reparten**». Eso es una cuenta, y
 * se prueba como una cuenta, sin montar un navegador.
 */
describe('sectores', () => {
  it('reparte la vuelta entera, sin huecos', () => {
    for (const cuantos of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const trozos = sectores(cuantos);
      expect(trozos).toHaveLength(cuantos);

      const suma = trozos.reduce((total, s) => total + (s.hasta - s.desde), 0);
      expect(suma).toBeCloseTo(360, 6);

      // Cada uno empieza donde acaba el anterior: ni hueco ni solape.
      for (let i = 1; i < trozos.length; i++) {
        expect(trozos[i]?.desde).toBeCloseTo(trozos[i - 1]?.hasta ?? 0, 6);
      }
    }
  });

  it('a un rol con tres apps le da tres sectores de 120 grados', () => {
    // Y no tres de 45 con un hueco: «un cocinero no usa Estook con cosas
    // ocultas, usa una aplicacion pensada para el».
    const trozos = sectores(3);
    for (const sector of trozos) {
      expect(sector.hasta - sector.desde).toBeCloseTo(120, 6);
    }
  });

  it('centra el primero arriba, no lo empieza arriba', () => {
    // Con un numero impar, empezar arriba dejaria la rueda descolgada.
    for (const cuantos of [3, 5, 7]) {
      expect(sectores(cuantos)[0]?.medio).toBeCloseTo(0, 6);
    }
  });

  it('sin apps no hay sectores, y no revienta', () => {
    expect(sectores(0)).toEqual([]);
    expect(sectores(-1)).toEqual([]);
  });
});

describe('puntoEn', () => {
  it('cero grados es arriba', () => {
    const { x, y } = puntoEn(0, 100, 0);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(-100, 6);
  });

  it('se crece en el sentido de las agujas del reloj', () => {
    // 90 grados tiene que ser la derecha, no la izquierda: es lo que espera
    // quien mira una rueda, y donde se equivoca todo el mundo con SVG.
    const { x, y } = puntoEn(90, 100, 0);
    expect(x).toBeCloseTo(100, 6);
    expect(y).toBeCloseTo(0, 6);
  });
});

describe('anguloDe y sectorEn · arrastrar el dedo', () => {
  it('arrastrar hacia arriba senala el primer sector', () => {
    // dy negativo es hacia arriba en pantalla.
    expect(anguloDe(0, -50)).toBeCloseTo(0, 6);
    expect(sectorEn(anguloDe(0, -50), 8)).toBe(0);
  });

  it('arrastrar a la derecha, con ocho apps, senala la tercera', () => {
    // Ocho sectores de 45 grados centrados en 0, 45, 90... El de 90 es el
    // tercero contando desde arriba.
    expect(sectorEn(anguloDe(50, 0), 8)).toBe(2);
  });

  it('arrastrar hacia abajo senala el de enfrente', () => {
    expect(sectorEn(anguloDe(0, 50), 8)).toBe(4);
    expect(sectorEn(anguloDe(0, 50), 4)).toBe(2);
  });

  it('el angulo siempre cae en algun sector, se arrastre donde se arrastre', () => {
    for (const cuantos of [1, 3, 5, 8]) {
      for (let grados = 0; grados < 360; grados += 1) {
        const indice = sectorEn(grados, cuantos);
        expect(indice).not.toBeNull();
        expect(indice).toBeGreaterThanOrEqual(0);
        expect(indice).toBeLessThan(cuantos);
      }
    }
  });

  it('sin apps no senala nada', () => {
    expect(sectorEn(90, 0)).toBeNull();
  });
});

describe('caminoDeSector', () => {
  it('dibuja una corona con sus dos arcos', () => {
    const camino = caminoDeSector(elPrimero(4), 60, 150, 160);
    expect(camino).toMatch(/^M /);
    expect(camino).toContain('A 150 150');
    expect(camino).toContain('A 60 60');
    expect(camino.endsWith('Z')).toBe(true);
    expect(camino).not.toContain('NaN');
  });

  it('con una sola app dibuja la corona entera, no una raya', () => {
    // Un arco de 360 grados en SVG no pinta nada, porque el principio y el final
    // son el mismo punto. Con una sola app hay que dibujarlo en dos mitades.
    const camino = caminoDeSector(elPrimero(1), 60, 150, 160);
    expect(camino.match(/A /g)?.length).toBe(4);
    expect(camino).not.toContain('NaN');
  });

  it('marca el arco largo solo cuando el sector pasa de media vuelta', () => {
    // SVG necesita que se le diga cual de los dos arcos posibles quiere: sin el
    // indicador dibuja siempre el corto, y un sector de mas de media vuelta
    // saldria al reves.
    //
    // Con la rueda de verdad esto no llega a pasar: con dos apps el sector es de
    // 180 clavados, y con una entra el caso aparte de la corona entera. La
    // guarda esta porque `caminoDeSector` se exporta y puede recibir cualquier
    // sector; se prueba con uno hecho a mano, que es la unica forma honesta.
    const largo = caminoDeSector({ indice: 0, desde: 0, hasta: 200, medio: 100 }, 60, 150, 160);
    expect(largo).toContain('0 1 1');

    const corto = caminoDeSector(elPrimero(8), 60, 150, 160);
    expect(corto).toContain('0 0 1');

    // Y el de dos apps, que es de 180 exactos, se dibuja bien con el corto.
    expect(caminoDeSector(elPrimero(2), 60, 150, 160)).toContain('0 0 1');
  });
});
