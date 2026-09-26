import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { API, APP, ejecutarEnLaApi, entrarEnLaApp, tokenDe } from './en-la-app.ts';

/**
 * Lo que vio Richi en su iPhone el 25-sep-2026, con la app instalada.
 *
 *   5  «Hoy» a veces salía y a veces no, o tardaba: la zona de atención se escondía
 *      con `:has(:empty)`, y WebKit no vuelve a mirarlo cuando un hijo se llena
 *      después. Ahora la esconde la página (`usarSinNadaDentro`).
 *      **Ojo:** el WebKit de las pruebas ya trae el arreglo de Apple (Safari 27), así
 *      que aquí pasa también con el código viejo (comprobado el 25-sep). Lo que caza
 *      que vuelva es `sin-has.prueba.ts`, que lee el código; esta mira que «Hoy» sale
 *      cuando llega el último y es lo único de la zona.
 *   7  Al deslizar, la barra de abajo subía a media pantalla y se quedaba ahí: el
 *      visor del iPhone colgado tras el teclado. Ahora lo pegado abajo baja lo que
 *      se ha quedado colgado, y con el teclado abierto se aparta (`anclaAbajo.ts`).
 *
 * Con Rosa, como las del Panel en el móvil.
 */
const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

const esMovil = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

test('«Hoy» aparece aunque llegue el último y sea lo único de la zona de atención', async ({
  page,
}) => {
  // Lo demás de la zona, vacío: sin el alta, sin la pregunta de la caja y sin «sin
  // precio». Así «Hoy» es lo único que la llena, como en el Panel de Richi.
  await page.route('**/v1/consultas/el_alta*', (ruta) => ruta.abort());
  await page.route('**/v1/consultas/mis_cierres*', (ruta) => ruta.abort());
  await page.route('**/v1/consultas/almacen_hoy*', async (ruta) => {
    const respuesta = await ruta.fetch();
    const cuerpo = (await respuesta.json()) as { datos: Record<string, unknown> };
    await ruta.fulfill({
      response: respuesta,
      json: { datos: { ...cuerpo.datos, sinPrecio: [] } },
    });
  });
  // Y «Hoy», el último en llegar: después de que la zona se haya pintado vacía.
  await page.route('**/v1/consultas/lo_de_hoy*', async (ruta) => {
    await new Promise((listo) => setTimeout(listo, 2_000));
    await ruta.fulfill({
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
    });
  });

  await entrarEnLaApp(page, ROSA);

  await expect(page.getByRole('region', { name: 'Hoy' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('1 producto está por debajo del mínimo')).toBeVisible();
});

test('la barra de abajo se queda en el borde aunque el visor del iPhone se cuelgue, y se aparta con el teclado', async ({
  page,
}) => {
  test.skip(!esMovil(page), 'La barra de abajo es del móvil.');
  await entrarEnLaApp(page, ROSA);

  const barra = page.getByRole('navigation', { name: 'Principal' });
  await expect(barra).toBeVisible();
  const alto = page.viewportSize()?.height ?? 0;

  // El visor visible, colgado 267 px por debajo como tras cerrar el teclado en la
  // app instalada. Aquí se finge, que en un navegador de pruebas no pasa.
  const fingirElVisor = (offsetTop: number, height: number) =>
    page.evaluate(
      ([arriba, altoVisible]) => {
        const visor = window.visualViewport;
        if (!visor) throw new Error('Sin visualViewport');
        Object.defineProperty(visor, 'offsetTop', { configurable: true, get: () => arriba });
        Object.defineProperty(visor, 'height', { configurable: true, get: () => altoVisible });
        visor.dispatchEvent(new Event('resize'));
      },
      [offsetTop, height] as const,
    );

  await fingirElVisor(267, alto);
  await expect.poll(() => barra.evaluate((nav) => getComputedStyle(nav).bottom)).toBe('-267px');

  // Con el teclado abierto (el visible, 300 px más bajo), la barra se aparta.
  await fingirElVisor(0, alto - 300);
  await expect(barra).toBeHidden();

  // Y al cerrarlo vuelve, en su sitio.
  await fingirElVisor(0, alto);
  await expect(barra).toBeVisible();
  await expect.poll(() => barra.evaluate((nav) => getComputedStyle(nav).bottom)).toBe('0px');
});

// ── 4 · El alta pide el mínimo, y la unidad se elige tocándola ──────────────

test('el alta pide el mínimo desde el principio y deja elegir kg o g tocando la unidad', async ({
  page,
}) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo`);
  await page.getByRole('button', { name: /^(Añadir producto|Añade tu primer producto)$/ }).click();
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });

  const nombre = `Carne picada del repaso ${String(Date.now())}`;
  await hoja.getByRole('button', { name: 'Crearlo a mano' }).click();
  await hoja.getByLabel(/^Producto/).fill(nombre);

  // Por peso, en kg de salida; se toca la unidad y se elige gramos.
  const unidad = hoja.getByLabel('Unidad de «Cuánto hay ahora»');
  await expect(unidad).toHaveValue('kg');
  await unidad.selectOption('g');
  await hoja.getByLabel('Cuánto hay ahora', { exact: true }).fill('500');
  // El mínimo, en el alta y en la misma unidad.
  await expect(hoja.getByLabel('Unidad de «Mínimo»')).toHaveValue('g');
  await hoja.getByLabel('Mínimo', { exact: true }).fill('200');

  await hoja.getByRole('button', { name: 'Guardar el producto' }).click();
  await expect(page.getByText('Lo que hay en cámara').first()).toBeVisible({ timeout: 15_000 });

  const ficha = page.getByRole('dialog', { name: nombre });
  await expect(ficha.getByText('200 g', { exact: true })).toBeVisible();
});

// ── 1 · Congelar ya no pregunta la caducidad ────────────────────────────────

test('congelar no pregunta la caducidad: dice cuándo avisará', async ({ page }) => {
  const token = await tokenDe(page.request, ROSA);
  const nombre = `Bacon del repaso ${String(Date.now())}`;
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    page.request,
    token,
    'crear_producto',
    { nombre, unidad_de_uso: 'kg', cantidad_inicial: 4 },
  );

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/almacen/productos/todo?producto=${productoId}`);
  const ficha = page.getByRole('dialog', { name: nombre });
  await ficha.getByRole('button', { name: 'Congelar una parte' }).click();

  const congelar = page.getByRole('dialog', { name: `Congelar ${nombre}` });
  await expect(congelar.getByText(/Te aviso cuando lleve 3 meses congelado/)).toBeVisible();
  await expect(congelar.getByLabel(/Caduca el/)).toHaveCount(0);
});

// ── 6 · El Tablón ────────────────────────────────────────────────────────────

test('el Tablón: se escribe desde el «+», sale en el Panel, y cada uno lo marca leído', async ({
  page,
}) => {
  const texto = `Reserva de 20 personas ${String(Date.now()).slice(-5)}`;
  await entrarEnLaApp(page, ROSA);

  await abrirSinQueSeCaiga(page, `${APP}#/?hacer=tablon`);
  const hoja = page.getByRole('dialog', { name: 'Escribir en el tablón' });
  await hoja.getByLabel(/^Qué/).fill(texto);
  await hoja.getByRole('radio', { name: 'Sala' }).click();
  await hoja.getByLabel('A qué hora').fill('17:00');
  await hoja.getByRole('button', { name: 'Poner en el tablón' }).click();
  await expect(hoja).toHaveCount(0);

  const tablon = page.getByRole('region', { name: 'Tablón' });
  // Solo la suya: los otros navegadores dejan sus notas en la misma base.
  const mia = tablon.getByRole('listitem').filter({ hasText: texto });
  await expect(mia).toBeVisible();
  // La suya cuenta como leída, y ve cuántos la han leído.
  await expect(mia.getByRole('button', { name: /Quién la ha leído: 0 personas/ })).toBeVisible();

  // Una de otra persona sale por leer, y se marca leída.
  const deSara = `Faltan servilletas ${String(Date.now()).slice(-5)}`;
  await ejecutarEnLaApi(page.request, await tokenDe(page.request, SARA), 'escribir_en_el_tablon', {
    texto: deSara,
  });
  await recargarSinQueSeCaiga(page);
  const suya = tablon.getByRole('listitem').filter({ hasText: deSara });
  await expect(suya).toBeVisible();
  await suya.getByRole('button', { name: 'Leído', exact: true }).click();
  await expect(suya.getByRole('button', { name: 'Leído', exact: true })).toHaveCount(0);

  // Y la suya la quita ella: la cruz pregunta, y «Quitar» la saca del tablón.
  await mia.getByRole('button', { name: `Quitar del tablón «${texto}»` }).click();
  await mia.getByRole('button', { name: 'Quitar', exact: true }).click();
  await expect(tablon.getByText(texto)).toHaveCount(0);
});

// ── 3 · La carta del local, subida ───────────────────────────────────────────

test('la carta se sube en Ajustes, se ve antes de publicarla, y la enseña su QR', async ({
  page,
}) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/local`);
  const tarjeta = page.locator('#tu-carta');
  await tarjeta.getByLabel('Elegir el PDF o las fotos de tu carta').setInputFiles({
    name: 'carta.png',
    mimeType: 'image/png',
    buffer: await unaPagina(page),
  });

  await expect(tarjeta.getByRole('img', { name: 'Página 1 de la carta' })).toBeVisible({
    timeout: 15_000,
  });
  await tarjeta.getByRole('button', { name: 'Publicar la carta' }).click();
  await expect(tarjeta.getByRole('link', { name: /Verla como el cliente/ })).toBeVisible({
    timeout: 15_000,
  });

  // Y la carta pública, sin sesión, la trae.
  const direccion =
    (await tarjeta.getByRole('link', { name: /Verla como el cliente/ }).getAttribute('href')) ?? '';
  const publica = await page.request.get(
    `${API}/v1/consultas/la_carta?direccion=${direccion.split('/carta/')[1] ?? ''}`,
  );
  const cuerpo = (await publica.json()) as { datos: { paginas: string[] } };
  expect(cuerpo.datos.paginas.length).toBeGreaterThan(0);

  // Se deja como estaba: las demás pruebas miran la carta sin páginas.
  await tarjeta.getByRole('button', { name: 'Quitarla' }).click();
  await expect(tarjeta.getByRole('button', { name: 'Subir la carta' })).toBeVisible();
});

/** Una página de carta de verdad, pintada en el navegador: un PNG de 800 × 1100. */
async function unaPagina(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const lienzo = document.createElement('canvas');
    lienzo.width = 800;
    lienzo.height = 1100;
    const pincel = lienzo.getContext('2d');
    if (pincel === null) return '';
    pincel.fillStyle = '#fff8ee';
    pincel.fillRect(0, 0, 800, 1100);
    pincel.fillStyle = '#222';
    pincel.font = '48px serif';
    pincel.fillText('Carta', 320, 120);
    pincel.fillText('Hamburguesa de buey · 14,90', 80, 300);
    return lienzo.toDataURL('image/png').split(',')[1] ?? '';
  });
  return Buffer.from(base64, 'base64');
}

test('una carta en PDF se pasa a páginas en el navegador, una por hoja', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/local`);
  const tarjeta = page.locator('#tu-carta');
  await tarjeta.getByLabel('Elegir el PDF o las fotos de tu carta').setInputFiles({
    name: 'carta.pdf',
    mimeType: 'application/pdf',
    buffer: unPdf(['Entrantes', 'Postres']),
  });

  // Dos hojas, dos páginas: las pinta PDF.js, que solo se descarga ahora.
  await expect(tarjeta.getByRole('img', { name: 'Página 2 de la carta' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(tarjeta.getByRole('button', { name: 'Publicar las 2 páginas' })).toBeVisible();
  await tarjeta.getByRole('button', { name: 'Dejarlo' }).click();
});

/**
 * Un PDF de verdad, escrito a mano: una hoja por título, con su texto. Las
 * posiciones del índice (`xref`) se cuentan, que es lo que un lector de PDF mira.
 */
function unPdf(titulos: readonly string[]): Buffer {
  const objetos: string[] = [];
  const paginas = titulos.map((_, i) => 4 + i * 2);
  objetos.push('<< /Type /Catalog /Pages 2 0 R >>');
  objetos.push(
    `<< /Type /Pages /Kids [${paginas.map((n) => `${String(n)} 0 R`).join(' ')}] /Count ${String(titulos.length)} >>`,
  );
  objetos.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  titulos.forEach((titulo, i) => {
    const contenido = `BT /F1 36 Tf 72 700 Td (${titulo}) Tj ET`;
    objetos.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${String(5 + i * 2)} 0 R >>`,
    );
    objetos.push(`<< /Length ${String(contenido.length)} >>\nstream\n${contenido}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const posiciones: number[] = [];
  objetos.forEach((objeto, i) => {
    posiciones.push(pdf.length);
    pdf += `${String(i + 1)} 0 obj\n${objeto}\nendobj\n`;
  });
  const indice = pdf.length;
  pdf += `xref\n0 ${String(objetos.length + 1)}\n0000000000 65535 f \n`;
  for (const posicion of posiciones) pdf += `${String(posicion).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${String(objetos.length + 1)} /Root 1 0 R >>\nstartxref\n${String(indice)}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}
