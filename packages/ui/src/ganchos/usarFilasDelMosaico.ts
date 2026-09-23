import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

/*
 * Lo que mide cada pieza del mosaico (entrega V, 0045). El porqué del mosaico
 * está en `componentes/Mosaico.tsx`; aquí solo la cuenta, que la usan también las
 * casillas del Panel.
 */

/** El alto de cada fila del mosaico. Cuanto más pequeña, más exacto el encaje. */
export const FILA_DEL_MOSAICO = 4;
/** Lo que se separan dos piezas en vertical: el mismo `e3` que en horizontal. */
export const HUECO_DEL_MOSAICO = 12;

/**
 * Cuántas filas del mosaico ocupa un elemento, medido.
 *
 * Devuelve la referencia que hay que poner en **lo que se mide** —el contenido, no
 * la casilla de la rejilla, que se estira hasta sus filas— y el estilo que hay que
 * poner en la casilla. Sin medir todavía (o sin nada dentro), la casilla ocupa una
 * fila, que son cuatro píxeles y no se ven.
 */
export function usarFilasDelMosaico<T extends HTMLElement>(): {
  readonly medir: RefObject<T>;
  readonly estilo: CSSProperties;
} {
  const medir = useRef<T>(null);
  const [filas, setFilas] = useState(1);

  // Antes de pintar, para que la primera vez ya salga en su sitio.
  useLayoutEffect(() => {
    const elemento = medir.current;
    if (elemento === null) return;
    const contar = () => {
      const alto = elemento.getBoundingClientRect().height;
      setFilas(alto === 0 ? 1 : Math.ceil((alto + HUECO_DEL_MOSAICO) / FILA_DEL_MOSAICO));
    };
    contar();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(contar);
    observador.observe(elemento);
    return () => {
      observador.disconnect();
    };
  }, []);

  return { medir, estilo: { gridRowEnd: `span ${filas}` } };
}
