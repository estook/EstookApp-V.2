import { describe, expect, it } from 'vitest';
import {
  DIAS_DE_OFERTA_MAXIMOS,
  DIAS_DE_OFERTA_MINIMOS,
  DIAS_DE_OFERTA_POR_DEFECTO,
  PLANES,
  codigoDeRegistro,
  esCodigoDeRegistro,
  planPorCodigo,
} from './registro.ts';

describe('el código que llega por correo', () => {
  it('son seis cifras, siempre, incluidas las que empiezan por cero', () => {
    for (let i = 0; i < 2_000; i++) {
      expect(esCodigoDeRegistro(codigoDeRegistro())).toBe(true);
    }
  });

  it('y no se repite de una vez a otra', () => {
    const vistos = new Set(Array.from({ length: 200 }, () => codigoDeRegistro()));
    // Con un millón de códigos posibles, doscientos iguales no salen por azar.
    expect(vistos.size).toBeGreaterThan(190);
  });

  it('lo que no tiene seis cifras no es un código', () => {
    expect(esCodigoDeRegistro('12345')).toBe(false);
    expect(esCodigoDeRegistro('1234567')).toBe(false);
    expect(esCodigoDeRegistro('12a456')).toBe(false);
  });
});

describe('la oferta de prueba', () => {
  it('los doce días de Richi caben entre el mínimo y el máximo', () => {
    expect(DIAS_DE_OFERTA_POR_DEFECTO).toBe(12);
    expect(DIAS_DE_OFERTA_POR_DEFECTO).toBeGreaterThanOrEqual(DIAS_DE_OFERTA_MINIMOS);
    expect(DIAS_DE_OFERTA_POR_DEFECTO).toBeLessThanOrEqual(DIAS_DE_OFERTA_MAXIMOS);
  });
});

describe('los planes', () => {
  it('son los del Manifiesto, con el IVA incluido', () => {
    expect(planPorCodigo('esencial')?.alMesPorLocal).toBe(4_900);
    expect(planPorCodigo('pro')?.alMesPorLocal).toBe(7_900);
    expect(planPorCodigo('cadena')?.alMesPorLocal).toBe(6_900);
    expect(planPorCodigo('pausa')?.alMesPorLocal).toBe(1_200);
  });

  it('el anual son diez meses: dos gratis', () => {
    for (const plan of PLANES) {
      if (plan.alAnoPorLocal === null) continue;
      expect(plan.alAnoPorLocal, plan.codigo).toBe(plan.alMesPorLocal * 10);
    }
  });

  it('el dinero va en céntimos enteros (regla 9)', () => {
    for (const plan of PLANES) {
      expect(Number.isInteger(plan.alMesPorLocal)).toBe(true);
    }
  });

  it('cadena es de 2 a 10 locales', () => {
    expect(planPorCodigo('cadena')?.localesDesde).toBe(2);
    expect(planPorCodigo('cadena')?.localesHasta).toBe(10);
  });
});
