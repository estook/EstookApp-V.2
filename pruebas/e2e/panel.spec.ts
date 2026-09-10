import { expect, test, type Page } from '@playwright/test';

/**
 * El Panel de cada uno · que lo que montas siga ahí mañana (M6½).
 *
 * ── Por qué esta prueba existe ───────────────────────────────────────────────
 *
 * «Si modificas el panel y actualizas, vuelve a su estado original.» Un dato que
 * se guarda en el servidor y no se comprueba recargando es un dato que se guarda
 * en la memoria del navegador hasta que alguien mira.
 *
 * Se comprueban dos cosas:
 *
 *   1. **Quitar y recargar.** El widget sigue fuera.
 *   2. **Lo que se quita se puede volver a poner**, y sigue puesto al recargar.
 *      Un widget que desaparece del catálogo de «Añadir» al quitarlo es un widget
 *      que se pierde para siempre: le pasaba a «Acciones rápidas».
 *
 * ── Por qué con Luis, y por qué no en Safari ─────────────────────────────────
 *
 * El Panel es **de la persona y del aparato** (móvil o escritorio), y es estado
 * del servidor: una prueba que lo toca lo deja tocado para cualquier otra que
 * mire el mismo a la vez. La primera versión de este fichero usaba a Rosa, que es
 * la de `esqueleto.spec.ts`, y en la integración continua salió en rojo una vez
 * de cada tantas: una prueba dejaba el Panel de fábrica mientras la otra acababa
 * de quitar un widget.
 *
 * Así que dos reglas, las dos por lo mismo:
 *
 *   · **Luis**, cuyo Panel no toca ninguna otra prueba: las demás solo usan su
 *     cuenta para hablar con la API.
 *   · **Un solo navegador de móvil.** El móvil pequeño y Safari son dos proyectos
 *     y un mismo Panel —el del móvil—, y en la integración continua corren a la
 *     vez. Lo que se prueba aquí es el servidor, que no cambia de un navegador a
 *     otro.
 */
const APP = 'http://localhost:5174/';
const CLAVE = 'estook en desarrollo';

/** Luis es jefe de cocina en Bar Puerto. Su Panel es solo de estas pruebas. */
const LUIS = 'luis@ejemplo.estook.com';

async function entrar(page: Page, correo: string) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem('estook.sesion');
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/**
 * Espera a que no quede nada por guardar.
 *
 * «guardando…» dura desde que se toca algo hasta que la cola se vacía. Recargar
 * antes de eso cortaría el guardado por la mitad, que es lo que le pasaría a una
 * persona rápida y **no** es lo que esta prueba quiere medir.
 */
async function yaEstaGuardado(page: Page) {
  await expect(page.getByText('guardando…')).toHaveCount(0, { timeout: 15_000 });
}

async function editar(page: Page) {
  await page.getByRole('button', { name: 'Editar' }).click();
}

async function listo(page: Page) {
  await page.getByRole('button', { name: 'Listo' }).click();
  await yaEstaGuardado(page);
}

/** Deja el Panel como de fábrica, para que cada prueba empiece igual. */
async function panelDeFabrica(page: Page) {
  await editar(page);
  await page.getByRole('button', { name: 'Volver al panel de siempre' }).click();
  await listo(page);
}

test.describe('el Panel se guarda de verdad', () => {
  // Una detrás de otra: las dos tocan el mismo Panel.
  test.describe.configure({ mode: 'serial' });

  // Y en un solo navegador de móvil: arriba está por qué.
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Safari y el móvil pequeño comparten el Panel del móvil, y a la vez se pisan.',
  );

  test('un widget quitado sigue quitado después de recargar', async ({ page }) => {
    await entrar(page, LUIS);
    await panelDeFabrica(page);

    // El primero de la rejilla, sea el que sea: la prueba no se casa con un
    // widget concreto, porque el Panel de fábrica puede cambiar.
    await editar(page);
    const quitar = page.getByRole('button', { name: /^Quitar .* del panel$/ }).first();
    const cual = (await quitar.getAttribute('aria-label')) ?? '';
    const nombre = cual.replace(/^Quitar /, '').replace(/ del panel$/, '');
    await quitar.click();
    await listo(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await editar(page);

    await expect(page.getByRole('button', { name: `Quitar ${nombre} del panel` })).toHaveCount(0);
  });

  test('lo que se quita se puede volver a poner, y sigue puesto al recargar', async ({ page }) => {
    await entrar(page, LUIS);
    await panelDeFabrica(page);

    // Acciones rápidas es el que Richi encontró sin vuelta atrás: se quitaba del
    // Panel y no había forma de recuperarlo.
    await editar(page);
    await page.getByRole('button', { name: 'Quitar Acciones rápidas del panel' }).click();
    await listo(page);

    await editar(page);
    await page.getByRole('button', { name: 'Añadir', exact: true }).first().click();
    await page.getByRole('button', { name: /^Acciones rápidas/ }).click();
    await listo(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await editar(page);
    await expect(
      page.getByRole('button', { name: 'Quitar Acciones rápidas del panel' }),
    ).toBeVisible();
  });
});
