import { describe, expect, it, vi } from 'vitest';
import { crearCliente } from './index.ts';

/**
 * Las consultas juntas (0085): el Panel pedía unas diez a la vez, y con mala
 * cobertura cada petición es una espera. Lo que sale a la vez tiene que viajar en
 * **una sola petición**, y cada pantalla recibir **lo mismo que si hubiera ido sola**.
 */

interface Peticion {
  readonly url: string;
  readonly metodo: string;
  readonly cuerpo: unknown;
}

function respuesta(estado: number, cuerpo: unknown): Response {
  return new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

/** Un servidor de mentira: el lote contesta lo que diga `lote`, y lo suelto, su nombre. */
function servidor(lote: (consultas: { nombre: string }[]) => Response) {
  const peticiones: Peticion[] = [];
  const pedir = vi.fn((url: string, init?: RequestInit) => {
    const cuerpo: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    peticiones.push({ url, metodo: init?.method ?? 'GET', cuerpo });
    if (url.endsWith('/consultas/varias')) {
      return Promise.resolve(lote((cuerpo as { consultas: { nombre: string }[] }).consultas));
    }
    const nombre = new URL(url).pathname.split('/').pop() ?? '';
    return Promise.resolve(respuesta(200, { datos: { suelta: nombre } }));
  });
  return { pedir: pedir as unknown as typeof fetch, peticiones };
}

const ELLAS = (consultas: { nombre: string }[]) =>
  respuesta(200, {
    datos: consultas.map((c) =>
      c.nombre === 'la_de_precios'
        ? {
            error: {
              codigo: 'sin_permiso',
              quePasa: 'No tienes permiso.',
              queSePuedeHacer: 'Pídeselo a quien lleva el local.',
              boton: null,
            },
          }
        : { datos: { junta: c.nombre } },
    ),
  });

describe('lo que se pide a la vez viaja junto', () => {
  it('tres consultas a la vez son una sola petición, y cada una recibe lo suyo', async () => {
    const { pedir, peticiones } = servidor(ELLAS);
    const cliente = crearCliente({ base: 'https://api', pedir, juntar: true });

    const [a, b, c] = await Promise.all([
      cliente.consultar('lo_de_hoy'),
      cliente.consultar('un_indicador', { indicador: 'merma', dias: '7' }),
      cliente.consultar('la_de_precios'),
    ]);

    expect(peticiones).toHaveLength(1);
    expect(peticiones[0]?.metodo).toBe('POST');
    expect(peticiones[0]?.cuerpo).toEqual({
      consultas: [
        { nombre: 'lo_de_hoy', parametros: {} },
        { nombre: 'un_indicador', parametros: { indicador: 'merma', dias: '7' } },
        { nombre: 'la_de_precios', parametros: {} },
      ],
    });
    expect(a).toMatchObject({ ok: true, datos: { junta: 'lo_de_hoy' } });
    expect(b).toMatchObject({ ok: true, datos: { junta: 'un_indicador' } });
    // La que no se puede leer, con su error en cristiano, como si hubiera ido sola.
    expect(c).toMatchObject({ ok: false, error: { codigo: 'sin_permiso' } });
  });

  it('una sola sigue yendo sola, por su camino de siempre', async () => {
    const { pedir, peticiones } = servidor(ELLAS);
    const cliente = crearCliente({ base: 'https://api', pedir, juntar: true });
    const una = await cliente.consultar('quien_soy');
    expect(peticiones.map((p) => p.metodo)).toEqual(['GET']);
    expect(una).toMatchObject({ ok: true, datos: { suelta: 'quien_soy' } });
  });

  it('sin `juntar`, cada una va sola', async () => {
    const { pedir, peticiones } = servidor(ELLAS);
    const cliente = crearCliente({ base: 'https://api', pedir });
    await Promise.all([cliente.consultar('a'), cliente.consultar('b')]);
    expect(peticiones.map((p) => p.metodo)).toEqual(['GET', 'GET']);
  });

  it('más de las que caben se parten en varios lotes', async () => {
    const { pedir, peticiones } = servidor(ELLAS);
    const cliente = crearCliente({ base: 'https://api', pedir, juntar: true });
    await Promise.all(Array.from({ length: 30 }, (_, i) => cliente.consultar(`c${i}`)));
    expect(peticiones.map((p) => (p.cuerpo as { consultas: unknown[] }).consultas.length)).toEqual([
      24, 6,
    ]);
  });
});

describe('con una API de antes del lote', () => {
  it('si no conoce el lote (404), van sueltas, y desde entonces ya no lo intenta', async () => {
    const { pedir, peticiones } = servidor(() => respuesta(404, '404 Not Found'));
    const cliente = crearCliente({ base: 'https://api', pedir, juntar: true });

    const [a, b] = await Promise.all([cliente.consultar('a'), cliente.consultar('b')]);
    expect(a).toMatchObject({ ok: true, datos: { suelta: 'a' } });
    expect(b).toMatchObject({ ok: true, datos: { suelta: 'b' } });

    await Promise.all([cliente.consultar('c'), cliente.consultar('d')]);
    expect(peticiones.filter((p) => p.url.endsWith('/varias'))).toHaveLength(1);
  });
});

describe('lo que le pasa al lote entero', () => {
  it('sin red, a cada una le llega «sin conexión», como si hubiera ido sola', async () => {
    const pedir = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    const cliente = crearCliente({ base: 'https://api', pedir, juntar: true });
    const [a, b] = await Promise.all([cliente.consultar('a'), cliente.consultar('b')]);
    expect(a).toMatchObject({ ok: false, error: { codigo: 'sin_conexion' } });
    expect(b).toMatchObject({ ok: false, error: { codigo: 'sin_conexion' } });
  });

  it('si la sesión ha caducado, se avisa una vez aunque lo digan todas', async () => {
    const caducada = {
      error: {
        codigo: 'sin_sesion',
        quePasa: 'Tu sesión ha caducado.',
        queSePuedeHacer: 'Vuelve a entrar.',
        boton: null,
      },
    };
    const { pedir } = servidor(() => respuesta(200, { datos: [caducada, caducada, caducada] }));
    const alCaducarLaSesion = vi.fn();
    const cliente = crearCliente({ base: 'https://api', pedir, juntar: true, alCaducarLaSesion });
    await Promise.all([cliente.consultar('a'), cliente.consultar('b'), cliente.consultar('c')]);
    expect(alCaducarLaSesion).toHaveBeenCalledTimes(1);
  });
});
