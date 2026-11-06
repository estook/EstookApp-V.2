import { describe, expect, it } from 'vitest';
import type { LaPantallaDeCocina, TarjetaDeCocina } from '../datos/tipos.ts';
import {
  elColorDelTiempo,
  elPaseQueAcabaDeMarchar,
  elPlatoQueSigue,
  losAcabados,
  loQueSuena,
  loServidoPorLaSala,
  losCambios,
  separarLoProgramado,
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

  it('suena también lo que vuelve de Acabados y lo pedido de más (0117): los postres, otra ronda', () => {
    const acabada = pantalla([], [tarjeta('1', { estado: 'fuera' })]);
    expect(loQueSuena(acabada, pantalla([tarjeta('1')]))).toBe('nueva');
    const conMas = tarjeta('1', {
      pases: [
        ...tarjeta('1').pases,
        { numero: 3, marchadoEn: null, fueraEn: null, platos: [plato('d')] },
      ],
    });
    expect(loQueSuena(pantalla([tarjeta('1')]), pantalla([conMas]))).toBe('nueva');
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

describe('lo de llevar programado (0121)', () => {
  it('se ve aparte hasta veinte minutos antes de su hora, por orden de hora', () => {
    const ahora = Date.parse('2026-10-28T19:00:00Z');
    const ya = tarjeta('1');
    const a2130 = tarjeta('L1', { tipo: 'para_llevar', paraLas: '2026-10-28T21:30:00Z' });
    const a2000 = tarjeta('L2', { tipo: 'para_llevar', paraLas: '2026-10-28T20:00:00Z' });
    const a1915 = tarjeta('L3', { tipo: 'para_llevar', paraLas: '2026-10-28T19:15:00Z' });
    const { ya: hoy, programados } = separarLoProgramado([ya, a2130, a2000, a1915], ahora);
    expect(hoy.map((t) => t.cuentaId)).toEqual(['1', 'L3']);
    expect(programados.map((t) => t.cuentaId)).toEqual(['L2', 'L1']);
  });
});

describe('lo servido por la sala y lo cambiado (0132)', () => {
  const ahora = Date.parse('2026-11-06T21:58:00Z');
  const conPlatos = (platos: ReturnType<typeof plato>[]) =>
    tarjeta('5', {
      pases: [{ numero: 1, marchadoEn: '2026-11-06T21:30:00Z', fueraEn: null, platos }],
    });

  it('«Lucía ha marcado servido», con lo suyo y los minutos que quedan para deshacerlo', () => {
    const t = conPlatos([
      plato('Entrecot', {
        salioEn: '2026-11-06T21:57:30Z',
        servidoEnSala: true,
        servidoPor: 'Lucía',
        cantidad: 2,
      }),
      plato('Merluza', {
        salioEn: '2026-11-06T21:57:00Z',
        servidoEnSala: true,
        servidoPor: 'Lucía',
      }),
      // Lo que tachó la cocina no sale aquí, ni lo de hace más de 5 minutos.
      plato('Bravas', { salioEn: '2026-11-06T21:57:00Z' }),
      plato('Pan', { salioEn: '2026-11-06T21:50:00Z', servidoEnSala: true, servidoPor: 'Lucía' }),
    ]);
    expect(loServidoPorLaSala(t, ahora)).toEqual({
      quien: 'Lucía',
      platos: [
        { id: 'Entrecot', texto: '2 Entrecot' },
        { id: 'Merluza', texto: '1 Merluza' },
      ],
      quedan: 4,
    });
    expect(loServidoPorLaSala(t, ahora + 5 * 60_000)).toBeNull();
  });

  it('«CAMBIO · Ana»: lo de antes y lo nuevo, mientras no salga', () => {
    const t = conPlatos([
      plato('Croquetas', { anulado: true, cambiadoA: 'Bravas', cambioPor: 'Ana' }),
      plato('Bravas', { cambioDe: '1 Croquetas' }),
    ]);
    expect(losCambios(t)).toEqual([
      { id: 'Bravas', texto: '1 Croquetas → 1 Bravas', quien: 'Ana' },
    ]);
    const salida = conPlatos([
      plato('Bravas', { cambioDe: '1 Croquetas', salioEn: '2026-11-06T21:57:00Z' }),
    ]);
    expect(losCambios(salida)).toEqual([]);
  });

  it('un plato cambiado suena como lo anulado: fuerte, que hay que mirarlo', () => {
    const antes = pantalla([conPlatos([plato('Croquetas')])]);
    const ahoraPantalla = pantalla([
      conPlatos([
        plato('Croquetas', { anulado: true, cambiadoA: 'Bravas' }),
        plato('Bravas', { cambioDe: '1 Croquetas' }),
      ]),
    ]);
    expect(loQueSuena(antes, ahoraPantalla)).toBe('aviso');
  });
});
