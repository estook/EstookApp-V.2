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

test('el Tablón se ve siempre en el Panel, también sin nada', async ({ page }) => {
  // «Hoy», no: sin nada urgente no sale (Richi, 16-oct, 0090). Lo prueba
  // `el-panel-en-el-movil.spec.ts`.
  await entrarEnLaApp(page, SARA);
  await expect(page.getByRole('region', { name: 'Tablón' })).toBeVisible({ timeout: 10_000 });
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
  // En su hoja desde las bases firmes (0084).
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/local#google`);
  await expect(page.getByRole('heading', { level: 2, name: 'Dónde está tu local' })).toBeVisible();
  await expect(page.getByText('Marcar a mano el punto exacto')).toBeVisible();

  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/conexiones`);
  await expect(page.getByRole('heading', { level: 2, name: 'Tus ventas' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Dónde está tu local' })).toHaveCount(0);
});

test('los iconos de las apps no se encogen, ni con el menú abierto ni plegado', async ({
  page,
}, info) => {
  // Era la barra de arriba con ocho apps, que en 1.280 px las encogía. Desde la
  // experiencia (0083) van en el menú de la izquierda, y se mira en sus dos formas.
  test.skip(info.project.name !== 'escritorio', 'El menú es del ordenador');
  await page.setViewportSize({ width: 1280, height: 800 });
  await entrarEnLaApp(page, ROSA);
  const menu = page.getByRole('complementary', { name: 'Menú' });
  const anchos = () =>
    menu
      .getByRole('navigation', { name: 'Las apps' })
      .locator('button svg')
      .evaluateAll((iconos) => iconos.map((icono) => icono.getBoundingClientRect().width));

  const abierto = await anchos();
  // El Panel y las cinco apps con algo construido que tiene quien lleva el local.
  expect(abierto.length).toBeGreaterThanOrEqual(6);
  for (const ancho of abierto) expect(ancho).toBeGreaterThanOrEqual(14);

  await menu.getByRole('button', { name: 'Plegar el menú' }).click();
  const plegado = await anchos();
  expect(plegado.length).toBeGreaterThanOrEqual(6);
  for (const ancho of plegado) expect(ancho).toBeGreaterThanOrEqual(16);
});
