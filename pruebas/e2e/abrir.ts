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
 */
const EL_MOTOR_SE_HA_CAIDO = 'WebKit encountered an internal error';

export async function abrirSinQueSeCaiga(page: Page, direccion: string): Promise<void> {
  try {
    await page.goto(direccion, { waitUntil: 'domcontentloaded' });
  } catch (fallo) {
    if (!String(fallo).includes(EL_MOTOR_SE_HA_CAIDO)) throw fallo;
    await page.goto(direccion, { waitUntil: 'domcontentloaded' });
  }
}
