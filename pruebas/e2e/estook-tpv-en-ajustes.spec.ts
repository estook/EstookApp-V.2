import { expect, test } from '@playwright/test';
import { entrarEnLaApp, irA } from './en-la-app.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';

/**
 * **El botón de Estook TPV en Ajustes** (decisión 0120; la maqueta del 28-oct), desde la
 * pantalla:
 *
 *   · con Pro (aquí, la cuenta de ejemplo, que lo tiene todo): en el ordenador abre su hoja,
 *     con «Abrir Estook TPV» y «Descargar para Windows»; en el móvil lleva directo a /tpv/
 *   · con Esencial: «PRO», y al tocarlo vende Estook TPV, dice el precio y lleva a cambiar
 *     de plan
 */
const ROSA = 'rosa@ejemplo.estook.com';

test('con Pro, el botón lleva a Estook TPV y a la caja para Windows', async ({ page }, info) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'ajustes');

  if (info.project.name.startsWith('movil')) {
    const enlace = page.getByRole('link', { name: /Estook TPV/ });
    await expect(enlace).toHaveAttribute('href', /\/tpv\/$/);
    return;
  }

  await page.getByRole('button', { name: /Estook TPV/ }).click();
  const hoja = page.getByRole('dialog', { name: 'Estook TPV' });
  await expect(hoja.getByRole('link', { name: /Abrir Estook TPV/ })).toHaveAttribute(
    'href',
    /\/tpv\/$/,
  );
  await expect(hoja.getByRole('link', { name: /Descargar para Windows/ })).toHaveAttribute(
    'href',
    /Estook-TPV-caja-para-Windows\.exe$/,
  );
});

test('con Esencial, sale con «PRO» y vende Estook TPV', async ({ page, request }, info) => {
  await cuentaNueva(page, request, `tpv-${unico(info)}@correo-de-prueba.com`, 'Bar Sin TPV');
  await pagarEsencial(page);
  await sinElAlta(page);
  await irA(page, 'ajustes');

  const boton = page.getByRole('button', { name: /Estook TPV.*PRO/ });
  await expect(boton).toBeVisible();
  await boton.click();

  const hoja = page.getByRole('dialog', { name: 'Actualiza a Pro para cobrar con nuestro TPV' });
  await expect(hoja).toContainText('Lo vendido baja solo del almacén');
  await expect(hoja).toContainText('99,00 €');
  // Hasta que exista la web de Estook TPV, a estook.com (0120).
  await expect(hoja.getByRole('link', { name: /Aprende más sobre Estook TPV/ })).toHaveAttribute(
    'href',
    'https://estook.com/',
  );
  await hoja.getByRole('button', { name: 'Pasar a Pro' }).click();
  await expect(page).toHaveURL(/ajustes\/suscripcion/);
});
