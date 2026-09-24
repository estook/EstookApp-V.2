import { expect, test, type Locator } from '@playwright/test';
import { ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * Los dos fallos que vio Richi en el móvil al mirar V (24-sep-2026).
 *
 * 1. **En Productos, el nombre se partía letra a letra** («Nar / anj / a»): la
 *    cantidad, la etiqueta y los dos botones tenían ancho fijo, y al nombre le
 *    quedaban unos 50 px.
 * 2. **Al recargar dos veces, la app pedía entrar** con la sesión guardada. La
 *    causa de fondo era la API sin conexiones libres (`laPuertaDeLaApi`, probada
 *    en `postgres.prueba.ts`); aquí se prueba la otra mitad: que un fallo del
 *    servidor no se confunda nunca con «no has entrado».
 */
const ROSA = 'rosa@ejemplo.estook.com';

/**
 * Cuántas líneas ocupa cada palabra del texto de un elemento.
 *
 * Con un `Range` por palabra, cada línea en la que cae es un rectángulo con su
 * altura. Una palabra entera en una línea da 1; «Naranja» partida en tres, 3.
 */
async function lineasDeCadaPalabra(nombre: Locator): Promise<Record<string, number>> {
  return nombre.evaluate((el) => {
    const texto = el.firstChild;
    const buscado = el.textContent;
    if (texto?.nodeType !== Node.TEXT_NODE) throw new Error('el nombre no es un texto suelto');
    const resultado: Record<string, number> = {};
    let desde = 0;
    for (const palabra of buscado.split(' ')) {
      const rango = document.createRange();
      rango.setStart(texto, desde);
      rango.setEnd(texto, desde + palabra.length);
      const alturas = new Set(Array.from(rango.getClientRects(), (r) => r.top.toFixed(0)));
      resultado[palabra] = alturas.size;
      desde += palabra.length + 1;
    }
    return resultado;
  });
}

for (const ancho of [320, 375]) {
  test(`a ${ancho} px, el nombre de un producto se lee entero, sin partir palabras`, async ({
    page,
    request,
  }) => {
    // El nombre de la captura de Richi, con algo detrás para que sea solo de esta prueba.
    const nombre = `Jamón ibérico 50% cebo ${String(Date.now()).slice(-5)}`;
    const token = await tokenDe(request, ROSA);
    await ejecutarEnLaApi(request, token, 'crear_producto', {
      nombre,
      unidad_de_uso: 'kg',
      zona: 'cocina',
      cantidad_inicial: 35,
    });

    await page.setViewportSize({ width: ancho, height: 740 });
    await entrarEnLaApp(page, ROSA);
    await irA(page, 'inventario/productos/todo');
    await page.getByLabel('Buscar en tu género').fill(nombre);
    const elNombre = page.getByText(nombre, { exact: true }).filter({ visible: true });
    await expect(elNombre).toBeVisible();

    const lineas = await lineasDeCadaPalabra(elNombre);
    for (const [palabra, cuantas] of Object.entries(lineas)) {
      expect(cuantas, `«${palabra}» sale en ${String(cuantas)} líneas`).toBe(1);
    }

    // Y el nombre no se queda en una tira: tiene al menos la mitad de la fila.
    const fila = page.getByRole('listitem').filter({ hasText: nombre }).filter({ visible: true });
    const caja = await elNombre.boundingBox();
    const deLaFila = await fila.first().boundingBox();
    expect(caja?.width ?? 0).toBeGreaterThan((deLaFila?.width ?? 0) * 0.4);

    // Sin mínimo puesto no es un aviso, y en la lista no se dice.
    await expect(fila.getByText('Sin mínimo puesto')).toHaveCount(0);

    // Y nada se sale por los lados: ni la página ni la barra de abajo, que a 320 px
    // cortaba «Apps» y «Compras».
    const seSale = await page.evaluate(() => {
      const barra = document.querySelector('nav[aria-label="Inventario"]');
      return {
        pagina: document.documentElement.scrollWidth - window.innerWidth,
        barra: barra === null ? 0 : barra.scrollWidth - barra.clientWidth,
      };
    });
    expect(seSale).toEqual({ pagina: 0, barra: 0 });
  });
}

test('si el servidor no contesta, la app lo dice y no pide entrar', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'inventario/productos/todo');

  // El servidor, sin poder llegar a la base: lo que pasaba el 24-sep.
  await page.route('**/v1/consultas/quien_soy', (ruta) =>
    ruta.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          codigo: 'fallo_nuestro',
          quePasa: 'Se nos ha roto algo por dentro.',
          queSePuedeHacer: 'Inténtalo en un minuto.',
        },
      }),
    }),
  );
  await page.reload();

  // Tres reintentos, esperando 1, 2 y 4 segundos, y después lo dice.
  await expect(page.getByText('No llego al servidor')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Entra en Estook' })).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('estook.sesion'))).not.toBeNull();

  // Vuelve el servidor, y con un toque se sigue donde se estaba.
  await page.unroute('**/v1/consultas/quien_soy');
  await page.getByRole('button', { name: 'Volver a probar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible({
    timeout: 15_000,
  });
});

test('y si el servidor dice que la sesión no vale, entonces sí pide entrar', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);

  await page.route('**/v1/consultas/quien_soy', (ruta) =>
    ruta.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          codigo: 'sin_sesion',
          quePasa: 'Tu sesión ha caducado.',
          queSePuedeHacer: 'Vuelve a entrar.',
        },
      }),
    }),
  );
  await page.reload();

  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toBeVisible();
  await expect(page.getByText('No llego al servidor')).toHaveCount(0);
});
