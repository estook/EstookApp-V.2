import { describe, expect, it } from 'vitest';
import { avisoDeLaRevision } from './avisos.ts';
import { BUSQUEDAS_POR_ANALISIS } from './tu-zona.ts';
import {
  CREDITOS_AL_MES,
  CREDITOS_DE_FOGON,
  MODELO_DE_FOGON,
  PARTE_DEL_MES_AL_DIA,
  TOPE_EN_EUROS,
  casarConUnProducto,
  centimosDeEuros,
  costeEnMicroEuros,
} from './fogon.ts';

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
    // Buscar en internet, lo que más (0104): y cabe en el día de Esencial (10, desde la 0135).
    expect(CREDITOS_DE_FOGON.analizar_zona).toBe(Math.max(...Object.values(CREDITOS_DE_FOGON)));
    expect(CREDITOS_DE_FOGON.analizar_zona).toBeLessThanOrEqual(CREDITOS_AL_MES.esencial / 10);
    for (const creditos of Object.values(CREDITOS_DE_FOGON)) {
      expect(creditos).toBeGreaterThanOrEqual(1);
      expect(creditos).toBeLessThanOrEqual(30);
    }
  });
});

describe('la IA a un tercio (0135)', () => {
  it('100 créditos en Esencial, 500 en Pro y Cadena, y 1,65 € al mes por local', () => {
    expect(CREDITOS_AL_MES).toEqual({ esencial: 100, pro: 500, cadena: 500, pausa: 0 });
    expect(TOPE_EN_EUROS.mes).toBe(1_650_000);
    expect(TOPE_EN_EUROS.dia).toBe(TOPE_EN_EUROS.mes / PARTE_DEL_MES_AL_DIA);
  });

  it('un análisis de la zona, con todas sus búsquedas, cabe en el tope de un día', () => {
    const analisis = costeEnMicroEuros(MODELO_DE_FOGON, {
      entrada: 30_000,
      cacheLeidos: 0,
      cacheEscritos: 0,
      salida: 4_000,
      busquedas: BUSQUEDAS_POR_ANALISIS,
    });
    expect(analisis).toBeLessThan(TOPE_EN_EUROS.dia);
  });
});

describe('lo que cuesta buscar en internet', () => {
  it('cada búsqueda, un céntimo de dólar además de los tokens', () => {
    const tokens = { entrada: 0, cacheLeidos: 0, cacheEscritos: 0, salida: 0 };
    expect(costeEnMicroEuros('claude-haiku-5-5', { ...tokens, busquedas: 10 })).toBe(90_000);
    expect(costeEnMicroEuros('claude-haiku-5-5', tokens)).toBe(0);
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
