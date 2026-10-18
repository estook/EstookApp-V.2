import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, APP, ejecutarEnLaApi } from './en-la-app.ts';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * Fogón 1 · 1 · la base (decisión 0097), en la pantalla.
 *
 * Con el Fogón de mentira de la API de pruebas, que contesta sin llamar a ningún modelo
 * y no gasta nada: una cuenta nueva con Fogón encendido le pregunta desde la ventana,
 * ve lo que le queda, y desgrana un plato con «Rellenar con Fogón»: las líneas entran
 * como borrador, cada una pregunta cuál de sus productos es, y avisa de que la IA no es
 * precisa. Y el admin tiene su sección con los dos interruptores.
 *
 * Fogón se enciende **solo para la cuenta de la prueba** (`/api/pruebas/fogon`): las
 * demás pruebas, que corren a la vez, lo siguen viendo apagado.
 */

async function elToken(page: Page): Promise<string> {
  return (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';
}

/** El Panel, ya pintado, y Fogón con `Ctrl+J`. */
async function abrirFogon(page: Page) {
  await abrirSinQueSeCaiga(page, `${APP}#/`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  const ventana = page.getByRole('dialog', { name: 'Fogón' });
  // El atajo lo escucha la app cuando ya ha arrancado del todo: se repite hasta que abre.
  await expect(async () => {
    if (!(await ventana.isVisible())) await page.keyboard.press('Control+j');
    await expect(ventana).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  return ventana;
}

/** Se cierra con su botón, como una persona: al volver a abrirla, pregunta otra vez. */
async function cerrarFogon(page: Page) {
  const ventana = page.getByRole('dialog', { name: 'Fogón' });
  await ventana.getByRole('button', { name: 'Cerrar' }).first().click();
  await expect(ventana).toBeHidden();
}

/** Apagado: el general, o el de este cliente (otra prueba puede haber encendido el general). */
const APAGADO = /Fogón (está apagado ahora mismo|todavía no está encendido en tu negocio)/;

test.use({ viewport: { width: 1280, height: 800 } });

test('con Fogón encendido, se le pregunta y rellena el borrador de un escandallo', async ({
  page,
  request,
}, info) => {
  test.slow();
  const correo = `fogon-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(page, request, correo, 'Bar Fogón');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = await elToken(page);
  await ejecutarEnLaApi(request, token, 'crear_producto', {
    nombre: 'Leche entera',
    unidad_de_uso: 'l',
    precio_centimos: 120,
  });
  await ejecutarEnLaApi(request, token, 'crear_platos', {
    seccion_id: null,
    platos: [{ nombre: 'Croquetas de boletus', precio_centimos: 1200 }],
  });

  // Apagado, la ventana lo dice y no hay casilla.
  let ventana = await abrirFogon(page);
  await expect(ventana.getByText(APAGADO)).toBeVisible({ timeout: 15_000 });
  await expect(ventana.getByRole('textbox')).toHaveCount(0);
  await cerrarFogon(page);

  // Encendido para esta cuenta, habla.
  const encendido = await request.get(
    `${API}/pruebas/fogon?encendido=1&correo=${encodeURIComponent(correo)}`,
  );
  expect(encendido.status()).toBe(200);
  // Como quien abre la app después de que la enciendan: la página entera, de nuevo.
  await abrirSinQueSeCaiga(page, `${APP}?otra-vez#/`);
  ventana = await abrirFogon(page);
  // La API de pruebas tiene una sola conexión: con otras pruebas a la vez, tarda.
  await expect(ventana.getByText(/Fogón es una inteligencia artificial/)).toBeVisible({
    timeout: 15_000,
  });
  // Vacío, saluda con lo que se le puede preguntar aquí, y una se manda tocándola.
  await expect(ventana.getByText('Pregunta lo que necesites')).toBeVisible();
  await ventana
    .getByRole('list', { name: 'Puedes preguntarle' })
    .getByRole('button', { name: '¿Qué tengo que atender hoy?' })
    .click();
  await expect(
    ventana.getByText('Esto es Fogón de pruebas: no he llamado a ningún modelo.'),
  ).toBeVisible();
  // Esencial: 300 al mes y 30 al día. Ha gastado uno.
  await expect(ventana.getByText(/quedan 29 hoy y 299 de 300 este mes/)).toBeVisible();
  await cerrarFogon(page);

  // «Rellenar con Fogón», al desgranar un plato vacío.
  await abrirSinQueSeCaiga(page, `${APP}#/escandallos/resumen`);
  await page
    .getByRole('list', { name: 'Sin escandallo' })
    .getByRole('button', { name: /Croquetas de boletus/ })
    .click();
  await page
    .getByRole('dialog', { name: 'Croquetas de boletus' })
    .getByRole('button', { name: 'Desgranar' })
    .click();
  const editor = page.getByRole('dialog', { name: 'Desgranar' });
  await editor.getByRole('button', { name: 'Rellenar con Fogón · 2 créditos' }).click();
  await expect(editor.getByText('Borrador de Fogón.')).toBeVisible();
  await expect(editor.getByRole('textbox', { name: 'Cantidad de Leche entera' })).toHaveValue(
    '120',
  );
  // Cada línea pregunta cuál de tus productos es: hasta elegir, no se guarda.
  await expect(editor.getByText('¿Cuál de tus productos es?').first()).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Guardar' })).toBeDisabled();
});

test('el admin tiene su sección de Fogón, con el interruptor general', async ({ page }) => {
  await entrarEnElAdmin(page);
  await page.getByRole('button', { name: 'Fogón', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fogón' })).toBeVisible();

  const general = page.getByRole('switch', { name: 'Fogón encendido' });
  // Solo se enciende, nunca se apaga: otras pruebas pueden estar usándolo a la vez. Se
  // pulsa el rótulo: la casilla de verdad está escondida a propósito.
  if (!(await general.isChecked())) {
    await general.locator('xpath=..').click();
  }
  await expect(general).toBeChecked();
  await expect(page.getByRole('heading', { name: 'Encendido' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Cada cliente' })).toBeVisible();
  await expect(page.getByText(/Este mes: \d+ llamadas/)).toBeVisible();

  // «Probar la conexión»: con el Fogón de pruebas, funciona.
  await page.getByRole('button', { name: 'Probar la conexión' }).click();
  await expect(page.getByText(/Ha contestado de-mentira en/)).toBeVisible();
});
