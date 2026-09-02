import { Hono } from 'hono';
import { CABECERA_CORRELACION, correlacionIdDeEntrada } from '@estook/utiles';
import type { Despachador, Resultado } from '../aplicacion/index.ts';
import {
  CABECERA_AUTORIZACION,
  CABECERA_IDEMPOTENCIA,
  CABECERA_REPETIDA,
  tokenDeLaCabecera,
} from './cabeceras.ts';
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

/**
 * Quien puede llamar desde un navegador (M4).
 *
 * Hasta M4 esto no hacia falta: la API no la llamaba nadie desde una pagina. Ahora
 * la aplicacion vive en un dominio (GitHub Pages hoy, `estook.com` manana) y la
 * API en otro (Supabase Edge Functions), asi que sin esto el navegador **no deja
 * ni salir la peticion**.
 *
 * Y a proposito **no es `*`**. Con `*` cualquier pagina del mundo podria llamar a
 * la API desde el navegador de quien la visite. Como el token viaja en una
 * cabecera y no en una cookie, el navegador no lo enviaria solo... pero seguir
 * confiando en eso es apostar a que nadie cambie nunca a cookies. Se declara la
 * lista, y punto.
 *
 * Los origenes se leen del entorno, separados por comas, porque cambian con el
 * dominio y no con el codigo.
 */
function origenesPermitidos(): string[] {
  const declarados = process.env['ORIGENES_PERMITIDOS'] ?? '';
  const delEntorno = declarados
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== '');

  // En desarrollo, las cuatro aplicaciones en su puerto. No se anaden en
  // produccion: ahi solo vale lo que diga `ORIGENES_PERMITIDOS`.
  const enDesarrollo = process.env['ENTORNO'] !== 'produccion';
  const locales = enDesarrollo
    ? [5173, 5174, 5175, 5176].map((puerto) => `http://localhost:${puerto}`)
    : [];

  return [...delEntorno, ...locales];
}

function cabecerasDeCors(origen: string): Record<string, string> {
  return {
    'access-control-allow-origin': origen,
    // Sin esto, un agrupador podria servirle a un origen la respuesta que
    // guardo para otro.
    vary: 'Origin',
    'access-control-allow-headers': [
      'authorization',
      'content-type',
      CABECERA_IDEMPOTENCIA,
      CABECERA_CORRELACION,
    ].join(', '),
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    // Para que el cliente pueda leer de vuelta su hilo y saber si el comando se
    // repitio. Sin declararlas, el navegador se las esconde.
    'access-control-expose-headers': [CABECERA_CORRELACION, CABECERA_REPETIDA].join(', '),
    'access-control-max-age': '86400',
  };
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

  // El navegador pregunta antes de llamar, y hay que contestarle.
  //
  // **Las cabeceras se ponen DESPUES de que responda la ruta, no antes.** No es
  // un detalle de estilo: las rutas de aqui devuelven una `Response` construida a
  // mano (`respuestaConDatos`), y una `Response` devuelta tal cual **sustituye**
  // lo que el middleware hubiera dejado puesto con `c.header()`. Puestas antes,
  // el navegador recibia el permiso en la pregunta previa y no en la respuesta de
  // verdad, asi que la peticion se bloqueaba igual. Lo cazo una prueba de extremo
  // a extremo, no la vista: contra la API a pelo funcionaba perfectamente.
  api.use('*', async (c, siguiente) => {
    const origen = c.req.header('origin');
    const permitido = origen !== undefined && origenesPermitidos().includes(origen);

    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: permitido ? cabecerasDeCors(origen) : {},
      });
    }

    await siguiente();

    if (permitido) {
      for (const [nombre, valor] of Object.entries(cabecerasDeCors(origen))) {
        c.res.headers.set(nombre, valor);
      }
    }

    // `noImplicitReturns` pide que todos los caminos devuelvan lo mismo, y el de
    // arriba devuelve una respuesta. Aqui no hay nada que devolver: la respuesta
    // ya la puso la ruta y solo se le han anadido cabeceras.
    return undefined;
  });

  api.get('/salud', (c) => c.json({ datos: { estado: 'en pie', version: VERSION_ACTUAL } }));

  api.get('/v:version{[0-9]+}/consultas/:nombre', async (c) => {
    const correlacionId = c.get('correlacionId');

    const problema = comprobarVersion(Number(c.req.param('version')), correlacionId);
    if (problema) return problema;

    const resultado = await despachador.consultar(
      quienLlama(c.req.header(CABECERA_AUTORIZACION), correlacionId),
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
      quienLlama(c.req.header(CABECERA_AUTORIZACION), correlacionId),
      c.req.param('nombre'),
      cuerpo,
      c.req.header(CABECERA_IDEMPOTENCIA) ?? '',
    );

    return traducir(resultado, correlacionId);
  });

  return api;
}

function quienLlama(autorizacion: string | undefined, correlacionId: string) {
  // Desde M4 quien llama no dice quien es: trae un token y la infraestructura lo
  // resuelve contra `estook.sesion`. Sin token no se ve nada, igual que antes:
  // las politicas de M1 no ensenan una fila sin identidad.
  return { tokenDeSesion: tokenDeLaCabecera(autorizacion), correlacionId };
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
