import { expect, test } from '@playwright/test';
import { ejecutarEnLaApi, entrarEnLaApp, tokenDe } from './en-la-app.ts';

/**
 * Lo que escriben otros se ve sin tocar nada (30-sep, `apps/app/src/datos/alDia.ts`).
 *
 * Richi preguntó si la app se pone al día sola o hay que hacerlo a mano. Solo lo
 * hacía la campana: el Tablón, «Lo de hoy» y quién ha fichado se quedaban como
 * estaban hasta cambiar de pantalla. Aquí Rosa mira el Panel, Sara escribe en el
 * Tablón desde otro aparato, y pasado un minuto la nota está, sin recargar.
 *
 * El reloj de la página se adelanta en vez de esperar el minuto de verdad.
 */
const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

test('el Tablón se pone al día solo, sin recargar', async ({ page }) => {
  // Una nota de Rosa antes de entrar: el Tablón vacío no sale en el Panel.
  const deRosa = `Hoy cierra Rosa ${String(Date.now()).slice(-5)}`;
  await ejecutarEnLaApi(page.request, await tokenDe(page.request, ROSA), 'escribir_en_el_tablon', {
    texto: deRosa,
  });

  await page.clock.install();
  // El tablón entero, en la hoja de «Hoy» de quien lleva el local (0148): ahí salen todas las
  // notas, y la que llega se ve aunque otras pruebas escriban a la vez.
  await entrarEnLaApp(page, ROSA);
  await page.getByRole('button', { name: /^Hoy, / }).click();
  const tablon = page.getByRole('dialog', { name: 'Hoy' }).getByRole('region', { name: 'Tablón' });
  await expect(tablon).toBeVisible();

  const deOtra = `Llega el pescado a las 11 ${String(Date.now()).slice(-5)}`;
  await ejecutarEnLaApi(page.request, await tokenDe(page.request, SARA), 'escribir_en_el_tablon', {
    texto: deOtra,
  });

  await page.clock.fastForward(61_000);
  await expect(tablon.getByRole('listitem').filter({ hasText: deOtra })).toBeVisible();
});
