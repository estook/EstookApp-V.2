import { ALTO_DE_UN_TECLADO, type Visor } from '@estook/ui';

/**
 * El chat con el teclado abierto, y quieto al deslizar (repaso de C1, 6-oct).
 *
 * ── Lo que vio Richi, en su iPhone ───────────────────────────────────────────
 *
 *   · «Al escribir sale muy hacia arriba todo»: la conversación se metía debajo de la
 *     hora y la batería, y entre la caja de escribir y el teclado quedaba un hueco
 *     vacío del alto de la barra de abajo.
 *   · «A veces al deslizar coge toda la interfaz de arriba y la baja sin querer, en vez
 *     de desplazarte por la conversación.»
 *
 * ── Por qué ──────────────────────────────────────────────────────────────────
 *
 * El teclado del iPhone no encoge la página: la empuja hacia arriba lo que haga falta
 * para que se vea el campo (`anclaAbajo.ts` lo cuenta entero). El chat iba pegado
 * entre la barra de arriba y la de abajo de la página entera, así que con el teclado
 * subía con ella, y el hueco de la barra de abajo —que con el teclado se esconde— se
 * quedaba encima del teclado. Y al deslizar sobre algo que no se desplaza (la cabecera,
 * o la conversación ya arriba del todo), el iPhone estiraba **la página de debajo**, y
 * con ella la barra de arriba, que se descolgaba encima de la conversación.
 *
 * ── Qué se hace ──────────────────────────────────────────────────────────────
 *
 *   · **Con el teclado abierto, el chat ocupa justo lo que se ve**: desde arriba de lo
 *     visible hasta el teclado, con la cabecera de la conversación arriba y la caja de
 *     escribir pegada al teclado, como en cualquier chat del móvil.
 *   · **Mientras el chat está abierto, la página de debajo no se mueve** (`data-chat`
 *     en `estilos.css`): sin desplazarse ni estirarse. Solo se desplazan la lista y la
 *     conversación, y al llegar a su borde no arrastran nada.
 *
 * ── Y por qué no bastó con eso (10-oct) ──────────────────────────────────────
 *
 * Richi, con el iPhone, después del repaso del 9-oct: «al tocar la caja de escribir,
 * el iPhone sube la página entera y la caja queda tapada por la barra de flechas y el
 * teclado». Lo de arriba solo se hacía **si se veía el teclado**, y el teclado se veía
 * comparando el alto visible con `window.innerHeight`. En el iPhone ese número **también
 * encoge** con el teclado (sigue al visor visible, no a la página): la resta salía casi
 * cero, el chat creía que no había teclado y se quedaba entre las dos barras de la
 * página, que el iPhone había subido fuera de la vista. Por eso, en su captura, asomaba
 * un mensaje debajo de la hora y no se veían ni la cabecera ni la caja.
 *
 * Dos seguros, y basta uno para que funcione:
 *
 *   · **El alto de la página se mide con lo que no encoge** (`altoDeLaPagina`, en
 *     `@estook/ui`): el mayor de `innerHeight` y el alto del documento.
 *   · **Escribiendo en el chat, el chat va siempre a lo visible**, se vea o no el
 *     teclado: la cabecera arriba y la caja pegada encima del teclado, como WhatsApp.
 *
 * La cuenta es aritmética pura, para probarla sin un iPhone (`conElTeclado.prueba.ts`).
 */

export interface DondeVaElChat {
  /** Desde dónde, en px desde arriba de la página. */
  readonly arriba: number;
  /** Cuánto alto: lo que se ve encima del teclado. */
  readonly alto: number;
}

/**
 * Dónde va el chat: nulo si manda el CSS (entre la barra de arriba y la de abajo). Va a
 * lo visible con el teclado abierto **o mientras se escribe en él**. Con zoom de dos
 * dedos no se toca nada.
 */
export function dondeVaElChat(
  visor: Visor,
  altoDeMaquetacion: number,
  escribiendo = false,
): DondeVaElChat | null {
  if (Math.abs(visor.scale - 1) > 0.01) return null;
  const teclado = altoDeMaquetacion - visor.height > ALTO_DE_UN_TECLADO;
  if (!teclado && !escribiendo) return null;
  // Con `Math.trunc`: son píxeles, y la regla 9 guarda el redondeo para el dinero.
  return { arriba: Math.max(0, Math.trunc(visor.offsetTop)), alto: Math.trunc(visor.height) };
}
