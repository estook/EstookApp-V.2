import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { APP } from './en-la-app.ts';

/**
 * M10 · 2 · Los menús (decisiones 0103 y 0104), en la pantalla y con una cuenta nueva:
 *
 *   · «¿Tu local sirve menús?» la primera vez; con «Sí», nace el menú del día
 *   · añadir un plato nuevo (solo del menú) y otro de la carta, con su suplemento
 *   · el precio en Ajustes, y lo que deja: sin escandallos, dice cuáles faltan y lleva a
 *     Escandallos › Menús, donde salen para desgranarlos
 *   · un día sin tocar repite el anterior
 *   · descargar el cartel en A3
 *   · apagarlo en Ajustes › Tu local esconde la pestaña
 *
 * Se trabaja **en la semana siguiente**: un sábado o un domingo la semana ya ha pasado y
 * no se toca, y la prueba haría otra cosa según el día en que corra.
 */
test('el menú del día: montarlo, lo que deja, descargarlo y apagarlo', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `m10-2-${unico(info)}@correo-de-prueba.com`, 'Bar Menú');
  await pagarEsencial(page);
  await sinElAlta(page);

  // Un plato en la carta, para traerlo al menú.
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/por-secciones?hacer=nuevo`);
  const anadirALaCarta = page.getByRole('dialog', { name: 'Añadir platos' });
  await anadirALaCarta.getByLabel('Plato 1').fill('Pollo asado');
  await anadirALaCarta.getByRole('textbox', { name: 'Precio' }).first().fill('12,00');
  await anadirALaCarta.getByRole('button', { name: 'Añadir el plato' }).click();
  await expect(anadirALaCarta).toHaveCount(0);

  // ── La primera vez, la pregunta ──
  await abrirSinQueSeCaiga(page, `${APP}#/carta/menus`);
  await expect(page.getByText('¿Tu local sirve menús?')).toBeVisible();
  await page.getByRole('button', { name: 'Sí, sirvo menús' }).click();
  await expect(page.getByRole('heading', { name: 'Menú del día' })).toBeVisible();

  // La semana siguiente: el lunes se abre solo.
  await page.getByRole('button', { name: 'La semana siguiente' }).click();
  const lunes = page.getByRole('tab', { name: /^Lunes/ });
  await expect(lunes).toHaveAttribute('aria-selected', 'true');

  // ── Un plato nuevo, solo del menú ──
  await page.getByRole('button', { name: 'Añadir plato a Primeros' }).click();
  let hoja = page.getByRole('dialog', { name: /Añadir a Primeros/ });
  await hoja.getByRole('tab', { name: 'Plato nuevo' }).click();
  await hoja.getByLabel('El plato').fill('Lentejas estofadas');
  await hoja.getByRole('button', { name: 'Añadir', exact: true }).click();
  await expect(hoja).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Lentejas estofadas/ })).toBeVisible();
  await expect(page.getByText('Solo del menú')).toBeVisible();

  // ── Uno de la carta, en un toque ──
  await page.getByRole('button', { name: 'Añadir plato a Segundos' }).click();
  hoja = page.getByRole('dialog', { name: /Añadir a Segundos/ });
  await hoja.getByRole('button', { name: 'Poner Pollo asado' }).click();
  await expect(hoja).toHaveCount(0);

  // Su suplemento, tocándolo.
  await page.getByRole('button', { name: /Pollo asado/ }).click();
  hoja = page.getByRole('dialog', { name: 'Pollo asado' });
  await hoja.getByLabel('Suplemento').fill('2,00');
  await hoja.getByRole('button', { name: 'Guardar' }).click();
  await expect(hoja).toHaveCount(0);
  await expect(page.getByText('+2,00 €')).toBeVisible();

  // ── El precio, y lo que deja ──
  await page.getByRole('button', { name: /^Ajustes: precio/ }).click();
  hoja = page.getByRole('dialog', { name: /Ajustes · Menú del día/ });
  await hoja.getByLabel('Precio, con IVA').fill('13,50');
  await hoja.getByRole('button', { name: 'Guardar' }).click();
  await expect(hoja).toHaveCount(0);
  await expect(page.getByText('13,50 €').first()).toBeVisible();
  await expect(page.getByText('Para saber lo que te deja, falta desgranar')).toBeVisible();

  // ── Un día sin tocar repite el anterior ──
  await page.getByRole('tab', { name: /^Martes/ }).click();
  await expect(page.getByText(/Repite el lunes/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Lentejas estofadas/ })).toBeVisible();

  // ── Descargar: el cartel en A3 ──
  await page.getByRole('button', { name: 'Descargar' }).click();
  hoja = page.getByRole('dialog', { name: /Descargar/ });
  await expect(hoja.getByText(/Imprímelo en A3/)).toBeVisible();
  await hoja.getByRole('button', { name: 'Cartel en A3' }).click();
  await expect(hoja.getByText(/Descargado: cartel-menu-del-dia-/)).toBeVisible();
  await page.keyboard.press('Escape');

  // ── Escandallos › Menús: lo que falta por desgranar ──
  await abrirSinQueSeCaiga(page, `${APP}#/escandallos/escandallos/menus`);
  const delMenu = page.getByRole('list', { name: 'Menú del día' });
  await expect(delMenu.getByText('Lentejas estofadas')).toBeVisible();
  await expect(delMenu.getByText('Sin escandallo').first()).toBeVisible();

  // ── Apagarlo en Ajustes › Tu local: la pestaña se va ──
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/local#tu-carta`);
  const interruptor = page.getByRole('switch', { name: 'Tu local sirve menús' });
  await expect(interruptor).toBeChecked();
  // Se pulsa el rótulo: la casilla de verdad está escondida a propósito.
  await page.getByText('Tu local sirve menús', { exact: true }).click();
  await expect(interruptor).not.toBeChecked();
  await abrirSinQueSeCaiga(page, `${APP}#/carta/carta/por-secciones`);
  await expect(page.getByRole('navigation', { name: 'Carta' }).getByText('Menús')).toHaveCount(0);
});
