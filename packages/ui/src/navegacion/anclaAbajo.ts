/**
 * Dónde queda lo que va pegado abajo —la barra, el «+», el aviso de deshacer— en
 * un iPhone que se ha liado con su visor (repaso del 25-sep).
 *
 * ── Lo que vio Richi ─────────────────────────────────────────────────────────
 *
 * «Al deslizar hacia arriba, la barra de abajo sube hasta la mitad de la pantalla
 * y ahí se para.» Con la app puesta en la pantalla de inicio del iPhone.
 *
 * ── Por qué pasa ─────────────────────────────────────────────────────────────
 *
 * Lo `fixed` con `bottom: 0` se pega al borde de abajo del **visor de maquetación**
 * (layout viewport), no al de la pantalla. En el iPhone el teclado no encoge ese
 * visor: Safari desplaza por dentro el **visor visible** (visual viewport) para
 * enseñar el campo. Y en una app instalada, WebKit a menudo **no lo devuelve a su
 * sitio** al cerrarse el teclado: el visible se queda desplazado hacia abajo
 * (`offsetTop` sin volver a cero), el borde de abajo del de maquetación queda a
 * media pantalla, y todo lo pegado a él, con él. Es un fallo de WebKit, conocido
 * y sin arreglar en iOS 26; no lo podemos arreglar nosotros, pero sí medirlo.
 *
 * ── Qué se hace ──────────────────────────────────────────────────────────────
 *
 *   · **El desfase**: cuánto por debajo del borde de maquetación acaba de verdad
 *     la pantalla. Normalmente cero; con el fallo, lo que se ha quedado colgado.
 *     Lo pegado abajo baja eso (`--desfase-abajo`).
 *   · **El teclado**: si el visible es bastante más bajo que el de maquetación, hay
 *     un teclado abierto. Entonces la barra se esconde, como en las apps del
 *     teléfono: no se escribe con media pantalla de botones encima del teclado.
 *   · **Con zoom no se toca nada**: si alguien amplía con dos dedos, lo pegado se
 *     queda donde lo pone el navegador, que es lo esperado.
 *
 * Es aritmética pura, para poder probarla sin un iPhone (`anclaAbajo.prueba.ts`).
 * Quien la aplica es `usarAnclaAbajo`.
 */
export interface Visor {
  /** Cuánto está desplazado el visor visible dentro del de maquetación, en px. */
  readonly offsetTop: number;
  /** El alto del visor visible, en px. */
  readonly height: number;
  /** El zoom de dos dedos: 1 sin ampliar. */
  readonly scale: number;
}

export interface ComoQuedaAbajo {
  /** Cuántos px hay que bajar lo pegado abajo. Nunca negativo. */
  readonly desfase: number;
  /** Si hay un teclado abierto (y la barra se aparta). */
  readonly teclado: boolean;
}

/** Lo que tiene que encoger el visible para que sea un teclado y no una barra del navegador. */
export const ALTO_DE_UN_TECLADO = 150;

export function comoQuedaAbajo(visor: Visor, altoDeMaquetacion: number): ComoQuedaAbajo {
  if (Math.abs(visor.scale - 1) > 0.01) return { desfase: 0, teclado: false };

  const teclado = altoDeMaquetacion - visor.height > ALTO_DE_UN_TECLADO;
  // Con `Math.trunc`: son píxeles, y la regla 9 guarda el redondeo para el dinero.
  const sobra = Math.trunc(visor.offsetTop + visor.height - altoDeMaquetacion);
  // Lo que queda por encima (el teclado, una barra del navegador) no sube nada:
  // con teclado la barra se aparta, y sin él no hay nada que compensar.
  return { desfase: sobra > 0 ? sobra : 0, teclado };
}
