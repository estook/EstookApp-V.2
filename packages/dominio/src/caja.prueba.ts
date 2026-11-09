import { describe, expect, it } from 'vitest';
import {
  comoCuadra,
  elCambio,
  elTotalContado,
  esLoContado,
  laDiferenciaEnTexto,
  laLineaDeUnaParte,
  laParte,
  lasFormasEncendidas,
  lasPartesIguales,
  loQueDeberiaHaber,
  loQueSeProponeParaManana,
  nombreDeLaDenominacion,
  porQueNoSeCobra,
  sinLosCeros,
} from './caja.ts';

describe('la caja (0144)', () => {
  it('cuenta billete a billete, como en la maqueta: 722,40 €', () => {
    const contado = {
      '10000': 2,
      '5000': 5,
      '2000': 8,
      '1000': 6,
      '500': 7,
      '200': 4,
      '100': 6,
      '50': 5,
      '20': 3,
      '10': 2,
      '5': 2,
    };
    expect(esLoContado(contado)).toBe(true);
    expect(elTotalContado(contado)).toBe(72240);
  });

  it('no acepta billetes que no existen, ni medios, ni negativos', () => {
    expect(esLoContado({ '300': 1 })).toBe(false);
    expect(esLoContado({ '500': 1.5 })).toBe(false);
    expect(esLoContado({ '500': -1 })).toBe(false);
    expect(esLoContado({ '0500': 1 })).toBe(false);
    expect(esLoContado([1, 2])).toBe(false);
    expect(esLoContado(null)).toBe(false);
    expect(esLoContado({})).toBe(true);
  });

  it('guarda sin los ceros y llama a cada uno por su nombre', () => {
    expect(sinLosCeros({ '500': 0, '200': 3 })).toEqual({ '200': 3 });
    expect(nombreDeLaDenominacion(50000)).toBe('500 €');
    expect(nombreDeLaDenominacion(200)).toBe('2 €');
    expect(nombreDeLaDenominacion(50)).toBe('50 c');
  });

  it('lo que debería haber: fondo + efectivo + metido − sacado − devuelto', () => {
    expect(
      loQueDeberiaHaber({ fondo: 15000, efectivo: 61240, metido: 0, sacado: 3500, devuelto: 0 }),
    ).toBe(72740);
    expect(
      loQueDeberiaHaber({ fondo: 10000, efectivo: 5000, metido: 2000, sacado: 0, devuelto: 1200 }),
    ).toBe(15800);
  });

  it('cuadra en verde, hasta 10 € en ámbar y más en rojo', () => {
    expect(comoCuadra(0)).toBe('cuadra');
    expect(comoCuadra(-500)).toBe('poco');
    expect(comoCuadra(1000)).toBe('poco');
    expect(comoCuadra(-1001)).toBe('mucho');
    expect(laDiferenciaEnTexto(0)).toBe('Cuadra');
    expect(laDiferenciaEnTexto(-500)).toBe('Faltan 5,00 €');
    expect(laDiferenciaEnTexto(230)).toBe('Sobran 2,30 €');
  });

  it('para mañana propone el fondo de siempre, o lo de la última vez, sin pasarse de lo que hay', () => {
    expect(
      loQueSeProponeParaManana({ fondoDeSiempre: 15000, loDeLaUltimaVez: 10000, contado: 72240 }),
    ).toBe(15000);
    expect(
      loQueSeProponeParaManana({ fondoDeSiempre: null, loDeLaUltimaVez: 10000, contado: 72240 }),
    ).toBe(10000);
    expect(
      loQueSeProponeParaManana({ fondoDeSiempre: 15000, loDeLaUltimaVez: null, contado: 9000 }),
    ).toBe(9000);
    expect(
      loQueSeProponeParaManana({ fondoDeSiempre: null, loDeLaUltimaVez: null, contado: 4000 }),
    ).toBe(4000);
  });

  it('las partes iguales suman siempre el total: los céntimos que sobran, a las primeras', () => {
    expect(lasPartesIguales(4850, 4)).toEqual([1213, 1213, 1212, 1212]);
    expect(lasPartesIguales(1000, 3)).toEqual([334, 333, 333]);
    for (const total of [1, 99, 4850, 12345]) {
      for (const n of [2, 3, 7, 20]) {
        expect(lasPartesIguales(total, n).reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
    expect(laParte(4850, 3, 4)).toBe(1212);
  });

  it('el cambio sale de lo entregado en efectivo', () => {
    expect(elCambio([{ forma: 'efectivo', importe: 4850, entregado: 5000 }])).toBe(150);
    expect(
      elCambio([
        { forma: 'efectivo', importe: 2000, entregado: 2000 },
        { forma: 'tarjeta', importe: 2850 },
      ]),
    ).toBe(0);
  });

  it('un cobro solo se hace si los pagos cuadran', () => {
    const encendidas = lasFormasEncendidas({ bizum: false, cheque: true });
    const bien = { importe: 4850, queda: 4850, encendidas };
    expect(porQueNoSeCobra({ ...bien, pagos: [{ forma: 'tarjeta', importe: 4850 }] })).toBeNull();
    expect(porQueNoSeCobra({ ...bien, pagos: [] })).toBe('sin_pagos');
    expect(
      porQueNoSeCobra({
        ...bien,
        pagos: [
          { forma: 'efectivo', importe: 2000, entregado: 2000 },
          { forma: 'tarjeta', importe: 2850 },
        ],
      }),
    ).toBeNull();
    expect(
      porQueNoSeCobra({
        ...bien,
        pagos: [
          { forma: 'tarjeta', importe: 2000 },
          { forma: 'tarjeta', importe: 2850 },
        ],
      }),
    ).toBe('forma_repetida');
    expect(porQueNoSeCobra({ ...bien, pagos: [{ forma: 'bizum', importe: 4850 }] })).toBe(
      'forma_apagada',
    );
    expect(porQueNoSeCobra({ ...bien, pagos: [{ forma: 'tarjeta', importe: 4800 }] })).toBe(
      'no_suma',
    );
    expect(
      porQueNoSeCobra({ ...bien, pagos: [{ forma: 'efectivo', importe: 4850, entregado: 2000 }] }),
    ).toBe('entregado_corto');
    expect(
      porQueNoSeCobra({ ...bien, pagos: [{ forma: 'tarjeta', importe: 4850, entregado: 5000 }] }),
    ).toBe('entregado_sin_efectivo');
    expect(
      porQueNoSeCobra({ ...bien, queda: 3000, pagos: [{ forma: 'tarjeta', importe: 4850 }] }),
    ).toBe('mas_de_lo_que_queda');
    expect(
      porQueNoSeCobra({
        importe: 300001,
        queda: 400000,
        encendidas,
        pagos: [{ forma: 'tarjeta', importe: 300001 }],
      }),
    ).toBe('ticket_demasiado_grande');
  });

  it('efectivo y tarjeta siempre; Bizum y cheque si se encienden', () => {
    expect(lasFormasEncendidas({ bizum: false, cheque: false })).toEqual(['efectivo', 'tarjeta']);
    expect(lasFormasEncendidas({ bizum: true, cheque: true })).toEqual([
      'efectivo',
      'tarjeta',
      'bizum',
      'cheque',
    ]);
  });

  it('la línea de una parte igual dice el servicio y la parte', () => {
    expect(laLineaDeUnaParte('Mesa 12', 1, 4)).toBe(
      'Servicio de restauración · Mesa 12 · parte 1 de 4',
    );
  });
});
