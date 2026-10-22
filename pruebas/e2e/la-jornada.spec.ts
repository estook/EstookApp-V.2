import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { APP } from './en-la-app.ts';

/**
 * M16a · La jornada (decisión 0105), en la pantalla y con una cuenta nueva:
 *
 *   · Servicio entra por «En marcha»: el día abierto solo, con lo que le queda
 *   · «Cerrar el día» lleva al cierre, en tres pasos: las ventas, las mermas y el repaso
 *   · cerrado, ya no se corrige sin más: «Reabrir» pide el motivo, y se ve
 *   · cerrarlo otra vez lo deja cerrado, con la reapertura a la vista
 */
test('el día: en marcha, cerrarlo en tres pasos, reabrirlo con motivo y volver a cerrarlo', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `m16a-${unico(info)}@correo-de-prueba.com`, 'Bar Jornada');
  await pagarEsencial(page);
  await sinElAlta(page);

  // ── En marcha ──
  await abrirSinQueSeCaiga(page, `${APP}#/servicio/jornada`);
  await expect(page.getByText(/^La jornada · /)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Abierta', { exact: true })).toBeVisible();
  await expect(page.getByText(/Se abrió sola a las/)).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar el día' }).click();

  // ── Cerrar en tres pasos ──
  await expect(page).toHaveURL(/#\/servicio\/jornada\/cierre/);
  await page.getByLabel('Total facturado').fill('500');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText('Hoy no se ha apuntado ninguna merma.')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText(/Queda a tu nombre/)).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar el día' }).click();
  await expect(page.getByText(/^Día cerrado · /)).toBeVisible({ timeout: 15_000 });

  // ── Reabrir, con su motivo ──
  await page.getByRole('button', { name: 'Reabrir' }).click();
  const reabrir = page.getByRole('button', { name: 'Reabrir el día' });
  await expect(reabrir).toBeDisabled();
  await page.getByLabel('¿Por qué lo reabres?').fill('Faltaba una mesa de 40 €');
  await reabrir.click();
  await expect(page.getByText(/^Reabierto · /)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/«Faltaba una mesa de 40 €»/)).toBeVisible();
  await expect(page.getByLabel('Total facturado')).toHaveValue(/500/);

  // ── Y cerrarlo otra vez ──
  await page.getByLabel('Total facturado').fill('540');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Cerrar el día' }).click();
  await expect(page.getByText(/^Día cerrado · /)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Reabierto por .*«Faltaba una mesa de 40 €»/)).toBeVisible();

  // ── En marcha lo dice ──
  await abrirSinQueSeCaiga(page, `${APP}#/servicio/jornada/en-marcha`);
  await expect(page.getByText(/^Cerrada a las/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Ver el cierre' })).toBeVisible();
});
