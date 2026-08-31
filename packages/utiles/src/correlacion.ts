/**
 * El identificador de correlacion (M0).
 *
 * Nace en el navegador cuando alguien pulsa algo, viaja en la cabecera
 * `x-correlacion-id` hasta la API, baja a los comandos, a los eventos y a los
 * trabajos de la cola, y aparece en cada linea del registro y en cada suceso de
 * Sentry. Sirve para responder a «que paso exactamente cuando Sara toco ese boton».
 */
export const CABECERA_CORRELACION = 'x-correlacion-id';

const FORMATO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function esCorrelacionId(valor: unknown): valor is string {
  return typeof valor === 'string' && FORMATO.test(valor);
}

export function nuevaCorrelacionId(): string {
  return crypto.randomUUID();
}

/**
 * Toma el que venga de fuera si es valido; si no, crea uno.
 * Nunca se confia en un identificador con formato raro: se sustituye y ya.
 */
export function correlacionIdDeEntrada(recibido: string | null | undefined): string {
  return esCorrelacionId(recibido) ? recibido : nuevaCorrelacionId();
}
