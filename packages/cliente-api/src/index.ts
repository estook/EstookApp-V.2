/**
 * @estook/cliente-api · el cliente tipado y la unica salida a red del navegador.
 *
 * Vacio a proposito en M0. Se genera contra el contrato de la API versionada de M2.
 * Ninguna aplicacion hace `fetch` por su cuenta: pasa por aqui, que es donde viven
 * la cabecera de correlacion, la idempotencia y el catalogo de errores.
 */
export const PAQUETE = '@estook/cliente-api' as const;
