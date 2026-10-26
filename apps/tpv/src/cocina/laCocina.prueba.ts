import { describe, expect, it } from 'vitest';
import type { LaPantallaDeCocina, TarjetaDeCocina } from '../datos/tipos.ts';
import {
  elColorDelTiempo,
  elPaseQueAcabaDeMarchar,
  elPlatoQueSigue,
  losAcabados,
  loQueSuena,
} from './laCocina.ts';

const plato = (
  id: string,
  cambios: Partial<TarjetaDeCocina['pases'][number]['platos'][number]> = {},
) => ({
  id,
  nombre: id,
  cantidad: 1,
  nota: null,
  delMenu: false,
  salioEn: null,
  nuevo: false,
  cambio: false,
  anulado: false,
  vuelve: null,
  opciones: [],
  pesoGramos: null,
  ...cambios,
});

function tarjeta(cuentaId: string, cambios: Partial<TarjetaDeCocina> = {}): TarjetaDeCocina {
  return {
    cuentaId,
    titulo: `Mesa ${cuentaId}`,
    tipo: 'mesa',
    personas: 2,
    camarero: 'Lucía',
    camareroId: 'l',
    notaParaCocina: null,
    porPases: true,
    conPrisa: false,
    cocinaLlamaEn: null,
    estado: 'en_marcha',
    anulada: null,
    llegoEn: '2026-10-26T20:00:00Z',
    minutos: 3,
    ultimaMarcha: null,
    fueraEn: null,
    pases: [
      {
        numero: 1,
        marchadoEn: '2026-10-26T20:00:00Z',
        fueraEn: null,
        platos: [plato('a'), plato('b')],
      },
      { numero: 2, marchadoEn: null, fueraEn: null, platos: [plato('c')] },
    ],
    ...cambios,
  };
}

const pantalla = (
  enMarcha: TarjetaDeCocina[],
  fuera: TarjetaDeCocina[] = [],
): LaPantallaDeCocina => ({
  aparato: { nombre: 'Cocina', local: 'IKATZ' },
  ajustes: { avisoMin: 10, tardeMin: 20, suena: true },
  enMarcha,
  esperando: [],
  fuera,
});

describe('la pantalla de cocina', () => {
  it('el color del tiempo: verde, ámbar a los 10 y rojo a los 20', () => {
    const ajustes = { avisoMin: 10, tardeMin: 20 };
    expect(elColorDelTiempo(9, ajustes)).toBe('en_hora');
    expect(elColorDelTiempo(10, ajustes)).toBe('justo');
    expect(elColorDelTiempo(20, ajustes)).toBe('tarde');
  });

  it('lo acabado: lo de los últimos 40 minutos a la vista, lo de antes plegado', () => {
    const ahora = Date.parse('2026-10-26T21:00:00Z');
    const { recientes, plegados } = losAcabados(
      [
        tarjeta('1', { estado: 'fuera', fueraEn: '2026-10-26T20:30:00Z' }),
        tarjeta('2', { estado: 'fuera', fueraEn: '2026-10-26T20:10:00Z' }),
      ],
      ahora,
    );
    expect(recientes.map((t) => t.cuentaId)).toEqual(['1']);
    expect(plegados.map((t) => t.cuentaId)).toEqual(['2']);
  });

  it('qué suena: nada al encender; una mesa nueva; una marcha; y lo que pide mirar ya', () => {
    const antes = pantalla([tarjeta('1')]);
    expect(loQueSuena(undefined, antes)).toBeNull();
    expect(loQueSuena(antes, antes)).toBeNull();
    expect(loQueSuena(antes, pantalla([tarjeta('1'), tarjeta('2')]))).toBe('nueva');
    expect(
      loQueSuena(antes, pantalla([tarjeta('1', { ultimaMarcha: '2026-10-26T20:20:00Z' })])),
    ).toBe('marcha');
    expect(loQueSuena(antes, pantalla([tarjeta('1', { conPrisa: true })]))).toBe('aviso');
    const conAnulado = tarjeta('1', {
      pases: [
        {
          numero: 1,
          marchadoEn: '2026-10-26T20:00:00Z',
          fueraEn: null,
          platos: [plato('a', { anulado: true }), plato('b')],
        },
      ],
    });
    // Lo que pide mirar manda, aunque a la vez entre otra mesa.
    expect(loQueSuena(antes, pantalla([conAnulado, tarjeta('2')]))).toBe('aviso');
  });

  it('el teclado de cocina tacha el siguiente plato de lo que está en marcha', () => {
    expect(elPlatoQueSigue(tarjeta('1'))).toBe('a');
    const conA = tarjeta('1', {
      pases: [
        {
          numero: 1,
          marchadoEn: '2026-10-26T20:00:00Z',
          fueraEn: null,
          platos: [plato('a', { salioEn: '2026-10-26T20:05:00Z' }), plato('b', { anulado: true })],
        },
        { numero: 2, marchadoEn: null, fueraEn: null, platos: [plato('c')] },
      ],
    });
    // Lo anulado no se tacha, y lo que espera a la sala tampoco.
    expect(elPlatoQueSigue(conA)).toBeNull();
  });

  it('«¡MARCHA EL 2.º!» se ve los primeros minutos de la marcha', () => {
    const marchada = tarjeta('1', {
      ultimaMarcha: '2026-10-26T20:20:00Z',
      minutos: 1,
      pases: [
        {
          numero: 1,
          marchadoEn: '2026-10-26T20:00:00Z',
          fueraEn: '2026-10-26T20:15:00Z',
          platos: [],
        },
        { numero: 2, marchadoEn: '2026-10-26T20:20:00Z', fueraEn: null, platos: [plato('c')] },
      ],
    });
    expect(elPaseQueAcabaDeMarchar(marchada)).toBe(2);
    expect(elPaseQueAcabaDeMarchar({ ...marchada, minutos: 6 })).toBeNull();
    expect(elPaseQueAcabaDeMarchar(tarjeta('1'))).toBeNull();
  });
});
