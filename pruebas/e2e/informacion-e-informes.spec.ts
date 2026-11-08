import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { APP, entrarEnLaApp } from './en-la-app.ts';

/**
 * **Información e Informes** (la pausa del 8-nov, P2, decisión 0142), en la pantalla:
 *
 *   · Servicio entra en Jornadas › Información, con el periodo y sus flechas
 *   · la dirección de «En marcha» lleva a Información
 *   · Negocio › Informes trae cuándo se vende, la cocina, lo que se tuerce y las semanas
 *
 * Cómo cuenta cada cifra lo prueba `lo-que-se-vende.prueba.ts` contra la base.
 */
const ROSA = 'rosa@ejemplo.estook.com';

test('Información: el periodo con sus flechas, y «En marcha» lleva aquí', async ({
  page,
}, info) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/servicio/jornada/en-marcha`);
  await expect(page).toHaveURL(/#\/servicio\/jornada\/informacion/);
  const periodo = page.getByRole('radiogroup', { name: 'Qué periodo' });
  await expect(periodo).toBeVisible({ timeout: 15_000 });
  await expect(periodo.getByRole('radio', { name: 'Día' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Hoy', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('informacion-hoy.png'), fullPage: true });

  // La semana: el título cambia, y la flecha de la derecha no lleva al futuro.
  await periodo.getByRole('radio', { name: 'Semana' }).click();
  await expect(page.getByText(/^Del \d+/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'El periodo siguiente' })).toBeDisabled();
  await page.getByRole('button', { name: 'El periodo anterior' }).click();
  await expect(page.getByRole('button', { name: 'El periodo siguiente' })).toBeEnabled();
  await page.screenshot({ path: info.outputPath('informacion-semana.png'), fullPage: true });
});

test('Informes: cuándo se vende, la cocina, lo que se tuerce y las semanas', async ({
  page,
}, info) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/negocio/informes/semana`);
  // Los locales de ejemplo no tienen mesas de Estook TPV: una tarjeta lo dice, y las semanas.
  for (const titulo of [/^Cuándo se vende/, /^Las semanas$/]) {
    await expect(page.getByText(titulo).first()).toBeVisible({ timeout: 15_000 });
  }
  await page.screenshot({ path: info.outputPath('informes-semana.png'), fullPage: true });
});
