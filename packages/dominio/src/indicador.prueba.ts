import { describe, expect, it } from 'vitest';
import {
  COMO_ES_EL_INDICADOR,
  INDICADORES,
  PERIODOS_DEL_INDICADOR,
  comoCambia,
  idDelIndicador,
  leerIdDelIndicador,
  nombreDelIndicador,
} from './indicador.ts';

describe('los indicadores del Panel', () => {
  it('cada uno dice cómo es, de dónde sale y si subir es bueno', () => {
    for (const indicador of INDICADORES) {
      const como = COMO_ES_EL_INDICADOR[indicador];
      expect(como.nombre.length, indicador).toBeGreaterThan(0);
      expect(como.deDonde.length, indicador).toBeGreaterThan(0);
    }
  });

  it('el identificador va y vuelve con lo elegido', () => {
    for (const indicador of INDICADORES) {
      for (const dias of PERIODOS_DEL_INDICADOR) {
        const id = idDelIndicador(indicador, dias);
        // Tiene que caber en el formato que guarda el Panel desde la 0025.
        expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(id.length).toBeLessThanOrEqual(60);
        expect(leerIdDelIndicador(id)).toEqual({ indicador, dias });
      }
    }
  });

  it('un identificador que no es de un indicador no se lee como uno', () => {
    expect(leerIdDelIndicador('caducidades')).toBeNull();
    expect(leerIdDelIndicador('indicador-ventas-14')).toBeNull();
    expect(leerIdDelIndicador('indicador-inventado-7')).toBeNull();
  });

  it('el nombre lleva el periodo', () => {
    expect(nombreDelIndicador('ventas', 7)).toBe('Ventas · 7 días');
  });
});

describe('cómo ha cambiado', () => {
  it('las ventas que suben son buena noticia', () => {
    expect(comoCambia('ventas', 1120, 1000)).toEqual({
      sube: true,
      cuanto: 12,
      enPuntos: false,
      bueno: true,
    });
  });

  it('la merma que sube es mala noticia', () => {
    expect(comoCambia('merma', 150, 100)?.bueno).toBe(false);
    expect(comoCambia('merma', 50, 100)?.bueno).toBe(true);
  });

  it('un porcentaje cambia en puntos, no en por ciento de un por ciento', () => {
    // Del 30 % al 33 % son 3 puntos. «Un 10 % más» no lo entiende nadie.
    expect(comoCambia('food-cost', 33, 30)).toEqual({
      sube: true,
      cuanto: 3,
      enPuntos: true,
      bueno: false,
    });
  });

  it('de nada a algo no es un infinito por ciento: no hay flecha', () => {
    expect(comoCambia('ventas', 4000, 0)).toBeNull();
  });

  it('sin uno de los dos, no hay flecha', () => {
    expect(comoCambia('ventas', null, 100)).toBeNull();
    expect(comoCambia('ventas', 100, null)).toBeNull();
  });

  it('igual es igual, sin color', () => {
    expect(comoCambia('ventas', 100, 100)).toEqual({
      sube: null,
      cuanto: 0,
      enPuntos: false,
      bueno: null,
    });
  });

  it('lo neutro sube o baja, pero no es ni bueno ni malo', () => {
    expect(comoCambia('compras', 200, 100)?.bueno).toBeNull();
    expect(comoCambia('mis-horas', 200, 100)?.sube).toBe(true);
  });
});
