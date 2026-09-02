import type { ErrorDeLaApi } from '@estook/cliente-api';

/**
 * Un error de la API, envuelto para poder lanzarlo (M5).
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
