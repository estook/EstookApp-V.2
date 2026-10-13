import type { AvisoDelHorario, TipoDeTurno } from '@estook/dominio';

/**
 * Lo que contesta el servidor del horario (H2 · 0069), tal cual. Las cuentas —horas,
 * avisos, coste— las hace el servidor con el dominio; aquí solo se enseñan.
 */

export type Zona = 'sala' | 'cocina' | 'otros';

export interface DiaDeLaSemana {
  readonly fecha: string;
  /** «Lun 5». */
  readonly corto: string;
  /** «lunes 5». */
  readonly largo: string;
}

export interface PersonaEnElHorario {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly rolNombre: string;
  readonly zona: Zona;
  readonly minutos: number;
  /** Solo en el borrador. */
  readonly horasDeContrato?: number | null;
  /** Solo en el borrador, y solo con permiso de ver lo que cuesta el personal. */
  readonly costeCentimos?: number | null;
}

export interface TurnoVisto {
  readonly id: string;
  readonly personaId: string;
  readonly dia: string;
  readonly tipo: TipoDeTurno;
  readonly entra: string | null;
  readonly sale: string | null;
  readonly descansoMinutos: number;
  readonly nota: string | null;
  readonly minutos: number;
}

export interface ElHorario {
  readonly lunes: string;
  readonly semana: string;
  readonly hoy: string;
  readonly dias: readonly DiaDeLaSemana[];
  readonly publicado: boolean;
  readonly publicadaEn: string | null;
  readonly publicadaPor: string | null;
  readonly personas: readonly PersonaEnElHorario[];
  readonly turnos: readonly TurnoVisto[];
  readonly yo: string;
  readonly puedoMontarlo: boolean;
}

export type EstadoDeLaSemana = 'nueva' | 'borrador' | 'publicada' | 'con_cambios';

export interface CosteDeLaSemana {
  readonly totalCentimos: number;
  readonly sinSueldo: number;
  readonly ventasPrevistasCentimos: number | null;
  readonly parteDePersonal: number | null;
  readonly porDia: readonly {
    readonly costeCentimos: number;
    readonly ventasCentimos: number | null;
  }[];
}

export interface ElBorrador {
  readonly lunes: string;
  readonly semana: string;
  readonly hoy: string;
  readonly dias: readonly DiaDeLaSemana[];
  readonly estado: EstadoDeLaSemana;
  readonly publicadaEn: string | null;
  readonly publicadaPor: string | null;
  readonly personas: readonly PersonaEnElHorario[];
  readonly turnos: readonly TurnoVisto[];
  readonly avisos: readonly AvisoDelHorario[];
  readonly cambiosSinPublicar: readonly {
    readonly personaId: string;
    readonly nombre: string;
    readonly dias: readonly string[];
  }[];
  readonly puedeVerCostes: boolean;
  readonly coste?: CosteDeLaSemana;
}

/** «Rosa I.», como se dice alguien en una casilla pequeña. */
export function nombreCorto(p: {
  readonly nombre: string;
  readonly apellidos: string | null;
}): string {
  return p.apellidos === null || p.apellidos === ''
    ? p.nombre
    : `${p.nombre} ${p.apellidos.charAt(0)}.`;
}

export const COMO_SE_LLAMA_LA_ZONA: Readonly<Record<Zona, string>> = {
  sala: 'Sala',
  cocina: 'Cocina',
  otros: 'El resto del equipo',
};

/**
 * Dónde está el horario de la semana: **un solo sitio**, Calendario › Turnos (repaso
 * del 10-oct · 0082). Todo lo que lleva al horario lleva aquí; Equipo ya no tiene
 * «Horarios».
 */
export const DONDE_ESTA_EL_HORARIO = '/calendario/turnos';
