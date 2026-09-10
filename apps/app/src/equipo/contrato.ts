import { comoSeLeenLasHoras, conSimbolo, centimos } from '@estook/dominio';

/**
 * Lo que Equipo recibe del servidor (M6½).
 *
 * Los tipos son la copia de lo que devuelven `mi_fichaje`, `fichajes_de_hoy`,
 * `resumen_del_equipo` y `una_persona`. Están aquí y no en un paquete compartido
 * por la regla de dependencias: **la aplicación no importa del servidor**, habla
 * con él por `@estook/cliente-api`.
 *
 * Y ojo con lo mismo que en Inventario: **los campos de dinero llegan
 * opcionales**. Un jefe de cocina ve las horas de su equipo y no recibe ni un
 * euro, porque el servidor no se los envía. Que el tipo lo diga es lo que evita
 * pintar un «0,00 €» donde lo correcto es no pintar nada.
 */

export interface TramoDelHorario {
  /** 1 lunes … 7 domingo, como `isodow`. */
  readonly dia: number;
  readonly entra: string;
  readonly sale: string;
}

export interface MiFichaje {
  readonly abierto: {
    readonly fichajeId: string;
    readonly entroEn: string;
    readonly local: string;
    readonly localId: string;
    readonly minutos: number;
    readonly metros: number | null;
  } | null;
  readonly minutosDeHoy: number;
  readonly minutosDeLaSemana: number;
  readonly jornada: string;
  /** La hora del local, «HH:MM». La decide el servidor (regla 10). */
  readonly horaDelLocal: string;
  readonly diaDeLaSemana: number;
  readonly horario: readonly TramoDelHorario[];
  readonly elLocalSabeDondeEsta: boolean;
  readonly radioMetros: number;
  readonly puedoFichar: boolean;
}

export interface QuienEstaTrabajando {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly rolNombre: string;
  readonly dentro: boolean;
  readonly desde: string | null;
  readonly minutos: number | null;
  readonly metros: number | null;
  readonly enElLocal: boolean | null;
  readonly minutosDeHoy: number;
  readonly ultimoAccesoEn: string | null;
  readonly enLinea: boolean;
  readonly entraHoyALas: string | null;
  readonly turnoSospechoso: boolean;
}

export interface FichajesDeHoy {
  readonly gente: readonly QuienEstaTrabajando[];
  readonly jornada: string;
  readonly horaDelLocal: string;
  readonly dentro: number;
  readonly fuera: number;
}

export interface FilaDelResumen {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly rolNombre: string;
  readonly minutos: number;
  readonly turnos: number;
  readonly sinCerrar: number;
  readonly corregidos: number;
  readonly fueraDelLocal: number;
  readonly sinUbicacion: number;
  readonly horasSemanales: number | null;
  readonly frenteAlContrato: number | null;
  readonly costeCentimos?: number | null;
  readonly costeDeLaHoraCentimos?: number | null;
}

export interface ResumenDelEquipo {
  readonly filas: readonly FilaDelResumen[];
  readonly desde: string;
  readonly hasta: string;
  readonly dias: number;
  readonly minutosTotales: number;
  readonly puedeVerCostes: boolean;
  readonly costeTotalCentimos?: number | null;
}

export interface FichajeDeLaFicha {
  readonly fichajeId: string;
  readonly fecha: string;
  readonly entroEn: string;
  readonly salioEn: string | null;
  readonly minutos: number | null;
  readonly metros: number | null;
  readonly enElLocal: boolean | null;
  readonly sinUbicacion: string | null;
  readonly corregidoPor: string | null;
  readonly motivoDeLaCorreccion: string | null;
}

export interface UnaPersona {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly correo?: string;
  readonly rolNombre: string;
  readonly rol: string;
  readonly estado: 'dentro' | 'sin_estrenar' | 'fuera';
  readonly enLinea: boolean;
  readonly ultimoAccesoEn: string | null;
  readonly desde: string;
  readonly trabajandoDesde: string | null;
  readonly minutosDelTurno: number | null;
  readonly minutosDeLaSemana: number;
  readonly minutosDelMes: number;
  readonly horario: readonly TramoDelHorario[];
  readonly ultimosFichajes: readonly FichajeDeLaFicha[];
  readonly retribucion?: {
    readonly forma: 'por_hora' | 'mensual';
    readonly importeCentimos: number;
    readonly horasSemanales: number | null;
    readonly puesto: string | null;
    readonly desde: string;
  } | null;
  readonly costeDelMesCentimos?: number | null;
  readonly puedeVerCostes: boolean;
  readonly puedePonerRetribucion: boolean;
  readonly puedeEditar: boolean;
  readonly radioMetros: number;
}

// ── Cómo se enseña cada cosa ─────────────────────────────────────────────────

/** «6 h 12 min». Lo compone el motor del dominio, que es su único dueño. */
export function comoSeLeenMinutos(minutos: number): string {
  return comoSeLeenLasHoras(minutos);
}

export function comoDinero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return conSimbolo(centimos(Math.trunc(valor)));
}

/**
 * La hora de un instante, en la hora de quien mira.
 *
 * ── Y por qué esto sí puede leer el reloj del navegador ─────────────────────
 *
 * Porque no decide nada: solo pinta un instante que ya viene decidido por el
 * servidor. Lo que la regla 10 prohíbe es **calcular** con el reloj de aquí —a qué
 * jornada pertenece algo, si un turno ya empezó—, y eso se hace en el servidor y
 * llega hecho. Enseñar «entró a las 09:12» en la hora del aparato es lo correcto:
 * es la hora que ve la persona en su muñeca.
 */
export function comoSeLeeLaHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** «Nunca», «hace 4 min», «ayer». Para la última vez que se vio a alguien. */
export function ultimaVez(iso: string | null): string {
  if (iso === null) return 'Nunca ha entrado';

  const cuando = new Date(iso);
  const minutos = Math.trunc((Date.now() - cuando.getTime()) / 60_000);

  if (minutos < 1) return 'Ahora mismo';
  if (minutos < 60) return `Hace ${minutos} min`;

  const horas = Math.trunc(minutos / 60);
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.trunc(horas / 24);
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return cuando.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/** Por qué no había ubicación, en cristiano. */
export const POR_QUE_SIN_UBICACION: Readonly<Record<string, string>> = {
  la_nego: 'No dio permiso de ubicación',
  sin_senal: 'Sin señal de GPS',
  no_la_da_el_aparato: 'El aparato no sabe dar la ubicación',
};

/** Cómo se dice a cuántos metros del local se fichó. */
export function comoSeLeeDonde(
  metros: number | null,
  enElLocal: boolean | null,
  sinUbicacion: string | null,
): string {
  if (sinUbicacion !== null) return POR_QUE_SIN_UBICACION[sinUbicacion] ?? 'Sin ubicación';
  if (metros === null) return 'El local no tiene su posición puesta';
  if (metros < 25) return 'En el local';
  if (enElLocal === true) return `A ${metros} m, dentro del radio`;
  return `A ${metros} m del local`;
}
