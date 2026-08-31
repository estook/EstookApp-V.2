/**
 * servidor/eventos · catalogo, publicacion y bandeja de salida.
 *
 * Los eventos se escriben en la misma transaccion que el cambio que los provoca, y se publican despues. Asi no hay eventos de cosas que no pasaron.
 *
 * Vacio a proposito en M0. La bandeja de salida transaccional entra en M2.
 */
export const CAPA = 'eventos' as const;
