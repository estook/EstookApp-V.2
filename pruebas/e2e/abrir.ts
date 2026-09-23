import type { Page } from '@playwright/test';

/**
 * Abrir una dirección en una prueba, sin que Safari se caiga por dentro.
 *
 * ── Lo que pasa, y por qué no es de Estook ──────────────────────────────────
 *
 * En la integración continua, el Safari de las pruebas (WebKit en Linux) contesta a
 * veces «WebKit encountered an internal error» al navegar: pasó el 22-sep al recargar
 * y el 23-sep al volver a abrir la dirección, en pruebas distintas, y las dos pasaron
 * al repetirse. El fallo es **del motor del navegador antes de cargar nada**: la
 * página de Estook no llega ni a pedirse. Cambiar «recargar» por «abrir otra vez» no
 * lo quitó, que es lo que se había creído (regla 87).
 *
 * ── Lo que se hace ───────────────────────────────────────────────────────────
 *
 * Si la navegación falla **con ese error y solo con ese**, se vuelve a intentar una
 * vez. Cualquier otro fallo —que la página no exista, que tarde, que la API no
 * conteste— sigue rompiendo la prueba igual que antes: esto no puede tapar un fallo
 * de la aplicación, porque la aplicación ni ha empezado.
 *
 * ── Y la otra, del 24-sep: la página se estaba moviendo sola ─────────────────
 *
 * Al abrir una app sin destino (`#/negocio`), la app se coloca en su primera pestaña
 * (`#/negocio/ventas`), que es lo que tiene que hacer. Si la prueba abre la siguiente
 * dirección justo en ese instante, el navegador contesta que una navegación
 * «interrumpió» a la otra: la que pedía la prueba no llegó a hacerse. Pasó en Safari,
 * en la prueba que recorre las ocho apps. Se abre otra vez, una vez, con la misma
 * regla: si vuelve a pasar, o es cualquier otra cosa, la prueba falla.
 */
const EL_MOTOR_SE_HA_CAIDO = 'WebKit encountered an internal error';
const LA_PAGINA_SE_MOVIA_SOLA = 'is interrupted by another navigation';

const SE_PUEDE_REPETIR = [EL_MOTOR_SE_HA_CAIDO, LA_PAGINA_SE_MOVIA_SOLA];

export async function abrirSinQueSeCaiga(page: Page, direccion: string): Promise<void> {
  try {
    await page.goto(direccion, { waitUntil: 'domcontentloaded' });
  } catch (fallo) {
    if (!SE_PUEDE_REPETIR.some((motivo) => String(fallo).includes(motivo))) throw fallo;
    await page.goto(direccion, { waitUntil: 'domcontentloaded' });
  }
}
