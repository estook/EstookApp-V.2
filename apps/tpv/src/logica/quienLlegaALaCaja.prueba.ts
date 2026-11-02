import { describe, expect, it } from 'vitest';
import type { UnAparato } from '../datos/tipos.ts';
import {
  comoSeDice,
  cuantosSiguen,
  elEstado,
  hayCentro,
  windowsNoLaDeja,
} from './quienLlegaALaCaja.ts';

/**
 * Ajustes del TPV › Aparatos, con la caja de centro (T5 · 2 · 2 · 2, 0124): lo de la maqueta de
 * T5 · 2, sección 3 —«4 de 5 siguen sin internet»— y la de la caja de centro, secciones 1 a 3.
 */

function aparato(id: string, mas: Partial<UnAparato>): UnAparato {
  return {
    id,
    nombre: id,
    funcion: 'comandero',
    dueno: null,
    cajon: null,
    enLinea: true,
    vistoEn: null,
    version: null,
    vale: true,
    sistema: null,
    camino: null,
    esElCentro: false,
    centroPor: null,
    ...mas,
  };
}

const LA_MAQUETA = [
  aparato('Caja 1', { funcion: 'caja', sistema: 'windows', esElCentro: true, centroPor: 'cable' }),
  aparato('Cocina', { funcion: 'cocina', sistema: 'android', camino: 'llega' }),
  aparato('Móvil de Lucía', { sistema: 'android', camino: 'llega' }),
  aparato('Móvil de Marcos', { sistema: 'ios', camino: 'guarda_lo_suyo' }),
  aparato('Tablet terraza', { sistema: 'android', camino: 'sin_permiso' }),
];

describe('quién llega a la caja, en Aparatos', () => {
  it('«4 de 5 siguen sin internet»: el centro, quien llega y el iPhone que guarda lo suyo', () => {
    expect(hayCentro(LA_MAQUETA)).toBe(true);
    expect(cuantosSiguen(LA_MAQUETA)).toBe('4 de 5 siguen sin internet');
  });

  it('no cuentan el aparato de fichar, ni el que ya no vale; un iPad de cocina no sigue', () => {
    expect(
      cuantosSiguen([
        ...LA_MAQUETA,
        aparato('Fichar', { funcion: 'fichar' }),
        aparato('Móvil de Sara', { camino: 'llega', vale: false }),
        aparato('iPad cocina', { funcion: 'cocina', sistema: 'ios', camino: 'guarda_lo_suyo' }),
      ]),
    ).toBe('4 de 6 siguen sin internet');
  });

  it('sin caja de centro no hay nada que decir', () => {
    expect(hayCentro(LA_MAQUETA.slice(1))).toBe(false);
  });

  it('cada línea, como en la maqueta', () => {
    const [caja, cocina, lucia, marcos, terraza] = LA_MAQUETA;
    if (!caja || !cocina || !lucia || !marcos || !terraza) throw new Error('falta uno');
    expect(comoSeDice(caja, true, 'Caja')).toBe('Este · la caja para Windows · por cable');
    expect(comoSeDice(cocina, false, 'Pantalla de cocina')).toBe(
      'Tablet Android · pantalla de cocina',
    );
    expect(comoSeDice(lucia, false, 'Comandero para todos')).toBe('Android · comandero para todos');
    expect(comoSeDice(marcos, false, 'Comandero para todos')).toBe('iPhone · comandero para todos');
    expect(comoSeDice(terraza, false, 'Comandero para todos')).toBe(
      'Android · comandero para todos · sin el permiso de Chrome',
    );
    expect(
      comoSeDice(
        aparato('Móvil de Ana', { sistema: 'android', camino: 'con_datos' }),
        false,
        'Comandero',
      ),
    ).toBe('Android · comandero · con datos');
  });

  it('a la derecha: si llega, qué le pasa, o «Cómo darlo»', () => {
    const [caja, cocina, , marcos, terraza] = LA_MAQUETA;
    if (!caja || !cocina || !marcos || !terraza) throw new Error('falta uno');
    expect(elEstado(caja)).toEqual({ texto: 'Es el centro', tono: 'bien' });
    expect(elEstado(cocina)).toEqual({ texto: 'Llega a la caja', tono: 'bien' });
    expect(elEstado(marcos)).toEqual({ texto: 'Guarda lo suyo', tono: 'tenue' });
    expect(elEstado(terraza)).toBe('como_darlo');
    expect(elEstado(aparato('Ana', { camino: 'con_datos' }))).toEqual({
      texto: 'No llegaría a la caja',
      tono: 'atencion',
    });
    expect(elEstado(aparato('Ana', { camino: 'no_llega' }))).toEqual({
      texto: 'No llega a la caja',
      tono: 'atencion',
    });
    // Una versión de antes que no dice cómo llega: se dice si está en línea, como siempre.
    expect(elEstado(aparato('Viejo', {}))).toBeNull();
  });

  it('Windows no la deja escuchar: solo si no es por la red pública, que tiene su propio aviso', () => {
    const conWindows = (publica: boolean, cortafuegos: 'deja' | 'no_deja') => ({
      escucha: true,
      direcciones: [],
      porque: null,
      porImprimir: 0,
      windows: { red: { nombre: 'Wifi Bar Pepe', por: 'wifi' as const, publica }, cortafuegos },
    });
    expect(windowsNoLaDeja(conWindows(false, 'no_deja'))).toBe(true);
    expect(windowsNoLaDeja(conWindows(true, 'no_deja'))).toBe(false);
    expect(windowsNoLaDeja(conWindows(false, 'deja'))).toBe(false);
    expect(windowsNoLaDeja(null)).toBe(false);
  });
});
