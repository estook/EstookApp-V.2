import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { entrarEnLaApp, irA } from './en-la-app.ts';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * El pago con Stripe (entrega E2 · decisión 0048), desde la pantalla.
 *
 * Con el Stripe de mentira de la API de pruebas: su página de pago es una dirección
 * de la propia API, abrirla es pagar, y vuelve a la app como vuelve Stripe, con
 * `?pago=hecho&sesion=…`. Su aviso entra firmado por la misma puerta que el de verdad.
 *
 *   · sin pago no hay app: se elige plan, se paga y se entra al alta
 *   · Ajustes → Suscripción: el plan, la renovación, cancelar y seguir
 *   · un cobro que falla: el aviso de arriba con los días que quedan
 *   · las cuentas de la casa lo dicen, y el admin ve quién ha pagado
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';
const ELENA = 'elena@ejemplo.estook.com';

function unico(info: { project: { name: string } }): string {
  return `${info.project.name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Una cuenta nueva de verdad, con su código por correo. Acaba en Elegir plan. */
async function cuentaNueva(
  page: Page,
  request: APIRequestContext,
  correo: string,
  negocio: string,
) {
  await abrirSinQueSeCaiga(page, APP);
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  });
  await abrirSinQueSeCaiga(page, `${APP}#/crear-cuenta`);
  await page.getByLabel('Tu nombre').fill('Lucía');
  await page.getByLabel('El nombre de tu negocio').fill(negocio);
  await page.getByRole('textbox', { name: /Tu correo/ }).fill(correo);
  await page.getByLabel('Una contraseña').fill('una frase que recuerdo');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mira tu correo' })).toBeVisible();

  const mandado = await request.get(
    `${API}/pruebas/ultimo-correo?para=${encodeURIComponent(correo)}`,
  );
  const { asunto } = (await mandado.json()) as { asunto: string };
  await page.getByLabel('El código').fill(/\b(\d{6})\b/.exec(asunto)?.[1] ?? '');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Elige tu plan|Empieza tus \d+ días gratis/,
  );
}

/** Elegir Esencial y pagar en la página de Stripe (la de mentira paga al abrirla). */
async function pagarEsencial(page: Page) {
  await page.getByRole('button', { name: /^(Elegir|Probar) Esencial/ }).click();
  // De vuelta en la app, con el pago confirmado: al alta, y la dirección limpia.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /¿Cómo te llamas\?|¿Qué tipo de local tienes\?|¿Dónde está tu local\?/,
    { timeout: 20_000 },
  );
  await expect(page).not.toHaveURL(/pago=/);
}

/** El alta, terminada de golpe: lo que se prueba aquí es el pago, no las ocho preguntas. */
async function sinElAlta(page: Page) {
  const token = await page.evaluate(() => window.localStorage.getItem('estook.sesion'));
  const respuesta = await page.request.post(`${API}/v1/comandos/terminar_el_alta`, {
    headers: {
      authorization: `Bearer ${token ?? ''}`,
      'x-idempotencia': `alta-${String(Date.now())}-${String(Math.random())}`,
    },
    data: {},
  });
  expect(respuesta.ok(), await respuesta.text()).toBe(true);
  await recargarSinQueSeCaiga(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
}

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
  await cuentaNueva(page, request, `ajustes-${unico(info)}@correo-de-prueba.com`, 'Bar De Ajustes');
  await pagarEsencial(page);
  await sinElAlta(page);

  await irA(page, 'ajustes/suscripcion');
  const tarjeta = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Tu suscripción' }) })
    .last();
  await expect(tarjeta).toContainText('Esencial · mensual');
  await expect(tarjeta).toContainText('49,00 €');
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
  await expect(deNuevo).toContainText('79,00 €');
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

test('el admin ve las cuentas y quién ha pagado', async ({ page }) => {
  await entrarEnElAdmin(page);
  await page.getByRole('button', { name: 'Cuentas', exact: true }).click();
  const cuentas = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Cuentas' }) });
  await expect(cuentas).toContainText(/cuentas? pagan?/);
  // Las cuentas nuevas de estas pruebas están ahí, cada una con cómo está.
  await expect(cuentas.getByText(/Al día|En prueba|Sin pagar|Cobro fallido/).first()).toBeVisible();
});
