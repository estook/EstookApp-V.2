import { expect, test, type Page } from '@playwright/test';
import { recargarSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, ejecutarEnLaApi, entrarEnLaApp, tokenDe } from './en-la-app.ts';

/**
 * La entrega del 15-oct (decisión 0085), en la pantalla:
 *
 *   a. **el Panel en una sola petición**, y que siga abriendo con una API de antes;
 *   b. **las siluetas** con la forma de cada widget mientras llega;
 *   c. **el buscador**: pedidos y facturas que abren su ficha, y lo último abierto;
 *   d. **la puesta en marcha** de un local nuevo, que no sale en uno que ya la tiene.
 */
const ROSA = 'rosa@ejemplo.estook.com';

/** Las consultas que el Panel pedía una a una hasta la 0085. */
const DEL_PANEL = [
  'lo_de_hoy',
  'el_tablon',
  'mi_fichaje',
  'almacen_hoy',
  'un_indicador',
  'mis_objetivos',
  'fichajes_de_hoy',
  'mi_panel',
  'el_alta',
];

/** Lo que sale hacia la API mientras se abre el Panel: cada consulta suelta, y los lotes. */
function apuntarLoQueSale(page: Page) {
  const sueltas: string[] = [];
  const lotes: string[][] = [];
  page.on('request', (peticion) => {
    const url = new URL(peticion.url());
    if (!url.href.startsWith(API)) return;
    if (peticion.method() === 'GET' && url.pathname.includes('/consultas/')) {
      sueltas.push(url.pathname.split('/').pop() ?? '');
    }
    if (peticion.method() === 'POST' && url.pathname.endsWith('/consultas/varias')) {
      const cuerpo = peticion.postDataJSON() as { consultas: { nombre: string }[] };
      lotes.push(cuerpo.consultas.map((c) => c.nombre));
    }
  });
  return { sueltas, lotes };
}

test.describe('a · el Panel en una sola petición', () => {
  test('al abrirlo, todo lo del Panel viaja junto', async ({ page }) => {
    await entrarEnLaApp(page, ROSA);
    // Que acabe lo de entrar: su lote sale justo después del saludo, y no es este.
    await expect(page.getByRole('button', { name: 'Fichar la entrada' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    const sale = apuntarLoQueSale(page);
    await recargarSinQueSeCaiga(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    // Que haya llegado lo de los widgets: la jornada, con su botón.
    await expect(page.getByRole('button', { name: 'Fichar la entrada' })).toBeVisible();
    await page.waitForTimeout(1_500);

    // Ni una del Panel por su cuenta…
    expect(sale.sueltas.filter((n) => DEL_PANEL.includes(n))).toEqual([]);
    // …y todas en el mismo lote, que es uno.
    const conLoDelPanel = sale.lotes.filter((lote) => lote.includes('lo_de_hoy'));
    expect(conLoDelPanel).toHaveLength(1);
    for (const nombre of DEL_PANEL) expect(conLoDelPanel[0]).toContain(nombre);
  });

  test('con una API de antes del lote, el Panel abre igual, pidiéndolas sueltas', async ({
    page,
  }) => {
    // La web se publica al fusionar y la API se despliega después: en ese rato, la
    // app nueva habla con la API vieja, que no conoce `/consultas/varias`.
    await page.route('**/api/v1/consultas/varias', (ruta) =>
      ruta.fulfill({ status: 404, body: '404 Not Found' }),
    );
    await entrarEnLaApp(page, ROSA);
    await expect(page.getByRole('button', { name: 'Fichar la entrada' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Lo que necesita tu atención' })).toBeVisible();
  });
});

test.describe('b · las siluetas', () => {
  test('mientras llega, cada widget enseña su forma', async ({ page }) => {
    await entrarEnLaApp(page, ROSA);
    // Se frena el lote para ver lo de mientras.
    let soltar = (): void => undefined;
    const frenado = new Promise<void>((seguir) => {
      soltar = seguir;
    });
    await page.route('**/api/v1/consultas/varias', async (ruta) => {
      await frenado;
      await ruta.continue();
    });
    await recargarSinQueSeCaiga(page);

    // La jornada es un anillo, las ventas una cifra con su gráfica, los objetivos unos
    // medidores: cada uno, su silueta. Ninguna «Cargando…» escrita a la vista.
    await expect(page.locator('[data-silueta="anillo"]').first()).toBeVisible();
    await expect(page.locator('[data-silueta="cifra"]').first()).toBeVisible();
    await expect(page.locator('[data-silueta="medidores"]').first()).toBeVisible();
    await expect(page.getByText('Cargando…')).toHaveCount(0);

    soltar();
    await expect(page.getByRole('button', { name: 'Fichar la entrada' })).toBeVisible();
    await expect(page.locator('[data-silueta]')).toHaveCount(0);
  });
});

test.describe('c · el buscador', () => {
  test('un pedido por su número y una factura por su proveedor, cada uno a su ficha', async ({
    page,
    request,
  }, info) => {
    const token = await tokenDe(request, ROSA);
    const nombre = `Bodegas ${unico(info)
      .replace(/[^a-z0-9]/gi, '')
      .slice(-8)}`;
    const { proveedorId } = await ejecutarEnLaApi<{ proveedorId: string }>(
      request,
      token,
      'crear_proveedor',
      { nombre },
    );
    const { numero } = await ejecutarEnLaApi<{ numero: number }>(request, token, 'crear_pedido', {
      proveedor_id: proveedorId,
    });
    const numeroDeFactura = `FB-${String(Date.now()).slice(-6)}`;
    await ejecutarEnLaApi(request, token, 'registrar_factura', {
      proveedor_id: proveedorId,
      numero: numeroDeFactura,
      fecha: new Date().toISOString().slice(0, 10),
      base_centimos: 9_900,
    });

    await entrarEnLaApp(page, ROSA);
    const abrirElBuscador = async () => {
      await page
        .getByRole('button', { name: /Buscar/ })
        .first()
        .click();
      return page.getByRole('dialog', { name: 'Buscar en todo' });
    };

    // El pedido, por su número.
    let buscador = await abrirElBuscador();
    await buscador.getByRole('searchbox').fill(`pedido ${numero}`);
    await buscador
      .getByRole('button', { name: new RegExp(`Pedido ${numero} · ${nombre}`) })
      .click();
    await expect(page.getByRole('heading', { name: `Pedido ${numero} · ${nombre}` })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`pedido=`));
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: `Pedido ${numero} · ${nombre}` })).toHaveCount(
      0,
    );

    // La factura, por su proveedor.
    buscador = await abrirElBuscador();
    await buscador.getByRole('searchbox').fill(nombre.toLowerCase());
    await buscador.getByRole('button', { name: new RegExp(`Factura ${numeroDeFactura}`) }).click();
    await expect(
      page.getByRole('heading', { name: `Factura ${numeroDeFactura} · ${nombre}` }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    // Con la caja vacía, lo último abierto: la factura delante, el pedido detrás.
    buscador = await abrirElBuscador();
    const recientes = buscador.getByRole('region', { name: 'Recientes' });
    await expect(recientes.getByRole('button').nth(1)).toContainText(`Factura ${numeroDeFactura}`);
    await expect(recientes).toContainText(`Pedido ${numero}`);
    // Y se borran.
    await recientes.getByRole('button', { name: 'Borrar' }).click();
    await expect(buscador.getByRole('region', { name: 'Recientes' })).toHaveCount(0);
  });
});

test.describe('d · la puesta en marcha', () => {
  test('un local nuevo la ve, cada paso lleva a hacerlo y lo hecho se marca solo', async ({
    page,
    request,
  }, info) => {
    test.slow();
    await cuentaNueva(page, request, `marcha-${unico(info)}@correo-de-prueba.com`, 'Bar Arranque');
    await pagarEsencial(page);
    await sinElAlta(page);

    const puesta = page.getByRole('region', { name: 'Pon en marcha tu local' });
    await expect(puesta).toBeVisible();
    await expect(puesta).toContainText('0/5');
    // Y no se pisa con la del alta: una tarjeta de arrancar, no dos.
    await expect(page.getByRole('heading', { name: 'Termina de configurar tu local' })).toHaveCount(
      0,
    );

    // «Tus proveedores» lleva a crear uno, ya abierto.
    await puesta.getByRole('button', { name: 'Tus proveedores' }).click();
    await expect(page).toHaveURL(/proveedores/);
    const token = await page.evaluate(() => window.localStorage.getItem('estook.sesion'));
    await ejecutarEnLaApi(request, token ?? '', 'crear_proveedor', { nombre: 'Frutas Paco' });

    // De vuelta en el Panel, ese paso está hecho.
    await page.goto(page.url().replace(/#.*$/, '#/'));
    await expect(puesta).toContainText('1/5');
    await expect(puesta.getByRole('button', { name: /Tus proveedores · hecho/ })).toBeDisabled();

    // «No me lo recuerdes más», y no vuelve.
    await puesta.getByRole('button', { name: 'No me lo recuerdes más' }).click();
    await expect(puesta).toHaveCount(0);
    await recargarSinQueSeCaiga(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(page.getByRole('region', { name: 'Pon en marcha tu local' })).toHaveCount(0);
  });

  test('en un local que ya está en marcha, no sale', async ({ page }) => {
    // Los locales de ejemplo están en marcha desde que nacen.
    await entrarEnLaApp(page, ROSA);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(page.getByRole('region', { name: 'Pon en marcha tu local' })).toHaveCount(0);
  });
});
