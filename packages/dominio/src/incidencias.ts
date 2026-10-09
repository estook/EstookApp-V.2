/**
 * Las incidencias del equipo (repaso del 9-oct, decisión 0081).
 *
 * «Si un día un trabajador no ficha y no está justificado, no hay sitio donde lo
 * muestre» (Richi). Y en «Para mirar» salían «4 fichajes que revisar» y «8 retrasos»
 * sin poder llegar a ninguno. Una incidencia es **algo del registro horario que
 * alguien tiene que mirar**, y todas se miran en el mismo sitio: Equipo → Incidencias.
 *
 *   falta          tenía un tramo publicado en Horarios, acabó, y no fichó en él
 *   retraso        fichó la entrada pasado el margen del local
 *   sin_cerrar     fichó la entrada hace más de doce horas y no la salida
 *   lejos          fichó lejos del local
 *   sin_ubicacion  fichó sin decir dónde
 *   sin_conexion   fichó con más de doce horas sin señal: hay que darlo por bueno
 *
 * **Todo sale del horario publicado** (Horarios), que es el oficial: el «horario de
 * siempre» de la ficha de cada persona dejó de contar el 9-oct. Sin nada publicado,
 * no hay faltas ni retrasos que contar, y se dice así.
 *
 * Lo que decide quién faltó o llegó tarde lo calcula el servidor con el horario y los
 * fichajes; aquí vive **qué es cada cosa, cómo se dice y qué se puede hacer con ella**.
 */

export const TIPOS_DE_INCIDENCIA = [
  'falta',
  'retraso',
  'sin_cerrar',
  'lejos',
  'sin_ubicacion',
  'sin_conexion',
] as const;

export type TipoDeIncidencia = (typeof TIPOS_DE_INCIDENCIA)[number];

export function esTipoDeIncidencia(valor: unknown): valor is TipoDeIncidencia {
  return typeof valor === 'string' && (TIPOS_DE_INCIDENCIA as readonly string[]).includes(valor);
}

/** Lo que se lee en la etiqueta de cada una: corto, como en una lista de turnos. */
export const NOMBRE_DEL_TIPO_DE_INCIDENCIA: Readonly<Record<TipoDeIncidencia, string>> = {
  falta: 'No vino',
  retraso: 'Llegó tarde',
  sin_cerrar: 'Sin fichar la salida',
  lejos: 'Fichó lejos',
  sin_ubicacion: 'Sin ubicación',
  sin_conexion: 'Sin conexión',
};

/**
 * Los grupos de la pantalla: lo que se filtra arriba. Los tres fichajes raros van
 * juntos porque se arreglan igual, abriendo el fichaje.
 */
export const GRUPOS_DE_INCIDENCIAS = ['faltas', 'retrasos', 'fichajes'] as const;

export type GrupoDeIncidencias = (typeof GRUPOS_DE_INCIDENCIAS)[number];

export const NOMBRE_DEL_GRUPO_DE_INCIDENCIAS: Readonly<Record<GrupoDeIncidencias, string>> = {
  faltas: 'Faltas',
  retrasos: 'Retrasos',
  fichajes: 'Fichajes',
};

export function grupoDeLaIncidencia(tipo: TipoDeIncidencia): GrupoDeIncidencias {
  if (tipo === 'falta') return 'faltas';
  if (tipo === 'retraso') return 'retrasos';
  return 'fichajes';
}

export function esGrupoDeIncidencias(valor: unknown): valor is GrupoDeIncidencias {
  return typeof valor === 'string' && (GRUPOS_DE_INCIDENCIAS as readonly string[]).includes(valor);
}

/**
 * Lo que se justifica: no venir y llegar tarde. Un fichaje raro no se justifica, se
 * corrige —o se da por bueno—, que ya tiene su camino con nombre y motivo.
 */
export function seJustifica(tipo: TipoDeIncidencia): boolean {
  return tipo === 'falta' || tipo === 'retraso';
}

export const MOTIVOS_DE_JUSTIFICACION = [
  'enfermedad',
  'permiso',
  'cambio_de_turno',
  'avisado',
  'otro',
] as const;

export type MotivoDeJustificacion = (typeof MOTIVOS_DE_JUSTIFICACION)[number];

export const NOMBRE_DEL_MOTIVO: Readonly<Record<MotivoDeJustificacion, string>> = {
  enfermedad: 'Enfermedad o baja',
  permiso: 'Permiso o asunto propio',
  cambio_de_turno: 'Cambió el turno',
  avisado: 'Avisó con tiempo',
  otro: 'Otro motivo',
};

/** «Otro motivo» sin decir cuál no justifica nada: pide la nota. */
export function laJustificacionPideNota(motivo: MotivoDeJustificacion): boolean {
  return motivo === 'otro';
}

/** Lo que hace falta para decir qué pasó en una línea. */
export interface LoQuePaso {
  readonly tipo: TipoDeIncidencia;
  /** El tramo publicado: «10:00» y «16:00». Las faltas y los retrasos lo llevan. */
  readonly entra?: string | null;
  readonly sale?: string | null;
  /** Lo tarde que entró, en minutos. */
  readonly minutosTarde?: number | null;
  /** La hora a la que fichó la entrada, «09:58». */
  readonly fichoA?: string | null;
  /** Lo lejos que fichó, en metros. */
  readonly metros?: number | null;
}

/**
 * La línea de debajo del nombre, sin repetir la etiqueta: «Turno de 10:00 a 16:00»,
 * «12 min tarde · entraba a las 10:00», «Entró a las 09:58 y no fichó la salida».
 */
export function loQuePaso(i: LoQuePaso): string {
  switch (i.tipo) {
    case 'falta':
      return i.entra != null && i.sale != null
        ? `Turno de ${i.entra} a ${i.sale}, sin fichar`
        : 'Tenía turno y no fichó';
    case 'retraso':
      return `${cuantoTarde(i.minutosTarde ?? 0)} tarde${i.entra != null ? ` · entraba a las ${i.entra}` : ''}`;
    case 'sin_cerrar':
      return i.fichoA != null
        ? `Entró a las ${i.fichoA} y no fichó la salida`
        : 'No fichó la salida';
    case 'lejos':
      return i.metros != null ? `A ${comoSeLeenLosMetros(i.metros)} del local` : 'Lejos del local';
    case 'sin_ubicacion':
      return i.fichoA != null ? `Entró a las ${i.fichoA} sin decir dónde` : 'Sin decir dónde';
    case 'sin_conexion':
      return 'Fichado con más de doce horas sin señal';
  }
}

/** «12 min», «1 h 5 min»: lo tarde que se llegó, como se dice. */
export function cuantoTarde(minutos: number): string {
  // Llegan enteros del servidor: aquí solo se dicen.
  const m = Math.max(0, Math.trunc(minutos));
  if (m < 60) return `${m} min`;
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** «850 m», «1,2 km». */
export function comoSeLeenLosMetros(metros: number): string {
  if (metros < 1000) return `${metros.toLocaleString('es-ES', { maximumFractionDigits: 0 })} m`;
  return `${(metros / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`;
}

/** Cuántas de cada grupo, sin las justificadas: es lo que se pinta en los filtros. */
export function cuantasPorGrupo(
  incidencias: readonly { readonly tipo: TipoDeIncidencia; readonly justificada: boolean }[],
): Readonly<Record<GrupoDeIncidencias | 'todas', number>> {
  const cuentas = { todas: 0, faltas: 0, retrasos: 0, fichajes: 0 };
  for (const i of incidencias) {
    if (i.justificada) continue;
    cuentas.todas += 1;
    cuentas[grupoDeLaIncidencia(i.tipo)] += 1;
  }
  return cuentas;
}

/**
 * Lo que cuenta la cifra «Incidencias» de Equipo: **las faltas sin justificar y los
 * fichajes por revisar**. Los retrasos tienen su propia cifra al lado, y contarlos
 * aquí sería decir lo mismo dos veces.
 */
export function cuentaEnLaCifra(tipo: TipoDeIncidencia, justificada: boolean): boolean {
  return !justificada && tipo !== 'retraso';
}
