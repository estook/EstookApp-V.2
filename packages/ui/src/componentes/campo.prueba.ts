import { describe, expect, it } from 'vitest';
import { enEuros } from '@estook/dominio';
import { aCentimos } from './Campo.tsx';

/**
 * M3 · el campo de moneda.
 *
 * «Regla 9: **nunca se guarda dinero en coma flotante**. Centimos en entero.»
 *
 * El sitio por donde la regla 9 se rompe de verdad no es el motor de dinero, que
 * ya esta probado desde M2: es **el campo donde alguien teclea un precio**. Ahi
 * es donde «12,30» se convierte en 12.299999999999999 si se hace con
 * `parseFloat`, y donde un escandallo empieza a descuadrar un centimo.
 *
 * Por eso `aCentimos` trabaja con cadenas hasta el ultimo paso.
 */
describe('aCentimos', () => {
  it('lo normal', () => {
    expect(aCentimos('12,30')).toBe(1230);
    expect(aCentimos('0,99')).toBe(99);
    expect(aCentimos('100')).toBe(10_000);
    expect(aCentimos('0')).toBe(0);
  });

  it('con un solo decimal, lo completa', () => {
    expect(aCentimos('12,3')).toBe(1230);
    expect(aCentimos('0,5')).toBe(50);
  });

  it('acepta el punto como coma, porque hay teclados que solo tienen punto', () => {
    expect(aCentimos('12.30')).toBe(1230);
    expect(aCentimos('12.3')).toBe(1230);
  });

  it('los espacios sobran', () => {
    expect(aCentimos(' 12,30 ')).toBe(1230);
  });

  it('un importe negativo se puede: hay abonos y hay ajustes', () => {
    expect(aCentimos('-12,30')).toBe(-1230);
    expect(aCentimos('-0,05')).toBe(-5);
  });

  it('sin escribir nada no hay importe, y eso NO es cero', () => {
    // Es importante: cero es un precio, «vacio» es que no se ha puesto. Si el
    // campo devolviera cero, un producto sin precio parecerian ser gratis.
    expect(aCentimos('')).toBeNull();
    expect(aCentimos('   ')).toBeNull();
    expect(aCentimos('-')).toBeNull();
  });

  it('lo que no es un importe no se cuela', () => {
    expect(aCentimos('doce')).toBeNull();
    expect(aCentimos('12,345')).toBeNull();
    expect(aCentimos('1,2,3')).toBeNull();
    expect(aCentimos('12$')).toBeNull();
  });

  it('mientras se escribe, los pasos intermedios valen', () => {
    // Se teclea «1», «12», «12,», «12,3», «12,30»: si un paso intermedio
    // devolviera null, el campo se vaciaria solo al escribir la coma.
    expect(aCentimos('1')).toBe(100);
    expect(aCentimos('12')).toBe(1200);
    expect(aCentimos('12,')).toBe(1200);
    expect(aCentimos(',5')).toBe(50);
  });
});

describe('ida y vuelta', () => {
  it('lo que sale del campo vuelve a entrar igual', () => {
    // Es la propiedad que de verdad importa: escribir un precio, guardarlo,
    // volver a abrirlo y que sea el mismo. Sin esto, editar un producto tres
    // veces le cambiaria el precio.
    for (const centimos of [0, 1, 5, 99, 100, 1230, 99_999, 1_000_000, -1230]) {
      const escrito = enEuros(centimos as never);
      expect(aCentimos(escrito)).toBe(centimos);
    }
  });

  it('lo que teclea una persona no pasa nunca por coma flotante', () => {
    // El caso clasico: 0,1 + 0,2 en coma flotante no da 0,3. Aqui son enteros,
    // asi que se suman como enteros y da exacto.
    const diez = aCentimos('0,10') ?? 0;
    const veinte = aCentimos('0,20') ?? 0;
    expect(diez + veinte).toBe(30);
  });
});

describe('el punto, que es ambiguo', () => {
  it('con coma delante, los puntos son de miles', () => {
    expect(aCentimos('10.000,50')).toBe(1_000_050);
    expect(aCentimos('1.234.567,89')).toBe(123_456_789);
  });

  it('sin coma, un punto con tres digitos detras es de miles', () => {
    expect(aCentimos('10.000')).toBe(1_000_000);
    expect(aCentimos('1.234')).toBe(123_400);
  });

  it('sin coma, un punto con uno o dos digitos detras es decimal', () => {
    // Un teclado de movil que solo tiene punto.
    expect(aCentimos('12.30')).toBe(1230);
    expect(aCentimos('12.3')).toBe(1230);
  });

  it('el simbolo del euro, si se cuela pegando, no molesta', () => {
    expect(aCentimos('12,30 €')).toBe(1230);
  });
});
