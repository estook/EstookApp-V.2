import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { APP, entrarEnLaApp } from './en-la-app.ts';

/**
 * **Servicio › Empleados** (la pausa del 8-nov, P3, decisión 0142), en la pantalla:
 *
 *   · está entre Jornadas y Ventas, por semanas o meses
 *   · los objetivos, aparte, en su botón: para todos y por empleado, en € a la semana o al mes
 *     (0143), y si cada uno ve el suyo
 *
 * Cómo se cuenta lo de cada uno, y quién ve qué, lo prueba `los-empleados.prueba.ts`.
 */
test('Empleados: la semana, y los objetivos en su hoja', async ({ page }) => {
  await entrarEnLaApp(page, 'rosa@ejemplo.estook.com');
  await abrirSinQueSeCaiga(page, `${APP}#/servicio/empleados`);
  const periodo = page.getByRole('radiogroup', { name: 'Qué periodo' });
  await expect(periodo).toBeVisible({ timeout: 15_000 });
  await expect(periodo.getByRole('radio', { name: 'Semana' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(periodo.getByRole('radio', { name: 'Día' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Objetivos', exact: true }).click();
  const hoja = page.getByRole('dialog', { name: 'Objetivos' });
  await expect(hoja.getByRole('radio', { name: 'Para todos' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // **En € al mes** (0143): una cifra y su periodo, y lo otro de orientación.
  await hoja
    .getByRole('radiogroup', { name: 'De qué periodo' })
    .getByRole('radio', { name: 'Mes' })
    .click();
  await hoja.getByLabel(/Lo que debería vender cada uno al mes/).fill('4.000');
  await expect(hoja.getByText(/^Unos .* a la semana\.$/)).toBeVisible();
  await hoja.getByRole('radio', { name: 'Por empleado' }).click();
  await hoja.getByRole('radio', { name: 'Para todos' }).click();
  await hoja.getByRole('button', { name: 'Guardar' }).click();
  await expect(hoja).toHaveCount(0, { timeout: 15_000 });

  // Al volver a abrirla, se lee lo guardado.
  await page.getByRole('button', { name: 'Objetivos', exact: true }).click();
  await expect(
    hoja.getByRole('radiogroup', { name: 'De qué periodo' }).getByRole('radio', { name: 'Mes' }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(hoja.getByLabel(/Lo que debería vender cada uno al mes/)).toHaveValue('4.000,00');
});
