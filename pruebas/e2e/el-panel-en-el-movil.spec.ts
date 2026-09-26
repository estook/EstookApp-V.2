import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { APP, ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * Lo que vio Richi en el Panel del móvil al mirar O (25-sep-2026).
 *
 *   a  «Hoy» ocupaba la pantalla entera con tres avisos: ahora sale plegado en el
 *      móvil —cuántas cosas hay y la más urgente—, se abre tocando la cabecera, y
 *      sin nada que atender no aparece.
 *   c  El «+» se aparta al bajar por la pantalla y vuelve al subir, **solo en el
 *      móvil**: en una pantalla grande no tapa nada.
 *   d  Del repaso: la ficha de una persona o de un producto, cerrada, dejaba un
 *      «Cargando» escondido y vivo para siempre; y «Entrar» se movía bajo el dedo
 *      al aparecer Google.
 *
 * El punto de la línea de ventas (b) se prueba sin navegador, en
 * `formasDeLaTendencia.prueba.ts`.
 *
 * Con Rosa, como las de lo de hoy de O, y sin pisarse: lo que se aparta con «Luego»
 * vive en el navegador de cada prueba, y los avisos van por tipo —«2 lotes caducan
 * hoy» es uno—, así que los lotes de otra prueba no alargan la lista.
 */
const ROSA = 'rosa@ejemplo.estook.com';

const esMovil = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

/** Dos lotes con fecha, hoy y mañana: dos cosas en lo de hoy, que ya se pliegan. */
async function dosCosasParaHoy(page: Page): Promise<void> {
  const token = await tokenDe(page.request, ROSA);
  const dia = (mas: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(
      new Date(Date.now() + mas * 86_400_000),
    );
  for (const [nombre, caduca] of [
    ['Nata de hoy del móvil', dia(0)],
    ['Leche de mañana del móvil', dia(1)],
  ] as const) {
    const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
      page.request,
      token,
      'crear_producto',
      { nombre: `${nombre} ${String(Date.now()).slice(-5)}`, unidad_de_uso: 'l', zona: 'cocina' },
    );
    await ejecutarEnLaApi(page.request, token, 'apuntar_entrada', {
      producto_id: productoId,
      cuanto: 1,
      lote: 'L-M',
      caduca_el: caduca,
    });
  }
}

test('lo de hoy sale plegado en el móvil y abierto en el escritorio, y se abre tocando la cabecera', async ({
  page,
}) => {
  await dosCosasParaHoy(page);
  await entrarEnLaApp(page, ROSA);

  const hoy = page.getByRole('region', { name: 'Hoy' });
  const cabecera = hoy.getByRole('button', { name: /^Hoy/ });
  await expect(cabecera).toContainText(/\d+ cosas/);

  if (esMovil(page)) {
    // Plegado: una sola cosa a la vista, la más urgente.
    await expect(cabecera).toHaveAttribute('aria-expanded', 'false');
    await expect(hoy.getByRole('listitem')).toHaveCount(1);
    await cabecera.click();
  }
  await expect(cabecera).toHaveAttribute('aria-expanded', 'true');
  expect(await hoy.getByRole('listitem').count()).toBeGreaterThanOrEqual(2);

  // Y se recuerda en el aparato: al volver al Panel sigue como se dejó.
  await cabecera.click();
  await expect(cabecera).toHaveAttribute('aria-expanded', 'false');
  await irA(page, 'equipo');
  await irA(page, '');
  await expect(cabecera).toHaveAttribute('aria-expanded', 'false');
  await expect(hoy.getByRole('listitem')).toHaveCount(1);
});

test('sin nada que atender, lo de hoy lo dice en una línea: «todo en orden» (26-sep)', async ({
  page,
}) => {
  // Lo de hoy lo contesta la prueba, con una sola cosa. Con lo de verdad no se puede:
  // en GitHub los tres navegadores comparten la base, y mientras esta apartaba lo de
  // Rosa, las de compras le creaban pedidos en borrador, cada uno un aviso nuevo
  // (Safari, 25-sep). Lo que se prueba aquí es la pantalla, no la lista.
  await page.route('**/v1/consultas/lo_de_hoy', (ruta) =>
    ruta.fulfill({
      json: {
        datos: {
          hoy: '2026-09-25',
          cosas: [
            {
              id: 'bajo-minimo',
              escalon: 4,
              titulo: '1 producto está por debajo del mínimo',
              detalle: null,
              centimos: null,
              app: 'almacen',
              tono: 'info',
              accion: { texto: 'Verlos', ir: '/almacen/productos/bajo-minimo' },
            },
          ],
        },
      },
    }),
  );
  await entrarEnLaApp(page, ROSA);

  const hoy = page.getByRole('region', { name: 'Hoy' });
  await expect(hoy).toBeVisible();
  // Una sola cosa no se pliega: no hay nada que esconder.
  await expect(hoy.getByRole('button', { name: /^Hoy/ })).toHaveCount(0);

  // Apartada la única, lo de hoy se queda en una línea que lo dice: escondido,
  // nadie comprobaba que estaba todo en orden (Richi, 26-sep).
  await hoy.getByRole('button', { name: /^Recordarme/ }).click();
  await expect(hoy.getByText('Todo en orden: nada urgente para hoy.')).toBeVisible();
  await expect(hoy.getByRole('listitem')).toHaveCount(0);
});

test('el «+» se aparta al bajar y vuelve al subir, solo en el móvil', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  const mas = page.getByRole('button', { name: 'Qué quieres hacer' });
  const opacidad = () => mas.evaluate((boton) => getComputedStyle(boton).opacity);
  await expect(mas).toBeVisible();
  // Que haya por dónde bajar: nada más entrar, los widgets todavía no han llegado y
  // la página no da para 500 px. Sin esto la prueba bajaba 30 y se quedaba ahí.
  await page.waitForFunction(
    () => document.documentElement.scrollHeight > window.innerHeight + 600,
    null,
    { timeout: 15_000 },
  );

  // `scrollBy` y no la rueda: en el Safari de móvil de las pruebas no hay rueda.
  await page.evaluate(() => {
    window.scrollBy(0, 500);
  });
  if (esMovil(page)) {
    await expect.poll(opacidad).toBe('0');
    await page.evaluate(() => {
      window.scrollBy(0, -200);
    });
    await expect.poll(opacidad).toBe('1');
  } else {
    // En el escritorio no se mueve: espera un poco para dar tiempo a equivocarse.
    await page.waitForTimeout(400);
    expect(await opacidad()).toBe('1');
  }
});

test('una ficha cerrada no deja un «Cargando» escondido en la pantalla', async ({ page }) => {
  // Con la ficha cerrada su consulta está apagada, y TanStack la da por pendiente
  // para siempre: el «Cargando la ficha» se quedaba vivo, escondido, anunciándose.
  await entrarEnLaApp(page, ROSA);
  for (const donde of ['equipo', 'equipo/personas', 'almacen/productos']) {
    await irA(page, donde);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 15_000 });
  }
});

test('«Entrar» no se mueve bajo el dedo cuando llega Google', async ({ page }) => {
  // Se retiene `como_se_entra`, que es lo que dice si hay Google, y se mide el botón
  // antes y después de soltarla. Antes de arreglarlo bajaba 94 px, y quien lo
  // pulsaba justo entonces tocaba el aire (lo cazó Safari en GitHub, 25-sep).
  let soltar: () => void = () => {};
  const retenida = new Promise<void>((listo) => {
    soltar = listo;
  });
  await page.route('**/v1/consultas/como_se_entra', async (ruta) => {
    await retenida;
    await ruta.continue();
  });
  await abrirSinQueSeCaiga(page, APP);

  const entrar = page.getByRole('button', { name: 'Entrar', exact: true });
  await expect(entrar).toBeVisible();
  const antes = await entrar.boundingBox();

  soltar();
  await page.waitForResponse('**/v1/consultas/como_se_entra');
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  const despues = await entrar.boundingBox();
  expect(despues?.y).toBe(antes?.y);
});
