/**
 * @estook/permisos · la matriz de permisos, compartida entre cliente y servidor.
 *
 * Vacio a proposito en M0. Los doce roles, la herencia y el recorte por local
 * entran en M1, y se prueban llamando a la API a pelo (regla 4), nunca solo desde
 * la interfaz.
 */
export const PAQUETE = '@estook/permisos' as const;
