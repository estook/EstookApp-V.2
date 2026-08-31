/**
 * servidor/trabajos · los workers.
 *
 * Cola en tabla y ejecucion programada, con reintento. Ningun trabajo se da por hecho sin dejar rastro.
 *
 * Vacio a proposito en M0. Entra en M2.
 */
export const CAPA = 'trabajos' as const;
