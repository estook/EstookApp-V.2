/**
 * servidor/aplicacion · un fichero por comando y por consulta.
 *
 * Orquesta: abre transaccion, llama al dominio, escribe en la bandeja de salida. Habla con puertos, nunca con Postgres directamente.
 *
 * Vacio a proposito en M0. Los comandos y las consultas entran en M2.
 */
export const CAPA = 'aplicacion' as const;
