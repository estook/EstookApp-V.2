import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { APP, ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * R · la campana (decisión 0052), desde la pantalla.
 *
 *   · a quien manda le llega a la campana lo que empieza su equipo, y tocarlo lleva
 *     al pedido
 *   · pedir ayuda con un pedido: al cocinero le llega al momento, lo rellena y
 *     avisa con «Listo»
 *   · Ajustes → Avisos: cada uno enciende y apaga lo suyo; la subida, quien lleva
 *     el local
 *   · el buscador se cierra con su X y tocando fuera, también en el móvil
 *
 * Las pruebas corren a la vez en tres navegadores contra la misma base, así que
 * cada una crea su proveedor con su nombre, y se busca **su** aviso, no se cuentan.
 */
const ROSA = 'rosa@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

function unNombre(que: string): string {
  return `${que} ${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 100))}`;
}

async function abrirLaCampana(page: Page) {
  await page
    .getByRole('banner')
    .getByRole('button', { name: /^Avisos/ })
    .click();
  const campana = page.getByRole('dialog', { name: 'Avisos' });
  await expect(campana).toBeVisible();
  return campana;
}

test('a quien manda le llega lo que empieza su equipo, y tocarlo lleva al pedido', async ({
  page,
  request,
}) => {
  const rosa = await tokenDe(request, ROSA);
  const marcos = await tokenDe(request, MARCOS);
  const proveedor = unNombre('Frutas Campana');
  const { proveedorId } = await ejecutarEnLaApi<{ proveedorId: string }>(
    request,
    rosa,
    'crear_proveedor',
    { nombre: proveedor },
  );
  const { pedidoId } = await ejecutarEnLaApi<{ pedidoId: string }>(
    request,
    marcos,
    'crear_pedido',
    { proveedor_id: proveedorId, lineas: [] },
  );

  await entrarEnLaApp(page, ROSA);
  // El número de la campana lo dice a quien no la ve.
  await expect(
    page.getByRole('banner').getByRole('button', { name: /^Avisos: \d+ sin leer$/ }),
  ).toBeVisible({
    timeout: 15_000,
  });

  const campana = await abrirLaCampana(page);
  const suyo = campana.getByRole('button', {
    name: new RegExp(`Marcos ha empezado un pedido a ${proveedor}`),
  });
  await expect(suyo).toBeVisible();
  await suyo.click();

  await expect(page).toHaveURL(new RegExp(`pedido=${pedidoId}`));
  await expect(page.getByRole('dialog', { name: new RegExp(`· ${proveedor}$`) })).toBeVisible();
});

test('pedir ayuda: al cocinero le llega al momento, y avisa con «Listo»', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);
  const rosa = await tokenDe(request, ROSA);
  const proveedor = unNombre('Verduras Ayuda');
  const { proveedorId } = await ejecutarEnLaApi<{ proveedorId: string }>(
    request,
    rosa,
    'crear_proveedor',
    { nombre: proveedor },
  );
  const { pedidoId } = await ejecutarEnLaApi<{ pedidoId: string }>(request, rosa, 'crear_pedido', {
    proveedor_id: proveedorId,
    lineas: [],
  });

  // Rosa le pide ayuda a Marcos desde el pedido.
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/compras/pedidos?pedido=${pedidoId}`);
  const ficha = page.getByRole('dialog', { name: new RegExp(`· ${proveedor}$`) });
  await ficha.getByRole('button', { name: 'Pedir ayuda' }).click();
  const elegir = page.getByRole('dialog', { name: 'Pedir ayuda con el pedido' });
  await elegir.getByLabel('Marcos').check();
  await elegir.getByRole('button', { name: 'Pedírselo' }).click();
  await expect(elegir).toBeHidden();
  await expect(ficha.getByText('Marcos · rellenando')).toBeVisible();

  // A Marcos le llega a la campana, y desde ella llega al pedido.
  const deMarcos = await browser.newContext({ viewport: page.viewportSize() });
  const suPagina = await deMarcos.newPage();
  try {
    await entrarEnLaApp(suPagina, MARCOS);
    const campana = await abrirLaCampana(suPagina);
    await campana
      .getByRole('button', {
        name: new RegExp(`Rosa te pide que rellenes el pedido a ${proveedor}`),
      })
      .click();
    const suFicha = suPagina.getByRole('dialog', { name: new RegExp(`· ${proveedor}$`) });
    await expect(suFicha.getByText('Rosa te ha pedido que lo rellenes')).toBeVisible();
    await suFicha.getByRole('button', { name: 'Listo, avisar a Rosa' }).click();
    await expect(suFicha.getByText(/Ya avisaste a Rosa/)).toBeVisible();
  } finally {
    await deMarcos.close();
  }

  // Y a Rosa le llega que ya lo puede mandar: cierra el pedido y mira la campana.
  await page.keyboard.press('Escape');
  await expect(ficha).toBeHidden();
  const campana = await abrirLaCampana(page);
  await expect(
    campana.getByRole('button', {
      name: new RegExp(`Marcos ha terminado el pedido a ${proveedor}`),
    }),
  ).toBeVisible({ timeout: 10_000 });
});

/**
 * Los tres navegadores corren a la vez contra la misma base: si tocaran el mismo
 * interruptor de la misma persona, se lo pisarían. Cada uno toca el suyo.
 */
const QUIEN_Y_QUE: Readonly<Record<string, { readonly correo: string; readonly aviso: string }>> = {
  escritorio: { correo: SARA, aviso: 'Una nota nueva en el Tablón' },
  'movil-pequeno': { correo: SARA, aviso: 'Hay carta nueva' },
  'movil-safari': { correo: MARCOS, aviso: 'Una nota nueva en el Tablón' },
};

test('Ajustes → Avisos: cada uno elige lo suyo, y solo ve lo que le puede llegar', async ({
  page,
}, info) => {
  const { correo, aviso } = QUIEN_Y_QUE[info.project.name] ?? {
    correo: SARA,
    aviso: 'Una nota nueva en el Tablón',
  };
  await entrarEnLaApp(page, correo);
  await irA(page, 'ajustes/avisos');
  await expect(page.getByText(aviso, { exact: true })).toBeVisible({ timeout: 10_000 });
  // A quien no manda pedidos no se le enseña la subida de un precio.
  await expect(page.getByText('Un proveedor sube un precio', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Desde cuánto avisa una subida de precio')).toHaveCount(0);

  const campana = page.getByRole('switch', { name: `${aviso}: en la campana` });
  await expect(campana).toBeChecked();
  // Se ve al momento, y se guarda por detrás: se espera a que llegue antes de recargar.
  const guardado = page.waitForResponse((r) => r.url().includes('/guardar_mis_avisos'));
  await campana.click({ force: true });
  await expect(campana).not.toBeChecked();
  expect((await guardado).status()).toBe(200);
  // Sin campana no hay correo.
  await expect(page.getByRole('switch', { name: `${aviso}: también por correo` })).toBeDisabled();

  // Se ha guardado: sigue así al volver.
  await page.reload();
  await expect(campana).not.toBeChecked({ timeout: 10_000 });
  // Y se deja como estaba, para las demás pruebas.
  const devuelto = page.waitForResponse((r) => r.url().includes('/guardar_mis_avisos'));
  await campana.click({ force: true });
  await expect(campana).toBeChecked();
  expect((await devuelto).status()).toBe(200);
});

test('la subida de precio la elige quien lleva el local, de fábrica en un 5 %', async ({
  page,
}) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'ajustes/avisos');
  const umbral = page.getByRole('radiogroup', { name: 'Desde cuánto avisa una subida de precio' });
  await expect(umbral).toBeVisible({ timeout: 10_000 });
  await expect(umbral.getByRole('radio', { name: '5 %', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // Se cambia al tocar, y se deja como estaba.
  await umbral.getByRole('radio', { name: '8 %', exact: true }).click();
  await expect(umbral.getByRole('radio', { name: '8 %', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await umbral.getByRole('radio', { name: '5 %', exact: true }).click();
  await expect(umbral.getByRole('radio', { name: '5 %', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('el buscador se cierra con su X y tocando fuera', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  const buscador = page.getByRole('dialog', { name: 'Buscar en todo' });

  await page
    .getByRole('banner')
    .getByRole('button', { name: /^Buscar en todo/ })
    .click();
  await expect(buscador).toBeVisible();
  await buscador.getByRole('button', { name: 'Cerrar el buscador' }).click();
  await expect(buscador).toBeHidden();

  await page
    .getByRole('banner')
    .getByRole('button', { name: /^Buscar en todo/ })
    .click();
  await expect(buscador).toBeVisible();
  // Abajo del todo, fuera de la caja del buscador.
  const tamano = page.viewportSize() ?? { width: 375, height: 667 };
  await page.mouse.click(tamano.width / 2, tamano.height - 10);
  await expect(buscador).toBeHidden();
});
