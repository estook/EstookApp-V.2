import { expect, test } from '@playwright/test';
import { entrarEnLaApp, irA } from './en-la-app.ts';

/**
 * La auditoría del 20-oct (decisión 0101), en la pantalla.
 *
 * Lo del servidor está en `base-de-datos/pruebas/la-auditoria-del-20-oct.prueba.ts`; aquí,
 * lo que solo se ve con el dedo.
 */

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro

/**
 * **El precio escrito con IVA se queda como se escribió.** Se guarda sin IVA y al
 * céntimo, y al salir del campo se volvía a calcular con IVA: uno de cada seis precios
 * al 21 % cambiaba un céntimo delante de quien lo escribía («pongo 0,32 y pone 0,31»).
 */
test('un precio escrito con IVA no cambia al salir del campo', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'almacen/productos');

  await page.getByRole('button', { name: /^Añad/ }).first().click();
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });
  await hoja.getByLabel('¿Qué producto es?').fill('Cerveza quinto');
  await hoja.getByText('Cerveza quinto', { exact: true }).first().click();

  await hoja.getByRole('radio', { name: 'Con IVA' }).click();
  const precio = hoja.getByRole('textbox', { name: 'Precio de la caja', exact: true });
  await precio.fill('0,32');
  await precio.blur();

  await expect(precio).toHaveValue('0,32');
  await expect(hoja.getByText('Se guarda 0,26 € sin IVA (21 %).')).toBeVisible();
});
