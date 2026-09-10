import { expect, test, type Page } from '@playwright/test';

/**
 * El Panel de cada uno · que lo que montas siga ahí mañana (M6½).
 *
 * ── Por qué esta prueba existe ───────────────────────────────────────────────
 *
 * Porque el Panel se guarda en el servidor desde la migración 0025 y **no había
 * ni una prueba que lo comprobara**: ni de base de datos, ni de servidor, ni de
 * pantalla. Las de `esqueleto.spec.ts` quitan un widget para abrir la barra de
 * deshacer, pero ninguna **recarga** y mira si sigue quitado, que es justo lo
 * único que importa aquí.
 *
 * Y era lo que fallaba: «si modificas el panel y actualizas, vuelve a su estado
 * original». Un dato que se guarda en el servidor y no se comprueba recargando es
 * un dato que se guarda en la memoria del navegador hasta que alguien mira.
 *
 * Se comprueban las dos mitades, que son dos fallos distintos:
 *
 *   1. **Quitar y recargar.** El widget sigue fuera.
 *   2. **Añadir y recargar.** El widget sigue puesto.
 *
 * Y una tercera que no es de persistencia pero se cae por el mismo agujero:
 * **lo que se quita se puede volver a poner**. Un widget que desaparece del
 * catálogo de «Añadir» al quitarlo es un widget que se pierde para siempre.
 */
const APP = 'http://localhost:5174/';
const CLAVE = 'estook en desarrollo';

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
  // **Una detrás de otra.** Las dos tocan el mismo Panel —el de Rosa en este
  // aparato— y a la vez se pisan: una lo deja de fábrica mientras la otra acaba
  // de quitar un widget. El primer rojo de esta prueba fue ese, y no un fallo.
  test.describe.configure({ mode: 'serial' });

  test('un widget quitado sigue quitado después de recargar', async ({ page }) => {
    await entrar(page, 'rosa@ejemplo.estook.com');
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
    await entrar(page, 'rosa@ejemplo.estook.com');
    await panelDeFabrica(page);

    // Acciones rápidas es el que Richi encontró sin vuelta atrás: se quitaba del
    // Panel y no había forma de recuperarlo.
    await editar(page);
    await page.getByRole('button', { name: 'Quitar Acciones rápidas del panel' }).click();
    await listo(page);

    await editar(page);
    await page.getByRole('button', { name: 'Añadir' }).first().click();
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
