import { expect, test } from '@playwright/test';

/**
 * M0 · aceptacion. Las cuatro aplicaciones arrancan, sin errores y a tiempo.
 *
 * Desde M3, `app` ya no es la pantalla de cimientos. Y desde M4 lo primero que
 * ensena **no es el Panel sino la puerta**: sin haber entrado no se pinta ni una
 * barra ni un dato, que es exactamente lo que tiene que pasar.
 *
 * Las otras tres siguen siendo el marcador de sitio de M0, pintado con el sistema
 * de diseno.
 */
const APLICACIONES = [
  { nombre: 'web', url: 'http://localhost:5173/', titulo: /Estook/, esElEsqueleto: false },
  { nombre: 'app', url: 'http://localhost:5174/', titulo: /Estook/, esElEsqueleto: true },
  { nombre: 'carta', url: 'http://localhost:5175/', titulo: /Carta/, esElEsqueleto: false },
  { nombre: 'admin', url: 'http://localhost:5176/', titulo: /Estook/, esElEsqueleto: false },
];

/** B7 · abrir una aplicacion. Se deja holgura porque la maquina de CI es lenta. */
const PRESUPUESTO_MS = 3_000;

for (const aplicacion of APLICACIONES) {
  test.describe(aplicacion.nombre, () => {
    test('arranca, se pinta y no escupe errores', async ({ page }) => {
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

      if (aplicacion.esElEsqueleto) {
        // La puerta de M4. Que lo primero sea esto y no el Panel es la mitad del
        // modulo: antes de saber quien eres no hay nada que ensenar.
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Entra en Estook');
      } else {
        // El marcador de sitio de M0, que sigue diciendo como ha arrancado.
        await expect(page.getByText('Entorno', { exact: true })).toBeVisible();
        await expect(page.getByText('Sesion', { exact: true })).toBeVisible();
        await expect(page.getByText('Base de datos', { exact: true })).toBeVisible();
      }

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

    test('usa Montserrat autoalojada, no una fuente del sistema', async ({ page }) => {
      // B2: «autoalojada [...] Nada de cargarla desde un servidor ajeno».
      await page.goto(aplicacion.url, { waitUntil: 'load' });
      await page.waitForFunction(() => document.fonts.status === 'loaded');

      const familia = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
      expect(familia).toContain('Montserrat');
    });
  });
}

/**
 * Las que no eligen tema se quedan claras, **aunque el sistema sea oscuro**.
 *
 * De las cuatro aplicaciones, solo `app` tiene modo oscuro: la web pública y la
 * carta no llaman a `usarTema`, así que su `<html>` no lleva `data-tema`. Si el
 * gancho que decide el logotipo respondiera «lo que diga el sistema» por defecto,
 * con el móvil en oscuro esas dos pintarían **el logotipo claro sobre una página
 * clara**: invisible. Es el mismo fallo del logotipo, al revés.
 */
test.describe('con el sistema en oscuro', () => {
  test.use({ colorScheme: 'dark' });

  for (const { nombre, url } of APLICACIONES.filter((a) => a.nombre !== 'app')) {
    test(`${nombre} sigue clara, y su logotipo se lee`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Sin `data-tema`: esta aplicación no elige, así que no hay nada que elegir.
      await expect(page.locator('html')).not.toHaveAttribute('data-tema', /.+/);

      const fondo = await page.evaluate(() =>
        window.getComputedStyle(document.documentElement).getPropertyValue('--color-fondo').trim(),
      );
      expect(fondo, 'la web pública no tiene modo oscuro').toBe('#f1efea');

      const logos = page.getByRole('img', { name: /Estook · tu cocina/ });
      if ((await logos.count()) > 0) {
        await expect(logos.first()).toHaveAttribute('src', /estook-logo.png/);
      }
    });
  }
});
