import { expect, test } from '@playwright/test';

/**
 * M0 · aceptacion. Las cuatro aplicaciones arrancan, sin errores y a tiempo.
 */
const APLICACIONES = [
  { nombre: 'web', url: 'http://localhost:5173/', titulo: /Estook/ },
  { nombre: 'app', url: 'http://localhost:5174/', titulo: /Estook/ },
  { nombre: 'carta', url: 'http://localhost:5175/', titulo: /Carta/ },
  { nombre: 'admin', url: 'http://localhost:5176/', titulo: /Estook/ },
];

/** B7 · abrir una aplicacion. Se deja holgura porque la maquina de CI es lenta. */
const PRESUPUESTO_MS = 3_000;

for (const aplicacion of APLICACIONES) {
  test.describe(aplicacion.nombre, () => {
    test('arranca, se pinta y dice en que entorno esta', async ({ page }) => {
      const errores: string[] = [];
      page.on('console', (mensaje) => {
        if (mensaje.type() === 'error') errores.push(mensaje.text());
      });
      page.on('pageerror', (fallo) => errores.push(fallo.message));

      const comienzo = Date.now();
      await page.goto(aplicacion.url, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const tardanza = Date.now() - comienzo;

      await expect(page).toHaveTitle(aplicacion.titulo);
      await expect(page.getByText('Entorno')).toBeVisible();
      await expect(page.getByText('Correlacion')).toBeVisible();
      await expect(page.getByText('Base de datos')).toBeVisible();

      expect(errores, `La consola no puede tener errores: ${errores.join(' · ')}`).toEqual([]);
      expect(tardanza, `Presupuesto de B7: ${PRESUPUESTO_MS} ms`).toBeLessThan(PRESUPUESTO_MS);
    });

    test('no desborda a lo ancho en movil pequeno', async ({ page }) => {
      await page.goto(aplicacion.url, { waitUntil: 'domcontentloaded' });
      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(desborda, 'Regla 11: nada se da por terminado con desbordes en movil').toBe(false);
    });
  });
}
