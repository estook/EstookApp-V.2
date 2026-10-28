import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';

/**
 * Una cuenta nueva de verdad, de principio a fin: crearla con su código por correo,
 * pagar con el Stripe de mentira y saltarse el alta. La usan la prueba del pago y la
 * del recorrido de la primera vez (0084), que necesita a alguien que no lo haya visto.
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';

export function unico(info: { project: { name: string } }): string {
  return `${info.project.name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Una cuenta nueva de verdad, con su código por correo. Acaba en Elegir plan. */
export async function cuentaNueva(
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
export async function pagarEsencial(page: Page) {
  await pagarElPlan(page, 'Esencial');
}

/** Pro, que es el que lleva Estook TPV (0120): sin él, el local no vincula ni un aparato. */
export async function pagarPro(page: Page) {
  await pagarElPlan(page, 'Pro');
}

async function pagarElPlan(page: Page, plan: 'Esencial' | 'Pro') {
  const boton = plan === 'Pro' ? /^(Elegir|Probar) Pro\b/ : /^(Elegir|Probar) Esencial/;
  await page.getByRole('button', { name: boton }).click();
  // De vuelta en la app, con el pago confirmado: al alta, y la dirección limpia.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /¿Cómo te llamas\?|¿Qué tipo de local tienes\?|¿Dónde está tu local\?/,
    { timeout: 20_000 },
  );
  await expect(page).not.toHaveURL(/pago=/);
}

/** El alta, terminada de golpe: lo que se prueba aquí es el pago, no las ocho preguntas. */
export async function sinElAlta(page: Page) {
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
