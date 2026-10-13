import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apuntarUnFallo, ponerElAvisadorDeFallos, sinDatosPersonales } from './fallos.ts';
import { conectarSentry, eventoSinDatosPersonales, type SdkDeSentry } from './sentry.ts';

/**
 * Los fallos de la API, a Sentry y sin datos personales (repaso del 10-oct · 0082).
 */

afterEach(() => {
  ponerElAvisadorDeFallos(null);
  vi.restoreAllMocks();
});

describe('sin datos personales', () => {
  it('lo que Postgres repite de una fila se va, y se queda qué columna chocó', () => {
    expect(
      sinDatosPersonales(
        'duplicate key value violates unique constraint "persona_correo" Key (correo)=(ana@bar.es) already exists.',
      ),
    ).toBe(
      'duplicate key value violates unique constraint "persona_correo" Key (correo)=([quitado]) already exists.',
    );
  });

  it('correos, teléfonos, DNI, NIE, cuentas, tarjetas, IP y claves', () => {
    const texto = [
      'escribe a pepe.lopez+bar@gmail.com',
      'llama al +34 612 345 678',
      'DNI 12345678Z y NIE X1234567L',
      'IBAN ES91 2100 0418 4502 0005 1332',
      'tarjeta 4242 4242 4242 4242',
      'desde 83.45.120.7',
      'Bearer eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl',
      'clave sk_live_51Habcdefghijk',
    ].join(' · ');
    const limpio = sinDatosPersonales(texto);
    for (const dato of [
      'pepe.lopez',
      'gmail',
      '612',
      '12345678Z',
      'X1234567L',
      'ES91',
      '4242',
      '83.45',
      'eyJ',
      'sk_live',
    ]) {
      expect(limpio, dato).not.toContain(dato);
    }
  });

  it('lo que no es de nadie se queda como estaba', () => {
    const texto = 'el PDF no ha salido: el motor contestó 502 a las 13:31 del 2026-10-10';
    expect(sinDatosPersonales(texto)).toBe(texto);
  });
});

describe('apuntar un fallo', () => {
  it('va al registro como antes, y al avisador si lo hay', async () => {
    const registro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const avisados: unknown[] = [];
    ponerElAvisadorDeFallos({
      avisar: (fallo, datos) => {
        avisados.push([fallo, datos]);
        return Promise.resolve();
      },
    });
    const fallo = new Error('se cayó');
    await apuntarUnFallo(fallo, {
      mensaje: 'los correos no han salido',
      correlacionId: 'hilo-1',
      extra: { motor: 'cloudflare' },
    });
    expect(JSON.parse(String(registro.mock.calls[0]?.[0]))).toEqual({
      nivel: 'error',
      mensaje: 'los correos no han salido',
      correlacion_id: 'hilo-1',
      motor: 'cloudflare',
      detalle: 'se cayó',
    });
    expect(avisados).toEqual([
      [
        fallo,
        {
          mensaje: 'los correos no han salido',
          correlacionId: 'hilo-1',
          extra: { motor: 'cloudflare' },
        },
      ],
    ]);
  });

  it('un avisador que falla no tumba nada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    ponerElAvisadorDeFallos({ avisar: () => Promise.reject(new Error('Sentry no contesta')) });
    await expect(
      apuntarUnFallo(new Error('x'), { mensaje: 'algo', correlacionId: null }),
    ).resolves.toBeUndefined();
  });
});

describe('Sentry, para la API', () => {
  function unSdkDeMentira() {
    const hecho = {
      init: undefined as Parameters<SdkDeSentry['init']>[0] | undefined,
      etiquetas: {} as Record<string, string>,
      extras: {} as Record<string, unknown>,
      capturados: [] as unknown[],
      esperado: 0,
    };
    const sdk: SdkDeSentry = {
      init: (opciones) => {
        hecho.init = opciones;
      },
      withScope: (hacer) => {
        hacer({
          setTag: (clave, valor) => {
            hecho.etiquetas[clave] = valor;
          },
          setExtra: (clave, valor) => {
            hecho.extras[clave] = valor;
          },
        });
      },
      captureException: (fallo) => {
        hecho.capturados.push(fallo);
      },
      flush: (espera) => {
        hecho.esperado = espera;
        return Promise.resolve(true);
      },
    };
    return { sdk, hecho };
  }

  it('se arranca sin datos personales, sin integraciones de fábrica, con el entorno y la versión', () => {
    const { sdk, hecho } = unSdkDeMentira();
    conectarSentry(sdk, {
      dsn: 'https://clave@o1.ingest.sentry.io/2',
      entorno: 'produccion',
      version: 'abc123',
    });
    expect(hecho.init).toMatchObject({
      environment: 'produccion',
      release: 'api@abc123',
      sendDefaultPii: false,
      defaultIntegrations: false,
    });
    expect(hecho.init?.beforeBreadcrumb()).toBeNull();
  });

  it('cada fallo va con su hilo y lo que hacía, y se espera a que salga', async () => {
    const { sdk, hecho } = unSdkDeMentira();
    const avisador = conectarSentry(sdk, { dsn: 'x', entorno: 'produccion', version: 'v' });
    const fallo = new Error('no hay conexión');
    await avisador.avisar(fallo, {
      mensaje: 'el reloj no ha podido latir',
      correlacionId: 'hilo-2',
      extra: { para: 'ana@bar.es' },
    });
    expect(hecho.etiquetas).toEqual({
      aplicacion: 'api',
      que: 'el reloj no ha podido latir',
      correlacion_id: 'hilo-2',
    });
    expect(hecho.extras).toEqual({ para: '[quitado]' });
    expect(hecho.capturados).toEqual([fallo]);
    expect(hecho.esperado).toBe(2000);
  });

  it('antes de salir, el evento pierde la petición, quién era y lo personal del texto', () => {
    const limpio = eventoSinDatosPersonales({
      message: 'para ana@bar.es',
      request: { headers: { authorization: 'Bearer x' } },
      user: { ip_address: '83.45.120.7' },
      server_name: 'maquina',
      breadcrumbs: [{ message: 'algo' }],
      exception: { values: [{ type: 'Error', value: 'Key (correo)=(ana@bar.es) already exists' }] },
      extra: { telefono: '612345678' },
    });
    expect(limpio).toEqual({
      message: 'para [quitado]',
      exception: { values: [{ type: 'Error', value: 'Key (correo)=([quitado]) already exists' }] },
      extra: { telefono: '[quitado]' },
    });
  });
});

describe('ningún fallo se queda solo en el registro', () => {
  it('todo lo que el servidor apunta como error pasa por apuntarUnFallo', () => {
    const raiz = fileURLToPath(new URL('../', import.meta.url));
    const sueltos: string[] = [];
    const recorrer = (carpeta: string) => {
      for (const nombre of readdirSync(carpeta)) {
        if (nombre === 'node_modules') continue;
        const ruta = join(carpeta, nombre);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (
          nombre.endsWith('.ts') &&
          !nombre.endsWith('.prueba.ts') &&
          nombre !== 'fallos.ts'
        ) {
          if (/console\.error\(/.test(readFileSync(ruta, 'utf8'))) sueltos.push(ruta);
        }
      }
    };
    recorrer(raiz);
    expect(sueltos).toEqual([]);
  });
});
