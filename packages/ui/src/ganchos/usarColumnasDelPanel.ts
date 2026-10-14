import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { columnasParaElAncho } from '../panel/rejilla.ts';

/**
 * Cuántas columnas tiene el Panel ahora, medido en el propio Panel (0084).
 *
 * Las columnas las decide el ancho que le queda al Panel, no la pantalla: plegar el
 * menú del ordenador lo cambia. Se mide **antes de pintar** (`useLayoutEffect`), para
 * que la primera vez ya salga cada widget en su fila, y se vuelve a medir al cambiar
 * de ancho. Sin medir todavía (el primer pintado en el servidor de pruebas), dos.
 */
export function usarColumnasDelPanel<T extends HTMLElement>(): readonly [RefObject<T>, number] {
  const caja = useRef<T>(null);
  const [columnas, setColumnas] = useState(2);

  useLayoutEffect(() => {
    const elemento = caja.current;
    if (elemento === null) return;
    const medir = () => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      setColumnas(columnasParaElAncho(elemento.getBoundingClientRect().width / rem));
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => {
      observador.disconnect();
    };
  }, []);

  return [caja, columnas] as const;
}
