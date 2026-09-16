/**
 * Con qué entran las personas de ejemplo (M4, y el admin desde la 0041).
 *
 * **Nada de esto es secreto, y no lo pretende**: son personas de mentira, y la
 * semilla que pone estas claves no corre contra una base remota (`acceso.ts`).
 *
 * Vive en un fichero aparte y **sin una sola dependencia** para que lo lean las
 * pruebas de pantalla, que compilan con otra configuración: importar `acceso.ts`
 * les arrastraba el código del servidor. Un dato, un dueño (regla 6).
 */

/** La contraseña de las personas de ejemplo. */
export const CLAVE_DE_EJEMPLO = 'estook en desarrollo';

/**
 * El admin de ejemplo y el secreto de su segundo factor.
 *
 * En el admin el segundo factor es obligatorio, así que para probarlo **desde la
 * pantalla** hace falta poder calcular el código, y para eso, saber el secreto.
 */
export const ADMIN_DE_EJEMPLO = 'plataforma@ejemplo.estook.com';
export const SECRETO_DEL_ADMIN_DE_EJEMPLO = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
