import { describe, expect, it } from 'vitest';
import { comoQuedaAbajo } from './anclaAbajo.ts';

/**
 * Lo que va pegado abajo en el iPhone (repaso del 25-sep). Las cifras son las de un
 * iPhone de 844 px de alto en una app instalada.
 */
describe('comoQuedaAbajo', () => {
  it('con todo en su sitio, ni desfase ni teclado', () => {
    expect(comoQuedaAbajo({ offsetTop: 0, height: 844, scale: 1 }, 844)).toEqual({
      desfase: 0,
      teclado: false,
    });
  });

  it('el visor colgado tras cerrar el teclado baja la barra lo que se ha quedado colgado', () => {
    // Lo de Richi: la barra a media pantalla. El visible sigue 267 px por debajo.
    expect(comoQuedaAbajo({ offsetTop: 267, height: 844, scale: 1 }, 844)).toEqual({
      desfase: 267,
      teclado: false,
    });
  });

  it('con el teclado abierto la barra se aparta, y no se sube encima de él', () => {
    expect(comoQuedaAbajo({ offsetTop: 120, height: 480, scale: 1 }, 844)).toEqual({
      desfase: 0,
      teclado: true,
    });
  });

  it('una barra del navegador que aparece no cuenta como teclado', () => {
    expect(comoQuedaAbajo({ offsetTop: 0, height: 790, scale: 1 }, 844).teclado).toBe(false);
  });

  it('con zoom de dos dedos no se toca nada', () => {
    expect(comoQuedaAbajo({ offsetTop: 300, height: 400, scale: 2 }, 844)).toEqual({
      desfase: 0,
      teclado: false,
    });
  });

  it('los medios píxeles no mueven la barra', () => {
    expect(comoQuedaAbajo({ offsetTop: 0.3, height: 844, scale: 1 }, 844).desfase).toBe(0);
  });
});
