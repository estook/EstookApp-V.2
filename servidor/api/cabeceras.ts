/**
 * Las cabeceras propias de Estook (M2, revisadas en M4).
 *
 * Viven aqui, en transporte, porque son cosa del protocolo. Lo que significan
 * esta en la capa que las usa.
 */

/** La clave que hace que reintentar un comando no lo ejecute dos veces. */
export const CABECERA_IDEMPOTENCIA = 'x-idempotencia';

/**
 * Quien pregunta, desde M4: `Authorization: Bearer <token>`.
 *
 * **`x-persona-id` ya no existe, y quitarla es media M4.** Era correcta mientras
 * no hubiera login —«en M4 esto saldra de la sesion», decia el comentario— pero
 * mientras estuvo puesta cualquiera podia escribir el identificador de otra
 * persona y ver sus datos. La regla 4 del Plan: «toda regla de acceso se prueba
 * llamando a la API a pelo». Llamandola a pelo, esa cabecera abria la puerta.
 *
 * Se usa `Authorization` y no una cabecera propia porque es la estandar: los
 * agrupadores, los cortafuegos y los registros ya saben que ahi hay un secreto y
 * no la escriben en el disco.
 */
export const CABECERA_AUTORIZACION = 'authorization';

/** Se pone en la respuesta cuando el comando ya se habia hecho antes. */
export const CABECERA_REPETIDA = 'x-repetida';

/**
 * Saca el token de `Authorization: Bearer <token>`.
 *
 * Devuelve nulo ante cualquier cosa que no sea exactamente eso, en vez de
 * intentar adivinar. Un token a medias no es un token.
 */
export function tokenDeLaCabecera(valor: string | undefined): string | null {
  if (!valor) return null;
  const partes = valor.split(' ');
  if (partes.length !== 2 || partes[0]?.toLowerCase() !== 'bearer') return null;
  const token = partes[1]?.trim() ?? '';
  return token === '' ? null : token;
}
