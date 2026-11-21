import { useLayoutEffect, useRef, useState } from 'react';
import { elModoDelAncho, type ModoDelPanel } from '@estook/ui';

/**
 * El modo del Panel —PC, tablet en horizontal, en vertical o móvil— **por su ancho**, no por el de
 * la pantalla: con el menú lateral abierto, el Panel de un portátil es más estrecho (0148).
 */
export function usarElModoDelPanel() {
  const caja = useRef<HTMLDivElement>(null);
  const [modo, setModo] = useState<ModoDelPanel>('pc');
  useLayoutEffect(() => {
    const el = caja.current;
    if (el === null) return;
    const medir = () => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setModo(elModoDelAncho(el.getBoundingClientRect().width / rem));
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      observador.disconnect();
    };
  }, []);
  return [caja, modo] as const;
}
