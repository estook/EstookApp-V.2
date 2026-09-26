import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * Si una caja tiene todos sus hijos vacíos, para esconderla entera (repaso del
 * 25-sep).
 *
 * ── Por qué no con CSS ───────────────────────────────────────────────────────
 *
 * Se hacía con `:not(:has(>:not(:empty)))`, que en Chrome va bien y en el iPhone
 * no: WebKit **no vuelve a mirar `:has(:empty)`** cuando un hijo se llena después
 * de pintarse, y la zona se quedaba escondida con «Hoy» dentro. Es un fallo suyo,
 * arreglado solo en Safari 27, y en el iPhone todos los navegadores son Safari por
 * dentro. Richi lo vio así: «en el ordenador sale siempre; en el móvil a veces sí,
 * a veces no, o tarda» (lo de hoy llega después que lo demás, y cuándo se volvía a
 * pintar la zona dependía de cualquier otra cosa, como deslizar).
 *
 * Así lo decide la página: se mira al montar, antes de pintar, y cada vez que
 * cambia algo dentro. **No se usa `:has()` para esconder nada** (lo tasa
 * `sin-has.prueba.ts`).
 */
export function usarSinNadaDentro<T extends HTMLElement>(): readonly [RefObject<T>, boolean] {
  const caja = useRef<T>(null);
  const [vacia, setVacia] = useState(true);

  useLayoutEffect(() => {
    const elemento = caja.current;
    if (elemento === null) return;

    const mirar = () => {
      setVacia(Array.from(elemento.children).every((hijo) => hijo.childNodes.length === 0));
    };
    mirar();

    const observador = new MutationObserver(mirar);
    observador.observe(elemento, { childList: true, subtree: true });
    return () => {
      observador.disconnect();
    };
  }, []);

  return [caja, vacia];
}
