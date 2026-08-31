/**
 * servidor/conectores · uno por TPV: agora, glop, lastapp, revo...
 *
 * Cada TPV detras del mismo contrato, para que el resto del sistema no sepa cual esta conectado.
 *
 * Vacio a proposito en M0. Entra en M18, M19 y M20. Antes de eso no se inventa el marco.
 */
export const CAPA = 'conectores' as const;
