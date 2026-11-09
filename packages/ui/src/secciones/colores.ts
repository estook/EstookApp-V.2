import type { ColorDeLaBotonera } from '@estook/dominio';

/**
 * **Los colores de la botonera**, con las fichas del sistema de diseño (Anexo 11.12: ningún
 * color escrito a mano en una pantalla). Once desde R3 (0133): los nueve de T3, y el amarillo
 * de «Lo más pedido» y el marrón de los cafés.
 *
 *   · `franja`  el botón de un producto lleva el color de su sección en una franja a la
 *               izquierda, para que el nombre y el precio se lean igual en todos
 *   · `punto`   el círculo para elegirlo
 *   · `baldosa` la baldosa de la sección, con su icono en oscuro encima
 */
export const COMO_SE_VE_EL_COLOR: Readonly<
  Record<
    ColorDeLaBotonera,
    {
      readonly nombre: string;
      readonly franja: string;
      readonly punto: string;
      readonly baldosa: string;
    }
  >
> = {
  amarillo: {
    nombre: 'Amarillo',
    franja: 'border-l-seccion-amarillo',
    punto: 'bg-seccion-amarillo',
    baldosa: 'bg-seccion-amarillo text-fondo',
  },
  naranja: {
    nombre: 'Naranja',
    franja: 'border-l-naranja',
    punto: 'bg-naranja',
    baldosa: 'bg-naranja text-fondo',
  },
  ambar: {
    nombre: 'Ámbar',
    franja: 'border-l-atencion',
    punto: 'bg-atencion',
    baldosa: 'bg-atencion text-fondo',
  },
  rojo: { nombre: 'Rojo', franja: 'border-l-mal', punto: 'bg-mal', baldosa: 'bg-mal text-fondo' },
  rosa: {
    nombre: 'Rosa',
    franja: 'border-l-app-carta',
    punto: 'bg-app-carta',
    baldosa: 'bg-app-carta text-fondo',
  },
  morado: {
    nombre: 'Morado',
    franja: 'border-l-app-equipo',
    punto: 'bg-app-equipo',
    baldosa: 'bg-app-equipo text-fondo',
  },
  azul: {
    nombre: 'Azul',
    franja: 'border-l-info',
    punto: 'bg-info',
    baldosa: 'bg-info text-fondo',
  },
  turquesa: {
    nombre: 'Turquesa',
    franja: 'border-l-app-servicio',
    punto: 'bg-app-servicio',
    baldosa: 'bg-app-servicio text-fondo',
  },
  verde: {
    nombre: 'Verde',
    franja: 'border-l-bien',
    punto: 'bg-bien',
    baldosa: 'bg-bien text-fondo',
  },
  arena: {
    nombre: 'Arena',
    franja: 'border-l-app-cuaderno',
    punto: 'bg-app-cuaderno',
    baldosa: 'bg-app-cuaderno text-fondo',
  },
  marron: {
    nombre: 'Marrón',
    franja: 'border-l-seccion-marron',
    punto: 'bg-seccion-marron',
    baldosa: 'bg-seccion-marron text-fondo',
  },
};

/** La baldosa de una sección sin color (lo que no se reconoce por el nombre): gris. */
export const BALDOSA_SIN_COLOR = 'bg-borde-fuerte text-fondo';

export function laBaldosa(color: ColorDeLaBotonera | null): string {
  return color === null ? BALDOSA_SIN_COLOR : COMO_SE_VE_EL_COLOR[color].baldosa;
}

/**
 * **El color de la sección como acento de una tarjeta** (0143): en Estook › Carta, cada sección
 * lleva su icono en una pastilla de su color, el mismo que en el TPV. Sin color, el gris suave.
 */
const EL_ACENTO: Readonly<Record<ColorDeLaBotonera, string>> = {
  amarillo: 'var(--color-seccion-amarillo)',
  naranja: 'var(--color-naranja)',
  ambar: 'var(--color-atencion)',
  rojo: 'var(--color-mal)',
  rosa: 'var(--color-app-carta)',
  morado: 'var(--color-app-equipo)',
  azul: 'var(--color-info)',
  turquesa: 'var(--color-app-servicio)',
  verde: 'var(--color-bien)',
  arena: 'var(--color-app-cuaderno)',
  marron: 'var(--color-seccion-marron)',
};

export function elAcentoDelColor(color: ColorDeLaBotonera | null): string {
  return color === null ? 'var(--color-texto-suave)' : EL_ACENTO[color];
}
