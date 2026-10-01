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

/**
 * **Lo hecho sin conexión** (0070): cuántos milisegundos hace que se hizo, según el
 * móvil que lo tuvo guardado sin señal. Va en una cabecera y no en el cuerpo a
 * propósito: el cuerpo es lo que se hizo, y con la clave de idempotencia se compara
 * igual en cada reintento; cuánto hace cambia en cada uno.
 */
export const CABECERA_HECHO_HACE = 'x-hecho-hace';

/** Lo que dice la cabecera, si es un número entero de milisegundos. Nulo si no. */
export function hechoHace(valor: string | undefined): number | null {
  if (valor === undefined || !/^[0-9]{1,12}$/.test(valor.trim())) return null;
  return Number(valor.trim());
}

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

/**
 * La dirección desde la que llega la petición (0041), o nulo.
 *
 * Supabase pone delante de la API un proxy, así que la dirección de verdad viene
 * en `x-forwarded-for`: la primera de la lista es la del navegador. Se guarda en
 * la auditoría del admin y **no decide nada**: se puede falsear, y por eso solo
 * se acepta con forma de dirección —números, puntos y dos puntos— y corta. Lo que
 * no la tenga, no se guarda.
 */
export const CABECERA_DIRECCION = 'x-forwarded-for';

export function direccionDeLaPeticion(valor: string | undefined): string | null {
  const primera = valor?.split(',')[0]?.trim() ?? '';
  return /^[0-9a-fA-F.:]{3,45}$/.test(primera) ? primera : null;
}
