import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { APP, ejecutarEnLaApi, entrarEnLaApp } from './en-la-app.ts';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * **T6 · 2 · 1 · El motor y el ticket**, desde la pantalla (decisión 0136; maqueta de T6,
 * secciones 1, 3 y 4). Con el Verifacti de mentira de la API de pruebas, que registra lo que
 * se le manda y contesta con su QR.
 *
 *   · Bar Faro, con la empresa de pruebas de Verifacti que pone el admin y sus series
 *   · Ajustes › Facturación › «Imprimir un ticket de prueba»: sale con su número
 *   · Servicio › Ventas › Tickets y facturas: el ticket con su chapa; al tocarlo, el papel
 *     como salió, con su QR, y su historia
 *
 * **Bar Faro no lo usa ninguna otra prueba**, y esta corre en el escritorio: la empresa de
 * pruebas es una por local.
 */

test('el ticket de prueba sale con su número, y en Tickets y facturas con su QR y su historia', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'escritorio', 'Bar Faro es uno: se prueba en el escritorio');
  test.setTimeout(90_000);

  // El admin le pone la empresa de pruebas de Verifacti, si no la tiene ya.
  await entrarEnElAdmin(page);
  await page.getByRole('button', { name: 'Facturación', exact: true }).click();
  const enQueLocal = page.getByLabel('En qué local');
  const faro = await enQueLocal.locator('option', { hasText: 'Bar Faro' }).getAttribute('value');
  expect(faro).not.toBeNull();
  await enQueLocal.selectOption(faro ?? '');
  const quitar = page.getByRole('button', { name: 'Quitarla de ese local' });
  if (!(await quitar.isVisible())) {
    await page.getByRole('button', { name: 'Ponerla en ese local' }).click();
    await expect(quitar).toBeVisible();
  }

  // Elena, la dirección, en Bar Faro, con sus series puestas.
  await entrarEnLaApp(page, 'elena@ejemplo.estook.com');
  const token = await page.evaluate(() => window.localStorage.getItem('estook.sesion'));
  await ejecutarEnLaApi(page.request, token ?? '', 'cambiar_de_contexto', { local_id: faro });
  await ejecutarEnLaApi(page.request, token ?? '', 'poner_las_series', {
    ticket: 'T-BF',
    factura: 'F-BF',
    rectificativa: 'R-BF',
    otro_programa: false,
  });
  await recargarSinQueSeCaiga(page);

  // Ajustes › Facturación › Probar el papel.
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/facturacion`);
  const probar = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Probar el papel' }) })
    .last();
  await expect(probar).toContainText('PRUEBA · SIN VALIDEZ');
  await probar.getByRole('button', { name: 'Imprimir un ticket de prueba' }).click();
  await expect(probar.getByText(/Hecho: T-BF-\d{4}-\d{6}/)).toBeVisible();
  const numero = (await probar.locator('strong').first().textContent()) ?? '';

  // Servicio › Ventas › Tickets y facturas.
  await probar.getByRole('link', { name: 'Verlo en Tickets y facturas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ventas' })).toBeVisible();
  const fila = page.getByRole('row').filter({ hasText: numero });
  await expect(fila).toContainText('Ticket');
  await expect(fila).toContainText('2,70 €');
  await expect(fila).toContainText('En Hacienda');
  await fila.click();

  const hoja = page.getByRole('dialog', { name: 'El documento' });
  await expect(hoja.getByRole('img', { name: 'QR tributario' })).toBeVisible();
  await expect(hoja).toContainText('QR tributario:');
  await expect(hoja).toContainText('VERI*FACTU');
  await expect(hoja).toContainText('Factura simplificada');
  await expect(hoja).toContainText('Preparado con su número');
  await expect(hoja).toContainText('Registrado, con su QR');
});

test('quien no lleva la facturación no ve Tickets y facturas', async ({ page }) => {
  await entrarEnLaApp(page, 'sara@ejemplo.estook.com');
  await abrirSinQueSeCaiga(page, `${APP}#/servicio`);
  await expect(page.getByRole('link', { name: 'Ventas', exact: true })).toHaveCount(0);
});
