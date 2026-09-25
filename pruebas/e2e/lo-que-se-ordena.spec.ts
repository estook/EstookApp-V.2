import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * Entrega O · lo que se ordena (decisión 0047), desde la pantalla.
 *
 *   6   el botón «+»: Fogón en su banner, fichar cuando se puede y los atajos del
 *       puesto, que se cambian y valen también en las acciones rápidas
 *   8   lo de hoy, arriba del Panel, con su botón y su «Luego»
 *   9   el Panel de cada puesto
 *   17  los objetivos, en Ajustes y con su semáforo
 *   20  el QR definitivo, y la carta que abre sin sesión
 */
const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto: su Panel no lo toca nadie
const CARTA = 'http://localhost:5175/carta/';

/**
 * Entrar como Luis, en su local. `acceso.spec.ts` le da acceso de camarero a otro
 * local de la cadena, así que según el orden de las pruebas llega a «¿Dónde estás
 * hoy?»: elige Bar Puerto, donde es jefe de cocina, como haría él.
 */
async function entrarComoLuis(page: Page): Promise<void> {
  await entrarEnLaApp(page, LUIS);
  const titulo = page.getByRole('heading', { level: 1 });
  if ((await titulo.textContent())?.includes('¿Dónde estás hoy?') === true) {
    await page.getByRole('button', { name: 'Bar Puerto' }).click();
  }
  await expect(titulo).toContainText('Hola');
}

/** Una tarjeta, por su título. */
function laTarjeta(page: Page, titulo: string) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: titulo, exact: true }) })
    .last();
}

// ── 9 · El Panel de cada puesto ──────────────────────────────────────────────

test('un jefe de cocina arranca con su Panel: fichar y sus objetivos, sin lo del gerente', async ({
  page,
}) => {
  await entrarComoLuis(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
  // Luis tiene el acceso recortado en su local (sin Inventario, semillas): su Panel
  // lleva lo de su puesto que puede ver, y ni un hueco por lo que no.
  await expect(page.getByRole('heading', { name: 'Fichar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Objetivos' })).toBeVisible();
  // Lo de quien lleva el local no le sale: las ventas del día son de su gerente.
  await expect(page.getByRole('heading', { name: 'Ventas de hoy' })).toHaveCount(0);
});

// ── 6 · El botón «+» ─────────────────────────────────────────────────────────

test('el «+» abre Fogón en su banner y los atajos de su puesto', async ({ page }) => {
  await entrarComoLuis(page);
  await page.getByRole('button', { name: 'Qué quieres hacer' }).click();

  const hoja = page.getByRole('dialog', { name: 'Qué quieres hacer' });
  await expect(hoja.getByRole('button', { name: /Pregúntale a Fogón/ })).toContainText('el Panel');

  const atajos = hoja.getByRole('region', { name: 'Tus atajos' });
  await expect(atajos.getByRole('button', { name: 'Apuntar una merma' })).toBeVisible();
  await expect(atajos.getByRole('button', { name: 'Recibir lo que ha llegado' })).toBeVisible();
  // Un jefe de cocina no cierra la caja (0041): no se le ofrece.
  await expect(atajos.getByRole('button', { name: 'Cerrar la caja' })).toHaveCount(0);

  // Y Fogón, desde su banner.
  await hoja.getByRole('button', { name: /Pregúntale a Fogón/ }).click();
  await expect(page.getByRole('dialog', { name: 'Fogón' })).toBeVisible();
});

test('los atajos se cambian en el «+» y valen también en las acciones rápidas', async ({
  page,
}) => {
  await entrarComoLuis(page);
  await page.getByRole('button', { name: 'Qué quieres hacer' }).click();
  const hoja = page.getByRole('dialog', { name: 'Qué quieres hacer' });
  await hoja.getByRole('button', { name: 'Cambiarlos' }).click();

  const elegir = page.getByRole('dialog', { name: 'Tus atajos' });
  await elegir.getByRole('checkbox', { name: /Ver el libro de movimientos/ }).check();
  await elegir.getByRole('button', { name: 'Guardar' }).click();
  await expect(
    hoja.getByRole('region', { name: 'Tus atajos' }).getByRole('button', {
      name: 'Ver el libro de movimientos',
    }),
  ).toBeVisible();

  // Y se deja como estaba, para la siguiente vez.
  await hoja.getByRole('button', { name: 'Cambiarlos' }).click();
  await elegir.getByRole('button', { name: 'Los de mi puesto' }).click();
  await expect(
    hoja.getByRole('region', { name: 'Tus atajos' }).getByRole('button', {
      name: 'Ver el libro de movimientos',
    }),
  ).toHaveCount(0);
});

test('«Fichar» desde cualquier sitio abre el «+» con fichar arriba', async ({ page }) => {
  await entrarComoLuis(page);
  await irA(page, '?hacer=fichar');
  const hoja = page.getByRole('dialog', { name: 'Qué quieres hacer' });
  await expect(hoja.getByRole('region', { name: 'Fichar' })).toBeVisible();
  await expect(hoja.getByRole('button', { name: /Fichar la (entrada|salida)/ })).toBeVisible();
});

// ── 8 · Lo de hoy ────────────────────────────────────────────────────────────

test('lo de hoy: lo que caduca hoy sale arriba del Panel, y «Luego» lo aparta', async ({
  page,
  request,
}) => {
  const nombre = `Nata de hoy ${String(Date.now()).slice(-5)}`;
  // La caducidad es una fecha del calendario del local.
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(
    new Date(Date.now()),
  );
  const token = await tokenDe(request, ROSA);
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    request,
    token,
    'crear_producto',
    { nombre, unidad_de_uso: 'l', zona: 'cocina' },
  );
  await ejecutarEnLaApi(request, token, 'apuntar_entrada', {
    producto_id: productoId,
    cuanto: 2,
    lote: 'L-O',
    caduca_el: hoy,
  });

  await entrarEnLaApp(page, ROSA);
  const zona = page.getByRole('region', { name: 'Lo que necesita tu atención' });
  const caduca = zona.getByRole('listitem').filter({ hasText: /caducan? hoy/ });
  await expect(caduca).toBeVisible();
  await expect(caduca).toContainText(nombre);
  await expect(caduca.getByRole('button', { name: 'Verlos' })).toBeVisible();

  await caduca.getByRole('button', { name: /Recordarme/ }).click();
  await expect(caduca).toHaveCount(0);
});

// ── 17 · Los objetivos ───────────────────────────────────────────────────────

test('los objetivos se cambian en Ajustes, con lo normal del sector al lado', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'ajustes/local#objetivos');

  const tarjeta = laTarjeta(page, 'Tus objetivos');
  await expect(tarjeta.getByText(/Lo normal va del 4 al 10 %/)).toBeVisible();

  const merma = tarjeta.getByLabel('Merma');
  await merma.fill('5');
  await tarjeta.getByRole('button', { name: 'Guardar los objetivos' }).click();
  await expect(tarjeta.getByText('Guardados.', { exact: false })).toBeVisible();

  // El semáforo de arriba lo juzga ya con el nuevo.
  await expect(tarjeta.getByText('objetivo 5 %')).toBeVisible();
  await merma.fill('4');
  await tarjeta.getByRole('button', { name: 'Guardar los objetivos' }).click();
  await expect(tarjeta.getByText('objetivo 4 %')).toBeVisible();
});

// ── 20 · El QR y la carta ────────────────────────────────────────────────────

test('el QR de la carta se ve en Ajustes y se baja en SVG', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'ajustes/local#tu-carta');

  const tarjeta = laTarjeta(page, 'Tu carta y su QR');
  await expect(tarjeta.getByText('estook.com/carta/bar-centro')).toBeVisible();
  await expect(tarjeta.getByRole('img', { name: 'QR de la carta de Bar Centro' })).toBeVisible();

  const bajada = page.waitForEvent('download');
  await tarjeta.getByRole('button', { name: 'SVG para la imprenta' }).click();
  expect((await bajada).suggestedFilename()).toBe('qr-bar-centro.svg');
});

test('la carta abre sin sesión, y lo que no existe lo dice', async ({ page }) => {
  await abrirSinQueSeCaiga(page, `${CARTA}bar-centro`);
  await expect(page.getByRole('heading', { level: 1, name: 'Bar Centro' })).toBeVisible();
  await expect(page).toHaveTitle(/Bar Centro/);

  await abrirSinQueSeCaiga(page, `${CARTA}no-hay-tal-local`);
  await expect(page.getByText('Esta carta no existe')).toBeVisible();

  await abrirSinQueSeCaiga(page, CARTA);
  await expect(page.getByText('La carta de cada local')).toBeVisible();
});
