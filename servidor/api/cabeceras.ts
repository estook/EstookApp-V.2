/**
 * Las cabeceras propias de Estook (M2).
 *
 * Viven aqui, en transporte, porque son cosa del protocolo. Lo que significan
 * esta en la capa que las usa.
 */

/** La clave que hace que reintentar un comando no lo ejecute dos veces. */
export const CABECERA_IDEMPOTENCIA = 'x-idempotencia';

/** Quien pregunta. En M4 saldra de la sesion; hasta entonces llega asi. */
export const CABECERA_PERSONA = 'x-persona-id';

/** Se pone en la respuesta cuando el comando ya se habia hecho antes. */
export const CABECERA_REPETIDA = 'x-repetida';
