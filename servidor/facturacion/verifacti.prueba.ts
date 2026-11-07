import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifactiDeVerdad, type Verifacti } from './verifacti.ts';

/**
 * **El Verifacti de verdad, con la red de mentira** (0138). Lo que contesta sale de su especificación
 * (`verifactu.min.yaml` y `nifs.min.yaml`, leídas el 7-nov): el de mentira no prueba que hablemos su
 * idioma, y hasta aquí esto no lo miraba nadie. El camino de los avisos no había corrido nunca.
 */

interface UnaLlamada {
  readonly metodo: string;
  readonly camino: string;
  readonly cuerpo: unknown;
  readonly clave: string | null;
}

type Respuesta = readonly [estado: number, cuerpo?: unknown];

let llamadas: UnaLlamada[];
let contesta: (metodo: string, camino: string) => Respuesta;

beforeEach(() => {
  llamadas = [];
  vi.stubGlobal('fetch', (url: string, opciones: RequestInit) => {
    const direccion = new URL(url);
    const camino = `${direccion.pathname}${direccion.search}`;
    const metodo = opciones.method ?? 'GET';
    const cabeceras = opciones.headers as Record<string, string>;
    llamadas.push({
      metodo,
      camino,
      cuerpo: typeof opciones.body === 'string' ? JSON.parse(opciones.body) : undefined,
      clave: cabeceras['Authorization'] ?? null,
    });
    if (camino.startsWith('/nifs/keys/')) {
      return Promise.resolve(Response.json({ api_key: 'vf_test_del_nif' }));
    }
    const [estado, cuerpo] = contesta(metodo, camino);
    return Promise.resolve(new Response(JSON.stringify(cuerpo ?? {}), { status: estado }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const elDeVerdad = (): Verifacti => {
  const v = verifactiDeVerdad('vfn_la_de_la_cuenta');
  if (v === null) throw new Error('Sin clave');
  return v;
};

const sinLaClave = () => llamadas.filter((l) => !l.camino.startsWith('/nifs/keys/'));

describe('el estado de un registro', () => {
  it('su respuesta no trae el uuid, y su código puede ser un número', async () => {
    contesta = () => [
      200,
      {
        nif: 'B75777847',
        serie: 'T-IKA-2026-',
        numero: '000002',
        operacion: 'Alta',
        url: 'https://prewww2.aeat.es/x',
        qr: 'iVBOR',
        estado: 'Aceptado con errores',
        codigo_error: 2005,
        mensaje_error: 'El campo ImporteTotal…',
      },
    ];
    expect(await elDeVerdad().elRegistro('B75777847', 'test', 'mi-uuid')).toEqual({
      uuid: '',
      estado: 'Aceptado con errores',
      url: 'https://prewww2.aeat.es/x',
      qr: 'iVBOR',
      codigoError: '2005',
      mensajeError: 'El campo ImporteTotal…',
      operacion: 'Alta',
      serie: 'T-IKA-2026-',
      numero: '000002',
    });
    const [pregunta] = sinLaClave();
    expect(pregunta?.camino).toBe('/verifactu/status?uuid=mi-uuid');
    expect(pregunta?.clave).toBe('Bearer vf_test_del_nif');
  });

  it('un registro que no existe es nulo, no un fallo', async () => {
    contesta = () => [404];
    expect(await elDeVerdad().elRegistro('B75777847', 'test', 'mi-uuid')).toBeNull();
  });
});

describe('si Hacienda ya tiene un documento', () => {
  const FACTURA = { serie: 'F-IKA-2026-', numero: '000001', fecha: '07-11-2026' };

  it('lleva la fecha de la operación solo si fue en el registro original', async () => {
    contesta = () => [200, { uuid: 'el-suyo' }];
    expect(await elDeVerdad().buscarEnHacienda('B75777847', 'test', FACTURA)).toBe('el-suyo');
    expect(sinLaClave().at(-1)?.cuerpo).toEqual({
      serie: 'F-IKA-2026-',
      numero: '000001',
      fecha_expedicion: '07-11-2026',
    });
    await elDeVerdad().buscarEnHacienda('B75777847', 'test', {
      ...FACTURA,
      fechaOperacion: '30-10-2026',
    });
    expect(sinLaClave().at(-1)?.cuerpo).toMatchObject({ fecha_operacion: '30-10-2026' });
  });

  it('si no lo tiene, nulo: la especificación no dice cómo contesta, y sin uuid no hay nada', async () => {
    contesta = () => [200, {}];
    expect(await elDeVerdad().buscarEnHacienda('B75777847', 'test', FACTURA)).toBeNull();
    contesta = () => [404];
    expect(await elDeVerdad().buscarEnHacienda('B75777847', 'test', FACTURA)).toBeNull();
  });
});

describe('pedir los avisos', () => {
  const AVISO = {
    id: null,
    url: 'https://api.estook.test/avisos/verifacti',
    secreto: 'el-secreto',
  };

  it('la primera vez lo crea, con la clave de la cuenta', async () => {
    contesta = () => [200, { id: 'aviso-1' }];
    expect(await elDeVerdad().escucharElNif('test', 'B75777847', AVISO)).toBe('aviso-1');
    expect(llamadas).toEqual([
      {
        metodo: 'POST',
        camino: '/webhooks',
        clave: 'Bearer vfn_la_de_la_cuenta',
        cuerpo: {
          url: AVISO.url,
          entorno: 'test',
          secret: 'el-secreto',
          nifs: ['B75777847'],
        },
      },
    ]);
  });

  it('con uno ya creado, le añade el NIF', async () => {
    contesta = () => [200, {}];
    expect(await elDeVerdad().escucharElNif('test', 'B1', { ...AVISO, id: 'aviso-1' })).toBe(
      'aviso-1',
    );
    expect(llamadas.map((l) => `${l.metodo} ${l.camino}`)).toEqual([
      'POST /webhooks/aviso-1/nifs/B1',
    ]);
  });

  it('si lo borraron en su panel, crea otro', async () => {
    contesta = (metodo, camino) =>
      camino.includes('/nifs/') ? [404] : metodo === 'POST' ? [200, { id: 'aviso-2' }] : [500];
    expect(await elDeVerdad().escucharElNif('test', 'B1', { ...AVISO, id: 'aviso-1' })).toBe(
      'aviso-2',
    );
  });

  it('si ya hay uno con esa dirección (409), usa ese, con este secreto y encendido', async () => {
    contesta = (metodo, camino) => {
      if (metodo === 'POST' && camino === '/webhooks') return [409, { error: 'Ya existe' }];
      if (metodo === 'GET') {
        return [
          200,
          [
            { id: 'otro', url: 'https://otra.web/aviso', entorno: 'test' },
            { id: 'aviso-viejo', url: AVISO.url, entorno: 'test', activo: false },
          ],
        ];
      }
      return [200, {}];
    };
    expect(await elDeVerdad().escucharElNif('test', 'B1', AVISO)).toBe('aviso-viejo');
    expect(llamadas.map((l) => `${l.metodo} ${l.camino}`)).toEqual([
      'POST /webhooks',
      'GET /webhooks?entorno=test',
      'PUT /webhooks/aviso-viejo',
      'POST /webhooks/aviso-viejo/nifs/B1',
    ]);
    expect(llamadas[2]?.cuerpo).toEqual({ secret: 'el-secreto', activo: true });
  });

  it('si no sale en la lista, lo dice: no se inventa nada', async () => {
    contesta = (metodo) => (metodo === 'GET' ? [200, []] : [409]);
    await expect(elDeVerdad().escucharElNif('test', 'B1', AVISO)).rejects.toThrow(
      'no sale en la lista',
    );
  });
});
