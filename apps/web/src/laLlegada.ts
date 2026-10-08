import { laLlegadaDelEnlace, type LlegadaDelEnlace } from '@estook/dominio';

/**
 * Lo que trae el enlace por el que se llega a esta página (A3 · 0076): el código del
 * vendedor, las marcas de campaña y de qué web se venía. **Viaja en la dirección** de
 * cada enlace hasta crear cuenta y **no se guarda** en el navegador: guardarlo
 * pediría un aviso de cookies (LSSI 22.2), y la web no lo tiene.
 *
 * Se lee una vez por página, con `useState(laLlegadaDeAqui)`.
 */
export function laLlegadaDeAqui(): LlegadaDelEnlace {
  return typeof window === 'undefined'
    ? {}
    : laLlegadaDelEnlace(window.location.search, document.referrer);
}
