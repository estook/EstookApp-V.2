import type { ColorDeLaBotonera } from '@estook/dominio';

/**
 * **Los colores de la botonera**, con las fichas del sistema de diseño (Anexo 11.12: ningún
 * color escrito a mano en una pantalla). El botón lleva su color en una franja a la
 * izquierda, para que el nombre y el precio se lean igual en todos.
 */
export const COMO_SE_VE_EL_COLOR: Readonly<
  Record<
    ColorDeLaBotonera,
    { readonly nombre: string; readonly franja: string; readonly punto: string }
  >
> = {
  naranja: { nombre: 'Naranja', franja: 'border-l-naranja', punto: 'bg-naranja' },
  verde: { nombre: 'Verde', franja: 'border-l-bien', punto: 'bg-bien' },
  azul: { nombre: 'Azul', franja: 'border-l-info', punto: 'bg-info' },
  ambar: { nombre: 'Ámbar', franja: 'border-l-atencion', punto: 'bg-atencion' },
  rojo: { nombre: 'Rojo', franja: 'border-l-mal', punto: 'bg-mal' },
  rosa: { nombre: 'Rosa', franja: 'border-l-app-carta', punto: 'bg-app-carta' },
  morado: { nombre: 'Morado', franja: 'border-l-app-equipo', punto: 'bg-app-equipo' },
  turquesa: { nombre: 'Turquesa', franja: 'border-l-app-servicio', punto: 'bg-app-servicio' },
  arena: { nombre: 'Arena', franja: 'border-l-app-cuaderno', punto: 'bg-app-cuaderno' },
};
