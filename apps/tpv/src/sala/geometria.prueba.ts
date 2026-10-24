import { describe, expect, it } from 'vitest';
import { alLado, estirarHasta, girarHasta, moverHasta, moverVariasHasta } from './geometria.ts';

/** Mover, estirar y girar en el editor de la sala, sin un número de centímetros (T2). */
const LIENZO = { ancho: 1000, alto: 625 };
const MESA = { x: 100, y: 100, ancho: 120, fondo: 192, giro: 0 };

describe('el editor de la sala, con el dedo', () => {
  it('mover se pega a la rejilla y no se sale del plano', () => {
    expect(moverHasta(LIENZO, MESA, 33, 0, null).caja.x).toBe(130);
    expect(moverHasta(LIENZO, MESA, 5000, 5000, null).caja).toMatchObject({ x: 880, y: 808 });
  });

  it('mover una sola la pone en fila con las demás', () => {
    const otra = { x: 400, y: 100, ancho: 120, fondo: 192 };
    const { caja, guias } = moverHasta(LIENZO, MESA, 0, 4, [otra]);
    expect(caja.y).toBe(100);
    expect(guias.length).toBeGreaterThan(0);
  });

  it('estirar desde la esquina de abajo a la derecha la agranda, y la de enfrente se queda', () => {
    const estirada = estirarHasta(LIENZO, MESA, 'se', 50, 0);
    expect(estirada.ancho).toBe(170);
    expect(estirada.x).toBe(100);
    const desdeArriba = estirarHasta(LIENZO, MESA, 'no', -50, 0);
    expect(desdeArriba.ancho).toBe(170);
    expect(desdeArriba.x + desdeArriba.ancho).toBe(MESA.x + MESA.ancho);
  });

  it('el asa de arriba gira, y se queda en 90° si se pasa cerca', () => {
    // El centro está en (160, 122,5) px; el dedo, a su derecha: 90°.
    expect(girarHasta(LIENZO, MESA, 400, 125).giro).toBe(90);
    // Justo encima: 0°.
    expect(girarHasta(LIENZO, MESA, 160, 0).giro).toBe(0);
  });

  it('duplicar la pone al lado; varias se mueven juntas sin salirse', () => {
    expect(alLado(MESA)).toEqual({ x: 240, y: 100 });
    const juntas = moverVariasHasta(LIENZO, [MESA, { ...MESA, x: 800 }], 1000, 0);
    expect(Math.max(...juntas.map((c) => c.x + c.ancho))).toBeLessThanOrEqual(1000);
    expect((juntas[1]?.x ?? 0) - (juntas[0]?.x ?? 0)).toBe(700);
  });
});
