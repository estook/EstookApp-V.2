import { errorDeEstook, type CodigoDeError } from '@estook/dominio';
import { CABECERA_CORRELACION } from '@estook/utiles';

/**
 * Como responde la API (M2).
 *
 * Un solo sitio donde se construye una respuesta, para que todas se parezcan y
 * para que **ningun error se escape sin pasar por el catalogo en cristiano**.
 *
 * Lo que nunca sale de aqui: un mensaje de Postgres, una traza, el nombre de una
 * tabla, ni la palabra «error». Quien lee esto puede ser una camarera con el
 * movil en la mano en mitad de un servicio.
 */

export interface CuerpoDeError {
  readonly error: {
    readonly codigo: string;
    readonly quePasa: string;
    readonly queSePuedeHacer: string;
    readonly boton: { readonly texto: string; readonly accion: string } | null;
    readonly detalle?: Record<string, unknown>;
  };
}

export function respuestaDeError(
  codigo: CodigoDeError,
  correlacionId: string,
  detalle?: Record<string, unknown>,
): Response {
  const el = errorDeEstook(codigo);

  const cuerpo: CuerpoDeError = {
    error: {
      codigo: el.codigo,
      quePasa: el.quePasa,
      queSePuedeHacer: el.queSePuedeHacer,
      boton: el.boton,
      ...(detalle ? { detalle } : {}),
    },
  };

  return new Response(JSON.stringify(cuerpo), {
    status: el.estadoHttp,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      [CABECERA_CORRELACION]: correlacionId,
    },
  });
}

export function respuestaConDatos(
  datos: unknown,
  correlacionId: string,
  estado = 200,
  cabecerasExtra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ datos }), {
    status: estado,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      [CABECERA_CORRELACION]: correlacionId,
      ...cabecerasExtra,
    },
  });
}
