/**
 * servidor/api · rutas HTTP. Solo transporte y validacion.
 *
 * Recibe, valida el esquema, saca el correlacion_id de la cabecera y llama a un caso de uso de servidor/aplicacion. No conoce el dominio ni la base de datos: la regla de dependencias lo impide y la integracion continua lo comprueba.
 *
 * Vacio a proposito en M0. La API versionada con compatibilidad N-2 entra en M2.
 */
export const CAPA = 'api' as const;
