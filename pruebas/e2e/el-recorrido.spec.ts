import { expect, test } from '@playwright/test';
import { recargarSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';

/**
 * El recorrido de la primera vez (las bases firmes, 0084).
 *
 * «Un recorrido de 30 segundos la primera vez que alguien entra, enseñando el menú, el
 * "+" y el Panel.» Se ofrece con una tarjeta arriba del Panel; empezarlo ilumina cada
 * sitio de verdad; y visto o saltado, **no vuelve**, porque se guarda en la cuenta.
 *
 * Con una cuenta nueva, que es quien lo ve: las personas de ejemplo ya lo han visto
 * (semilla `recorrido-visto.sql`), para que no cambie lo que miran las demás pruebas.
 */
test('quien entra por primera vez puede hacer el recorrido, y no vuelve a salirle', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `recorrido-${unico(info)}@correo-de-prueba.com`, 'Bar Nuevo');
  await pagarEsencial(page);
  await sinElAlta(page);

  const invitacion = page.getByRole('region', { name: 'El recorrido de Estook' });
  await expect(invitacion).toBeVisible();
  await invitacion.getByRole('button', { name: 'Empezar' }).click();

  // Cuatro pasos, cada uno con su sitio iluminado: las apps, el «+», el buscador y el Panel.
  const recorrido = page.getByRole('dialog', { name: 'El recorrido' });
  for (const titulo of [
    'Tus apps',
    'Lo que más haces, a un toque',
    'Busca lo que sea',
    'Tu Panel',
  ]) {
    await expect(recorrido.getByRole('heading', { name: titulo })).toBeVisible();
    if (titulo === 'Tu Panel') {
      // El último: «Listo» lo apunta en la cuenta, y se espera a que conteste.
      const apuntado = page.waitForResponse((r) => r.url().includes('ya_he_visto_el_recorrido'));
      await recorrido.getByRole('button', { name: 'Listo' }).click();
      expect((await apuntado).ok()).toBe(true);
    } else {
      await recorrido.getByRole('button', { name: 'Siguiente' }).click();
    }
  }
  await expect(recorrido).toHaveCount(0);
  await expect(invitacion).toHaveCount(0);

  // Ni al recargar, ni en otro aparato: lo dice la cuenta, no el navegador.
  await page.evaluate(() => {
    window.localStorage.removeItem('estook.recorrido');
  });
  await recargarSinQueSeCaiga(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
  await expect(page.getByRole('region', { name: 'El recorrido de Estook' })).toHaveCount(0);
});

test('«Ya lo conozco» lo quita sin hacerlo', async ({ page, request }, info) => {
  test.slow();
  await cuentaNueva(page, request, `conocido-${unico(info)}@correo-de-prueba.com`, 'Bar Sabido');
  await pagarEsencial(page);
  await sinElAlta(page);

  const invitacion = page.getByRole('region', { name: 'El recorrido de Estook' });
  const apuntado = page.waitForResponse((r) => r.url().includes('ya_he_visto_el_recorrido'));
  await invitacion.getByRole('button', { name: 'Ya lo conozco' }).click();
  expect((await apuntado).ok()).toBe(true);
  await expect(invitacion).toHaveCount(0);

  await page.evaluate(() => {
    window.localStorage.removeItem('estook.recorrido');
  });
  await recargarSinQueSeCaiga(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
  await expect(page.getByRole('region', { name: 'El recorrido de Estook' })).toHaveCount(0);
});
