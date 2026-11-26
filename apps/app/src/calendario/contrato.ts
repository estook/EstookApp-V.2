import type {
  DiaDeLaSemana,
  ParaQuien,
  SaldoDeVacaciones,
  TipoDeRecordatorio,
  VacacionesEn,
} from '@estook/dominio';
import type { Zona } from '../horario/contrato.ts';

/**
 * Lo que contesta el servidor de las vacaciones (la Ampliación 4 · 2, 0153), tal cual: los días,
 * el saldo y las coincidencias las cuenta el servidor; aquí solo se enseñan.
 */

export type EstadoDeLaSolicitud =
  'pedida' | 'aprobada' | 'rechazada' | 'contrapropuesta' | 'retirada';

/**
 * Los días que suele librar alguien, para contar sus vacaciones en laborables (0130): de su horario
 * publicado o de lo último que dijo.
 */
export interface SusDiasLibres {
  readonly dias: readonly DiaDeLaSemana[];
  readonly de: 'horario' | 'escrito';
}

export interface UnaSolicitud {
  readonly id: string;
  readonly desde: string;
  readonly hasta: string;
  readonly dias: number;
  readonly estado: EstadoDeLaSolicitud;
  readonly nota: string | null;
  readonly motivo: string | null;
  readonly propuestaDesde: string | null;
  readonly propuestaHasta: string | null;
  readonly decididaPor: string | null;
  readonly pedidaEn: string;
  /** En laborables, los días que libra con los que se contó; nulo en naturales. */
  readonly libra: readonly DiaDeLaSemana[] | null;
  readonly libraDe: 'horario' | 'escrito' | 'antes' | null;
}

export interface MisVacaciones {
  readonly hoy: string;
  readonly vacacionesEn: VacacionesEn;
  readonly saldo: SaldoDeVacaciones | null;
  readonly pedidas: number;
  readonly sePuedenPedir: number | null;
  readonly libra: SusDiasLibres | null;
  readonly solicitudes: readonly UnaSolicitud[];
  readonly gestiona: boolean;
}

export interface UnaPeticionDelEquipo extends UnaSolicitud {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly zona: Zona;
  readonly rolNombre: string;
  readonly leQuedarian: number | null;
  readonly coincidencias: readonly {
    readonly nombre: string;
    readonly desde: string;
    readonly hasta: string;
    readonly estado: 'aprobada' | 'pedida';
  }[];
  readonly quedan: { readonly fecha: string; readonly quedan: number; readonly de: number } | null;
  readonly conPocoMargen: boolean;
}

export interface LasVacacionesDelEquipo {
  readonly hoy: string;
  readonly pendientes: readonly UnaPeticionDelEquipo[];
  readonly proximas: readonly (UnaSolicitud & {
    readonly personaId: string;
    readonly nombre: string;
    readonly zona: Zona;
  })[];
  readonly equipo: readonly {
    readonly personaId: string;
    readonly nombre: string;
    readonly apellidos: string | null;
    readonly vacacionesEn: VacacionesEn;
    readonly libra: SusDiasLibres | null;
  }[];
}

/** Un recordatorio del calendario del equipo (la Ampliación 4 · 3, 0153), tal cual lo da el servidor. */
export interface UnRecordatorio {
  readonly id: string;
  readonly titulo: string;
  readonly tipo: TipoDeRecordatorio;
  readonly para: ParaQuien;
  readonly dia: string;
  readonly hastaEl: string | null;
  readonly desde: string | null;
  readonly avisaA: string | null;
  readonly detalle: string | null;
  readonly puestoPor: string | null;
}

export interface ElCalendarioDelEquipo {
  readonly hoy: string;
  readonly proximos: readonly UnRecordatorio[];
  readonly puedePoner: boolean;
  readonly recordatorios: readonly UnRecordatorio[];
}

export interface UnaNota {
  readonly id: string;
  readonly dia: string;
  readonly texto: string;
  readonly avisaA: string | null;
}

export interface MisNotas {
  readonly hoy: string;
  readonly notas: readonly UnaNota[];
  readonly delEquipo: readonly UnRecordatorio[];
}
