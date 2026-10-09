import { expect, test, type Page } from '@playwright/test';
import { APP, ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';
import { abrirSinQueSeCaiga } from './abrir.ts';

/**
 * M8, la segunda entrega (decisión 0079), desde la pantalla.
 *
 *   · Movimientos → Desviación: el food cost real, lo gastado de verdad entre dos
 *     inventarios y, de lo que se vende tal cual, lo que falta con su causa
 *   · emparejar una línea de la caja con su producto, desde la propia pantalla
 *   · la merma con su foto, que la camarera hace con el móvil, y que se ve en la lista
 *
 * Las cuentas —lo gastado y el food cost frente a una cuenta a mano, las ventanas de
 * caja, los días sin caja, el aviso del 3 %— están probadas contra Postgres en
 * `lo-gastado-y-la-desviacion.prueba.ts`. Aquí los dos inventarios son del mismo
 * momento, así que la caja no cae entre ellos: lo que falta es lo que nadie apuntó.
 */

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

/** Un día de caja propio de cada navegador y repetición: cerrar la caja de un día la sustituye. */
function unDiaDeCaja(proyecto: string, repeticion: number): string {
  const desfase = 40 + ['escritorio', 'movil-pequeno', 'movil-safari'].indexOf(proyecto) * 5;
  const dia = new Date(Date.now() - (desfase + repeticion) * 86_400_000);
  return dia.toISOString().slice(0, 10);
}

/** Una foto de verdad, pintada en el navegador. */
async function unaFoto(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const lienzo = document.createElement('canvas');
    lienzo.width = 900;
    lienzo.height = 700;
    const pincel = lienzo.getContext('2d');
    if (pincel === null) throw new Error('sin lienzo');
    pincel.fillStyle = 'tomato';
    pincel.fillRect(0, 0, 900, 700);
    return lienzo.toDataURL('image/png').split(',')[1] ?? '';
  });
  return Buffer.from(base64, 'base64');
}

test('la desviación: lo gastado de verdad, el food cost y emparejar la caja', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const sufijo = `${info.project.name}-${String(info.repeatEachIndex)}-${String(Date.now())}`;
  const producto = `Refresco ${sufijo}`;
  const rosa = await tokenDe(page.request, ROSA);
  const { productoId } = await ejecutarEnLaApi<{ productoId: string }>(
    page.request,
    rosa,
    'crear_producto',
    {
      nombre: producto,
      unidad_de_uso: 'ud',
      zona: 'sala',
      cantidad_inicial: 50,
      precio_centimos: 60,
    },
  );
  // La caja lo vende con su nombre de la caja.
  await ejecutarEnLaApi(page.request, rosa, 'cerrar_la_caja', {
    fecha: unDiaDeCaja(info.project.name, info.repeatEachIndex),
    total_centimos: 2400,
    lineas: [{ concepto: producto, unidades: 12, importe_centimos: 2400 }],
  });
  // Dos inventarios: había 50; se rompen 2, apuntados; y al volver a contar hay 40.
  await ejecutarEnLaApi(page.request, rosa, 'cerrar_recuento', {
    lineas: [{ producto_id: productoId, hay: 50 }],
  });
  await ejecutarEnLaApi(page.request, rosa, 'apuntar_merma', {
    producto_id: productoId,
    cuanto: 2,
    motivo: 'roto',
  });
  await ejecutarEnLaApi(page.request, rosa, 'cerrar_recuento', {
    lineas: [{ producto_id: productoId, hay: 40 }],
  });

  await entrarEnLaApp(page, ROSA);
  await irA(page, 'almacen/movimientos/desviacion');

  // El food cost real, con su porqué plegado.
  await expect(page.getByRole('heading', { name: 'Food cost real' })).toBeVisible();
  await expect(page.getByText('Cómo sale')).toBeVisible();

  // Lo gastado de verdad: 50 − 40 = 10.
  const tabla = page.getByRole('table').or(page.getByRole('list')).filter({ hasText: producto });
  await expect(tabla.getByText(producto).first()).toBeVisible();
  await expect(tabla.getByText('10 ud').first()).toBeVisible();

  // En la caja sin decir qué es: se propone el producto, y se empareja en dos toques.
  await page.getByRole('button', { name: `¿Es ${producto}?` }).click();
  const hoja = page.getByRole('dialog', { name: `«${producto}» de la caja` });
  await expect(hoja).toBeVisible();
  await hoja.getByRole('button', { name: 'Es este producto' }).click();
  await expect(hoja).toBeHidden();

  // Ya se vende tal cual: faltan 8 (10 gastadas, 2 rotas apuntadas), con su causa.
  const suya = page
    .getByRole('listitem')
    .filter({ hasText: producto })
    .filter({ hasText: 'Faltan' });
  await expect(suya.getByText('Faltan 8 ud · 4,80 €')).toBeVisible();
  await suya.getByText('Salidas sin apuntar').click();
  await expect(
    suya.getByText(/comida del personal, invitaciones o roturas sin apuntar/),
  ).toBeVisible();
  await expect(suya.getByRole('button', { name: 'Mirar las mermas' })).toBeVisible();
});

test('la merma con su foto: la hace la camarera, y se ve en la lista', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(90_000);
  const nombre = `Copa ${info.project.name}-${String(info.repeatEachIndex)}-${String(Date.now())}`;
  const rosa = await tokenDe(page.request, ROSA);
  await ejecutarEnLaApi(page.request, rosa, 'crear_producto', {
    nombre,
    unidad_de_uso: 'ud',
    zona: 'sala',
    cantidad_inicial: 24,
    precio_centimos: 250,
  });

  await entrarEnLaApp(page, SARA);
  await abrirSinQueSeCaiga(page, `${APP}#/?hacer=merma`);
  const hoja = page.getByRole('dialog', { name: 'Apuntar una merma' });
  await hoja.getByLabel('Qué se ha ido').fill(nombre);
  await hoja.getByRole('button', { name: new RegExp(nombre) }).click();
  await hoja.getByLabel('Cuánto', { exact: true }).fill('1');
  await hoja.getByRole('radio', { name: /^Se ha caído o roto/ }).click();

  // El cuarto toque, que se puede saltar: la foto, reducida en el móvil.
  await hoja.getByLabel('Elegir la foto de la merma').setInputFiles({
    name: 'copa.png',
    mimeType: 'image/png',
    buffer: await unaFoto(page),
  });
  await expect(hoja.getByRole('img', { name: 'La foto de lo que se tira' })).toBeVisible();
  const subida = page.waitForRequest((p) => p.url().includes('/comandos/poner_foto_de_merma'));
  await hoja.getByRole('button', { name: 'Apuntar', exact: true }).click();
  const cuerpo = (await subida).postDataJSON() as { tipo: string; foto: string };
  expect(['image/webp', 'image/jpeg']).toContain(cuerpo.tipo);
  await expect(hoja.getByText(/apuntado con su foto/)).toBeVisible({ timeout: 15_000 });

  // Quien lleva el local la ve en la lista de mermas.
  const deRosa = await browser.newPage({
    viewport: page.viewportSize() ?? { width: 1280, height: 800 },
  });
  await entrarEnLaApp(deRosa, ROSA);
  await irA(deRosa, 'almacen/mermas');
  await deRosa.getByLabel('Buscar', { exact: true }).fill(nombre);
  await expect(deRosa.getByRole('link', { name: 'Ver la foto' }).first()).toBeVisible({
    timeout: 15_000,
  });
  await deRosa.close();
});
