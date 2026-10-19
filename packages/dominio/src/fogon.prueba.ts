import { describe, expect, it } from 'vitest';
import { avisoDeLaRevision } from './avisos.ts';
import { CREDITOS_DE_FOGON, casarConUnProducto, centimosDeEuros } from './fogon.ts';

/**
 * Fogón lee y revisa (Fogón 1 · 2 y 1 · 3, decisión 0098): lo que no depende del modelo.
 * Casar lo leído con tus productos, pasar euros a céntimos y decir lo que encontró.
 */

const productos = [
  { id: '1', nombre: 'Tomate pera' },
  { id: '2', nombre: 'Huevos camperos L' },
  { id: '3', nombre: 'Aceite de oliva virgen extra' },
  { id: '4', nombre: 'Vino tinto Rioja' },
];

describe('casar lo leído con uno de tus productos', () => {
  it('el nombre igual, sin mayúsculas ni tildes', () => {
    expect(casarConUnProducto('tomate PERA', productos)?.id).toBe('1');
    expect(casarConUnProducto('Aceite de olivá virgen extra', productos)?.id).toBe('3');
  });

  it('el que más se parece, si se parece lo bastante', () => {
    expect(casarConUnProducto('Huevos camperos talla L', productos)?.id).toBe('2');
    expect(casarConUnProducto('Vino tinto Rioja crianza', productos)?.id).toBe('4');
  });

  it('nada si no se parece a ninguno: casar mal es peor que no casar', () => {
    expect(casarConUnProducto('Servilletas de papel', productos)).toBeNull();
    expect(casarConUnProducto('', productos)).toBeNull();
    expect(casarConUnProducto('Tomate', [])).toBeNull();
  });
});

describe('de euros a céntimos', () => {
  it('redondea al céntimo con el motor del dinero', () => {
    expect(centimosDeEuros(12.5)).toBe(1250);
    expect(centimosDeEuros(8.115)).toBe(812);
  });

  it('lo que no es un importe, nulo: el modelo pone 0 cuando no lo lee', () => {
    expect(centimosDeEuros(0)).toBeNull();
    expect(centimosDeEuros(-3)).toBeNull();
    expect(centimosDeEuros(null)).toBeNull();
    expect(centimosDeEuros(Number.NaN)).toBeNull();
  });
});

describe('lo que gasta cada cosa', () => {
  it('una foto gasta más que un texto, y nada pasa de lo que deja apuntar la base', () => {
    expect(CREDITOS_DE_FOGON.leer_merma_foto).toBeGreaterThan(CREDITOS_DE_FOGON.leer_merma_voz);
    for (const creditos of Object.values(CREDITOS_DE_FOGON)) {
      expect(creditos).toBeGreaterThanOrEqual(1);
      expect(creditos).toBeLessThanOrEqual(20);
    }
  });
});

describe('el aviso de la revisión', () => {
  it('con una cosa, la dice entera', () => {
    expect(avisoDeLaRevision(['«Huevo L» y «Huevos L» parecen el mismo producto.'])).toEqual({
      titulo: 'Fogón ha revisado tus datos: 1 cosa que mirar',
      detalle: '«Huevo L» y «Huevos L» parecen el mismo producto.',
    });
  });

  it('con varias, la primera y cuántas más', () => {
    const dice = avisoDeLaRevision(['Una.', 'Dos.', 'Tres.']);
    expect(dice.titulo).toBe('Fogón ha revisado tus datos: 3 cosas que mirar');
    expect(dice.detalle).toBe('Una. Y 2 más.');
  });
});
