import { useRef, useState, type PointerEvent } from 'react';

/**
 * **Arrastrar para ordenar**, con el dedo o con el ratón (Anexo 11.11: «se arrastran los
 * botones y las páginas»). Vale para una lista y para una cuadrícula: al soltar, lo
 * arrastrado va delante de aquello sobre lo que se suelta (o detrás, si se suelta en su
 * mitad de después). Cada pieza lleva `data-orden="<id>"`; el asa, `asa(id)`.
 *
 * Sin arrastrar también se ordena: cada hoja tiene «Antes» y «Después» (el teclado y el
 * lector de pantalla no arrastran).
 */
export function usarArrastrar(
  ids: readonly string[],
  alSoltar: (nuevoOrden: readonly string[]) => void,
): {
  readonly arrastrando: string | null;
  readonly sobre: string | null;
  readonly asa: (id: string) => {
    readonly onPointerDown: (e: PointerEvent<HTMLElement>) => void;
    readonly onPointerMove: (e: PointerEvent<HTMLElement>) => void;
    readonly onPointerUp: (e: PointerEvent<HTMLElement>) => void;
    readonly onPointerCancel: () => void;
    readonly style: { readonly touchAction: 'none'; readonly cursor: 'grab' };
  };
} {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const despues = useRef(false);

  function loQueHayDebajo(x: number, y: number): string | null {
    const debajo = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-orden]');
    const id = debajo?.dataset['orden'] ?? null;
    if (debajo !== null && debajo !== undefined && id !== null) {
      const caja = debajo.getBoundingClientRect();
      // Más ancho que alto (un botón en su fila): por la mitad de izquierda a derecha.
      despues.current =
        caja.width > caja.height * 2
          ? y > caja.top + caja.height / 2
          : x > caja.left + caja.width / 2;
    }
    return id !== null && ids.includes(id) ? id : null;
  }

  return {
    arrastrando,
    sobre,
    asa: (id) => ({
      onPointerDown: (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setArrastrando(id);
        setSobre(null);
      },
      onPointerMove: (e) => {
        if (arrastrando !== id) return;
        setSobre(loQueHayDebajo(e.clientX, e.clientY));
      },
      onPointerUp: (e) => {
        if (arrastrando !== id) return;
        const destino = loQueHayDebajo(e.clientX, e.clientY);
        setArrastrando(null);
        setSobre(null);
        if (destino === null || destino === id) return;
        const sinEl = ids.filter((x) => x !== id);
        const donde = sinEl.indexOf(destino) + (despues.current ? 1 : 0);
        alSoltar([...sinEl.slice(0, donde), id, ...sinEl.slice(donde)]);
      },
      onPointerCancel: () => {
        setArrastrando(null);
        setSobre(null);
      },
      style: { touchAction: 'none', cursor: 'grab' },
    }),
  };
}

/** Mueve uno un puesto antes (-1) o después (+1). */
export function moverUnPuesto(ids: readonly string[], id: string, salto: -1 | 1): string[] {
  const donde = ids.indexOf(id);
  const otro = donde + salto;
  if (donde < 0 || otro < 0 || otro >= ids.length) return [...ids];
  const nuevo = [...ids];
  const a = nuevo[donde];
  const b = nuevo[otro];
  if (a === undefined || b === undefined) return nuevo;
  nuevo[donde] = b;
  nuevo[otro] = a;
  return nuevo;
}
