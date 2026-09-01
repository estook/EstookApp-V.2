/**
 * Los dos hilos que permiten reconstruir que paso (M0).
 *
 * Son cosas distintas y se confunden con facilidad, asi que aqui van separadas:
 *
 *   SESION        Uno por visita. Nace cuando se abre la aplicacion y vive hasta
 *                 que se cierra la pestana. Agrupa todo lo que hizo esa persona
 *                 en ese rato: «ensename todo lo de Sara en el turno de ayer».
 *
 *   CORRELACION   Uno por accion. Nace en el navegador cuando alguien pulsa algo,
 *                 viaja en la cabecera `x-correlacion-id` hasta la API, baja a
 *                 los comandos, a los eventos y a los trabajos de la cola.
 *                 Responde a «que paso exactamente cuando Sara toco ESE boton».
 *
 * Una sesion contiene muchas correlaciones. Si hubiera una sola para toda la
 * visita, en un turno de ocho horas ese numero no distinguiria nada: todas las
 * lineas del registro compartirian el mismo, y rastrear una operacion concreta
 * seria imposible.
 *
 * En M0 solo existe la sesion, porque todavia no hay acciones que enviar. Las
 * correlaciones por accion las pone en marcha M2, que es donde nace la API.
 */
export const CABECERA_CORRELACION = 'x-correlacion-id';
export const CABECERA_SESION = 'x-sesion-id';

const FORMATO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function esUuid(valor: unknown): valor is string {
  return typeof valor === 'string' && FORMATO.test(valor);
}

export function esCorrelacionId(valor: unknown): valor is string {
  return esUuid(valor);
}

export function esSesionId(valor: unknown): valor is string {
  return esUuid(valor);
}

/** Uno nuevo por cada accion que se envia. */
export function nuevaCorrelacionId(): string {
  return crypto.randomUUID();
}

/** Uno nuevo por cada visita, al abrir la aplicacion. */
export function nuevaSesionId(): string {
  return crypto.randomUUID();
}

/**
 * Toma el que venga de fuera si es valido; si no, crea uno.
 * Nunca se confia en un identificador con formato raro: se sustituye y ya.
 */
export function correlacionIdDeEntrada(recibido: string | null | undefined): string {
  return esCorrelacionId(recibido) ? recibido : nuevaCorrelacionId();
}

/** Lo mismo para la sesion. */
export function sesionIdDeEntrada(recibido: string | null | undefined): string {
  return esSesionId(recibido) ? recibido : nuevaSesionId();
}
