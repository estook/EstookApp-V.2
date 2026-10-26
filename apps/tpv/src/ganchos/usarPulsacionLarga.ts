import { useRef } from 'react';

/** Lo que tarda en contar como «mantener pulsado»: medio segundo, como en un móvil. */
export const MANTENER_PULSADO_MS = 500;

/**
 * **Mantener pulsado** (la entrada nueva, maqueta 5): un toque hace lo de siempre; mantenerlo,
 * otra cosa (en la botonera, «Se ha agotado» o pedirlo con una nota). Se suelta antes de
 * tiempo o se mueve el dedo, y es un toque normal. Tras mantenerlo, el toque que llega al
 * soltar no cuenta: si no, se pediría el plato a la vez.
 *
 * Devuelve lo que se pone en el botón: sus eventos y el `onClick` que ya sabe si fue largo.
 */
export function usarPulsacionLarga(alMantener: () => void, alTocar: () => void) {
  const reloj = useRef<number | null>(null);
  const fueLarga = useRef(false);

  const parar = () => {
    if (reloj.current !== null) window.clearTimeout(reloj.current);
    reloj.current = null;
  };

  return {
    onPointerDown: () => {
      fueLarga.current = false;
      parar();
      reloj.current = window.setTimeout(() => {
        fueLarga.current = true;
        reloj.current = null;
        alMantener();
      }, MANTENER_PULSADO_MS);
    },
    onPointerUp: parar,
    onPointerLeave: parar,
    onPointerCancel: parar,
    // El menú del navegador al mantener el dedo no sale: lo de mantener es nuestro. Y en el
    // ordenador de la caja, el botón derecho del ratón hace lo mismo que mantener.
    onContextMenu: (evento: { preventDefault: () => void }) => {
      evento.preventDefault();
      if (fueLarga.current) return;
      parar();
      fueLarga.current = true;
      alMantener();
    },
    onClick: () => {
      if (fueLarga.current) {
        fueLarga.current = false;
        return;
      }
      alTocar();
    },
  };
}
