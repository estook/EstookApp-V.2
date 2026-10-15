import { ERRORES } from '@estook/dominio';
import {
  CABECERA_CORRELACION,
  CONSULTAS_POR_LOTE,
  nuevaCorrelacionId,
  type Registro,
} from '@estook/utiles';

/**
 * @estook/cliente-api · la unica salida a red del navegador (M2).
 *
 * Ninguna aplicacion hace `fetch` por su cuenta. Todo pasa por aqui, que es donde
 * viven las tres cosas que se olvidan siempre:
 *
 *   · **La correlacion.** Cada accion nace con su hilo, y ese hilo viaja hasta la
 *     base de datos y hasta el registro. Sirve para responder a «que paso
 *     exactamente cuando Sara toco ese boton».
 *   · **La idempotencia.** Todo comando lleva su clave. Si se pulsa dos veces, o
 *     si el movil reintenta al recuperar cobertura, el efecto es uno solo.
 *   · **Los errores en cristiano.** Lo que devuelve la API ya viene con que ha
 *     pasado, que se puede hacer y con que boton. Aqui no se traduce nada, se
 *     pasa tal cual a la pantalla.
 */

export {
  comoSeLlamaEsteAparato,
  elAparato,
  marcaDelAparato,
  queClaseDeAparatoEs,
} from './aparato.ts';

export const VERSION_DE_LA_API = 1;

export interface ErrorDeLaApi {
  readonly codigo: string;
  readonly quePasa: string;
  readonly queSePuedeHacer: string;
  readonly boton: { readonly texto: string; readonly accion: string } | null;
  readonly detalle?: Record<string, unknown>;
}

/**
 * Lo que devuelve una llamada. Nunca lanza por un error de negocio: los errores
 * previstos son un resultado mas, y hay que atenderlos, no cazarlos.
 */
/**
 * Un error de la API, envuelto para poder lanzarlo (M5, en este paquete desde la 0041: el admin lo necesita igual).
 *
 * ── Por qué hace falta ───────────────────────────────────────────────────────
 *
 * `@estook/cliente-api` **no lanza** por un error de negocio, y eso es
 * deliberado: «los errores previstos son un resultado más, y hay que atenderlos,
 * no cazarlos». Una respuesta trae `ok: false` con su frase en cristiano, su qué
 * se puede hacer y su botón.
 *
 * Pero TanStack Query necesita que una mutación **falle lanzando** para llamar a
 * `onError` y poner `isPending` en falso. Lanzar el error tal cual sería lanzar
 * un objeto que no es un `Error`, que es lo que prohíbe `only-throw-error`, y lo
 * prohíbe con razón: un `catch` genérico no sabría qué hacer con él y se perdería
 * la traza.
 *
 * Así que se envuelve. Un `Error` de verdad, con el mensaje puesto para que salga
 * en el registro, y el error de la API entero dentro para que la pantalla pueda
 * sacar su frase y su botón sin adivinar nada.
 */
export class FalloDeLaApi extends Error {
  readonly error: ErrorDeLaApi;

  constructor(error: ErrorDeLaApi) {
    super(error.codigo);
    this.name = 'FalloDeLaApi';
    this.error = error;
  }
}

export type Respuesta<T> =
  | { readonly ok: true; readonly datos: T; readonly correlacionId: string }
  | { readonly ok: false; readonly error: ErrorDeLaApi; readonly correlacionId: string };

export interface OpcionesDelCliente {
  readonly base: string;
  /**
   * El token de sesion, o una funcion que lo devuelva (M4).
   *
   * Se admite una funcion a proposito. El cliente se crea una vez y vive toda la
   * sesion; si el token fuera un valor fijo, al entrar habria que crear otro
   * cliente, y toda consulta que se hubiera quedado con el viejo seguiria yendo
   * sin token. Con una funcion, el cliente pregunta en cada llamada.
   */
  readonly token?: string | null | (() => string | null);
  readonly registro?: Registro;
  /** Para poder probar sin red. */
  readonly pedir?: typeof fetch;
  /**
   * Que hacer cuando el servidor dice que la sesion ha caducado.
   *
   * Vive aqui y no en cada pantalla porque puede pasar en cualquiera: la sesion
   * se puede haber cerrado desde otro aparato, o le pueden haber retirado el
   * acceso a alguien mientras tenia la aplicacion abierta. Con esto, la
   * aplicacion entera se entera de una vez.
   */
  readonly alCaducarLaSesion?: () => void;
  /**
   * **Juntar las consultas que salen a la vez** (0085). Las que se piden en el mismo
   * instante —el Panel entero al abrirse, con la campana y el chat— viajan en una
   * sola petición (`POST /consultas/varias`) y cada una recibe lo suyo, como si
   * hubiera ido sola. Una suelta sigue yendo sola.
   */
  readonly juntar?: boolean;
}

/** Cuánto se espera a que salgan las demás antes de mandar el lote. */
export const ESPERA_PARA_JUNTAR_MS = 8;

export interface OpcionesDeUnComando {
  /** La misma en cada reintento: es lo que hace que no se haga dos veces. */
  readonly claveDeIdempotencia?: string;
  /**
   * **Lo hecho sin conexión** (0070): cuántos milisegundos hace que se hizo, medido
   * con el reloj de este aparato entre que se hizo y que se manda. La hora la pone el
   * servidor con el suyo; de este solo cuenta la diferencia.
   */
  readonly hechoHaceMs?: number;
}

export interface ClienteApi {
  consultar<T>(nombre: string, parametros?: Record<string, string>): Promise<Respuesta<T>>;
  ejecutar<T>(
    nombre: string,
    entrada: unknown,
    opciones?: OpcionesDeUnComando,
  ): Promise<Respuesta<T>>;
}

/** La cabecera de lo hecho sin conexión: la lee `servidor/api/cabeceras.ts`. */
export const CABECERA_HECHO_HACE = 'x-hecho-hace';

/**
 * Cuando la peticion no llega ni a salir.
 *
 * **Se coge del catalogo, no se escribe aqui.** Estaba copiado a mano, con su
 * propio texto, y las dos copias se separaron: la del catalogo decia una cosa y
 * esta otra, y la que veia la gente era esta. Un texto con dos duenos acaba
 * diciendo dos cosas (regla 6), y el catalogo de errores es cerrado a proposito:
 * «un error que no este aqui no existe».
 */
const ERROR_SIN_RED: ErrorDeLaApi = ERRORES.sin_conexion;

export function crearCliente(opciones: OpcionesDelCliente): ClienteApi {
  const pedir = opciones.pedir ?? fetch;
  const raiz = opciones.base.replace(/\/+$/, '');

  async function llamar<T>(
    metodo: 'GET' | 'POST',
    camino: string,
    cuerpo: unknown,
    cabecerasExtra: Record<string, string>,
    // El código HTTP, para quien lo necesite: el lote, para saber si la API lo conoce.
    alResponder?: (estado: number) => void,
  ): Promise<Respuesta<T>> {
    // Cada llamada nace con su hilo, aunque la sesion sea la misma.
    const correlacionId = nuevaCorrelacionId();

    const cabeceras: Record<string, string> = {
      [CABECERA_CORRELACION]: correlacionId,
      ...cabecerasExtra,
    };

    // Desde M4 la identidad no se declara, se demuestra: va el token de sesion en
    // la cabecera estandar, y el servidor lo resuelve contra `estook.sesion`.
    const token = typeof opciones.token === 'function' ? opciones.token() : opciones.token;
    if (token) cabeceras['authorization'] = `Bearer ${token}`;

    if (cuerpo !== undefined) cabeceras['content-type'] = 'application/json';

    let respuesta: Response;
    try {
      respuesta = await pedir(`${raiz}/v${VERSION_DE_LA_API}${camino}`, {
        method: metodo,
        headers: cabeceras,
        ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
      });
    } catch {
      opciones.registro?.aviso('sin conexion con la API', { camino });
      return { ok: false, error: ERROR_SIN_RED, correlacionId };
    }

    alResponder?.(respuesta.status);

    const devuelto = (await respuesta.json().catch(() => null)) as {
      datos?: T;
      error?: ErrorDeLaApi;
    } | null;

    if (!respuesta.ok || devuelto?.error) {
      const error = devuelto?.error ?? {
        codigo: 'fallo_nuestro',
        quePasa: 'Se nos ha roto algo por dentro.',
        queSePuedeHacer:
          'No es cosa tuya y no has perdido nada. Ya lo estamos viendo; inténtalo en un minuto.',
        boton: { texto: 'Reintentar', accion: 'reintentar' },
      };
      opciones.registro?.aviso('la API ha dicho que no', { codigo: error.codigo, camino });

      // La sesion ha caducado, o se ha cerrado desde otro aparato, o le han
      // retirado el acceso a quien la tenia abierta. Se avisa una vez, arriba, en
      // vez de que cada pantalla tenga que acordarse.
      if (error.codigo === 'sin_sesion') opciones.alCaducarLaSesion?.();

      return { ok: false, error, correlacionId };
    }

    return { ok: true, datos: devuelto?.datos as T, correlacionId };
  }

  function consultarSuelta<T>(nombre: string, parametros: Record<string, string>) {
    const query = new URLSearchParams(parametros).toString();
    return llamar<T>('GET', `/consultas/${nombre}${query ? `?${query}` : ''}`, undefined, {});
  }

  // ── Las consultas juntas (0085) ────────────────────────────────────────────
  //
  // Lo que se pide en el mismo instante espera unos milisegundos en la cola y sale
  // en una sola petición. Si la API desplegada todavía no conoce el lote —la web se
  // publica al fusionar, y la API se despliega después—, contesta «no existe» y a
  // partir de ahí todo va suelto, como antes: nada deja de funcionar por el orden.

  interface EnLaCola {
    readonly nombre: string;
    readonly parametros: Record<string, string>;
    readonly contestar: (respuesta: Respuesta<unknown>) => void;
  }
  let cola: EnLaCola[] = [];
  let reloj: ReturnType<typeof setTimeout> | null = null;
  let laApiNoJunta = false;

  async function mandarElLote(lote: readonly EnLaCola[]): Promise<void> {
    if (lote.length === 1 || laApiNoJunta) {
      await Promise.all(
        lote.map(async (una) => {
          una.contestar(await consultarSuelta(una.nombre, una.parametros));
        }),
      );
      return;
    }

    let estado = 0;
    const juntas = await llamar<readonly { datos?: unknown; error?: ErrorDeLaApi }[]>(
      'POST',
      '/consultas/varias',
      { consultas: lote.map(({ nombre, parametros }) => ({ nombre, parametros })) },
      {},
      (elEstado) => {
        estado = elEstado;
      },
    );

    if (!juntas.ok) {
      // Sin red, o sin sesión: a cada una, lo mismo, que es lo que le habría pasado sola.
      if (juntas.error.codigo === 'sin_conexion' || juntas.error.codigo === 'sin_sesion') {
        for (const una of lote) una.contestar(juntas);
        return;
      }
      // Una API de antes del lote no tiene la ruta (404): se recuerda, y desde ahora
      // todo va suelto. Cualquier otro no del lote entero, esta vez sueltas.
      if (estado === 404) laApiNoJunta = true;
      await Promise.all(
        lote.map(async (una) => {
          una.contestar(await consultarSuelta(una.nombre, una.parametros));
        }),
      );
      return;
    }

    let caducada = false;
    lote.forEach((una, i) => {
      const suya = juntas.datos[i];
      if (suya?.error === undefined && suya !== undefined) {
        una.contestar({ ok: true, datos: suya.datos, correlacionId: juntas.correlacionId });
        return;
      }
      const error = suya?.error ?? ERRORES.fallo_nuestro;
      opciones.registro?.aviso('la API ha dicho que no', {
        codigo: error.codigo,
        camino: `/consultas/${una.nombre}`,
      });
      if (error.codigo === 'sin_sesion') caducada = true;
      una.contestar({ ok: false, error, correlacionId: juntas.correlacionId });
    });
    // Una vez, aunque lo digan todas: es la misma sesión.
    if (caducada) opciones.alCaducarLaSesion?.();
  }

  function vaciarLaCola(): void {
    reloj = null;
    const todas = cola;
    cola = [];
    for (let desde = 0; desde < todas.length; desde += CONSULTAS_POR_LOTE) {
      void mandarElLote(todas.slice(desde, desde + CONSULTAS_POR_LOTE));
    }
  }

  return {
    consultar<T>(nombre: string, parametros: Record<string, string> = {}) {
      if (opciones.juntar !== true) return consultarSuelta<T>(nombre, parametros);
      return new Promise<Respuesta<T>>((contestar) => {
        cola.push({
          nombre,
          parametros: { ...parametros },
          contestar: contestar as (respuesta: Respuesta<unknown>) => void,
        });
        reloj ??= setTimeout(vaciarLaCola, ESPERA_PARA_JUNTAR_MS);
      });
    },

    ejecutar<T>(nombre: string, entrada: unknown, opcionesDeLlamada: OpcionesDeUnComando = {}) {
      // Si no se pasa clave, se pone una. Un comando SIEMPRE lleva la suya: es lo
      // que hace que reintentar no duplique nada.
      const clave = opcionesDeLlamada.claveDeIdempotencia ?? nuevaCorrelacionId();
      const hace = opcionesDeLlamada.hechoHaceMs;
      return llamar<T>('POST', `/comandos/${nombre}`, entrada, {
        'x-idempotencia': clave,
        ...(hace === undefined
          ? {}
          : { [CABECERA_HECHO_HACE]: String(Math.max(0, Math.trunc(hace))) }),
      });
    },
  };
}
