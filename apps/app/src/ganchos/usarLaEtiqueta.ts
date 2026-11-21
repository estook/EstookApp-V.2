import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * **La etiqueta de lo que se señala** en una tarjeta del Panel (el rediseño, entrega 3 · 0148).
 *
 * Richi, 18-nov: «las gráficas dicen lo suyo al pasar el ratón o al tocarlas». Todo lo que lleva
 * `data-tip` dentro de la tarjeta enseña su etiqueta: con el ratón al pasar; con el dedo al tocar,
 * y arrastrando va de una a otra; con el teclado, al llegar con el tabulador. La tarjeta escucha y
 * esto dice qué enseñar y dónde: **encima del dedo**, para que no la tape.
 */
export interface LaEtiqueta {
  readonly titulo: string;
  readonly texto: string;
  readonly x: number;
  readonly y: number;
  /** Debajo del punto, cuando arriba no cabe. */
  readonly debajo: boolean;
}

function laDelElemento(objetivo: EventTarget | null): Element | null {
  return objetivo instanceof Element ? objetivo.closest('[data-tip]') : null;
}

export function usarLaEtiqueta() {
  const caja = useRef<HTMLElement>(null);
  const [etiqueta, setEtiqueta] = useState<LaEtiqueta | null>(null);
  const conDedo = useRef(false);

  const ensenar = useCallback((el: Element, x: number, y: number) => {
    const tarjeta = caja.current?.getBoundingClientRect();
    if (tarjeta === undefined) return;
    const enLaTarjeta = { x: x - tarjeta.left, y: y - tarjeta.top };
    setEtiqueta({
      titulo: el.getAttribute('data-tip') ?? '',
      texto: el.getAttribute('data-tip-texto') ?? '',
      x: enLaTarjeta.x,
      // Con el dedo, más arriba: el dedo tapa lo que tiene debajo.
      y: enLaTarjeta.y - (conDedo.current ? 28 : 12),
      debajo: enLaTarjeta.y < 70,
    });
  }, []);

  const alMoverse = (evento: PointerEvent<HTMLElement>) => {
    conDedo.current = evento.pointerType === 'touch';
    const el = laDelElemento(evento.target);
    if (el === null) {
      if (!conDedo.current) setEtiqueta(null);
      return;
    }
    ensenar(el, evento.clientX, evento.clientY);
  };

  const alTocar = (evento: PointerEvent<HTMLElement>) => {
    conDedo.current = evento.pointerType === 'touch';
    const el = laDelElemento(evento.target);
    if (el === null) {
      setEtiqueta(null);
      return;
    }
    // Para que, arrastrando de lado, la etiqueta siga al dedo de una columna a otra.
    if (evento.pointerType === 'touch' && evento.target instanceof Element) {
      evento.target.releasePointerCapture(evento.pointerId);
    }
    ensenar(el, evento.clientX, evento.clientY);
  };

  const alEnfocar = (el: Element) => {
    const r = el.getBoundingClientRect();
    conDedo.current = false;
    ensenar(el, r.left + r.width / 2, r.top);
  };

  return {
    caja,
    etiqueta,
    oyentes: {
      onPointerMove: alMoverse,
      onPointerDown: alTocar,
      onPointerLeave: (evento: PointerEvent<HTMLElement>) => {
        if (evento.pointerType !== 'touch') setEtiqueta(null);
      },
      onFocus: (evento: { target: EventTarget }) => {
        const el = laDelElemento(evento.target);
        if (el !== null) alEnfocar(el);
      },
      onBlur: () => {
        setEtiqueta(null);
      },
      onKeyDown: (evento: KeyboardEvent<HTMLElement>) => {
        if (evento.key === 'Escape') setEtiqueta(null);
      },
    },
  };
}
