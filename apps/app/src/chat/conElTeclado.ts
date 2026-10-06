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
 * La cuenta es aritmética pura, para probarla sin un iPhone (`conElTeclado.prueba.ts`).
 */

export interface DondeVaElChat {
  /** Desde dónde, en px desde arriba de la página. */
  readonly arriba: number;
  /** Cuánto alto: lo que se ve encima del teclado. */
  readonly alto: number;
}

/**
 * Dónde va el chat con el teclado abierto; nulo sin teclado (entonces manda el CSS:
 * entre la barra de arriba y la de abajo). Con zoom de dos dedos no se toca nada.
 */
export function dondeVaElChat(visor: Visor, altoDeMaquetacion: number): DondeVaElChat | null {
  if (Math.abs(visor.scale - 1) > 0.01) return null;
  if (altoDeMaquetacion - visor.height <= ALTO_DE_UN_TECLADO) return null;
  // Con `Math.trunc`: son píxeles, y la regla 9 guarda el redondeo para el dinero.
  return { arriba: Math.max(0, Math.trunc(visor.offsetTop)), alto: Math.trunc(visor.height) };
}
