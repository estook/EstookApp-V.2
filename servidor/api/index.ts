import { Hono } from 'hono';
import { CABECERA_CORRELACION, correlacionIdDeEntrada, variable } from '@estook/utiles';
import {
  CONSULTAS_POR_LOTE,
  apuntarUnFallo,
  hayAvisadorDeFallos,
  type ConsultaDelLote,
  type Despachador,
  type Resultado,
} from '../aplicacion/index.ts';
import {
  CABECERA_AUTORIZACION,
  CABECERA_DIRECCION,
  CABECERA_HECHO_HACE,
  CABECERA_IDEMPOTENCIA,
  CABECERA_POR_LA_CAJA,
  CABECERA_REPETIDA,
  direccionDeLaPeticion,
  hechoHace,
  porLaCaja,
  tokenDeLaCabecera,
} from './cabeceras.ts';
import { cuerpoDeError, respuestaConDatos, respuestaDeError } from './respuestas.ts';
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
 * Dos rutas, y una tercera que es la primera en lote:
 *
 *   GET  /vN/consultas/:nombre    lee. No cambia nada.
 *   POST /vN/comandos/:nombre     cambia algo. Idempotente por cabecera.
 *   POST /vN/consultas/varias     lee varias de una vez (0085), cada una por su camino.
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
 * la aplicacion vive en un dominio (`estook.com`) y la API en otro (Supabase
 * Edge Functions), asi que sin esto el navegador **no deja ni salir la peticion**.
 *
 * Y a proposito **no es `*`**. Con `*` cualquier pagina del mundo podria llamar a
 * la API desde el navegador de quien la visite. Como el token viaja en una
 * cabecera y no en una cookie, el navegador no lo enviaria solo... pero seguir
 * confiando en eso es apostar a que nadie cambie nunca a cookies. Se declara la
 * lista, y punto.
 *
 * ── Los nuestros van en el codigo, y no en un secreto ────────────────────────
 *
 * `estook.com` es **nuestra direccion**, no un ajuste de cada instalacion: la
 * decide el producto (0036). Cuando vivia solo en `ORIGENES_PERMITIDOS`, poner el
 * dominio propio dejaba la aplicacion cargando y la API diciendo que no a un
 * origen que es el nuestro, y para arreglarlo habia que entrar en Supabase. Un
 * dato que decide el producto no se guarda donde no se ve.
 *
 * `ORIGENES_PERMITIDOS` sigue existiendo **para lo que si cambia**: una
 * previsualizacion, un dominio de un cliente, una prueba desde otro sitio.
 */
export const NUESTROS_ORIGENES = ['https://estook.com', 'https://www.estook.com'] as const;

function origenesPermitidos(): string[] {
  const declarados = variable('ORIGENES_PERMITIDOS') ?? '';
  const delEntorno = declarados
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== '');

  // En desarrollo, las cinco aplicaciones en su puerto. En produccion no: ahi
  // valen los nuestros y lo que anada `ORIGENES_PERMITIDOS`.
  const enDesarrollo = variable('ENTORNO') !== 'produccion';
  const locales = enDesarrollo
    ? [5173, 5174, 5175, 5176, 5178].map((puerto) => `http://localhost:${puerto}`)
    : [];

  // Sin repetidos: quien lo tuviera declarado en el entorno no rompe nada.
  return [...new Set([...NUESTROS_ORIGENES, ...delEntorno, ...locales])];
}

/**
 * **La región donde está la base, para que la API corra a su lado** (repaso del
 * 16-oct, 0090).
 *
 * Supabase ejecuta la función en la región más cercana a quien llama: desde España,
 * París (`eu-west-3`). Y la base está en Irlanda (`eu-west-1`). Cada consulta hace de
 * cinco a treinta viajes a la base, y cada viaje París–Irlanda son unos 18 ms: el
 * Panel, con quince consultas, se iba cerca de un segundo solo en idas y vueltas. Lo
 * medimos el 16-oct, y es lo que Richi notaba como «carga súper lento».
 *
 * Supabase deja fijar la región con la cabecera `x-region` (documentado en «Regional
 * invocation»). La API **dice** en cada respuesta en qué región está su base
 * (`x-estook-region`), y la app, en cuanto lo oye, la pide en las siguientes. Así no
 * depende del orden: una API de antes no lo dice, no deja pasar `x-region` y la app
 * no la manda. En desarrollo no se dice: la base está en el mismo ordenador.
 */
export const CABECERA_REGION_DE_LA_BASE = 'x-estook-region';

function laRegionDeLaBase(): string | null {
  const dicha = variable('REGION_DE_LA_BASE');
  if (dicha !== undefined && dicha !== '') return dicha;
  return variable('ENTORNO') === 'produccion' ? 'eu-west-1' : null;
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
      CABECERA_HECHO_HACE,
      CABECERA_POR_LA_CAJA,
      // La región en que se pide que corra la función (0090).
      'x-region',
    ].join(', '),
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    // Para que el cliente pueda leer de vuelta su hilo y saber si el comando se
    // repitio. Sin declararlas, el navegador se las esconde.
    'access-control-expose-headers': [
      CABECERA_CORRELACION,
      CABECERA_REPETIDA,
      CABECERA_REGION_DE_LA_BASE,
    ].join(', '),
    'access-control-max-age': '86400',
  };
}

/**
 * La raiz bajo la que cuelga todo, y por que no es `/`.
 *
 * Supabase sirve las funciones en `/functions/v1/<nombre>/...` y **le pasa a la
 * funcion la ruta con su propio nombre delante**. La nuestra se llama `api`, asi
 * que una peticion a `/functions/v1/api/salud` llega aqui como `/api/salud`.
 *
 * Sin esto, la funcion se desplegaba bien y contestaba `404 Not Found` a todo,
 * que es de los errores mas desconcertantes que hay: parece que no esta
 * desplegada cuando lo esta y esta funcionando.
 *
 * Va aqui, en la aplicacion, y **no quitando el prefijo en el fichero de
 * Supabase**, que era la otra opcion. Quitarlo alli haria que la API desplegada
 * atendiera rutas distintas de las que se prueban aqui, y eso es exactamente el
 * agujero por el que se colo este fallo: un camino que solo existe en
 * produccion. Asi lo que se prueba y lo que se despliega son la misma cosa.
 */
export const RAIZ_DE_LA_API = '/api';

export function crearApi(despachador: Despachador) {
  const api = new Hono<{ Variables: Variables }>().basePath(RAIZ_DE_LA_API);

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
      const region = laRegionDeLaBase();
      if (region !== null) c.res.headers.set(CABECERA_REGION_DE_LA_BASE, region);
    }

    // `noImplicitReturns` pide que todos los caminos devuelvan lo mismo, y el de
    // arriba devuelve una respuesta. Aqui no hay nada que devolver: la respuesta
    // ya la puso la ruta y solo se le han anadido cabeceras.
    return undefined;
  });

  /**
   * La red de debajo del todo (M4).
   *
   * «Ningún mensaje enseña un código ni un error de base de datos» (Auditoría de
   * flujos, Parte 5). El despachador ya traduce lo previsto; esto atrapa **lo
   * que no lo estaba**, que es justo lo que puede llevar dentro el nombre de una
   * tabla o media consulta.
   *
   * Sin esto, un fallo inesperado salía como el `500` de serie de Hono: un
   * «Internal Server Error» en inglés, sin cuerpo y sin el hilo de la petición.
   * Se vio de verdad con un cocinero intentando invitar a alguien.
   *
   * Lo que sale ahora es el error del catálogo, en cristiano, con su hilo. Y por
   * dentro se registra el fallo entero, que es donde tiene que estar: quien
   * atiende un aviso de Sentry necesita la traza, y quien está en la cocina no.
   */
  api.onError(async (fallo, c) => {
    const correlacionId = c.get('correlacionId');
    await apuntarUnFallo(fallo, {
      mensaje: 'fallo no previsto en la API',
      correlacionId,
    });
    return respuestaDeError('fallo_nuestro', correlacionId);
  });

  // Nunca guardada: dice si la API está en pie ahora, no hace un rato (0070).
  api.get('/salud', (c) =>
    c.json(
      {
        datos: {
          estado: 'en pie',
          version: VERSION_ACTUAL,
          // Si los avisos al móvil están encendidos (0070): sí o no, nunca la clave.
          movil: despachador.movilEncendido,
          // Si sus fallos llegan a Sentry (repaso del 10-oct · 0082): sí o no.
          sentry: hayAvisadorDeFallos(),
        },
      },
      200,
      { 'cache-control': 'no-store' },
    ),
  );

  api.get('/v:version{[0-9]+}/consultas/:nombre', async (c) => {
    const correlacionId = c.get('correlacionId');

    const problema = comprobarVersion(Number(c.req.param('version')), correlacionId);
    if (problema) return problema;

    const resultado = await despachador.consultar(
      quienLlama(
        c.req.header(CABECERA_AUTORIZACION),
        correlacionId,
        c.req.header(CABECERA_DIRECCION),
      ),
      c.req.param('nombre'),
      Object.fromEntries(new URL(c.req.url).searchParams),
    );

    return traducir(resultado, correlacionId);
  });

  /*
    **Varias consultas en una petición** (0085). El Panel pedía unas diez a la vez, y
    con mala cobertura cada petición es una espera y un sitio donde cortarse. Aquí
    llegan juntas y se contestan juntas, **cada una por el mismo camino que si llegara
    sola**: sus puertas, su permiso y su transacción. Lo que dice cada una va en su
    sitio de la lista —sus datos o su error, con el texto de siempre—, así que una que
    no se puede leer no tumba a las demás.

    Es un POST porque lleva un cuerpo, no porque cambie nada: no lleva clave de
    idempotencia ni deja rastro, como cualquier consulta.

    **Con la misma forma que las otras dos** (`/consultas/:nombre`), y no
    `/consultas` a secas: una ruta con versión y otra forma deja al enrutador de Hono
    sin encontrar **ninguna** de las de `/v1` (lo cazaron las pruebas de la API, con
    un 404 en todo). Cualquier otro nombre que `varias` no existe.
  */
  api.post('/v:version{[0-9]+}/consultas/:nombre', async (c) => {
    const correlacionId = c.get('correlacionId');
    if (c.req.param('nombre') !== 'varias') return respuestaDeError('no_existe', correlacionId);

    const problema = comprobarVersion(Number(c.req.param('version')), correlacionId);
    if (problema) return problema;

    const cuerpo: unknown = await c.req.json().catch(() => null);
    const consultas = elLote(cuerpo);
    if (consultas === null) {
      return respuestaDeError('faltan_datos', correlacionId, {
        porque: `Hace falta una lista de consultas, de una a ${CONSULTAS_POR_LOTE}, cada una con su nombre.`,
      });
    }

    const resultados = await despachador.consultarVarias(
      quienLlama(
        c.req.header(CABECERA_AUTORIZACION),
        correlacionId,
        c.req.header(CABECERA_DIRECCION),
      ),
      consultas,
    );

    return respuestaConDatos(
      resultados.map((resultado) =>
        resultado.estado === 'fallo'
          ? cuerpoDeError(resultado.codigo, resultado.detalle)
          : { datos: resultado.datos },
      ),
      correlacionId,
    );
  });

  api.post('/v:version{[0-9]+}/comandos/:nombre', async (c) => {
    const correlacionId = c.get('correlacionId');

    const problema = comprobarVersion(Number(c.req.param('version')), correlacionId);
    if (problema) return problema;

    const cuerpo: unknown = await c.req.json().catch(() => null);

    const resultado = await despachador.ejecutar(
      quienLlama(
        c.req.header(CABECERA_AUTORIZACION),
        correlacionId,
        c.req.header(CABECERA_DIRECCION),
      ),
      c.req.param('nombre'),
      cuerpo,
      c.req.header(CABECERA_IDEMPOTENCIA) ?? '',
      {
        hechoHaceMs: hechoHace(c.req.header(CABECERA_HECHO_HACE)),
        porLaCaja: porLaCaja(c.req.header(CABECERA_POR_LA_CAJA)),
      },
    );

    return traducir(resultado, correlacionId);
  });

  /*
    El aviso de Stripe (0048). Fuera de `/v1` porque no es de la app: la dirección la
    guarda Stripe y no la cambia una versión nuestra. **El cuerpo va tal cual**, en
    texto: la firma es del cuerpo exacto, y leerlo como JSON y volverlo a escribir
    la rompería. Una firma que no vale es un 400 y no se toca nada; un fallo
    nuestro es un 500, y Stripe lo vuelve a mandar más tarde.
  */
  api.post('/stripe/aviso', async (c) => {
    const correlacionId = c.get('correlacionId');
    const cuerpo = await c.req.text();
    const recibido = await despachador.avisoDeStripe(
      quienLlama(undefined, correlacionId, c.req.header(CABECERA_DIRECCION)),
      cuerpo,
      c.req.header('stripe-signature') ?? null,
    );
    if (!recibido.firmaValida) {
      return respuestaDeError('sin_permiso', correlacionId, {
        porque: 'La firma no es de Stripe.',
      });
    }
    return respuestaConDatos(
      { recibido: true, resultado: recibido.resultado },
      correlacionId,
      200,
      {},
    );
  });

  // El latido del reloj (0016, 0048): lo llama `pg_cron` con su secreto.
  // Fuera de `/v1`, como el aviso de Stripe: la dirección la guarda `pg_cron` y no
  // cambia con una versión nuestra. Y dentro no se puede: una ruta más que empiece por
  // `/v…` junto a las de `v:version{[0-9]+}` deja al enrutador de Hono sin encontrar
  // ninguna (lo cazó `api.prueba.ts`, 25-sep).
  api.post('/tareas/latir', async (c) => {
    const correlacionId = c.get('correlacionId');
    const hecho = await despachador.latir(
      quienLlama(undefined, correlacionId, c.req.header(CABECERA_DIRECCION)),
      c.req.header('x-reloj') ?? null,
    );
    if (hecho === null) return respuestaDeError('sin_permiso', correlacionId);
    return respuestaConDatos(hecho, correlacionId, 200, {});
  });

  // El latido del móvil (0070): `pg_cron` lo llama, con el mismo secreto, el minuto en
  // que la base ve algo que mandar al móvil (0054).
  api.post('/tareas/movil', async (c) => {
    const correlacionId = c.get('correlacionId');
    const hecho = await despachador.alMovil(
      quienLlama(undefined, correlacionId, c.req.header(CABECERA_DIRECCION)),
      c.req.header('x-reloj') ?? null,
    );
    if (hecho === null) return respuestaDeError('sin_permiso', correlacionId);
    return respuestaConDatos(hecho, correlacionId, 200, {});
  });

  return api;
}

function quienLlama(
  autorizacion: string | undefined,
  correlacionId: string,
  direccion: string | undefined,
) {
  // Desde M4 quien llama no dice quien es: trae un token y la infraestructura lo
  // resuelve contra `estook.sesion`. Sin token no se ve nada, igual que antes:
  // las politicas de M1 no ensenan una fila sin identidad.
  //
  // La dirección solo viaja para la auditoría del admin (0041): no abre nada.
  return {
    tokenDeSesion: tokenDeLaCabecera(autorizacion),
    correlacionId,
    desde: direccionDeLaPeticion(direccion),
  };
}

function comprobarVersion(version: number, correlacionId: string): Response | null {
  if (versionSoportada(version)) return null;
  return respuestaDeError('faltan_datos', correlacionId, { porque: porQueNoSeAtiende(version) });
}

/**
 * Lo que llega a `POST /consultas`, comprobado a mano: `{ consultas: [{ nombre,
 * parametros }] }`, con los parámetros como texto, igual que en la barra de
 * direcciones de una consulta suelta. Así cada una se valida con **su misma
 * entrada** en el despachador. Nulo si no tiene esa forma.
 */
function elLote(cuerpo: unknown): readonly ConsultaDelLote[] | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;
  const lista = (cuerpo as { consultas?: unknown }).consultas;
  if (!Array.isArray(lista) || lista.length === 0 || lista.length > CONSULTAS_POR_LOTE) return null;

  const consultas: ConsultaDelLote[] = [];
  for (const una of lista as unknown[]) {
    if (typeof una !== 'object' || una === null) return null;
    const { nombre, parametros = {} } = una as { nombre?: unknown; parametros?: unknown };
    if (typeof nombre !== 'string' || nombre === '') return null;
    if (typeof parametros !== 'object' || parametros === null || Array.isArray(parametros)) {
      return null;
    }
    const entrada: Record<string, string> = {};
    for (const [clave, valor] of Object.entries(parametros)) {
      if (typeof valor !== 'string') return null;
      entrada[clave] = valor;
    }
    consultas.push({ nombre, entrada });
  }
  return consultas;
}

function traducir(resultado: Resultado, correlacionId: string): Response {
  if (resultado.estado === 'fallo') {
    return respuestaDeError(resultado.codigo, correlacionId, resultado.detalle);
  }

  // Una repeticion se marca, para que el cliente sepa que no se hizo dos veces.
  const cabeceras = resultado.estado === 'repetida' ? { [CABECERA_REPETIDA]: 'si' } : {};
  return respuestaConDatos(resultado.datos, correlacionId, 200, cabeceras);
}
