import { describe, expect, it } from 'vitest';
import { dondeVaElChat } from './conElTeclado.ts';

/**
 * Dónde va el chat con el teclado abierto (repaso de C1, 6-oct). Las cifras son las
 * de un iPhone de 844 px de alto con la app en la pantalla de inicio.
 */
describe('el chat con el teclado', () => {
  it('sin teclado, nada: manda el CSS, entre las dos barras', () => {
    expect(dondeVaElChat({ offsetTop: 0, height: 844, scale: 1 }, 844)).toBeNull();
  });

  it('una barra del navegador que asoma no es un teclado', () => {
    expect(dondeVaElChat({ offsetTop: 0, height: 760, scale: 1 }, 844)).toBeNull();
  });

  it('con el teclado, justo lo que se ve encima de él, aunque el iPhone haya empujado la página', () => {
    // Lo que pasó en el móvil de Richi: el teclado se come 336 px y el iPhone sube la
    // página 250 para enseñar la caja. El chat va de 250 a 758, que es lo que se ve.
    expect(dondeVaElChat({ offsetTop: 250, height: 508, scale: 1 }, 844)).toEqual({
      arriba: 250,
      alto: 508,
    });
  });

  it('sin empujar, desde arriba del todo', () => {
    expect(dondeVaElChat({ offsetTop: 0, height: 508.4, scale: 1 }, 844)).toEqual({
      arriba: 0,
      alto: 508,
    });
  });

  it('con zoom de dos dedos no se toca nada', () => {
    expect(dondeVaElChat({ offsetTop: 120, height: 400, scale: 2 }, 844)).toBeNull();
  });

  it('escribiendo en el chat va a lo visible aunque no se vea el teclado (10-oct)', () => {
    // El iPhone de Richi: innerHeight encoge con el teclado y la resta sale cero. Sin
    // este seguro el chat se quedaba entre las dos barras, fuera de la vista.
    expect(dondeVaElChat({ offsetTop: 250, height: 508, scale: 1 }, 508, true)).toEqual({
      arriba: 250,
      alto: 508,
    });
    // Sin escribir y sin teclado a la vista, manda el CSS.
    expect(dondeVaElChat({ offsetTop: 0, height: 844, scale: 1 }, 844, false)).toBeNull();
  });

  it('escribiendo, con zoom de dos dedos tampoco se toca nada', () => {
    expect(dondeVaElChat({ offsetTop: 120, height: 400, scale: 2 }, 844, true)).toBeNull();
  });
});
