import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { APP, ejecutarEnLaApi, entrarEnLaApp, tokenDe } from './en-la-app.ts';

/**
 * L · El lector, adelantada el 25-sep (Richi: «"Escanear producto" a la derecha de
 * "Añadir producto"»).
 *
 *   · En Productos, un código de un producto abre su ficha; uno nuevo abre el alta
 *     con él puesto y el nombre que propone Open Food Facts.
 *   · Los lectores de mano escriben como un teclado, y se reconocen solos.
 *   · Contando el inventario, cada lectura suma uno.
 *   · Recibiendo un pedido, cada lectura marca su línea.
 *   · Sin cámara o sin permiso, el código se escribe a mano.
 *
 * La cámara de verdad no se prueba aquí: un navegador de pruebas no tiene una
 * etiqueta delante. Se prueba todo lo demás, que es lo que decide qué pasa con
 * cada código.
 */
const ROSA = 'rosa@ejemplo.estook.com';

/** Un EAN-13 de uso interno (empieza por 2), distinto en cada prueba, con su control bien. */
function unCodigo(): string {
  const cuerpo = `2${String(Date.now()).slice(-8)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  const suma = Array.from(cuerpo, Number)
    .reverse()
    .reduce((total, cifra, i) => total + cifra * (i % 2 === 0 ? 3 : 1), 0);
  return `${cuerpo}${String((10 - (suma % 10)) % 10)}`;
}

/**
 * Lo que hace un lector de mano: el código de golpe y un Intro, fuera de cualquier campo.
 *
 * Las teclas se mandan **en el mismo instante**, desde la página: tecleadas desde
 * Playwright, una máquina de GitHub cargada mete a veces más pausa entre dos que lo
 * que tarda un lector (45 ms), y la lectura se toma por una persona. Lo de la
 * velocidad lo prueba `codigos.prueba.ts`; aquí, lo que pasa con cada código.
 */
async function leerConUnLector(page: Page, codigo: string) {
  await expect(page.getByRole('button', { name: 'Escanear' })).toBeVisible();
  await page.evaluate((teclas) => {
    for (const tecla of [...Array.from(teclas), 'Enter']) {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true }),
      );
    }
  }, codigo);
}

async function unProductoConCodigo(page: Page, nombre: string, codigo: string) {
  const token = await tokenDe(page.request, ROSA);
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    page.request,
    token,
    'crear_producto',
    { nombre, unidad_de_uso: 'ud', codigo_de_barras: codigo, cantidad_inicial: 12 },
  );
  return { token, productoId };
}

test('un lector de mano en Productos abre la ficha del producto de ese código', async ({
  page,
}) => {
  const codigo = unCodigo();
  const nombre = `Tónica del lector ${codigo.slice(-5)}`;
  await unProductoConCodigo(page, nombre, codigo);

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo`);
  await expect(page.getByRole('button', { name: 'Escanear' })).toBeVisible();
  await leerConUnLector(page, codigo);

  await expect(page.getByRole('dialog', { name: nombre })).toBeVisible();
});

test('un código nuevo abre el alta con él puesto, y el nombre que propone Open Food Facts', async ({
  page,
}) => {
  const codigo = unCodigo();
  await page.route('**/world.openfoodfacts.org/**', (ruta) =>
    ruta.fulfill({
      json: {
        status: 1,
        product: { product_name_es: 'Leche entera', brands: 'La de siempre', quantity: '1 l' },
      },
    }),
  );

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo`);
  await leerConUnLector(page, codigo);

  const alta = page.getByRole('dialog', { name: 'Un producto nuevo' });
  await expect(alta.getByText(codigo)).toBeVisible();
  await expect(alta.getByText('Leche entera · La de siempre · 1 l')).toBeVisible();
  await alta.getByRole('button', { name: 'Usar el nombre' }).click();
  await expect(alta.getByLabel(/^Producto/)).toHaveValue('Leche entera');
  await alta.getByLabel(/^Producto/).fill(`Leche entera ${codigo.slice(-5)}`);
  await alta.getByRole('button', { name: 'Guardar el producto' }).click();

  // Y se queda con su código: la próxima lectura ya abre su ficha.
  await expect(page.getByRole('dialog', { name: `Leche entera ${codigo.slice(-5)}` })).toBeVisible({
    timeout: 15_000,
  });
});

test('sin cámara, el lector deja escribir el código a mano', async ({ page }) => {
  const codigo = unCodigo();
  const nombre = `Cerveza del lector ${codigo.slice(-5)}`;
  await unProductoConCodigo(page, nombre, codigo);

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo`);
  await page.getByRole('button', { name: 'Escanear' }).click();

  const lector = page.getByRole('dialog', { name: 'Escanear un producto' });
  await lector.getByLabel('O escribe el código').fill(codigo);
  await lector.getByRole('button', { name: 'Usar' }).click();
  await expect(page.getByRole('dialog', { name: nombre })).toBeVisible();
});

test('contando el inventario, cada lectura suma uno y deja el cursor en su casilla', async ({
  page,
}) => {
  const codigo = unCodigo();
  const nombre = `Agua del lector ${codigo.slice(-5)}`;
  const { productoId } = await unProductoConCodigo(page, nombre, codigo);

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/movimientos/inventario`);
  await expect(page.getByRole('button', { name: 'Escanear' })).toBeVisible();

  await leerConUnLector(page, codigo);
  const casilla = page.locator(`#contado-${productoId}`);
  await expect(casilla).toHaveValue('1');
  await leerConUnLector(page, codigo);
  await expect(casilla).toHaveValue('2');
  await expect(page.getByText(`${nombre} · 2 ud`)).toBeVisible();
});

test('recibiendo un pedido, cada lectura marca su línea', async ({ page }, info) => {
  const token = await tokenDe(page.request, ROSA);
  const sufijo = `${info.project.name}-${String(Date.now())}`;
  const { proveedorId } = await ejecutarEnLaApi<{ proveedorId: string }>(
    page.request,
    token,
    'crear_proveedor',
    {
      nombre: `Bebidas del lector ${sufijo}`,
      contacto: 'Juan',
      dias_de_reparto: [1, 2, 3, 4, 5, 6, 7],
      plazo_de_entrega: 1,
      como_se_pide: 'telefono',
      forma_de_pago: 'transferencia',
      dias_de_pago: 30,
    },
  );
  const codigo = unCodigo();
  const nombre = `Refresco del lector ${codigo.slice(-5)}`;
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    page.request,
    token,
    'crear_producto',
    { nombre, unidad_de_uso: 'ud', codigo_de_barras: codigo, proveedor_id: proveedorId },
  );
  const { pedidoId, numero } = await ejecutarEnLaApi<{ pedidoId: string; numero: number }>(
    page.request,
    token,
    'crear_pedido',
    { proveedor_id: proveedorId, lineas: [{ producto_id: productoId, cantidad: 2 }] },
  );
  await ejecutarEnLaApi(page.request, token, 'enviar_pedido', {
    pedido_id: pedidoId,
    canal: 'telefono',
  });

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/compras/pedidos?pedido=${pedidoId}&recibir=1`);
  const recibir = page.getByRole('dialog', { name: `Recibir el pedido ${String(numero)}` });
  await recibir.getByRole('button', { name: /^Con cambios/ }).click();
  await recibir.getByRole('button', { name: 'Escanear lo que llega' }).click();

  const lector = page.getByRole('dialog', { name: 'Escanear lo que llega' });
  await lector.getByLabel('O escribe el código').fill(codigo);
  await lector.getByRole('button', { name: 'Usar' }).click();
  await expect(lector.getByText(`${nombre} · marcado`)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(lector).toHaveCount(0);

  await expect(recibir.getByText('escaneada')).toBeVisible();
  await expect(recibir.getByText(/1 de 1 marcadas/)).toBeVisible();
});
