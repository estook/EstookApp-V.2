import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { APP, entrarEnLaApp } from './en-la-app.ts';

/**
 * La auditoría del 26-sep (decisión 0051), desde la pantalla.
 *
 *   · las mermas son el quinto destino de Almacén, y la dirección de antes lleva allí
 *   · el Tablón y «Hoy» se ven siempre, también sin nada
 *   · quien abre una pantalla que no es suya vuelve al Panel **y se le dice**
 *   · Google y el punto exacto del local, juntos en «Tu local»
 *   · con ocho apps, los iconos de la barra de arriba no se encogen
 */
const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

test('las mermas tienen su destino en Almacén, y la dirección de antes lleva a él', async ({
  page,
}) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/movimientos/mermas`);
  await expect(page).toHaveURL(/#\/almacen\/mermas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Mermas' })).toBeVisible();
  // Y Movimientos ya no la lleva dentro.
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/movimientos/todo`);
  await expect(page.getByRole('tab', { name: 'Mermas' })).toHaveCount(0);
});

test('el Tablón y «Hoy» se ven siempre en el Panel, también sin nada', async ({ page }) => {
  await entrarEnLaApp(page, SARA);
  await expect(page.getByRole('region', { name: 'Tablón' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('region', { name: 'Hoy' })).toBeVisible();
  // Y ninguna tarjeta del Panel se aparta por vacía.
  await expect(page.getByText(/^Sin nada ahora en /)).toHaveCount(0);
});

test('quien abre una pantalla que no es suya vuelve al Panel, y se le dice', async ({ page }) => {
  await entrarEnLaApp(page, SARA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo`);
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByText('Esa pantalla no está entre tus apps')).toBeVisible();
});

test('Google y el punto exacto van juntos en Tu local, y Conexiones es solo de ventas', async ({
  page,
}) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/local`);
  await expect(page.getByRole('heading', { level: 2, name: 'Dónde está tu local' })).toBeVisible();
  await expect(page.getByText('Marcar a mano el punto exacto')).toBeVisible();

  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/conexiones`);
  await expect(page.getByRole('heading', { level: 2, name: 'Tus ventas' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Dónde está tu local' })).toHaveCount(0);
});

test('con ocho apps, los iconos de la barra de arriba no se encogen', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', 'La barra de arriba es del ordenador');
  await page.setViewportSize({ width: 1280, height: 800 });
  await entrarEnLaApp(page, ROSA);
  const anchos = await page
    .getByRole('navigation', { name: 'Las apps' })
    .locator('button > span:first-child svg')
    .evaluateAll((iconos) => iconos.map((icono) => icono.getBoundingClientRect().width));
  expect(anchos.length).toBeGreaterThanOrEqual(8);
  for (const ancho of anchos) expect(ancho).toBeGreaterThanOrEqual(17);
});
