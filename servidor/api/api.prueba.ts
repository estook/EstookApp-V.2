import { describe, expect, it } from 'vitest';
import { crearApi } from './index.ts';
import { crearDespachador, type Contexto, type Puertos } from '../aplicacion/index.ts';
import { CABECERA_IDEMPOTENCIA, CABECERA_PERSONA } from './cabeceras.ts';
import { porQueNoSeAtiende, versionSoportada, VERSION_ACTUAL } from './version.ts';

/**
 * M2 · la API entera, de punta a punta.
 *
 * Se prueba con puertos de mentira, sin base de datos: lo que se comprueba aquí
 * es el transporte, el versionado, la idempotencia y que **ningún error se
 * escapa sin pasar por el catálogo en cristiano**.
 *
 * Lo que toca la base de datos de verdad se prueba aparte, en
 * `base-de-datos/pruebas/`.
 */

/** Puertos falsos que recuerdan lo que pasó, para poder mirarlo después. */
function puertosDeMentira() {
  const claves = new Map<string, { huella: string; respuesta: unknown }>();
  const ejecutados: string[] = [];

  const puertos: Puertos = {
    enTransaccion: (quien, hacer) =>
      hacer({
        sql: null as unknown as Contexto['sql'],
        personaId: quien.personaId,
        correlacionId: quien.correlacionId,
        ahora: new Date(Date.UTC(2026, 8, 1, 12, 0, 0)),
      }),

    recordar: (_contexto, clave, comando, entrada) => {
      const guardada = claves.get(clave);
      if (!guardada) return Promise.resolve({ estado: 'nueva' as const });
      const huella = `${comando}:${JSON.stringify(entrada)}`;
      if (guardada.huella !== huella) {
        return Promise.resolve({ estado: 'clave_reutilizada' as const });
      }
      return Promise.resolve({ estado: 'repetida' as const, respuesta: guardada.respuesta });
    },

    anotar: (_contexto, clave, comando, entrada, respuesta) => {
      claves.set(clave, { huella: `${comando}:${JSON.stringify(entrada)}`, respuesta });
      return Promise.resolve();
    },
  };

  return { puertos, claves, ejecutados };
}

function api() {
  const { puertos, claves } = puertosDeMentira();
  return { app: crearApi(crearDespachador(puertos)), claves };
}

async function cuerpoDe(respuesta: Response) {
  return (await respuesta.json()) as { datos?: unknown; error?: { codigo: string } };
}

describe('el versionado, con compatibilidad hacia atras', () => {
  it('la version de ahora se atiende', () => {
    expect(versionSoportada(VERSION_ACTUAL)).toBe(true);
  });

  it('una version del futuro no, y se explica por que', () => {
    expect(versionSoportada(VERSION_ACTUAL + 1)).toBe(false);
    expect(porQueNoSeAtiende(VERSION_ACTUAL + 1)).toMatch(/se haya adelantado/i);
  });

  it('una demasiado antigua tampoco, y se dice que actualice sin perder nada', () => {
    expect(versionSoportada(0)).toBe(false);
    expect(porQueNoSeAtiende(0)).toMatch(/no has perdido nada/i);
  });

  it('la API responde con un error en cristiano, no con un numero pelado', async () => {
    const { app } = api();
    const respuesta = await app.request('/v99/consultas/mis_locales');
    const cuerpo = await cuerpoDe(respuesta);
    expect(cuerpo.error?.codigo).toBe('faltan_datos');
  });
});

describe('la salud', () => {
  it('dice que esta en pie y con que version', async () => {
    const { app } = api();
    const cuerpo = await cuerpoDe(await api().app.request('/salud'));
    expect(cuerpo.datos).toEqual({ estado: 'en pie', version: VERSION_ACTUAL });
    expect(app).toBeDefined();
  });
});

describe('lo que no existe', () => {
  it('una consulta que no esta en el catalogo', async () => {
    const { app } = api();
    const cuerpo = await cuerpoDe(await app.request('/v1/consultas/inventada'));
    expect(cuerpo.error?.codigo).toBe('no_existe');
  });

  it('un comando que no esta en el catalogo', async () => {
    const { app } = api();
    const respuesta = await app.request('/v1/comandos/inventado', {
      method: 'POST',
      headers: { [CABECERA_IDEMPOTENCIA]: 'una-clave' },
      body: '{}',
    });
    expect((await cuerpoDe(respuesta)).error?.codigo).toBe('no_existe');
  });
});

describe('todo comando necesita su clave', () => {
  it('sin la cabecera de idempotencia no se ejecuta nada', async () => {
    const { app } = api();
    const respuesta = await app.request('/v1/comandos/cambiar_mi_idioma', {
      method: 'POST',
      body: JSON.stringify({ idioma: 'ca', version: 1 }),
    });
    const cuerpo = await cuerpoDe(respuesta);
    expect(cuerpo.error?.codigo).toBe('faltan_datos');
  });
});

describe('la validacion de lo que llega', () => {
  it('un idioma que no existe se rechaza antes de tocar nada', async () => {
    const { app } = api();
    const respuesta = await app.request('/v1/comandos/cambiar_mi_idioma', {
      method: 'POST',
      headers: { [CABECERA_IDEMPOTENCIA]: 'clave-1', [CABECERA_PERSONA]: 'alguien' },
      body: JSON.stringify({ idioma: 'klingon', version: 1 }),
    });
    const cuerpo = await cuerpoDe(respuesta);
    expect(cuerpo.error?.codigo).toBe('faltan_datos');
  });

  it('y dice que campo es', async () => {
    const { app } = api();
    const respuesta = await app.request('/v1/comandos/cambiar_mi_idioma', {
      method: 'POST',
      headers: { [CABECERA_IDEMPOTENCIA]: 'clave-2', [CABECERA_PERSONA]: 'alguien' },
      body: JSON.stringify({ idioma: 'ca' }),
    });
    const cuerpo = (await respuesta.json()) as {
      error: { detalle: { campos: string[] } };
    };
    expect(cuerpo.error.detalle.campos).toContain('version');
  });

  it('un cuerpo que no es JSON tampoco pasa', async () => {
    const { app } = api();
    const respuesta = await app.request('/v1/comandos/cambiar_mi_idioma', {
      method: 'POST',
      headers: { [CABECERA_IDEMPOTENCIA]: 'clave-3' },
      body: 'esto no es json',
    });
    expect((await cuerpoDe(respuesta)).error?.codigo).toBe('faltan_datos');
  });
});

describe('sin decir quien pregunta no se ve nada', () => {
  it('una consulta sin persona devuelve «la sesion ha caducado»', async () => {
    const { app } = api();
    const cuerpo = await cuerpoDe(await app.request('/v1/consultas/mis_locales'));
    expect(cuerpo.error?.codigo).toBe('sin_sesion');
  });
});

describe('cada respuesta lleva su hilo', () => {
  it('devuelve la correlacion que se le mando', async () => {
    const { app } = api();
    const mia = '3f0c2e6a-1b4d-4a71-9c2e-8a6f5b0d1e77';
    const respuesta = await app.request('/v1/consultas/mis_locales', {
      headers: { 'x-correlacion-id': mia },
    });
    expect(respuesta.headers.get('x-correlacion-id')).toBe(mia);
  });

  it('y si no se manda ninguna, se crea una', async () => {
    const { app } = api();
    const respuesta = await app.request('/v1/consultas/mis_locales');
    expect(respuesta.headers.get('x-correlacion-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('una correlacion con formato raro se sustituye, no se propaga', async () => {
    const { app } = api();
    const respuesta = await app.request('/v1/consultas/mis_locales', {
      headers: { 'x-correlacion-id': 'esto-no-es-un-uuid' },
    });
    expect(respuesta.headers.get('x-correlacion-id')).not.toBe('esto-no-es-un-uuid');
  });
});
