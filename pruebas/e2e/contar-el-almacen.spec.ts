import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, APP, ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';

/**
 * M8 · contar el almacén, la primera entrega (decisión 0078), desde la pantalla.
 *
 *   · el cocinero cuenta **a ciegas**, en cajas y sueltas, y manda lo contado
 *   · quien cierra lo abre desde el aviso, ve lo que baila y en euros, pide que se
 *     recuente una línea, y el cocinero la recuenta
 *   · se cierra, y lo que entró entre contar y cerrar no se pierde
 *   · «Toca contar» y la hoja impresa
 *   · el valor del almacén en una fecha, solo para quien ve precios
 *   · y los mínimos que propone Estook, que con poca historia no propone nada
 *
 * Lo que es aritmética —la diferencia con el libro de la hora de contar, FEFO, el
 * mínimo con catorce días de historia, el aviso del lunes— está probado contra
 * Postgres en `contar-el-almacen.prueba.ts`.
 */

const ROSA = 'rosa@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';

async function consultar<T>(
  peticion: APIRequestContext,
  token: string,
  nombre: string,
  parametros: Record<string, string> = {},
): Promise<T> {
  const respuesta = await peticion.get(
    `${API}/v1/consultas/${nombre}?${new URLSearchParams(parametros).toString()}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  const cuerpo = (await respuesta.json()) as { datos?: T; error?: unknown };
  expect(respuesta.status(), `${nombre}: ${JSON.stringify(cuerpo.error)}`).toBe(200);
  return cuerpo.datos as T;
}

async function loQueHay(peticion: APIRequestContext, token: string, id: string): Promise<number> {
  return (
    await consultar<{ producto: { cantidad: number } }>(peticion, token, 'un_producto', {
      producto_id: id,
    })
  ).producto.cantidad;
}

test('cuenta el cocinero a ciegas, recuenta lo que le piden y cierra quien lleva el local', async ({
  page,
  browser,
}, info) => {
  // Dos personas y siete pasos: con la batería entera a la vez, medio minuto no llega.
  test.setTimeout(120_000);
  const sufijo = `${info.project.name}-${String(Date.now())}`;
  const rosa = await tokenDe(page.request, ROSA);
  const pulpo = `Pulpo de contar ${sufijo}`;
  const huevos = `Huevos de contar ${sufijo}`;
  const { productoId: pulpoId } = await ejecutarEnLaApi<{ productoId: string }>(
    page.request,
    rosa,
    'crear_producto',
    {
      nombre: pulpo,
      unidad_de_uso: 'kg',
      zona: 'cocina',
      cantidad_inicial: 10,
      precio_centimos: 3200,
    },
  );
  const { productoId: huevosId } = await ejecutarEnLaApi<{ productoId: string }>(
    page.request,
    rosa,
    'crear_producto',
    {
      nombre: huevos,
      unidad_de_uso: 'ud',
      zona: 'cocina',
      formato: 'Caja 6 ud',
      factor: 6,
      cantidad_inicial: 12,
      precio_centimos: 180,
    },
  );

  // ── Marcos cuenta, a ciegas ────────────────────────────────────────────────
  await entrarEnLaApp(page, MARCOS);
  await irA(page, 'almacen/movimientos/inventario');
  await expect(page.getByText('Toca contar').first()).toBeVisible();
  await page.getByRole('button', { name: 'Contar una zona' }).click();

  await page.getByLabel('Buscar', { exact: true }).fill(`de contar ${sufijo}`);
  await expect(page.getByText(pulpo)).toBeVisible();
  // A ciegas: lo que dice el libro no sale (0078).
  await expect(page.getByText(/El libro dice/)).toHaveCount(0);

  await page.locator(`#contado-${pulpoId}-hay`).fill('7');
  // Los huevos se cuentan como están: dos cajas de seis y tres sueltas son quince.
  await page.locator(`#contado-${huevosId}-formatos`).fill('2');
  await page.locator(`#contado-${huevosId}-sueltas`).fill('3');
  await expect(page.getByText('· 15 ud')).toBeVisible();

  await page.getByRole('button', { name: 'Mandar lo contado' }).click();
  await expect(page.getByText('Mandado')).toBeVisible({ timeout: 15_000 });
  // Mandar no toca el libro.
  expect(await loQueHay(page.request, rosa, pulpoId)).toBe(10);

  // ── Entre contar y cerrar entra género ─────────────────────────────────────
  await ejecutarEnLaApi(page.request, rosa, 'apuntar_entrada', {
    producto_id: pulpoId,
    cuanto: 5,
    como: 'unidades_de_uso',
  });

  // El inventario de Marcos, el que lleva estos dos productos.
  const lista = await consultar<{ porCerrar: { id: string }[] }>(
    page.request,
    rosa,
    'el_inventario',
  );
  let inventarioId = '';
  for (const i of lista.porCerrar) {
    const suyo = await consultar<{ lineas: { productoId: string }[] }>(
      page.request,
      rosa,
      'un_inventario',
      { inventario_id: i.id },
    );
    if (suyo.lineas.some((l) => l.productoId === pulpoId)) inventarioId = i.id;
  }
  expect(inventarioId).not.toBe('');

  // ── Rosa lo abre, como desde el aviso ──────────────────────────────────────
  const deRosa = await browser.newPage({
    viewport: page.viewportSize() ?? { width: 1280, height: 800 },
  });
  await entrarEnLaApp(deRosa, ROSA);
  await abrirSinQueSeCaiga(
    deRosa,
    `${APP}#/almacen/movimientos/inventario?inventario=${inventarioId}`,
  );
  // Lo que más baila, primero: el pulpo, 3 kg a 32 €.
  await expect(deRosa.getByText('−3 kg · 96,00 €')).toBeVisible({ timeout: 15_000 });
  await expect(deRosa.getByText(/decía 12 ud · contado 15 ud/)).toBeVisible();

  // Que se vuelvan a contar los huevos.
  const lineaDeHuevos = deRosa.locator('li').filter({ hasText: huevos });
  await lineaDeHuevos.getByLabel('Que lo vuelvan a contar').check();
  await deRosa.getByRole('button', { name: 'Que vuelvan a contar este' }).click();
  await expect(deRosa.getByText('Pedido que se recuenten 1')).toBeVisible({ timeout: 15_000 });

  // ── Marcos recuenta ────────────────────────────────────────────────────────
  await irA(page, 'almacen/movimientos/inventario');
  await recargarSinQueSeCaiga(page);
  await expect(page.getByText(/Te piden que vuelvas a contar/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Contarlos' }).click();
  await page.locator(`#recontado-${huevosId}-formatos`).fill('2');
  await page.locator(`#recontado-${huevosId}-sueltas`).fill('0');
  await page.getByRole('button', { name: 'Mandar lo recontado' }).click();
  await expect(page.getByText('Recontado')).toBeVisible({ timeout: 15_000 });

  // ── Rosa cierra ────────────────────────────────────────────────────────────
  await recargarSinQueSeCaiga(deRosa);
  await expect(deRosa.getByText(/decía 12 ud · contado 12 ud/)).toBeVisible({ timeout: 15_000 });
  await deRosa.getByRole('button', { name: 'Cerrar el inventario' }).click();
  await expect(deRosa.getByText('Inventario cerrado')).toBeVisible({ timeout: 15_000 });

  // 15 que había al cerrar, menos los 3 que faltaban al contar: 12. Los 5 que
  // entraron entre medias siguen ahí.
  expect(await loQueHay(page.request, rosa, pulpoId)).toBe(12);
  expect(await loQueHay(page.request, rosa, huevosId)).toBe(12);
  await deRosa.close();
});

test('se descarta lo contado con su porqué, y no toca el libro', async ({ page }, info) => {
  const sufijo = `${info.project.name}-${String(Date.now())}`;
  const rosa = await tokenDe(page.request, ROSA);
  const marcos = await tokenDe(page.request, MARCOS);
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    page.request,
    rosa,
    'crear_producto',
    {
      nombre: `Arroz de descartar ${sufijo}`,
      unidad_de_uso: 'kg',
      zona: 'cocina',
      cantidad_inicial: 9,
    },
  );
  const { inventarioId } = await ejecutarEnLaApi<{ inventarioId: string }>(
    page.request,
    marcos,
    'enviar_lo_contado',
    { lineas: [{ producto_id: productoId, hay: 1 }] },
  );

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(
    page,
    `${APP}#/almacen/movimientos/inventario?inventario=${inventarioId}`,
  );
  await page.getByRole('button', { name: 'Descartar', exact: true }).click({ timeout: 15_000 });
  await page.getByLabel('Por qué', { exact: true }).fill('Contó la cámara de al lado');
  await page.getByRole('button', { name: 'Descartarlo' }).click();
  await expect(page.getByRole('button', { name: 'Contar una zona' })).toBeVisible({
    timeout: 15_000,
  });
  expect(await loQueHay(page.request, rosa, productoId)).toBe(9);
});

test('el valor del almacén en una fecha, solo para quien ve precios', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'almacen/productos/valor');
  await expect(page.getByText('Lo que vale hoy tu almacén')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible();

  // Otro día: el valor de ayer.
  const hoy = await page.getByLabel('El día', { exact: true }).inputValue();
  const ayer = new Date(`${hoy}T12:00:00Z`);
  ayer.setUTCDate(ayer.getUTCDate() - 1);
  await page.getByLabel('El día', { exact: true }).fill(ayer.toISOString().slice(0, 10));
  await expect(page.getByText(/^Lo que valía el /)).toBeVisible({ timeout: 15_000 });
});

test('el cocinero no ve el valor, ni un euro de lo que baila', async ({ page }) => {
  await entrarEnLaApp(page, MARCOS);
  await irA(page, 'almacen/productos/valor');
  await expect(page.getByText('Esto no lo llevas tú')).toBeVisible({ timeout: 15_000 });

  // Y a pelo, tampoco.
  const marcos = await tokenDe(page.request, MARCOS);
  const respuesta = await page.request.get(`${API}/v1/consultas/valor_del_almacen`, {
    headers: { authorization: `Bearer ${marcos}` },
  });
  expect(respuesta.status()).not.toBe(200);
});

test('los mínimos que propone Estook: sin historia, no propone nada', async ({ page }, info) => {
  const rosa = await tokenDe(page.request, ROSA);
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    page.request,
    rosa,
    'crear_producto',
    {
      nombre: `Harina del mínimo ${info.project.name}-${String(Date.now())}`,
      unidad_de_uso: 'kg',
      zona: 'cocina',
      cantidad_inicial: 25,
      minimo: 5,
    },
  );
  const lo = await consultar<{ propuestas: { id: string }[] }>(
    page.request,
    rosa,
    'minimos_propuestos',
  );
  expect(lo.propuestas.some((p) => p.id === productoId)).toBe(false);
  // Pedirlo igual no inventa nada: sin una semana de historia no se toca.
  const puesto = await ejecutarEnLaApi<{ puestos: number; sinDatos: number }>(
    page.request,
    rosa,
    'usar_el_minimo_calculado',
    { producto_ids: [productoId] },
  );
  expect(puesto).toEqual({ puestos: 0, sinDatos: 1 });
});
