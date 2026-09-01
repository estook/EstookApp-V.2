/**
 * Motor de tiempo (M2).
 *
 * Regla 10 del Plan: **nunca se decide la fecha operativa en el navegador. La
 * decide el servidor.** Y la decide con dos datos del local: su zona horaria y su
 * hora de corte (Auditoría, parte 7).
 *
 * El problema que resuelve: un bar cierra a las tres de la mañana. Una venta de
 * las 02:30 del sábado pertenece a la jornada del **viernes**, no a la del
 * sábado. Si cada sitio lo calculara por su cuenta, las ventas del cierre
 * acabarían en el día equivocado y la desviación de género no cuadraría nunca.
 *
 * Ninguna función de aquí lee el reloj: el instante se pasa siempre desde fuera.
 * Así se puede probar el cambio de hora sin esperar a octubre.
 */

/** Una fecha de calendario, sin hora. `2026-09-01`. */
export type FechaOperativa = string & { readonly __fechaOperativa: unique symbol };

/** `HH:MM` en hora local del local. */
export type HoraDeCorte = string & { readonly __horaDeCorte: unique symbol };

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function fechaOperativa(valor: string): FechaOperativa {
  if (!FORMATO_FECHA.test(valor)) {
    throw new Error(`«${valor}» no es una fecha. Se escriben asi: 2026-09-01.`);
  }
  return valor as FechaOperativa;
}

export function horaDeCorte(valor: string): HoraDeCorte {
  if (!FORMATO_HORA.test(valor)) {
    throw new Error(`«${valor}» no es una hora de corte. Se escriben asi: 05:00.`);
  }
  return valor as HoraDeCorte;
}

/** La de un local que no ha dicho otra cosa: la jornada corta a las cinco. */
export const CORTE_POR_DEFECTO = horaDeCorte('05:00');

interface RelojLocal {
  readonly anio: number;
  readonly mes: number;
  readonly dia: number;
  readonly hora: number;
  readonly minuto: number;
}

/**
 * Qué hora es en el local en ese instante. Lo resuelve `Intl`, que conoce el
 * histórico de cambios de hora de cada zona, así que el último domingo de octubre
 * sale bien sin que nosotros hagamos nada.
 */
function relojDelLocal(instante: Date, zonaHoraria: string): RelojLocal {
  let partes;
  try {
    partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(instante);
  } catch {
    throw new Error(`«${zonaHoraria}» no es una zona horaria que este sistema conozca.`);
  }

  const dato = (tipo: Intl.DateTimeFormatPartTypes): number => {
    const parte = partes.find((p) => p.type === tipo);
    if (!parte) throw new Error(`No se ha podido leer ${tipo} de la hora local.`);
    return Number(parte.value);
  };

  // A medianoche, `hour12: false` puede devolver 24 en algunos entornos.
  const hora = dato('hour') % 24;

  return { anio: dato('year'), mes: dato('month'), dia: dato('day'), hora, minuto: dato('minute') };
}

function comoTexto(anio: number, mes: number, dia: number): FechaOperativa {
  return fechaOperativa(
    `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
  );
}

/**
 * A qué jornada pertenece un instante.
 *
 * Antes de la hora de corte, cuenta como el día anterior. Es lo que hace que las
 * copas de las dos de la mañana del sábado sean del viernes.
 */
export function jornadaDe(
  instante: Date,
  zonaHoraria: string,
  corte: HoraDeCorte = CORTE_POR_DEFECTO,
): FechaOperativa {
  const reloj = relojDelLocal(instante, zonaHoraria);
  const [horaCorte, minutoCorte] = corte.split(':').map(Number) as [number, number];

  const minutosAhora = reloj.hora * 60 + reloj.minuto;
  const minutosDeCorte = horaCorte * 60 + minutoCorte;

  if (minutosAhora >= minutosDeCorte) {
    return comoTexto(reloj.anio, reloj.mes, reloj.dia);
  }

  // Antes del corte: es la jornada de ayer. Se resta un día sobre el calendario
  // del local, no sobre el instante, para que un cambio de hora no lo mueva.
  const ayer = new Date(Date.UTC(reloj.anio, reloj.mes - 1, reloj.dia));
  ayer.setUTCDate(ayer.getUTCDate() - 1);
  return comoTexto(ayer.getUTCFullYear(), ayer.getUTCMonth() + 1, ayer.getUTCDate());
}

/** La fecha del calendario en el local, sin tener en cuenta la hora de corte. */
export function fechaEnElLocal(instante: Date, zonaHoraria: string): FechaOperativa {
  const reloj = relojDelLocal(instante, zonaHoraria);
  return comoTexto(reloj.anio, reloj.mes, reloj.dia);
}

/** Suma (o resta, con negativo) días de calendario a una fecha. */
export function masDias(fecha: FechaOperativa, dias: number): FechaOperativa {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  const movida = new Date(Date.UTC(anio, mes - 1, dia));
  movida.setUTCDate(movida.getUTCDate() + dias);
  return comoTexto(movida.getUTCFullYear(), movida.getUTCMonth() + 1, movida.getUTCDate());
}

/**
 * Cuántos días de calendario hay entre dos fechas. Negativo si `hasta` es antes.
 *
 * No hace falta redondear, y a propósito no se redondea: las dos fechas se
 * convierten a medianoche en hora universal, así que su diferencia es siempre un
 * número exacto de días. Si algún día dejara de serlo, es que hay un error, y
 * redondear lo escondería.
 */
const MILISEGUNDOS_POR_DIA = 86_400_000;

export function diasEntre(desde: FechaOperativa, hasta: FechaOperativa): number {
  const aUtc = (f: FechaOperativa) => {
    const [anio, mes, dia] = f.split('-').map(Number) as [number, number, number];
    return Date.UTC(anio, mes - 1, dia);
  };
  const diferencia = aUtc(hasta) - aUtc(desde);
  if (diferencia % MILISEGUNDOS_POR_DIA !== 0) {
    throw new Error(`La diferencia entre ${desde} y ${hasta} no da dias enteros. Eso es un fallo.`);
  }
  return diferencia / MILISEGUNDOS_POR_DIA;
}

export function esAnterior(fecha: FechaOperativa, otra: FechaOperativa): boolean {
  return fecha < otra;
}

/** Si una fecha cae dentro de una vigencia. `hasta` nulo es «sin fin». */
export function estaVigente(
  fecha: FechaOperativa,
  desde: FechaOperativa,
  hasta: FechaOperativa | null,
): boolean {
  return fecha >= desde && (hasta === null || fecha <= hasta);
}
