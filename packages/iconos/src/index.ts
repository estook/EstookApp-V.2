/**
 * @estook/iconos · los SVG de Lucide, descargados y optimizados (M3, Parte B3).
 *
 * Lucide, licencia ISC, uso libre incluido el comercial. **No se instala la
 * libreria**: se descargan los cincuenta iconos que se usan con
 * `herramientas/traer-iconos.mjs`, se reducen a su figura y se generan aqui. Los
 * cincuenta juntos son 7 KB, contra los cientos de la libreria entera.
 *
 * Nada se carga desde un servidor ajeno. Un icono que no este en la lista de la
 * herramienta no existe en Estook, y eso es a proposito: es lo que evita que dos
 * pantallas acaben usando dos flechas distintas para lo mismo.
 */
export { crearIcono } from './crearIcono.tsx';
export type { IconoProps, Icono } from './crearIcono.tsx';

export * from './generados.tsx';
