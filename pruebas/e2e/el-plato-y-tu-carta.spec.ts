import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { APP, entrarEnLaApp } from './en-la-app.ts';

/**
 * M9 · 1 · El plato y tu carta (decisión 0086), en la pantalla.
 *
 * «Primero la carta»: se monta de cero, de golpe, se ordena en secciones, se activa
 * Uber Eats y se pone a mano el precio de un plato allí, y el historial lo cuenta. Con
 * una cuenta nueva, que es quien la monta, y sin que otra prueba la toque.
 */
test('se monta la carta de cero, con su sección, Uber Eats y el historial', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `carta-${unico(info)}@correo-de-prueba.com`, 'Bar Carta');
  await pagarEsencial(page);
  await sinElAlta(page);

  // Vacía, lo dice y ofrece empezar.
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta`);
  await expect(page.getByText('Tu carta, aquí')).toBeVisible();
  // Como llega desde el «+»: la orden en la dirección, con la carta todavía cargando.
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/por-secciones?hacer=nuevo`);

  // De golpe, fila a fila: siempre queda una libre al final.
  const hoja = page.getByRole('dialog', { name: 'Añadir platos' });
  await hoja.getByLabel('Plato 1').fill('Croquetas de jamón');
  await hoja.getByRole('textbox', { name: 'Precio' }).nth(0).fill('9,50');
  await hoja.getByLabel('Plato 2').fill('Patatas bravas');
  await hoja.getByRole('textbox', { name: 'Precio' }).nth(1).fill('6,50');
  await expect(hoja.getByLabel('Plato 4')).toHaveCount(0);
  await hoja.getByLabel('Plato 3').fill('Ensaladilla rusa');
  await expect(hoja.getByLabel('Plato 4')).toBeVisible();
  await hoja.getByRole('button', { name: 'Añadir 3 platos' }).click();
  await expect(hoja).toHaveCount(0);

  // Sin sección todavía; se crea una y se coloca el plato.
  const sinSeccion = page.getByRole('list', { name: 'Sin sección' });
  await expect(sinSeccion.getByText('Croquetas de jamón')).toBeVisible();
  await page.getByRole('button', { name: 'Nueva sección' }).click();
  const seccion = page.getByRole('dialog', { name: 'Nueva sección' });
  await seccion.getByLabel('Nombre de la sección').fill('Entrantes');
  await seccion.getByRole('button', { name: 'Crear la sección' }).click();
  await expect(seccion).toHaveCount(0);

  await sinSeccion.getByRole('button', { name: /Croquetas de jamón/ }).click();
  const ficha = page.getByRole('dialog', { name: 'Croquetas de jamón' });
  await ficha.getByLabel('Sección').selectOption({ label: 'Entrantes' });
  await ficha.getByRole('button', { name: 'Guardar' }).click();
  await expect(ficha.getByText('Guardado')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('list', { name: 'Entrantes' }).getByText('Croquetas de jamón'),
  ).toBeVisible();

  // Uber Eats, en Canales: se activa con la comisión de siempre.
  await abrirSinQueSeCaiga(page, `${APP}#/carta/canales`);
  await expect(page.getByText('Próximamente').first()).toBeVisible();
  // Se pulsa su rótulo: la casilla de verdad está escondida a propósito.
  await page.getByRole('switch', { name: 'Uber Eats, activo' }).locator('xpath=..').click();
  await expect(page.getByText('Activo · se lleva el 30 %')).toBeVisible();

  // Y el precio del plato allí, a mano; sin él decía «igual que sala».
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta`);
  await page
    .getByRole('list', { name: 'Entrantes' })
    .getByRole('button', { name: /Croquetas de jamón/ })
    .click();
  await expect(ficha.getByText(/Igual que sala \(9,50 €\)/)).toBeVisible();
  await ficha.getByRole('textbox', { name: 'Uber Eats' }).fill('12,50');
  await expect(ficha.getByText('Uber Eats se lleva 3,75 €: te quedan 8,75 €')).toBeVisible();
  await ficha.getByRole('button', { name: 'Guardar' }).click();
  await expect(ficha.getByText('Guardado')).toBeVisible();

  // El historial dice quién cambió qué precio.
  await ficha.getByText('Historial', { exact: true }).click();
  await expect(
    ficha
      .getByRole('list', { name: 'Historial del plato' })
      .getByText('Uber Eats: igual que sala → 12,50 €'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Uber Eats 12,50 €')).toBeVisible();

  // Y el buscador lo encuentra y abre su ficha.
  await page
    .getByRole('button', { name: /Buscar/ })
    .first()
    .click();
  const buscador = page.getByRole('dialog', { name: 'Buscar en todo' });
  await buscador.getByRole('searchbox').fill('croque');
  await buscador.getByRole('button', { name: /Croquetas de jamón/ }).click();
  await expect(page.getByRole('dialog', { name: 'Croquetas de jamón' })).toBeVisible();
});

test('la camarera ve la carta, pero no la monta', async ({ page }) => {
  await entrarEnLaApp(page, 'sara@ejemplo.estook.com');
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta`);
  await expect(page.getByRole('heading', { level: 1, name: 'Carta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir platos' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nueva sección' })).toHaveCount(0);
});
