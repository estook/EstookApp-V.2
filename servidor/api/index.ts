import { Hono } from 'hono';
import { CABECERA_CORRELACION, correlacionIdDeEntrada } from '@estook/utiles';
import type { Despachador, Resultado } from '../aplicacion/index.ts';
import { CABECERA_IDEMPOTENCIA, CABECERA_PERSONA, CABECERA_REPETIDA } from './cabeceras.ts';
import { respuestaConDatos, respuestaDeError } from './respuestas.ts';
import { VERSION_ACTUAL, porQueNoSeAtiende, versionSoportada } from './version.ts';

/**
 * La API (M2).
 *
 * **Solo transporte y validacion de forma**, como manda la regla A4. No sabe
 * nada del dominio, ni de Postgres, ni de transacciones: lee la peticion, se la
 * pasa al despachador y traduce lo que devuelve a codigos y cabeceras.
 *
 * Que no pueda hacer mas no es una convencion: la regla de dependencias lo
 * impide y la integracion continua bloquea la fusion si se incumple. De hecho
 * salto mientras se escribia esto, y por eso la orquestacion acabo donde tenia
 * que estar.
 *
 * Dos rutas, y ninguna mas:
 *
 *   GET  /vN/consultas/:nombre    lee. No cambia nada.
 *   POST /vN/comandos/:nombre     cambia algo. Idempotente por cabecera.
 *
 * No hay un endpoint por tabla ni un CRUD: **el cliente llama comandos y lee
 * vistas** (regla 3).
 */

interface Variables {
  readonly correlacionId: string;
}

export function crearApi(despachador: Despachador) {
  const api = new Hono<{ Variables: Variables }>();

  // Toda peticion lleva su hilo, venga de fuera o se cree aqui.
  api.use('*', async (c, siguiente) => {
    const correlacionId = correlacionIdDeEntrada(c.req.header(CABECERA_CORRELACION));
    c.set('correlacionId', correlacionId);
    c.header(CABECERA_CORRELACION, correlacionId);
    await siguiente();
  });

  api.get('/salud', (c) => c.json({ datos: { estado: 'en pie', version: VERSION_ACTUAL } }));

  api.get('/v:version{[0-9]+}/consultas/:nombre', async (c) => {
    const correlacionId = c.get('correlacionId');

    const problema = comprobarVersion(Number(c.req.param('version')), correlacionId);
    if (problema) return problema;

    const resultado = await despachador.consultar(
      quienLlama(c.req.header(CABECERA_PERSONA), correlacionId),
      c.req.param('nombre'),
      Object.fromEntries(new URL(c.req.url).searchParams),
    );

    return traducir(resultado, correlacionId);
  });

  api.post('/v:version{[0-9]+}/comandos/:nombre', async (c) => {
    const correlacionId = c.get('correlacionId');

    const problema = comprobarVersion(Number(c.req.param('version')), correlacionId);
    if (problema) return problema;

    const cuerpo: unknown = await c.req.json().catch(() => null);

    const resultado = await despachador.ejecutar(
      quienLlama(c.req.header(CABECERA_PERSONA), correlacionId),
      c.req.param('nombre'),
      cuerpo,
      c.req.header(CABECERA_IDEMPOTENCIA) ?? '',
    );

    return traducir(resultado, correlacionId);
  });

  return api;
}

function quienLlama(personaId: string | undefined, correlacionId: string) {
  // En M4 esto saldra de la sesion. Hasta entonces llega por cabecera, y sin
  // ella no se ve nada: las politicas de M1 no ensenan una fila sin identidad.
  return { personaId: personaId ?? null, correlacionId };
}

function comprobarVersion(version: number, correlacionId: string): Response | null {
  if (versionSoportada(version)) return null;
  return respuestaDeError('faltan_datos', correlacionId, { porque: porQueNoSeAtiende(version) });
}

function traducir(resultado: Resultado, correlacionId: string): Response {
  if (resultado.estado === 'fallo') {
    return respuestaDeError(resultado.codigo, correlacionId, resultado.detalle);
  }

  // Una repeticion se marca, para que el cliente sepa que no se hizo dos veces.
  const cabeceras = resultado.estado === 'repetida' ? { [CABECERA_REPETIDA]: 'si' } : {};
  return respuestaConDatos(resultado.datos, correlacionId, 200, cabeceras);
}
