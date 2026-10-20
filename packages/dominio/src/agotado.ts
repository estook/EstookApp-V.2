import { instanteEnElLocal, jornadaDe, masDias, type HoraDeCorte } from './tiempo.ts';

/**
 * Los agotados (M10 · 1, decisión 0102; Auditoría de Flujos 2.4).
 *
 * Se acaba el pulpo a las 22:00: quien lo ve lo marca y **vuelve solo al empezar la
 * jornada siguiente**, con la hora de corte del local (la jornada del viernes acaba el
 * sábado a las 05:00, no a medianoche). «Sin fecha» lo deja agotado hasta que alguien
 * diga que ya hay: el plato de temporada que ya no llega.
 *
 * **Agotado no es stock**: no mueve el libro (Auditoría de Flujos, punto 7).
 */

export const HASTA_CUANDO_AGOTADO = ['jornada', 'sin_fecha'] as const;
export type HastaCuandoAgotado = (typeof HASTA_CUANDO_AGOTADO)[number];

/**
 * Hasta qué instante está agotado lo que se marca ahora. Nulo: sin fecha.
 *
 * Con la jornada, el principio de la siguiente: marcado el viernes a las 02:30 (aún es
 * la jornada del jueves, si corta a las 05:00), vuelve el viernes a las 05:00.
 */
export function hastaCuandoEstaAgotado(
  ahora: Date,
  zonaHoraria: string,
  corte: HoraDeCorte,
  como: HastaCuandoAgotado,
): Date | null {
  if (como === 'sin_fecha') return null;
  const hoy = jornadaDe(ahora, zonaHoraria, corte);
  return instanteEnElLocal(masDias(hoy, 1), corte, zonaHoraria);
}

/** Si un plato marcado hasta `hasta` sigue agotado. Nulo es sin fecha. */
export function sigueAgotado(hasta: Date | null, ahora: Date): boolean {
  return hasta === null || hasta.getTime() > ahora.getTime();
}

/** Lo que dice la etiqueta: «Hasta mañana» o «Sin fecha». */
export function hastaCuandoSeDice(hasta: Date | null): string {
  return hasta === null ? 'Sin fecha' : 'Hasta mañana';
}
