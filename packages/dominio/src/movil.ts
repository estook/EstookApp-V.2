import { plural } from './textos.ts';
import { fechaEnElLocal, horaEnElLocal, instanteEnElLocal, masDias } from './tiempo.ts';

/**
 * El móvil · cuándo suena y lo que se hace sin conexión (I · decisión 0070).
 *
 * Dos reglas puras que comparten el servidor y la pantalla, y por eso viven aquí:
 *
 *   1 · **Cuándo puede sonar el móvil de alguien.** «Fuera de turno no suena nada»
 *       (0017, regla 3). Quien tiene horario, solo en su turno; quien no lo tiene
 *       (un area manager, dirección), fuera de sus horas de silencio. Cada uno lo
 *       cambia en Ajustes → Avisos (Richi, 1-oct: «que lo configuren como quieran»).
 *   2 · **A qué hora pasó lo que se hizo sin conexión.** La hora la pone el servidor
 *       (regla 10): el móvil solo dice cuánto hace.
 */

// ── 1 · Cuándo puede sonar ───────────────────────────────────────────────────

export const MODOS_DE_SONAR = ['en_mi_turno', 'fuera_del_silencio'] as const;

/**
 * `en_mi_turno`        solo mientras estás de turno, y cinco minutos antes de entrar.
 * `fuera_del_silencio` siempre, menos en tus horas de silencio.
 */
export type CuandoSuena = (typeof MODOS_DE_SONAR)[number];

export function esCuandoSuena(valor: unknown): valor is CuandoSuena {
  return typeof valor === 'string' && (MODOS_DE_SONAR as readonly string[]).includes(valor);
}

/** De 23:00 a 08:00: la noche, que es cuando un aviso del trabajo no lo quiere nadie. */
export const SILENCIO_DE_FABRICA = { desde: '23:00', hasta: '08:00' } as const;

/** «Entras en cinco minutos»: se avisa este rato antes de cada turno. */
export const MINUTOS_ANTES_DE_ENTRAR = 5;

/**
 * Cuántos días se mira hacia delante para saber cuándo vuelve a poder sonar. Pasado
 * eso, lo que haya se queda en la campana: quien está de vacaciones dos semanas no
 * necesita que al volver le suenen quince avisos viejos.
 */
export const DIAS_QUE_ESPERA_UN_AVISO = 7;

export interface TurnoQueSeMira {
  readonly empieza: Date;
  readonly acaba: Date;
}

export interface ComoLeSuena {
  readonly modo: CuandoSuena;
  /** «HH:MM». Si son iguales, no hay silencio. */
  readonly silencioDesde: string;
  readonly silencioHasta: string;
  /** La zona de su local: las horas de silencio son las de su reloj de pared. */
  readonly zonaHoraria: string;
  /** Sus turnos de los próximos días, publicados o de siempre. */
  readonly turnos: readonly TurnoQueSeMira[];
  /** Si ahora mismo está fichado: está trabajando, tenga o no turno puesto. */
  readonly fichadoAhora: boolean;
}

/**
 * El modo de quien no ha elegido: **en su turno si tiene horario**, y si no lo tiene,
 * fuera de sus horas de silencio. Un area manager no ficha ni sale en el horario
 * (Richi, 1-oct), así que «solo en tu turno» sería no avisarle nunca.
 */
export function suModo(elegido: CuandoSuena | null, tieneHorario: boolean): CuandoSuena {
  if (elegido !== null) return elegido;
  return tieneHorario ? 'en_mi_turno' : 'fuera_del_silencio';
}

function minutosDelDia(hora: string): number {
  const [h, m] = hora.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

/** Si en el reloj del local es hora de silencio. Cruza la medianoche si hace falta. */
export function estaEnSilencio(
  ahora: Date,
  desde: string,
  hasta: string,
  zonaHoraria: string,
): boolean {
  const a = minutosDelDia(desde);
  const b = minutosDelDia(hasta);
  if (a === b) return false;
  const m = minutosDelDia(horaEnElLocal(ahora, zonaHoraria));
  return a < b ? m >= a && m < b : m >= a || m < b;
}

/** Cuándo acaba el silencio en el que se está: hoy o mañana a su hora, en el local. */
function cuandoAcabaElSilencio(ahora: Date, hasta: string, zonaHoraria: string): Date {
  const hoy = fechaEnElLocal(ahora, zonaHoraria);
  const hoyALaHora = instanteEnElLocal(hoy, hasta, zonaHoraria);
  return hoyALaHora.getTime() > ahora.getTime()
    ? hoyALaHora
    : instanteEnElLocal(masDias(hoy, 1), hasta, zonaHoraria);
}

const MINUTO = 60_000;

/**
 * **Cuándo puede sonar el móvil de alguien**: ahora, más tarde, o nulo si en los
 * próximos días no va a poder (entonces se queda en la campana, que es donde está).
 *
 *   · En su turno: si está fichado, ahora. Si está en un turno —o a cinco minutos de
 *     entrar—, ahora. Si no, cinco minutos antes de su próximo turno, que es cuando
 *     le suena «entras en cinco minutos»: lo que esperaba sale a la vez.
 *   · Fuera del silencio: ahora, o cuando acabe el silencio.
 */
export function cuandoPuedeSonar(ahora: Date, como: ComoLeSuena): Date | null {
  if (como.modo === 'fuera_del_silencio') {
    if (!estaEnSilencio(ahora, como.silencioDesde, como.silencioHasta, como.zonaHoraria)) {
      return ahora;
    }
    return cuandoAcabaElSilencio(ahora, como.silencioHasta, como.zonaHoraria);
  }

  if (como.fichadoAhora) return ahora;
  const antes = MINUTOS_ANTES_DE_ENTRAR * MINUTO;
  const t = ahora.getTime();
  let proximo: number | null = null;
  for (const turno of como.turnos) {
    const desde = turno.empieza.getTime() - antes;
    if (t >= desde && t < turno.acaba.getTime()) return ahora;
    if (desde > t && (proximo === null || desde < proximo)) proximo = desde;
  }
  if (proximo === null || proximo - t > DIAS_QUE_ESPERA_UN_AVISO * 24 * 60 * MINUTO) return null;
  return new Date(proximo);
}

/**
 * **Cuándo se le recuerda a alguien que le falta confirmar** un mensaje (C2 · 0075):
 * una vez, al empezar su siguiente turno.
 *
 *   · En su turno: al empezar **el primer turno que empieza después** de que se
 *     mandara. Si estaba trabajando, el de la próxima vez: ya lo tuvo delante.
 *   · Fuera del silencio (quien no tiene horario): cuando acaba su próximo silencio,
 *     que es cuando empieza su día. Sin silencio, al día siguiente a la misma hora.
 *   · Nulo si en una semana no le toca: entonces no se le recuerda, y quien lo pidió
 *     lo ve en la lista de quién falta.
 */
export function cuandoSeRecuerda(enviado: Date, como: ComoLeSuena): Date | null {
  const tope = enviado.getTime() + DIAS_QUE_ESPERA_UN_AVISO * 24 * 60 * MINUTO;
  if (como.modo === 'en_mi_turno') {
    const siguiente = como.turnos
      .map((t) => t.empieza.getTime())
      .filter((t) => t > enviado.getTime())
      .sort((a, b) => a - b)[0];
    return siguiente === undefined || siguiente > tope ? null : new Date(siguiente);
  }
  if (minutosDelDia(como.silencioDesde) === minutosDelDia(como.silencioHasta)) {
    return new Date(enviado.getTime() + 24 * 60 * MINUTO);
  }
  return cuandoAcabaElSilencio(enviado, como.silencioHasta, como.zonaHoraria);
}

// ── 2 · Lo hecho sin conexión ────────────────────────────────────────────────

/**
 * Lo más viejo que se acepta: una semana. Un fichaje de hace diez días que aparece
 * de golpe no es un móvil sin cobertura, es otra cosa, y lo apunta quien lleva el
 * equipo a mano, con su motivo.
 */
export const SIN_CONEXION_COMO_MUCHO_MS = 7 * 24 * 60 * MINUTO;

/** Pasado esto sin señal, el fichaje lo revisa quien lleva el equipo (mejora 15). */
export const SIN_CONEXION_SE_REVISA_MS = 12 * 60 * MINUTO;

/**
 * **A qué hora pasó**: la del servidor menos lo que dice el móvil que ha pasado.
 *
 * El móvil no manda su hora: manda **cuánto hace**, medido con su propio reloj entre
 * que se hizo y que se manda. Que el móvil vaya cinco minutos adelantado da igual,
 * porque solo cuenta la diferencia; y el servidor pone la hora de verdad (regla 10).
 */
export function laHoraDeLoHecho(ahora: Date, haceMs: number): Date {
  return new Date(ahora.getTime() - Math.max(0, Math.trunc(haceMs)));
}

/** Si lo hecho sin conexión se acepta: ni negativo, ni de hace más de una semana. */
export function seAceptaLoHecho(haceMs: number): boolean {
  return Number.isFinite(haceMs) && haceMs >= 0 && haceMs <= SIN_CONEXION_COMO_MUCHO_MS;
}

/** Si un fichaje hecho sin conexión lo revisa quien lleva el equipo. */
export function seRevisaElFichaje(haceMs: number): boolean {
  return haceMs > SIN_CONEXION_SE_REVISA_MS;
}

// ── 3 · Lo que dice el móvil cuando se juntan varios ─────────────────────────

/** Lo que se nombra en un resumen: más no cabe en la pantalla bloqueada. */
const AVISOS_QUE_SE_NOMBRAN = 2;

/**
 * Cuando lo que esperaba a que acabara el silencio sale todo junto, **un solo aviso**:
 * «Tienes 3 avisos» · «Hoy caducan 2 lotes · Te cambian el horario · y 1 más». Tres
 * pitidos seguidos al entrar al turno son ruido, y uno que dice cuántos, no.
 */
export function resumenParaElMovil(titulos: readonly string[]): {
  readonly titulo: string;
  readonly detalle: string;
} {
  const nombrados = titulos.slice(0, AVISOS_QUE_SE_NOMBRAN);
  const quedan = titulos.length - nombrados.length;
  return {
    titulo: `Tienes ${plural(titulos.length, 'aviso', 'avisos')}`,
    detalle:
      quedan > 0 ? `${nombrados.join(' · ')} · y ${String(quedan)} más` : nombrados.join(' · '),
  };
}
