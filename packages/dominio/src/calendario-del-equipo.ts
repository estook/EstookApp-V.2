/**
 * El calendario del equipo (la Ampliación 4 · 3, decisión 0153, sección 5; Plan, M14).
 *
 * El gerente y los jefes ponen días o tramos con aviso —una limpieza a fondo, la inspección de
 * Sanidad, una formación— **para todos, solo sala o solo cocina**, y avisa ese día y cada día si son
 * varios. Cada tipo con su color y su icono (Richi, 24-nov: «odio que todo sea hiperplano»):
 * limpiezas en turquesa, inspecciones en coral, formación en rosa y el resto en ámbar.
 *
 * En la base es un aviso del Calendario (capa `aviso`, 0032) con sus `roles`: lo que no le toca a
 * alguien no le llega ni lo ve, porque lo filtra la base y no la pantalla.
 */

export const TIPOS_DE_RECORDATORIO = ['limpieza', 'inspeccion', 'formacion', 'otro'] as const;
export type TipoDeRecordatorio = (typeof TIPOS_DE_RECORDATORIO)[number];

export function esTipoDeRecordatorio(valor: unknown): valor is TipoDeRecordatorio {
  return typeof valor === 'string' && (TIPOS_DE_RECORDATORIO as readonly string[]).includes(valor);
}

/** Cómo se llama cada tipo en la pantalla y en sus capas. */
export const NOMBRE_DEL_RECORDATORIO: Readonly<Record<TipoDeRecordatorio, string>> = {
  limpieza: 'Limpieza',
  inspeccion: 'Inspección',
  formacion: 'Formación',
  otro: 'Aviso',
};

/** Las capas que se encienden y se apagan, en plural. */
export const CAPA_DEL_RECORDATORIO: Readonly<Record<TipoDeRecordatorio, string>> = {
  limpieza: 'Limpiezas',
  inspeccion: 'Inspecciones',
  formacion: 'Formación',
  otro: 'Avisos',
};

export const PARA_QUIEN = ['todos', 'sala', 'cocina'] as const;
export type ParaQuien = (typeof PARA_QUIEN)[number];

/**
 * Los roles que ven un recordatorio, según para quién es: todos (nulo), los de sala o los de
 * cocina. Quien lleva el Calendario (gerente y jefes) los ve todos igualmente: lo dice la base.
 */
export const ROLES_PARA: Readonly<Record<ParaQuien, readonly string[] | null>> = {
  todos: null,
  sala: ['camarero', 'jefe_de_sala'],
  cocina: ['cocinero', 'jefe_de_cocina'],
};

/** Para quién es, leído de sus roles. */
export function paraQuienDe(roles: readonly string[] | null): ParaQuien {
  if (roles === null || roles.length === 0) return 'todos';
  if (roles.every((r) => (ROLES_PARA.cocina ?? []).includes(r))) return 'cocina';
  if (roles.every((r) => (ROLES_PARA.sala ?? []).includes(r))) return 'sala';
  return 'todos';
}

export const PARA_QUIEN_EN_LETRA: Readonly<Record<ParaQuien, string>> = {
  todos: 'Todos',
  sala: 'Solo sala',
  cocina: 'Solo cocina',
};

/** Si a alguien con ese rol le toca un recordatorio: para todos, o para los de su zona. */
export function leToca(roles: readonly string[] | null, rol: string): boolean {
  return roles === null || roles.length === 0 || roles.includes(rol);
}

const UN_DIA_MS = 86_400_000;

function aMediodia(fecha: string): number {
  return Date.parse(`${fecha}T12:00:00Z`);
}

function masUnDia(fecha: string, dias: number): string {
  return new Date(aMediodia(fecha) + dias * UN_DIA_MS).toISOString().slice(0, 10);
}

/** Los días que dura: el 1 del 1 al 1; el 14 y el 15, dos. */
export function cuantosDiasDura(dia: string, hastaEl: string | null): number {
  if (hastaEl === null || hastaEl <= dia) return 1;
  // A mediodía en UTC la resta es siempre de días enteros: sin cambios de hora por medio.
  return (aMediodia(hastaEl) - aMediodia(dia)) / UN_DIA_MS + 1;
}

/**
 * Moverlo a otro día (arrastrándolo en el mes): **dura lo mismo**. Una limpieza del 14 al 15
 * llevada al 21 queda del 21 al 22.
 */
export function moverloAl(
  dia: string,
  hastaEl: string | null,
  nuevoDia: string,
): { readonly dia: string; readonly hastaEl: string | null } {
  const dura = cuantosDiasDura(dia, hastaEl);
  return { dia: nuevoDia, hastaEl: dura === 1 ? null : masUnDia(nuevoDia, dura - 1) };
}

/** Si un recordatorio cae en un día: del primero al último, los dos incluidos. */
export function caeEn(primero: string, ultimo: string | null, fecha: string): boolean {
  return fecha >= primero && fecha <= (ultimo ?? primero);
}

/**
 * Cómo se dice cuándo avisa: «Avisa a las 9:00», «Avisa a las 9:00, cada día», o «Sin aviso».
 */
export function comoAvisa(avisaA: string | null, dias: number): string {
  if (avisaA === null) return 'Sin aviso';
  const hora = avisaA.replace(/^0(\d)/, '$1');
  return dias > 1 ? `Avisa a las ${hora}, cada día` : `Avisa a las ${hora}`;
}
