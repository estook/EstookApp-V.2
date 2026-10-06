import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Respuesta } from '@estook/cliente-api';
import {
  laCola,
  mandarCuandoSePueda,
  olvidar,
  reintentar,
  vaciarLaCola,
  type PorMandar,
} from './porMandar.ts';

/**
 * Lo escrito sale al momento y se manda por detrás (repaso de C1, 6-oct): en orden,
 * sin duplicar al reintentar, y sin que uno que falla frene a los demás.
 */

function escrito(clave: string, texto: string): PorMandar {
  return {
    clave,
    canalId: 'canal-1',
    texto,
    adjunto: null,
    respondeA: null,
    en: '2026-10-06T21:38:00.000Z',
    estado: 'mandando',
    error: null,
    mensajeId: null,
  };
}

const SIN_RED = {
  ok: false,
  correlacionId: 'c',
  error: { codigo: 'sin_conexion', quePasa: 'No hay conexión.', queSePuedeHacer: '' },
} as Respuesta<{ mensajeId: string }>;

const NO_VALE = {
  ok: false,
  correlacionId: 'c',
  error: { codigo: 'faltan_datos', quePasa: 'Ese fichero no vale.', queSePuedeHacer: '' },
} as Respuesta<{ mensajeId: string }>;

function llega(mensajeId: string): Respuesta<{ mensajeId: string }> {
  return { ok: true, correlacionId: 'c', datos: { mensajeId } };
}

/** Lo que hace la conversación al llegar; aquí, nada. */
const nada = (): Promise<void> => Promise.resolve();

/** Deja que la cola dé sus vueltas. */
async function esperar(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

afterEach(() => {
  vaciarLaCola();
  vi.useRealTimers();
});

describe('lo que va de camino', () => {
  it('sale en la cola al momento, antes de que conteste el servidor', async () => {
    let contestar: (r: Respuesta<{ mensajeId: string }>) => void = () => undefined;
    mandarCuandoSePueda(
      escrito('a', 'Hola'),
      () =>
        new Promise((resolver) => {
          contestar = resolver;
        }),
      nada,
    );
    expect(laCola().map((p) => [p.clave, p.estado, p.mensajeId])).toEqual([
      ['a', 'mandando', null],
    ]);
    contestar(llega('17'));
    await esperar();
    expect(laCola()[0]?.mensajeId).toBe('17');
  });

  it('se mandan en el orden en que se escribieron, de uno en uno', async () => {
    const orden: string[] = [];
    let enVuelo = 0;
    let maximo = 0;
    const mandar = (texto: string) => async () => {
      enVuelo += 1;
      maximo = Math.max(maximo, enVuelo);
      await Promise.resolve();
      orden.push(texto);
      enVuelo -= 1;
      return llega(texto);
    };
    mandarCuandoSePueda(escrito('a', 'uno'), mandar('uno'), nada);
    mandarCuandoSePueda(escrito('b', 'dos'), mandar('dos'), nada);
    mandarCuandoSePueda(escrito('c', 'tres'), mandar('tres'), nada);
    await esperar();
    await esperar();
    expect(orden).toEqual(['uno', 'dos', 'tres']);
    expect(maximo).toBe(1);
  });

  it('sin red espera, y al volver se manda con la misma clave: no se duplica', async () => {
    vi.useFakeTimers();
    const claves: string[] = [];
    let hayRed = false;
    mandarCuandoSePueda(
      escrito('a', 'Hola'),
      (clave) => {
        claves.push(clave);
        return Promise.resolve(hayRed ? llega('20') : SIN_RED);
      },
      nada,
    );
    await esperar();
    expect(laCola()[0]?.estado).toBe('sin_red');
    hayRed = true;
    await vi.advanceTimersByTimeAsync(5_000);
    await esperar();
    expect(laCola()[0]?.mensajeId).toBe('20');
    expect(claves).toEqual(['a', 'a']);
  });

  it('si el servidor dice que no, se queda en rojo y los demás siguen', async () => {
    mandarCuandoSePueda(escrito('a', 'foto rota'), () => Promise.resolve(NO_VALE), nada);
    mandarCuandoSePueda(escrito('b', 'Hola'), () => Promise.resolve(llega('21')), nada);
    await esperar();
    await esperar();
    const [rota, buena] = laCola();
    expect(rota?.estado).toBe('fallo');
    expect(rota?.error?.quePasa).toBe('Ese fichero no vale.');
    expect(buena?.mensajeId).toBe('21');
  });

  it('«Reintentar» lo vuelve a mandar, y «Quitar» lo saca de la cola', async () => {
    let vale = false;
    mandarCuandoSePueda(
      escrito('a', 'Hola'),
      () => Promise.resolve(vale ? llega('22') : NO_VALE),
      nada,
    );
    await esperar();
    expect(laCola()[0]?.estado).toBe('fallo');
    vale = true;
    reintentar('a');
    await esperar();
    expect(laCola()[0]?.mensajeId).toBe('22');
    olvidar(['a']);
    expect(laCola()).toEqual([]);
  });

  it('al llegar, refresca la conversación', async () => {
    const refrescar = vi.fn(nada);
    mandarCuandoSePueda(escrito('a', 'Hola'), () => Promise.resolve(llega('23')), refrescar);
    await esperar();
    expect(refrescar).toHaveBeenCalledTimes(1);
  });
});
