import { CABECERA_CORRELACION, nuevaCorrelacionId, type Registro } from '@estook/utiles';

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
export type Respuesta<T> =
  | { readonly ok: true; readonly datos: T; readonly correlacionId: string }
  | { readonly ok: false; readonly error: ErrorDeLaApi; readonly correlacionId: string };

export interface OpcionesDelCliente {
  readonly base: string;
  /** Quien pregunta. En M4 lo pondra el login; hasta entonces se pasa a mano. */
  readonly personaId?: string | null;
  readonly registro?: Registro;
  /** Para poder probar sin red. */
  readonly pedir?: typeof fetch;
}

export interface ClienteApi {
  consultar<T>(nombre: string, parametros?: Record<string, string>): Promise<Respuesta<T>>;
  ejecutar<T>(
    nombre: string,
    entrada: unknown,
    opciones?: { claveDeIdempotencia?: string },
  ): Promise<Respuesta<T>>;
}

const ERROR_SIN_RED: ErrorDeLaApi = {
  codigo: 'sin_conexion',
  quePasa: 'No hay conexión.',
  queSePuedeHacer: 'Lo que has apuntado se guarda en el móvil y sube solo cuando vuelva la señal.',
  boton: null,
};

export function crearCliente(opciones: OpcionesDelCliente): ClienteApi {
  const pedir = opciones.pedir ?? fetch;
  const raiz = opciones.base.replace(/\/+$/, '');

  async function llamar<T>(
    metodo: 'GET' | 'POST',
    camino: string,
    cuerpo: unknown,
    cabecerasExtra: Record<string, string>,
  ): Promise<Respuesta<T>> {
    // Cada llamada nace con su hilo, aunque la sesion sea la misma.
    const correlacionId = nuevaCorrelacionId();

    const cabeceras: Record<string, string> = {
      [CABECERA_CORRELACION]: correlacionId,
      ...cabecerasExtra,
    };
    if (opciones.personaId) cabeceras['x-persona-id'] = opciones.personaId;
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
      return { ok: false, error, correlacionId };
    }

    return { ok: true, datos: devuelto?.datos as T, correlacionId };
  }

  return {
    consultar<T>(nombre: string, parametros: Record<string, string> = {}) {
      const query = new URLSearchParams(parametros).toString();
      return llamar<T>('GET', `/consultas/${nombre}${query ? `?${query}` : ''}`, undefined, {});
    },

    ejecutar<T>(
      nombre: string,
      entrada: unknown,
      opcionesDeLlamada: { claveDeIdempotencia?: string } = {},
    ) {
      // Si no se pasa clave, se pone una. Un comando SIEMPRE lleva la suya: es lo
      // que hace que reintentar no duplique nada.
      const clave = opcionesDeLlamada.claveDeIdempotencia ?? nuevaCorrelacionId();
      return llamar<T>('POST', `/comandos/${nombre}`, entrada, { 'x-idempotencia': clave });
    },
  };
}
