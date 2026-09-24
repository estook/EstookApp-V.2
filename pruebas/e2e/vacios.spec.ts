import { expect, test } from '@playwright/test';
import { entrarEnLaApp, irA } from './en-la-app.ts';

/**
 * V · punto 4 · los vacíos invitan a empezar.
 *
 * «Terminado cuando: … los vacíos invitan a empezar» (mejoras antes de M8). Lo que
 * se comprueba es lo que prometía el plan, en pantalla:
 *
 *   · **un dibujo y una sola acción**, que hace lo que dice;
 *   · **Inventario · Resumen, con la cámara vacía, enseña cómo empezar** y no
 *     «Cómo va»: cuatro cifras sin datos encima de lo único que sirve sobraban;
 *   · el vacío **de un filtro** no es el vacío de verdad: ofrece quitar el filtro;
 *   · y **los dibujos se cargan aparte**: llegan en su propio trozo, no en el
 *     paquete con el que arranca la aplicación.
 *
 * Entra Vera, que lleva el Bar Ribera: no tiene género y **ninguna otra prueba
 * entra con ella**, así que nadie le llena la cámara mientras tanto. Ninguna de
 * estas pruebas guarda nada: abren, miran y cierran.
 */
const VERA = 'vera@ejemplo.estook.com';

test('con la cámara vacía, el Resumen enseña cómo empezar, y el botón abre el alta', async ({
  page,
}) => {
  // El dibujo llega en su trozo propio: se oye pedirlo.
  const elTrozoDelDibujo = page.waitForResponse((r) => /\/Camara-[\w-]+\.js$/.test(r.url()));

  await entrarEnLaApp(page, VERA);
  await irA(page, 'inventario/resumen');

  await expect(page.getByText('Tu cámara está vacía')).toBeVisible();
  expect((await elTrozoDelDibujo).ok()).toBe(true);
  await expect(page.locator('[data-dibujo="camara"] svg')).toBeVisible();

  // Los tres pasos, y «Cómo va» no: sin datos serían cuatro cuadros vacíos.
  await expect(page.getByText('Pon a tus proveedores')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cómo va' })).toHaveCount(0);

  // **Un** botón, y hace lo que dice: abre el alta, en Productos.
  const empezar = page.getByRole('button', { name: 'Añade tu primer producto' });
  await expect(empezar).toHaveCount(1);
  await empezar.click();
  await expect(page.getByRole('dialog', { name: 'Un producto nuevo' })).toBeVisible();
  await expect(page).toHaveURL(/#\/inventario\/productos/);
});

test('Productos vacío enseña solo el vacío: un botón, y los ejemplos en texto', async ({
  page,
}) => {
  await entrarEnLaApp(page, VERA);
  await irA(page, 'inventario/productos/todo');

  // Con la cámara vacía, solo el vacío: ni buscador, ni «0 productos», ni un
  // segundo botón naranja.
  await expect(page.getByText('Todavía no tienes género')).toBeVisible();
  await expect(page.getByLabel('Buscar en tu género')).toHaveCount(0);
  await expect(page.getByText('0 productos')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Añade tu primer producto' })).toBeVisible();
  // La otra salida va en texto y debajo, no como un segundo botón del mismo peso.
  await expect(
    page.getByRole('button', { name: 'O ponme unos ejemplos para verlo' }),
  ).toBeVisible();
});

test('en Pedidos, el filtro vacío ofrece volver a los abiertos, y los abiertos, hacer uno', async ({
  page,
}) => {
  await entrarEnLaApp(page, VERA);
  await irA(page, 'inventario/compras/pedidos');

  await expect(page.getByText('No hay pedidos abiertos')).toBeVisible();
  await expect(page.locator('[data-dibujo="pedidos"] svg')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hacer un pedido' }).last()).toBeVisible();

  await page.getByRole('radio', { name: /Cancelados/ }).click();
  await expect(page.getByText('Ningún pedido cancelado')).toBeVisible();
  await page.getByRole('button', { name: 'Ver los abiertos' }).click();
  await expect(page.getByText('No hay pedidos abiertos')).toBeVisible();
});

test('el buscador, sin nada parecido, ofrece borrar lo escrito', async ({ page }) => {
  await entrarEnLaApp(page, VERA);
  await irA(page, 'inventario/resumen');

  await page.keyboard.press('Control+k');
  const campo = page.getByLabel('Que quieres buscar');
  await expect(campo).toBeVisible();
  await campo.fill('zzqqxx');
  await expect(page.getByText('Nada con «zzqqxx»')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Borrar lo escrito' }).click();
  await expect(campo).toHaveValue('');
  await expect(campo).toBeFocused();
});
