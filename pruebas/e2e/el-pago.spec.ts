import { expect, test } from '@playwright/test';
import { recargarSinQueSeCaiga } from './abrir.ts';
import { entrarEnLaApp, irA } from './en-la-app.ts';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';

/**
 * El pago con Stripe (entrega E2 · decisión 0048), desde la pantalla.
 *
 * Con el Stripe de mentira de la API de pruebas: su página de pago es una dirección
 * de la propia API, abrirla es pagar, y vuelve a la app como vuelve Stripe, con
 * `?pago=hecho&sesion=…`. Su aviso entra firmado por la misma puerta que el de verdad.
 *
 *   · sin pago no hay app: se elige plan, se paga y se entra al alta
 *   · Ajustes → Suscripción: el plan, la renovación, cancelar y seguir, y la Pausa (0135)
 *   · un cobro que falla: el aviso de arriba con los días que quedan
 *   · las cuentas de la casa lo dicen, y el admin ve quién ha pagado (en Clientes, desde A2)
 */
const API = 'http://localhost:5177/api';
const ELENA = 'elena@ejemplo.estook.com';

test('sin pago no hay app: se elige plan, se paga y se entra al alta', async ({
  page,
  request,
}, info) => {
  await cuentaNueva(page, request, `paga-${unico(info)}@correo-de-prueba.com`, 'Bar Que Paga');

  // Lo legal está, plegado: la renovación y cómo cancelar.
  await page.getByText('Cómo funciona el pago').click();
  await expect(page.getByText(/se renueva\s+sola/)).toBeVisible();

  await pagarEsencial(page);
});

test('Ajustes → Suscripción: el plan, la renovación, cancelar y seguir', async ({
  page,
  request,
}, info) => {
  const correo = `ajustes-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(page, request, correo, 'Bar De Ajustes');
  await pagarEsencial(page);
  await sinElAlta(page);
  // Cobrada ya, sin prueba: la Pausa no se ofrece en la prueba (0135).
  const cobro = await request.post(
    `${API}/pruebas/stripe/cobrar?correo=${encodeURIComponent(correo)}`,
  );
  expect(cobro.ok()).toBe(true);

  await irA(page, 'ajustes/suscripcion');
  const tarjeta = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Tu suscripción' }) })
    .last();
  await expect(tarjeta).toContainText('Esencial · mensual');
  await expect(tarjeta).toContainText('39,00 € + IVA al mes');
  await expect(tarjeta).toContainText(/Se renueva el|Tu prueba acaba el/);
  await expect(tarjeta).toContainText('Visa ···· 4242');

  await tarjeta.getByRole('button', { name: 'Cancelar la suscripción' }).click();
  await tarjeta.getByRole('button', { name: 'Sí, cancelar' }).click();
  await expect(tarjeta.getByText('Cancelada')).toBeVisible();
  await expect(tarjeta).toContainText(/Se cancela el|no se cobrará nada/);

  await tarjeta.getByRole('button', { name: 'Seguir con la suscripción' }).click();
  await expect(tarjeta.getByRole('button', { name: 'Cancelar la suscripción' })).toBeVisible();

  // La tarjeta y las facturas, en el portal de Stripe; vuelve aquí.
  // Se espera a que el portal conteste y la app vuelva a cargar: la dirección de vuelta
  // es la misma que la de ahora, así que mirar la dirección no espera a nada.
  const delPortal = page.waitForResponse((r) => r.url().includes('/pruebas/stripe/portal'));
  await tarjeta.getByRole('button', { name: 'Tarjeta y facturas' }).click();
  await delPortal;
  await page.waitForLoadState('load');
  await expect(page).toHaveURL(/#\/ajustes\/suscripcion/);
  await expect(page.getByRole('heading', { name: 'Tu suscripción' })).toBeVisible();

  // Y cambiar de plan: a Pro, que con un local es Pro.
  const deNuevo = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Tu suscripción' }) })
    .last();
  await deNuevo.getByRole('button', { name: 'Cambiar de plan' }).click();
  await deNuevo
    .getByRole('listitem')
    .filter({ hasText: 'Pro' })
    .getByRole('button', { name: 'Cambiar' })
    .click();
  await expect(deNuevo).toContainText('Pro · mensual');
  await expect(deNuevo).toContainText('99,00 € + IVA');

  // La Pausa (0135): al instante, en solo lectura, y se vuelve cuando se quiere.
  await deNuevo.getByRole('button', { name: 'Cambiar de plan' }).click();
  await deNuevo
    .getByRole('listitem')
    .filter({ hasText: 'Pausa' })
    .getByRole('button', { name: 'Pausar' })
    .click();
  await expect(deNuevo.getByText('¿Pausar tu cuenta?')).toBeVisible();
  await expect(deNuevo).toContainText('9,00 € + IVA al mes');
  await deNuevo.getByRole('button', { name: 'Sí, pausar' }).click();
  await expect(deNuevo.getByText(/^En Pausa desde el/)).toBeVisible();
  await expect(deNuevo).toContainText('Pausa · mensual');
  await expect(deNuevo.getByRole('button', { name: 'Pagar ahora' })).toHaveCount(0);

  await deNuevo.getByRole('button', { name: 'Volver a Pro' }).click();
  await expect(deNuevo).toContainText('Pro · mensual');
  await expect(deNuevo.getByText(/^En Pausa desde el/)).toHaveCount(0);

  // Una al año: la segunda, con la fecha y sin botón.
  await deNuevo.getByRole('button', { name: 'Cambiar de plan' }).click();
  const laPausa = deNuevo.getByRole('listitem').filter({ hasText: 'Pausa' });
  await expect(laPausa).toContainText('La Pausa se puede una vez al año');
  await expect(laPausa.getByRole('button', { name: 'Pausar' })).toBeDisabled();
});

test('un cobro que falla: arriba, los días que quedan y que no se pierde nada', async ({
  page,
  request,
}, info) => {
  const correo = `impago-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(page, request, correo, 'Bar Del Impago');
  await pagarEsencial(page);
  await sinElAlta(page);

  const fallo = await request.post(
    `${API}/pruebas/stripe/fallar?correo=${encodeURIComponent(correo)}`,
  );
  expect(fallo.ok()).toBe(true);
  await recargarSinQueSeCaiga(page);

  const aviso = page.getByText(/No hemos podido cobrar la suscripción · quedan 7 días/);
  await expect(aviso).toBeVisible();
  await expect(page.getByText(/No se pierde nada/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Pagar ahora' }).first().click();
  await expect(page).toHaveURL(/#\/ajustes\/suscripcion/);

  // Y cobrar lo arregla: el aviso se va.
  const cobro = await request.post(
    `${API}/pruebas/stripe/cobrar?correo=${encodeURIComponent(correo)}`,
  );
  expect(cobro.ok()).toBe(true);
  await irA(page, '');
  await expect(aviso).toHaveCount(0);
});

test('una cuenta de la casa lo dice en Ajustes, y no se cobra', async ({ page }) => {
  await entrarEnLaApp(page, ELENA);
  await irA(page, 'ajustes/suscripcion');
  await expect(
    page.getByText('Esta cuenta es de la casa: no se cobra, y tiene todo abierto.'),
  ).toBeVisible();
});

test('el admin ve quién ha pagado, arriba de Clientes', async ({ page }) => {
  await entrarEnElAdmin(page);
  // Lo que era la pestaña Cuentas vive ahora encima de la lista de clientes (A2).
  await expect(page.getByText(/pagan? · .* al mes/)).toBeVisible();
  await expect(
    page
      .getByText(/Al día|Prueba|Sin pagar|Cobro fallido/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});
