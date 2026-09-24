import { describe, expect, it } from 'vitest';
import { LADO_DE_LA_FOTO, elCuadradoDelCentro, loQueCabe } from './reducirFoto.ts';

/**
 * Las cuentas de reducir una foto de producto (entrega V, punto 5).
 *
 * El lienzo y la codificación son del navegador y se miran en la prueba de
 * pantalla; lo que se puede equivocar en silencio son estas dos cuentas: una
 * foto estirada o deformada no rompe nada, solo se ve mal en la ficha de todos.
 */
describe('reducir una foto', () => {
  it('una foto del móvil, en vertical, cabe en 800 sin deformarse', () => {
    // 3024 × 4032 es la cámara de un iPhone.
    expect(loQueCabe(3024, 4032, LADO_DE_LA_FOTO)).toEqual({ ancho: 600, alto: 800 });
    expect(loQueCabe(4032, 3024, LADO_DE_LA_FOTO)).toEqual({ ancho: 800, alto: 600 });
  });

  it('una foto pequeña no se agranda', () => {
    expect(loQueCabe(320, 240, LADO_DE_LA_FOTO)).toEqual({ ancho: 320, alto: 240 });
  });

  it('nunca da cero píxeles, ni con una tira de una línea', () => {
    expect(loQueCabe(8000, 3, LADO_DE_LA_FOTO)).toEqual({ ancho: 800, alto: 1 });
  });

  it('la miniatura es el cuadrado del centro', () => {
    expect(elCuadradoDelCentro(4032, 3024)).toEqual({ x: 504, y: 0, lado: 3024 });
    expect(elCuadradoDelCentro(3024, 4032)).toEqual({ x: 0, y: 504, lado: 3024 });
    expect(elCuadradoDelCentro(500, 500)).toEqual({ x: 0, y: 0, lado: 500 });
  });
});
