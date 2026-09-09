import { describe, expect, it } from 'vitest';
import {
  CONTRASTE_DE_ICONO,
  CONTRASTE_DE_TEXTO,
  ajustarHasta,
  contraste,
  derivarAcento,
  esColorHex,
  loQueSeLeeEncima,
  mezclar,
  type DondeSePinta,
} from './color.ts';

/**
 * Que elegir un color no pueda romper la pantalla.
 *
 * Estas pruebas no comprueban que los colores sean bonitos: comprueban que
 * **ninguno de los que alguien puede elegir deja un texto ilegible**. Es la
 * misma idea que `contraste.prueba.ts` —que mide la paleta de fábrica— aplicada
 * a la parte que no se puede medir de antemano: el color que traiga el local.
 */

/** Los dos sitios donde se pinta, con los valores de `temas.css`. */
const CLARO: DondeSePinta = { superficie: '#ffffff', texto: '#111c1f', oscuro: '#111c1f' };
const OSCURO: DondeSePinta = { superficie: '#182124', texto: '#eef2f3', oscuro: '#26333a' };

/**
 * Colores de verdad, elegidos para hacer daño.
 *
 * Los seis que propone el alta, más los que rompen: amarillo puro (clarísimo),
 * negro, blanco, un azul casi negro, un rosa clarísimo y un gris justo en medio,
 * que es el que no contrasta con nada.
 */
const A_PROBAR = [
  '#ff7a00',
  '#8a3b12',
  '#0d5c63',
  '#1f3a5f',
  '#5c1a33',
  '#3f4b32',
  '#ffff00',
  '#000000',
  '#ffffff',
  '#010b2a',
  '#ffd9ec',
  '#7f7f7f',
];

describe('la aritmética de color', () => {
  it('reconoce un color y rechaza lo que no lo es', () => {
    expect(esColorHex('#ff7a00')).toBe(true);
    expect(esColorHex('#FF7A00')).toBe(true);
    expect(esColorHex('#f70')).toBe(false);
    expect(esColorHex('rojo')).toBe(false);
    expect(esColorHex(null)).toBe(false);
  });

  it('mide el contraste como manda WCAG', () => {
    // Los dos extremos conocidos: el máximo es 21 y un color consigo mismo es 1.
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contraste('#ff7a00', '#ff7a00')).toBeCloseTo(1, 5);
  });

  it('mezcla sin salirse por ninguno de los dos lados', () => {
    expect(mezclar('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mezclar('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mezclar('#000000', '#ffffff', 0.5)).toBe('#808080');
    // Y no explota si le mandan un número de fuera.
    expect(mezclar('#000000', '#ffffff', 5)).toBe('#ffffff');
  });
});

describe('lo que se lee encima de un color', () => {
  it('elige midiendo, no suponiendo', () => {
    // El caso que justifica la función: sobre amarillo puro, el blanco da 1,07.
    expect(loQueSeLeeEncima('#ffff00')).toBe('#111c1f');
    expect(loQueSeLeeEncima('#1f3a5f')).toBe('#ffffff');
  });

  it('elige el mejor de los dos, siempre', () => {
    for (const color of A_PROBAR) {
      const encima = loQueSeLeeEncima(color);
      const elOtro = encima === '#ffffff' ? '#111c1f' : '#ffffff';
      expect(contraste(encima, color), `sobre ${color}`).toBeGreaterThanOrEqual(
        contraste(elOtro, color),
      );
    }
  });

  it('pero «el mejor» no siempre basta, y por eso el acento se mueve', () => {
    // Un gris del 50 % da 3,95 con el blanco y 4,34 con el charcoal: **ninguno
    // llega a 4,5**. No hay texto que se lea sobre un gris medio, así que la
    // garantía no puede estar aquí. Está en `derivarAcento`, que empuja el color
    // hasta que sí. Esta prueba existe para que quede claro dónde vive cada cosa.
    const gris = '#7f7f7f';
    expect(contraste(loQueSeLeeEncima(gris), gris)).toBeLessThan(CONTRASTE_DE_TEXTO);

    const { acento, sobreAcento } = derivarAcento(gris, CLARO);
    expect(acento).not.toBe(gris);
    expect(contraste(sobreAcento, acento)).toBeGreaterThanOrEqual(CONTRASTE_DE_TEXTO);
  });
});

describe('ajustar un color hasta que cumpla', () => {
  it('no toca el que ya cumple', () => {
    expect(ajustarHasta('#1f3a5f', '#ffffff', CONTRASTE_DE_ICONO)).toBe('#1f3a5f');
  });

  it('oscurece sobre claro y aclara sobre oscuro', () => {
    // Un amarillo sobre blanco no se ve; sobre la superficie oscura, sí.
    expect(ajustarHasta('#ffff00', '#ffffff', CONTRASTE_DE_ICONO)).not.toBe('#ffff00');
    expect(ajustarHasta('#ffff00', '#182124', CONTRASTE_DE_ICONO)).toBe('#ffff00');
  });
});

describe('el acento que sale de un color de marca', () => {
  for (const [comoSeLlama, donde] of [
    ['en claro', CLARO],
    ['en oscuro', OSCURO],
  ] as const) {
    it(`${comoSeLlama}, los cuatro cumplen su mínimo con cualquier color`, () => {
      for (const marca of A_PROBAR) {
        const { acento, sobreAcento, acentoSuave, acentoEnOscuro } = derivarAcento(marca, donde);

        expect(contraste(acento, donde.superficie), `acento de ${marca}`).toBeGreaterThanOrEqual(
          CONTRASTE_DE_ICONO,
        );
        expect(contraste(sobreAcento, acento), `texto sobre ${marca}`).toBeGreaterThanOrEqual(
          CONTRASTE_DE_TEXTO,
        );
        expect(contraste(donde.texto, acentoSuave), `pastilla de ${marca}`).toBeGreaterThanOrEqual(
          CONTRASTE_DE_TEXTO,
        );
        // Y el icono del acento, que va al lado del texto en la pastilla.
        expect(
          contraste(acento, acentoSuave),
          `icono en la pastilla de ${marca}`,
        ).toBeGreaterThanOrEqual(CONTRASTE_DE_ICONO);
        expect(
          contraste(acentoEnOscuro, donde.oscuro),
          `«Deshacer» con ${marca}`,
        ).toBeGreaterThanOrEqual(CONTRASTE_DE_TEXTO);
      }
    });
  }

  it('avisa cuando ha tenido que tocar el color elegido', () => {
    // El naranja de Estook sobre blanco no llega a 3:1, así que se ajusta. Es lo
    // que hay que poder contar en Ajustes: «se ha oscurecido para que se lea».
    expect(derivarAcento('#ff7a00', CLARO).seAjusto).toBe(true);
    expect(derivarAcento('#1f3a5f', CLARO).seAjusto).toBe(false);
  });

  it('y el tinte se parece al color elegido, no es un gris', () => {
    // Si el bucle que aclara el tinte se pasara, acabaría siendo la superficie y
    // la pastilla seleccionada no se distinguiría de una sin seleccionar.
    const { acentoSuave } = derivarAcento('#1f3a5f', CLARO);
    expect(acentoSuave).not.toBe(CLARO.superficie);
    expect(contraste(acentoSuave, CLARO.superficie)).toBeGreaterThan(1.03);
  });
});
