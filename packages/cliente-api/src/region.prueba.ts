import { describe, expect, it, vi } from 'vitest';
import { CABECERA_REGION_DE_LA_BASE, crearCliente } from './index.ts';

/**
 * La región de la base (repaso del 16-oct, 0090): la API corría en París y la base
 * está en Irlanda. La app pide `x-region` **solo cuando la API dice** dónde está su
 * base: con una API de antes no se pide nada, y si algún día la petición no pasa por
 * esa cabecera, se olvida y se repite sin ella.
 */

function respuesta(region: string | null): Response {
  return new Response(JSON.stringify({ datos: { ok: true } }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      ...(region === null ? {} : { [CABECERA_REGION_DE_LA_BASE]: region }),
    },
  });
}

function cabecerasDe(llamada: unknown[]): Record<string, string> {
  return ((llamada[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
}

describe('la región de la base', () => {
  it('con una API que no la dice, no se pide nunca', async () => {
    const pedir = vi.fn((_url: unknown, _init?: RequestInit) => Promise.resolve(respuesta(null)));
    const cliente = crearCliente({ base: 'https://api', pedir });
    await cliente.consultar('quien_soy');
    await cliente.consultar('lo_de_hoy');
    expect(pedir.mock.calls.map((l) => cabecerasDe(l)['x-region'])).toEqual([undefined, undefined]);
  });

  it('en cuanto la API la dice, se pide en las siguientes', async () => {
    const pedir = vi.fn((_url: unknown, _init?: RequestInit) =>
      Promise.resolve(respuesta('eu-west-1')),
    );
    const cliente = crearCliente({ base: 'https://api', pedir });
    await cliente.consultar('quien_soy');
    await cliente.consultar('lo_de_hoy');
    expect(pedir.mock.calls.map((l) => cabecerasDe(l)['x-region'])).toEqual([
      undefined,
      'eu-west-1',
    ]);
  });

  it('lo que no parece una región no se pide', async () => {
    const pedir = vi.fn((_url: unknown, _init?: RequestInit) =>
      Promise.resolve(respuesta('<script>')),
    );
    const cliente = crearCliente({ base: 'https://api', pedir });
    await cliente.consultar('quien_soy');
    await cliente.consultar('lo_de_hoy');
    expect(cabecerasDe(pedir.mock.calls[1] ?? [])['x-region']).toBeUndefined();
  });

  it('si con ella la petición no sale, se olvida y se repite sin ella', async () => {
    let veces = 0;
    const pedir = vi.fn((_url: unknown, init?: RequestInit) => {
      veces += 1;
      const conRegion = (init?.headers as Record<string, string>)['x-region'] !== undefined;
      if (conRegion) return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve(respuesta(veces === 1 ? 'eu-west-1' : null));
    });
    const cliente = crearCliente({ base: 'https://api', pedir });
    await cliente.consultar('quien_soy');
    const segunda = await cliente.consultar('lo_de_hoy');
    expect(segunda.ok).toBe(true);
    expect(pedir.mock.calls.map((l) => cabecerasDe(l)['x-region'])).toEqual([
      undefined,
      'eu-west-1',
      undefined,
    ]);
  });
});
