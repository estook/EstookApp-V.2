import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, APP, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * Fogón 1 · 2 y 1 · 3 (decisión 0098), en la pantalla.
 *
 * Con el Fogón de mentira de la API de pruebas, que contesta sin llamar a ningún modelo:
 *
 *   · **Lo que lee**: la merma dicha, la foto del albarán al recibir y la del Z al
 *     cerrar la caja. Cada una rellena la pantalla de siempre y avisa de que es un
 *     borrador; nada se apunta solo.
 *   · **Lo que revisa y prepara**: «Revisar mis datos» en Fogón, el horario de la semana
 *     con Fogón (que solo se pone en el borrador si se pulsa), la respuesta a una reseña
 *     y ajustar un pedido.
 *
 * Fogón se enciende **solo para la cuenta de la prueba**, como en `fogon.spec.ts`.
 */

async function elToken(page: Page): Promise<string> {
  return (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';
}

async function consultar<T>(
  peticion: APIRequestContext,
  token: string,
  nombre: string,
): Promise<T> {
  const respuesta = await peticion.get(`${API}/v1/consultas/${nombre}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(respuesta.status(), `${nombre}: ${await respuesta.text()}`).toBe(200);
  return ((await respuesta.json()) as { datos: T }).datos;
}

/** Una cuenta nueva, pagada, sin el alta y con Fogón encendido. */
async function unaCuentaConFogon(
  page: Page,
  request: APIRequestContext,
  correo: string,
  negocio: string,
): Promise<string> {
  await cuentaNueva(page, request, correo, negocio);
  await pagarEsencial(page);
  await sinElAlta(page);
  const encendido = await request.get(
    `${API}/pruebas/fogon?encendido=1&correo=${encodeURIComponent(correo)}`,
  );
  expect(encendido.status()).toBe(200);
  return elToken(page);
}

/** Una foto de verdad (un JPEG que el navegador sabe abrir), hecha en la página. */
async function unaFoto(page: Page): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const base64 = await page.evaluate(() => {
    const lienzo = document.createElement('canvas');
    lienzo.width = 320;
    lienzo.height = 240;
    const pincel = lienzo.getContext('2d');
    if (pincel !== null) {
      pincel.fillStyle = '#ffffff';
      pincel.fillRect(0, 0, 320, 240);
      pincel.fillStyle = '#000000';
      pincel.fillText('ALBARÁN 2024 · Tomate 3 cajas', 10, 40);
    }
    return lienzo.toDataURL('image/jpeg', 0.9).split(',')[1] ?? '';
  });
  return { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(base64, 'base64') };
}

/** El lunes de dentro de unas semanas, distinto en cada vuelta: una semana vacía. */
function unLunesLibre(): string {
  const semanas = 20 + Math.trunc(Math.random() * 400);
  const hoy = new Date(Date.now());
  const lunes = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + semanas * 7),
  );
  const desdeElLunes = (lunes.getUTCDay() + 6) % 7;
  lunes.setUTCDate(lunes.getUTCDate() - desdeElLunes);
  return lunes.toISOString().slice(0, 10);
}

test('Fogón lee: la merma dicha, el albarán y el Z por foto', async ({ page, request }, info) => {
  test.slow();
  const correo = `fogon-lee-${unico(info)}@correo-de-prueba.com`;
  const token = await unaCuentaConFogon(page, request, correo, 'Bar Fogón lee');

  // ── La merma, dicha ──────────────────────────────────────────────────────
  await ejecutarEnLaApi(request, token, 'crear_producto', {
    nombre: 'Vino tinto',
    unidad_de_uso: 'ud',
    precio_centimos: 600,
    cantidad_inicial: 12,
  });
  await abrirSinQueSeCaiga(page, `${APP}#/?hacer=merma`);
  const merma = page.getByRole('dialog', { name: 'Apuntar una merma' });
  await merma
    .getByRole('textbox', { name: 'Qué se tira' })
    .fill('Se han roto dos botellas de vino');
  await merma.getByRole('button', { name: 'Entenderlo · 1 crédito' }).click();
  // Lo entendido se pone en la hoja de siempre: el producto, cuánto y por qué.
  await expect(
    merma.getByRole('button', { name: /Vino tinto · 2 ud · se ha caído o roto/ }),
  ).toBeVisible();
  await expect(merma.getByLabel('Cuánto')).toHaveValue('2');
  await expect(merma.getByRole('button', { name: 'Apuntar', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');

  // ── El albarán, por foto ─────────────────────────────────────────────────
  const { proveedorId } = await ejecutarEnLaApi<{ proveedorId: string }>(
    request,
    token,
    'crear_proveedor',
    {
      nombre: 'Frutas Fogón',
      contacto: 'Juan',
      dias_de_reparto: [1, 2, 3, 4, 5, 6, 7],
      plazo_de_entrega: 1,
      como_se_pide: 'telefono',
      forma_de_pago: 'transferencia',
      dias_de_pago: 30,
    },
  );
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    request,
    token,
    'crear_producto',
    {
      nombre: 'Tomate pera',
      formato: 'Caja 5 kg',
      factor: 5,
      unidad_de_uso: 'kg',
      precio_centimos: 1000,
      proveedor_id: proveedorId,
    },
  );
  const { pedidoId, numero } = await ejecutarEnLaApi<{ pedidoId: string; numero: number }>(
    request,
    token,
    'crear_pedido',
    { proveedor_id: proveedorId, lineas: [{ producto_id: productoId, cantidad: 2 }] },
  );
  await ejecutarEnLaApi(request, token, 'enviar_pedido', {
    pedido_id: pedidoId,
    canal: 'telefono',
  });
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/compras/pedidos?pedido=${pedidoId}&recibir=1`);
  const recibir = page.getByRole('dialog', { name: `Recibir el pedido ${String(numero)}` });
  await recibir.getByLabel('Foto del albarán').setInputFiles(await unaFoto(page));
  // Lo leído entra en las líneas, marcado, y lo que no se sabe qué es, se dice.
  await expect(recibir.getByText('leído por Fogón')).toBeVisible({ timeout: 15_000 });
  await expect(recibir.getByText('Borrador de Fogón.')).toBeVisible();
  await expect(recibir.getByLabel('Número del albarán')).toHaveValue('A-2024');
  await expect(recibir.getByText('Esto no sé cuál de tus productos es')).toBeVisible();
  await expect(recibir.getByText(/Algo que no tienes/)).toBeVisible();
  await page.keyboard.press('Escape');

  // ── El Z, por foto ───────────────────────────────────────────────────────
  await abrirSinQueSeCaiga(page, `${APP}#/servicio/jornada/cierre`);
  await page.getByLabel('Foto del Z').setInputFiles(await unaFoto(page));
  await expect(page.getByText('Borrador de Fogón.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('Total facturado')).toHaveValue(/1\.?234,50/);
});

test('Fogón revisa y prepara: la revisión, el horario, la reseña y el pedido', async ({
  page,
  request,
}, info) => {
  test.slow();
  const correo = `fogon-prepara-${unico(info)}@correo-de-prueba.com`;
  const token = await unaCuentaConFogon(page, request, correo, 'Bar Fogón prepara');
  await ejecutarEnLaApi(request, token, 'crear_platos', {
    seccion_id: null,
    platos: [{ nombre: 'Croquetas de la casa', precio_centimos: 900 }],
  });

  // ── Revisar mis datos, en Fogón ──────────────────────────────────────────
  await abrirSinQueSeCaiga(page, `${APP}#/`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  const ventana = page.getByRole('dialog', { name: 'Fogón' });
  await expect(async () => {
    if (!(await ventana.isVisible())) await page.keyboard.press('Control+j');
    await expect(ventana).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  const revision = ventana.getByRole('region', { name: 'Revisar mis datos' });
  await revision.getByRole('button', { name: /Revisar mis datos/ }).click();
  await revision.getByRole('button', { name: 'Revisar ahora · 3 créditos' }).click();
  // Lo de las reglas: el plato sin escandallo, sin IA y sin señalar a nadie.
  await expect(
    revision.getByText(/1 plato de la carta sin escandallo: Croquetas de la casa/),
  ).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');

  // ── El horario de la semana, con Fogón ───────────────────────────────────
  const quien = await consultar<{ organizacion: { id: string }; local: { id: string } }>(
    request,
    token,
    'quien_soy',
  );
  await ejecutarEnLaApi(request, token, 'invitar_persona', {
    nombre: 'Marta',
    rol: 'cocinero',
    organizacion_id: quien.organizacion.id,
    local_id: quien.local.id,
  });
  const lunes = unLunesLibre();
  await abrirSinQueSeCaiga(page, `${APP}#/horario?semana=${lunes}`);
  await page.getByRole('button', { name: 'Hacerlo con Fogón' }).click();
  const cuadrante = page.getByRole('dialog', { name: 'El horario, con Fogón' });
  // Pregunta los días fuertes y a quién quieres; las horas ya las sabe.
  await expect(cuadrante.getByText('¿Qué días se vende más?')).toBeVisible({ timeout: 15_000 });
  await cuadrante.getByRole('button', { name: /Marta · cocina/ }).click();
  await cuadrante.getByRole('button', { name: 'Hacer el horario · 3 créditos' }).click();
  await expect(cuadrante.getByText('Borrador de Fogón.')).toBeVisible({ timeout: 15_000 });
  await expect(cuadrante.getByText(/Marta 12:00–16:00/).first()).toBeVisible();
  await cuadrante.getByRole('button', { name: 'Ponerlo en el borrador' }).click();
  // Cinco días por persona que ficha (la dueña de la cuenta también ficha).
  await expect(page.getByText(/\d+ tramos puestos por Fogón/)).toBeVisible({ timeout: 15_000 });

  // ── La respuesta a una reseña ────────────────────────────────────────────
  await abrirSinQueSeCaiga(page, `${APP}#/negocio/resenas`);
  await page
    .getByRole('textbox', { name: 'La reseña' })
    .fill('Muy rico todo, pero tardaron mucho.');
  await page.getByRole('button', { name: '3 estrellas' }).click();
  await page.getByRole('button', { name: 'Escribir la respuesta · 1 crédito' }).click();
  await expect(page.getByRole('textbox', { name: 'La respuesta' })).toHaveValue(
    'Esto es Fogón de pruebas: no he llamado a ningún modelo.',
    { timeout: 15_000 },
  );

  // ── Ajustar un pedido ────────────────────────────────────────────────────
  const { proveedorId } = await ejecutarEnLaApi<{ proveedorId: string }>(
    request,
    token,
    'crear_proveedor',
    {
      nombre: 'Harinas Fogón',
      contacto: 'Ana',
      dias_de_reparto: [1, 2, 3, 4, 5, 6, 7],
      plazo_de_entrega: 1,
      como_se_pide: 'telefono',
      forma_de_pago: 'transferencia',
      dias_de_pago: 30,
    },
  );
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    request,
    token,
    'crear_producto',
    { nombre: 'Harina', unidad_de_uso: 'kg', precio_centimos: 90, proveedor_id: proveedorId },
  );
  const { pedidoId } = await ejecutarEnLaApi<{ pedidoId: string }>(request, token, 'crear_pedido', {
    proveedor_id: proveedorId,
    lineas: [{ producto_id: productoId, cantidad: 1 }],
  });
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/compras/pedidos?pedido=${pedidoId}`);
  await page
    .getByRole('textbox', { name: 'Dímelo rápido' })
    .fill('El sábado tenemos una boda de 60');
  await page.getByRole('button', { name: 'Ajustar · 2 créditos' }).click();
  await expect(page.getByText('Más gente el sábado.')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Ponerlo en el pedido' }).click();
  await expect(page.getByText('Hecho: revísalo y guarda')).toBeVisible();
});
