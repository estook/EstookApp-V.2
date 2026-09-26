import { expect, test, type Page } from '@playwright/test';
import { ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * V · punto 5 · la foto de cada producto, desde la pantalla.
 *
 * Lo que el servidor ya prueba solo (`las-fotos-de-producto.prueba.ts`) no se
 * repite aquí. Aquí se mira **el camino que recorre una persona**: pulsar el
 * recuadro de la ficha, elegir una foto, que el teléfono la reduzca antes de
 * subirla, que salga en la ficha y en la lista, y quitarla.
 *
 * La foto se pinta en el propio navegador —1200 × 900, más grande que las 800 de
 * la ficha— para que la reducción tenga algo que reducir. Y se mira lo que viaja:
 * WebP donde el navegador sabe escribirlo, JPG en Safari, y nunca los megas de la
 * cámara.
 */
const ROSA = 'rosa@ejemplo.estook.com';

/** Una foto de verdad, hecha en el navegador: un degradado, que no comprime a nada. */
async function unaFoto(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const lienzo = document.createElement('canvas');
    lienzo.width = 1200;
    lienzo.height = 900;
    const pincel = lienzo.getContext('2d');
    if (pincel === null) throw new Error('sin lienzo');
    const degradado = pincel.createLinearGradient(0, 0, 1200, 900);
    degradado.addColorStop(0, 'tomato');
    degradado.addColorStop(1, 'steelblue');
    pincel.fillStyle = degradado;
    pincel.fillRect(0, 0, 1200, 900);
    return lienzo.toDataURL('image/png').split(',')[1] ?? '';
  });
  return Buffer.from(base64, 'base64');
}

test('se pone una foto desde la ficha, sale en la lista, y se quita', async ({ page, request }) => {
  const nombre = `Tomate con foto ${Date.now()}`;
  const token = await tokenDe(request, ROSA);
  await ejecutarEnLaApi(request, token, 'crear_producto', {
    nombre,
    unidad_de_uso: 'kg',
    zona: 'cocina',
    cantidad_inicial: 4,
  });

  await entrarEnLaApp(page, ROSA);
  await irA(page, 'almacen/productos/todo');
  await page.getByLabel('Buscar en tu género').fill(nombre);
  await page.getByText(nombre).filter({ visible: true }).first().click();

  const ficha = page.getByRole('dialog', { name: nombre });
  await expect(ficha).toBeVisible();

  // Sin foto, el recuadro es el botón de ponerla.
  await expect(ficha.getByRole('button', { name: `Poner una foto de ${nombre}` })).toBeVisible();

  // Lo que viaja: reducido y en WebP o JPG, nunca el PNG de 1200 px que se eligió.
  const subida = page.waitForRequest((p) => p.url().includes('/comandos/poner_foto_de_producto'));
  await ficha.getByLabel(`Elegir la foto de ${nombre}`).setInputFiles({
    name: 'tomate.png',
    mimeType: 'image/png',
    buffer: await unaFoto(page),
  });
  const cuerpo = (await subida).postDataJSON() as { tipo: string; foto: string; miniatura: string };
  expect(['image/webp', 'image/jpeg']).toContain(cuerpo.tipo);
  expect(cuerpo.foto.length, 'la foto viaja reducida').toBeLessThan(200 * 1024);
  expect(cuerpo.miniatura.length, 'y la miniatura, más').toBeLessThan(30 * 1024);

  await expect(ficha.getByText('Foto puesta')).toBeVisible({ timeout: 15_000 });
  const verla = ficha.getByRole('button', { name: `Ver la foto de ${nombre}` });
  await expect(verla).toBeVisible();
  await expect(verla.locator('img')).toHaveAttribute('src', /^data:image\/(webp|jpeg)/);

  // En la lista, su miniatura en la fila, cargando cuando se ve.
  await page.keyboard.press('Escape');
  await expect(ficha).toBeHidden();
  const miniatura = page
    .locator('img[loading="lazy"][src^="data:image"]')
    .filter({ visible: true });
  await expect(miniatura.first()).toBeVisible({ timeout: 15_000 });

  // Y se quita desde la foto en grande.
  await page.getByText(nombre).filter({ visible: true }).first().click();
  await expect(ficha).toBeVisible();
  await ficha.getByRole('button', { name: `Ver la foto de ${nombre}` }).click();
  const grande = page.getByRole('dialog', { name: nombre }).last();
  await expect(grande.getByRole('img', { name: `Foto de ${nombre}` })).toBeVisible();
  await grande.getByRole('button', { name: 'Quitar la foto' }).click();

  await expect(ficha.getByText('Foto quitada')).toBeVisible({ timeout: 15_000 });
  await expect(ficha.getByRole('button', { name: `Poner una foto de ${nombre}` })).toBeVisible();
});
