import { useCallback, useEffect, useRef } from 'react';

/** Lo que tarda en entrar en edición al mantener pulsado. El del iPhone. */
const MANTENER_PULSADO_MS = 500;
/** Cuánto se puede mover el dedo sin que deje de contar como «mantener». */
const TOLERANCIA_PX = 10;

/**
 * Mantener pulsado para entrar en edición.
 *
 * Con eventos de puntero, que son los mismos para dedo, ratón y lápiz. Se cancela
 * si el dedo se mueve —eso es hacer scroll, no mantener— y **se come el toque que
 * viene después**: sin eso, mantener pulsado un botón del widget lo pulsaría al
 * levantar el dedo, además de entrar en edición.
 */
export function usarMantenerPulsado(alCumplirse: () => void, activo: boolean) {
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desde = useRef<{ x: number; y: number } | null>(null);
  const cumplido = useRef(false);

  const cancelar = useCallback(() => {
    if (reloj.current !== null) clearTimeout(reloj.current);
    reloj.current = null;
    desde.current = null;
  }, []);

  useEffect(() => cancelar, [cancelar]);

  return {
    onPointerDown: (evento: React.PointerEvent) => {
      if (!activo || evento.button !== 0) return;
      cumplido.current = false;
      desde.current = { x: evento.clientX, y: evento.clientY };
      reloj.current = setTimeout(() => {
        cumplido.current = true;
        reloj.current = null;
        // Un toque de vibración donde se puede, como el iPhone. Donde no, nada.
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12);
        alCumplirse();
      }, MANTENER_PULSADO_MS);
    },
    onPointerMove: (evento: React.PointerEvent) => {
      const inicio = desde.current;
      if (inicio === null) return;
      if (Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y) > TOLERANCIA_PX)
        cancelar();
    },
    onPointerUp: cancelar,
    onPointerCancel: cancelar,
    onPointerLeave: cancelar,
    onClickCapture: (evento: React.MouseEvent) => {
      if (!cumplido.current) return;
      cumplido.current = false;
      evento.preventDefault();
      evento.stopPropagation();
    },
    onContextMenu: (evento: React.MouseEvent) => {
      // El menú del navegador al mantener pulsado en un móvil tapa justo lo que
      // se quiere ver.
      if (reloj.current !== null || cumplido.current) evento.preventDefault();
    },
  };
}
