import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { APP, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * El repaso del 20-oct (0100), en la pantalla.
 *
 * Richi: «he añadido albahaca y en el aceite de albahaca me pide unidades, cuando la
 * albahaca no se mide en unidades», y «al añadir un artículo se pierde la ficha». Desde
 * un escandallo, «Crear en el Almacén» daba de alta el producto solo con el nombre: sin
 * envase, sin precio y sin ver su ficha. Ahora abre el alta entera con el nombre puesto, y
 * al guardar vuelve al escandallo con el producto elegido; y lo que trae cada bandeja deja
 * escribirlo en gramos.
 */
test('desde un escandallo, lo que no está en el Almacén se crea con su ficha y se escribe en gramos', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `repaso-20-${unico(info)}@correo-de-prueba.com`, 'Bar Pesto');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';
  await ejecutarEnLaApi(request, token, 'crear_platos', {
    seccion_id: null,
    platos: [{ nombre: 'Pasta al pesto', precio_centimos: 1200 }],
  });

  await abrirSinQueSeCaiga(page, `${APP}#/escandallos/resumen`);
  await page
    .getByRole('list', { name: 'Sin escandallo' })
    .getByRole('button', { name: /Pasta al pesto/ })
    .click();
  await page
    .getByRole('dialog', { name: 'Pasta al pesto' })
    .getByRole('button', { name: 'Desgranar' })
    .click();
  const editor = page.getByRole('dialog', { name: 'Desgranar' });
  await editor.getByPlaceholder('Carne picada, salsa de la casa…').fill('Albahaca de bandeja');
  await editor.getByRole('button', { name: 'Crear «Albahaca de bandeja» en el Almacén' }).click();

  // El alta de siempre, encima, con el nombre ya buscado.
  const alta = page.getByRole('dialog', { name: 'Un producto nuevo' });
  await expect(alta.getByLabel('¿Qué producto es?')).toHaveValue('Albahaca de bandeja');
  await alta.getByRole('button', { name: 'Crearlo a mano' }).click();
  await alta.getByRole('radio', { name: /Por unidades/ }).click();
  await alta.getByLabel('Cómo viene cada una').selectOption('Bandeja');
  await alta.getByLabel('Qué trae cada una').fill('200');
  await alta.getByRole('button', { name: 'Guardar el producto' }).click();
  await expect(alta).toBeHidden();

  // De vuelta, con el producto elegido y en gramos, que es como se cocina.
  const unidad = editor.getByRole('combobox', { name: 'Unidad de Albahaca de bandeja' });
  await expect(unidad).toHaveValue('g');
  await expect(unidad.locator('option')).toHaveText(['g', 'kg', 'ud']);
  await editor.getByRole('textbox', { name: 'Cantidad de Albahaca de bandeja' }).fill('50');
  await editor.getByRole('button', { name: 'Guardar' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Pasta al pesto' }).getByText('50 g'),
  ).toBeVisible();
});
