import { comoSeLeenLasHoras, comoSeLlamaElDia, loQueCuesta, type Retribucion } from './equipo.ts';
import { centimos, entreFactor } from './dinero.ts';
import { fechaEnLetra, plural } from './textos.ts';
import { diaDeLaSemana, diasEntre, masDias, type FechaOperativa } from './tiempo.ts';
import type { LoQueDiceUnAviso } from './avisos.ts';

/**
 * El horario de la semana · H2 (decisiones 0068 y 0069).
 *
 * Hasta H2, Estook sabía a qué hora entra **normalmente** cada persona (el horario
 * de siempre, 0027) y cuándo ha fichado. Esto es **quién trabaja el jueves que
 * viene**: la semana del local, tramo a tramo, con sus libres, vacaciones y bajas.
 *
 * Aquí viven las cuentas, y solo aquí (regla 6): cuánto dura un tramo, qué avisos
 * salen al montarlo, lo que cuesta, las ventas previstas y qué ha cambiado entre lo
 * publicado y lo nuevo. Las usan el servidor, al contestar y al publicar, y la
 * pantalla, que recalcula al momento mientras se monta sin esperar a la red.
 *
 * ── Las reglas, en llano ────────────────────────────────────────────────────
 *
 * - **La semana va de lunes a domingo.**
 * - **Un tramo que sale antes de entrar cruza la medianoche**: 20:00–02:00 son seis
 *   horas, del día en que empieza. Es lo normal en un bar.
 * - **El horario partido son dos tramos** el mismo día. El hueco no se trabaja.
 * - **El descanso previsto** de un tramo («30 min de descanso») se resta de las
 *   horas. Es lo que se paga si la pausa no cuenta, que es lo de fábrica (0068).
 * - **Los avisos avisan, no impiden** (h-horarios, punto 4): quien lleva el local
 *   publica igual si quiere.
 */

// ── Qué es un turno ──────────────────────────────────────────────────────────

export const TIPOS_DE_TURNO = ['trabajo', 'libre', 'vacaciones', 'baja'] as const;
export type TipoDeTurno = (typeof TIPOS_DE_TURNO)[number];

/** Cómo se dice cada ausencia en el horario. El trabajo se dice con sus horas. */
export const COMO_SE_DICE_LA_AUSENCIA: Readonly<Record<Exclude<TipoDeTurno, 'trabajo'>, string>> = {
  libre: 'Libre',
  vacaciones: 'Vacaciones',
  baja: 'Baja',
};

export interface TurnoDelHorario {
  readonly personaId: string;
  /** El día en que empieza, `2026-10-05`. */
  readonly dia: string;
  readonly tipo: TipoDeTurno;
  /** `HH:MM`. Solo en los de trabajo. */
  readonly entra: string | null;
  readonly sale: string | null;
  /** Lo que se descansa dentro del tramo, en minutos. Cero si nada. */
  readonly descansoMinutos: number;
}

const MINUTOS_DEL_DIA = 24 * 60;

function enMinutos(hora: string): number {
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * Lo que dura un tramo, de la entrada a la salida, en minutos.
 *
 * Si sale a la misma hora o antes de la que entra, **cruza la medianoche**: 20:00 a
 * 02:00 son seis horas. Salir justo a la hora de entrar no es un tramo de cero
 * minutos, y la base no lo deja guardar (0053).
 */
export function minutosDelTramo(entra: string, sale: string): number {
  const desde = enMinutos(entra);
  const hasta = enMinutos(sale);
  return hasta > desde ? hasta - desde : hasta + MINUTOS_DEL_DIA - desde;
}

/** Lo que se trabaja en un turno: el tramo menos su descanso. Cero si es una ausencia. */
export function minutosDeTrabajo(turno: TurnoDelHorario): number {
  if (turno.tipo !== 'trabajo' || turno.entra === null || turno.sale === null) return 0;
  return Math.max(0, minutosDelTramo(turno.entra, turno.sale) - Math.max(0, turno.descansoMinutos));
}

// ── La semana ────────────────────────────────────────────────────────────────

/** El lunes de la semana de una fecha. */
export function lunesDe(fecha: FechaOperativa): FechaOperativa {
  return masDias(fecha, -(diaDeLaSemana(fecha) - 1));
}

/** Los siete días de la semana que empieza ese lunes. */
export function losDiasDeLaSemana(lunes: FechaOperativa): readonly FechaOperativa[] {
  return [0, 1, 2, 3, 4, 5, 6].map((d) => masDias(lunes, d));
}

/** «del 5 al 11 de octubre», o «del 28 de septiembre al 4 de octubre». */
export function laSemanaEnLetra(lunes: FechaOperativa): string {
  const domingo = masDias(lunes, 6);
  const [, mesLunes] = lunes.split('-');
  const [, mesDomingo] = domingo.split('-');
  const sinAnio = (f: FechaOperativa) => fechaEnLetra(f).replace(/ de \d{4}$/, '');
  const diaDelLunes = String(Number(lunes.slice(8)));
  return mesLunes === mesDomingo
    ? `del ${diaDelLunes} al ${sinAnio(domingo)}`
    : `del ${sinAnio(lunes)} al ${sinAnio(domingo)}`;
}

/**
 * Cómo se lee lo de una persona un día: «12:00–16:00 y 20:00–00:30», «Libre», o
 * nada si no tiene nada puesto. Los tramos, en orden, con su descanso si lo llevan.
 */
export function comoSeLeeElDia(turnos: readonly TurnoDelHorario[]): string {
  const ausencia = turnos.find((t) => t.tipo !== 'trabajo');
  if (ausencia !== undefined && ausencia.tipo !== 'trabajo') {
    return COMO_SE_DICE_LA_AUSENCIA[ausencia.tipo];
  }
  const tramos = turnos
    .filter((t) => t.tipo === 'trabajo' && t.entra !== null && t.sale !== null)
    .sort((a, b) => enMinutos(a.entra ?? '00:00') - enMinutos(b.entra ?? '00:00'))
    .map((t) => {
      const descanso =
        t.descansoMinutos > 0 ? ` (${String(t.descansoMinutos)} min de descanso)` : '';
      return `${t.entra ?? ''}–${t.sale ?? ''}${descanso}`;
    });
  if (tramos.length === 0) return '';
  if (tramos.length === 1) return tramos[0] ?? '';
  return `${tramos.slice(0, -1).join(', ')} y ${tramos[tramos.length - 1] ?? ''}`;
}

// ── Los avisos al montarlo ───────────────────────────────────────────────────

/** Horas de contrato de quien no tiene ninguna puesta (h-horarios, punto 5). */
export const HORAS_SI_NO_HAY_CONTRATO = 40;
/** Desde qué parte de sus horas se avisa en ámbar. */
export const CERCA_DE_SUS_HORAS = 0.9;
/** Estatuto de los Trabajadores, art. 34.3: doce horas entre el final de una jornada y el principio de la siguiente. */
export const DESCANSO_ENTRE_JORNADAS_MINUTOS = 12 * 60;
/** Art. 34.3: nueve horas de trabajo efectivo al día, salvo que el convenio diga otra cosa. */
export const JORNADA_MAXIMA_MINUTOS = 9 * 60;
/** Art. 37.1: día y medio seguido de descanso a la semana. */
export const DESCANSO_SEMANAL_MINUTOS = 36 * 60;

export type QueAvisa =
  'descanso_entre_jornadas' | 'jornada_larga' | 'descanso_semanal' | 'horas_de_contrato';

export interface AvisoDelHorario {
  readonly personaId: string;
  readonly que: QueAvisa;
  /** Ámbar avisa; rojo es pasarse de algo. Ninguno impide publicar. */
  readonly nivel: 'ambar' | 'rojo';
  /** El día al que se refiere, si es de un día. */
  readonly dia: string | null;
  readonly texto: string;
}

interface Intervalo {
  readonly empieza: number;
  readonly acaba: number;
  readonly dia: number;
}

/** Los tramos de trabajo de una persona, en minutos desde el lunes a las 00:00. */
function susIntervalos(turnos: readonly TurnoDelHorario[], lunes: FechaOperativa): Intervalo[] {
  return turnos
    .filter((t) => t.tipo === 'trabajo' && t.entra !== null && t.sale !== null)
    .map((t) => {
      const dia = diasEntre(lunes, t.dia as FechaOperativa);
      const empieza = dia * MINUTOS_DEL_DIA + enMinutos(t.entra ?? '00:00');
      return { dia, empieza, acaba: empieza + minutosDelTramo(t.entra ?? '', t.sale ?? '') };
    })
    .sort((a, b) => a.empieza - b.empieza);
}

/**
 * Lo que hay que mirar antes de publicar, persona a persona.
 *
 *   rojo    menos de 12 horas entre dos jornadas, o más horas que las de contrato
 *   ámbar   más de 9 horas de trabajo un día, sin día y medio seguido de descanso
 *           en la semana, o al 90 % de sus horas
 *
 * El descanso semanal se mira dentro de la semana, contando desde el lunes a las
 * 00:00 hasta el lunes siguiente: el Estatuto deja juntarlo en catorce días, y por
 * eso es ámbar y no rojo.
 */
export function avisosDelHorario(
  turnos: readonly TurnoDelHorario[],
  lunes: FechaOperativa,
  horasDeContrato: ReadonlyMap<string, number | null>,
): readonly AvisoDelHorario[] {
  const avisos: AvisoDelHorario[] = [];
  const porPersona = new Map<string, TurnoDelHorario[]>();
  for (const t of turnos) {
    const suyos = porPersona.get(t.personaId) ?? [];
    suyos.push(t);
    porPersona.set(t.personaId, suyos);
  }

  for (const [personaId, suyos] of porPersona) {
    const intervalos = susIntervalos(suyos, lunes);
    if (intervalos.length === 0) continue;

    // ── Cada día: más de nueve horas ────────────────────────────────────────
    const porDia = new Map<number, number>();
    for (const t of suyos) {
      const dia = diasEntre(lunes, t.dia as FechaOperativa);
      porDia.set(dia, (porDia.get(dia) ?? 0) + minutosDeTrabajo(t));
    }
    for (const [dia, cuanto] of [...porDia].sort((a, b) => a[0] - b[0])) {
      if (cuanto > JORNADA_MAXIMA_MINUTOS) {
        const fecha = masDias(lunes, dia);
        avisos.push({
          personaId,
          que: 'jornada_larga',
          nivel: 'ambar',
          dia: fecha,
          texto: `Más de 9 horas el ${comoSeLlamaElDia(dia + 1)}: ${comoSeLeenLasHoras(cuanto)}.`,
        });
      }
    }

    // ── Entre jornadas: doce horas ───────────────────────────────────────────
    // Una jornada es lo de un día, con todos sus tramos: el partido tiene su
    // hueco, y ese hueco no es el descanso entre jornadas.
    const jornadas = [...new Set(intervalos.map((i) => i.dia))].sort((a, b) => a - b);
    for (let i = 0; i + 1 < jornadas.length; i++) {
      const hoy = intervalos.filter((x) => x.dia === jornadas[i]);
      const siguiente = intervalos.filter((x) => x.dia === jornadas[i + 1]);
      const acaba = Math.max(...hoy.map((x) => x.acaba));
      const empieza = Math.min(...siguiente.map((x) => x.empieza));
      const hueco = empieza - acaba;
      if (hueco < DESCANSO_ENTRE_JORNADAS_MINUTOS) {
        const dia = jornadas[i + 1] ?? 0;
        avisos.push({
          personaId,
          que: 'descanso_entre_jornadas',
          nivel: 'rojo',
          dia: masDias(lunes, dia),
          texto: `Solo ${comoSeLeenLasHoras(Math.max(0, hueco))} de descanso antes del ${comoSeLlamaElDia(dia + 1)}: la ley pide 12 horas.`,
        });
      }
    }

    // ── La semana: día y medio seguido ──────────────────────────────────────
    let masLargo = intervalos[0]?.empieza ?? 0;
    let hasta = 0;
    for (const x of intervalos) {
      masLargo = Math.max(masLargo, x.empieza - hasta);
      hasta = Math.max(hasta, x.acaba);
    }
    masLargo = Math.max(masLargo, 7 * MINUTOS_DEL_DIA - hasta);
    if (masLargo < DESCANSO_SEMANAL_MINUTOS) {
      avisos.push({
        personaId,
        que: 'descanso_semanal',
        nivel: 'ambar',
        dia: null,
        texto: 'Sin día y medio seguido de descanso esta semana.',
      });
    }

    // ── Sus horas de contrato ────────────────────────────────────────────────
    const deContrato = horasDeContrato.get(personaId) ?? null;
    const horas = deContrato ?? HORAS_SI_NO_HAY_CONTRATO;
    const total = suyos.reduce((suma, t) => suma + minutosDeTrabajo(t), 0);
    const tope = horas * 60;
    const cuales = deContrato === null ? 'de referencia (no tiene contrato puesto)' : 'de contrato';
    if (total > tope) {
      avisos.push({
        personaId,
        que: 'horas_de_contrato',
        nivel: 'rojo',
        dia: null,
        texto: `${comoSeLeenLasHoras(total)} de ${comoSeLeenLasHoras(tope)} ${cuales}: se pasa ${comoSeLeenLasHoras(total - tope)}.`,
      });
    } else if (total >= tope * CERCA_DE_SUS_HORAS) {
      avisos.push({
        personaId,
        que: 'horas_de_contrato',
        nivel: 'ambar',
        dia: null,
        texto: `${comoSeLeenLasHoras(total)} de ${comoSeLeenLasHoras(tope)} ${cuales}.`,
      });
    }
  }

  return avisos;
}

// ── Lo que cuesta ────────────────────────────────────────────────────────────

export interface CosteDelHorario {
  /** Lo que cuesta la semana de quien tiene sueldo puesto, en céntimos. */
  readonly totalCentimos: number;
  readonly porPersona: ReadonlyMap<string, number>;
  /** Quien trabaja esa semana y no tiene sueldo puesto: no suma, y se dice. */
  readonly sinSueldo: readonly string[];
}

/**
 * Lo que cuesta la semana. **Una hora extra cuesta lo mismo que una normal** mientras
 * nadie diga otra cosa (h-horarios, punto 7), y quien no tiene sueldo puesto no suma
 * nada: se cuenta aparte, para decir cuántos faltan.
 */
export function costeDelHorario(
  turnos: readonly TurnoDelHorario[],
  retribuciones: ReadonlyMap<string, Retribucion | null>,
): CosteDelHorario {
  const minutosDe = new Map<string, number>();
  for (const t of turnos) {
    const cuanto = minutosDeTrabajo(t);
    if (cuanto > 0) minutosDe.set(t.personaId, (minutosDe.get(t.personaId) ?? 0) + cuanto);
  }
  const porPersona = new Map<string, number>();
  const sinSueldo: string[] = [];
  let totalCentimos = 0;
  for (const [personaId, cuanto] of minutosDe) {
    const retribucion = retribuciones.get(personaId) ?? null;
    const coste = retribucion === null ? null : loQueCuesta(cuanto, retribucion);
    if (coste === null) {
      sinSueldo.push(personaId);
      continue;
    }
    porPersona.set(personaId, coste);
    totalCentimos += coste;
  }
  return { totalCentimos, porPersona, sinSueldo };
}

// ── Las ventas previstas ─────────────────────────────────────────────────────

export interface VentaDeUnDia {
  readonly fecha: string;
  readonly centimos: number;
}

/** Cuántas semanas hacia atrás se miran, y cuántas con caja hacen falta. */
export const SEMANAS_PARA_PREVER = 4;
export const SEMANAS_MINIMAS_PARA_PREVER = 2;

/**
 * Lo que se espera vender cada día de la semana que empieza ese lunes: la media de
 * ese mismo día **en las cuatro semanas de antes que tuvieron caja**.
 *
 * Con menos de dos semanas con caja devuelve nulo, que es «todavía no se sabe» y no
 * un cero (h-horarios, punto 6). Un día que no tuvo caja ninguna de esas semanas
 * cuenta cero: es el día que el local cierra.
 */
export function ventasPrevistas(
  ventas: readonly VentaDeUnDia[],
  lunes: FechaOperativa,
): { readonly porDia: readonly number[]; readonly totalCentimos: number } | null {
  const desde = masDias(lunes, -7 * SEMANAS_PARA_PREVER);
  const semanasConCaja = new Set<number>();
  const sumaPorDia = [0, 0, 0, 0, 0, 0, 0];
  for (const v of ventas) {
    const fecha = v.fecha as FechaOperativa;
    const desdeElPrincipio = diasEntre(desde, fecha);
    if (desdeElPrincipio < 0 || diasEntre(fecha, lunes) <= 0) continue;
    semanasConCaja.add(Math.floor(desdeElPrincipio / 7));
    const dia = diaDeLaSemana(fecha) - 1;
    sumaPorDia[dia] = (sumaPorDia[dia] ?? 0) + v.centimos;
  }
  const semanas = semanasConCaja.size;
  if (semanas < SEMANAS_MINIMAS_PARA_PREVER) return null;
  // Dividir dinero es del motor del dinero (regla 9): un solo redondeo, al céntimo.
  const porDia: number[] = sumaPorDia.map((suma) => entreFactor(centimos(suma), semanas));
  return { porDia, totalCentimos: porDia.reduce((a, b) => a + b, 0) };
}

/** Qué parte de lo que se espera vender se va en personal. Nulo si no hay ventas. */
export function parteDePersonal(
  costeCentimos: number,
  ventasCentimos: number | null,
): number | null {
  if (ventasCentimos === null || ventasCentimos <= 0) return null;
  return costeCentimos / ventasCentimos;
}

// ── Lo que ha cambiado desde lo publicado ────────────────────────────────────

export interface CambioDeUnaPersona {
  readonly personaId: string;
  /** Una línea por día que cambia: «martes: 12:00–16:00 → 13:00–17:00». */
  readonly dias: readonly string[];
}

/**
 * A quién le ha cambiado algo, y qué, entre lo publicado y lo que se va a publicar.
 *
 * Se compara **cómo se lee cada día**, no los turnos uno a uno: borrar un tramo y
 * volver a ponerlo igual no es un cambio para quien lo trabaja, y no debe sonarle.
 */
export function loQueHaCambiado(
  antes: readonly TurnoDelHorario[],
  ahora: readonly TurnoDelHorario[],
  lunes: FechaOperativa,
): readonly CambioDeUnaPersona[] {
  const personas = [...new Set([...antes, ...ahora].map((t) => t.personaId))];
  const cambios: CambioDeUnaPersona[] = [];
  for (const personaId of personas) {
    const dias: string[] = [];
    for (const fecha of losDiasDeLaSemana(lunes)) {
      const deAntes = comoSeLeeElDia(
        antes.filter((t) => t.personaId === personaId && t.dia === fecha),
      );
      const deAhora = comoSeLeeElDia(
        ahora.filter((t) => t.personaId === personaId && t.dia === fecha),
      );
      if (deAntes === deAhora) continue;
      const dia = comoSeLlamaElDia(diaDeLaSemana(fecha));
      dias.push(
        `${dia}: ${deAntes === '' ? 'nada' : deAntes} → ${deAhora === '' ? 'nada' : deAhora}`,
      );
    }
    if (dias.length > 0) cambios.push({ personaId, dias });
  }
  return cambios;
}

// ── Lo que dicen los avisos ──────────────────────────────────────────────────

/**
 * «Tu horario de la semana del 5 al 11 de octubre» · «Lunes 12:00–16:00, martes
 * libre…». A cada uno, **lo suyo**: el horario de todos lo ve en la app.
 */
export function avisoDeHorarioPublicado(
  lunes: FechaOperativa,
  suyos: readonly TurnoDelHorario[],
): LoQueDiceUnAviso {
  const dias = losDiasDeLaSemana(lunes)
    .map((fecha) => {
      const loDelDia = comoSeLeeElDia(suyos.filter((t) => t.dia === fecha));
      return loDelDia === ''
        ? null
        : `${comoSeLlamaElDia(diaDeLaSemana(fecha))} ${loDelDia.charAt(0).toLowerCase()}${loDelDia.slice(1)}`;
    })
    .filter((linea): linea is string => linea !== null);
  const primero = dias.join(', ');
  return {
    titulo: `Tu horario de la semana ${laSemanaEnLetra(lunes)}`,
    detalle:
      dias.length === 0
        ? 'Esta semana no tienes nada puesto.'
        : `${primero.charAt(0).toUpperCase()}${primero.slice(1)}.`,
  };
}

/** «Cambia tu horario de la semana del 5 al 11 de octubre» · «Martes: …». Solo al afectado. */
export function avisoDeHorarioCambiado(
  lunes: FechaOperativa,
  cambio: CambioDeUnaPersona,
): LoQueDiceUnAviso {
  const lineas = cambio.dias.map((d) => `${d.charAt(0).toUpperCase()}${d.slice(1)}`);
  return {
    titulo: `Cambia tu horario de la semana ${laSemanaEnLetra(lunes)}`,
    detalle: `${plural(lineas.length, 'día cambia', 'días cambian')}. ${lineas.join('. ')}.`,
  };
}
