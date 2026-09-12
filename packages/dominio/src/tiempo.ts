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
    throw new Error(`«${valor}» no es una fecha. Se escriben así: 2026-09-01.`);
  }
  return valor as FechaOperativa;
}

export function horaDeCorte(valor: string): HoraDeCorte {
  if (!FORMATO_HORA.test(valor)) {
    throw new Error(`«${valor}» no es una hora de corte. Se escriben así: 05:00.`);
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
/**
 * Qué hora es en el local, «HH:MM» (M7).
 *
 * Hace falta para saber si **hoy todavía se llega** a pedir: «si me lo dices
 * antes de las ocho, te lo llevo mañana». Es la hora del reloj de pared del local,
 * no la jornada: a las dos de la mañana la jornada es la de ayer, pero el
 * proveedor cuenta con el día de hoy.
 */
export function horaEnElLocal(instante: Date, zonaHoraria: string): string {
  const reloj = relojDelLocal(instante, zonaHoraria);
  return `${String(reloj.hora).padStart(2, '0')}:${String(reloj.minuto).padStart(2, '0')}`;
}

/**
 * El día de la semana de una fecha, del 1 (lunes) al 7 (domingo) (M7).
 *
 * Es el `isodow` de Postgres, que es como se guardan los días de reparto de un
 * proveedor y lo que se repite en el Calendario. Se cuenta sobre la fecha, sin
 * zona: el martes es martes en cualquier sitio.
 */
export function diaDeLaSemana(fecha: FechaOperativa): number {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  const domingoEsCero = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return domingoEsCero === 0 ? 7 : domingoEsCero;
}

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
    throw new Error(`La diferencia entre ${desde} y ${hasta} no da días enteros. Eso es un fallo.`);
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

// ── Hasta dónde se mira hacia atrás ──────────────────────────────────────────

/**
 * Los tramos que se ofrecen en una lista larga (M7, repaso).
 *
 * ── Por qué esto existe ──────────────────────────────────────────────────────
 *
 * Porque un libro de movimientos, un histórico de mermas o una lista de albaranes
 * **crecen todos los días y no paran**. Un local en marcha apunta cuarenta líneas
 * diarias: a los seis meses son siete mil, y ninguna pantalla puede traerlas ni
 * ninguna persona puede recorrerlas.
 *
 * Las dos salidas malas son conocidas: traerlo todo —que funciona el primer mes y
 * se cae el sexto— o cortar por un número fijo y decir «se enseñan los cien
 * últimos», que es lo que había y que convierte el buscador en una mentira: buscar
 * «aceite» contestaba «nada con eso» cuando el aceite estaba en la línea tres mil.
 *
 * La buena es la de las aplicaciones que llevan años con esto: **se ve un tramo de
 * tiempo, se puede ampliar de tanto en tanto, y buscar busca en todo el tramo**,
 * no en lo que se haya traído. Tres meses es el tramo con el que trabaja un bar
 * —un trimestre— y por eso es el de en medio.
 *
 * Vive en el dominio y no en cada pantalla porque lo usan el libro, las mermas y
 * lo que venga: un catálogo, un dueño (regla 6).
 */
export const TRAMOS_QUE_SE_MIRAN = ['mes', 'trimestre', 'semestre', 'ano'] as const;

export type TramoQueSeMira = (typeof TRAMOS_QUE_SE_MIRAN)[number];

/** Cuántos días hacia atrás mira cada tramo. */
export const DIAS_DEL_TRAMO: Readonly<Record<TramoQueSeMira, number>> = {
  mes: 30,
  trimestre: 90,
  semestre: 180,
  ano: 365,
};

/** Cómo se llama en pantalla. En cristiano: nadie dice «últimos 90 días». */
export const NOMBRE_DEL_TRAMO: Readonly<Record<TramoQueSeMira, string>> = {
  mes: 'El último mes',
  trimestre: 'Los últimos tres meses',
  semestre: 'Los últimos seis meses',
  ano: 'El último año',
};

export function esTramoQueSeMira(valor: unknown): valor is TramoQueSeMira {
  return typeof valor === 'string' && (TRAMOS_QUE_SE_MIRAN as readonly string[]).includes(valor);
}

/**
 * Desde qué jornada empieza un tramo, contando desde hoy.
 *
 * `hoy` llega de fuera **y del servidor**: aquí no se mira el reloj del navegador
 * (regla 10), que a las dos de la mañana no sabe en qué jornada está un bar.
 */
export function desdeCuandoMira(tramo: TramoQueSeMira, hoy: FechaOperativa): FechaOperativa {
  return masDias(hoy, -DIAS_DEL_TRAMO[tramo]);
}
