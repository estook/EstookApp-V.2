import { expect, test } from '@playwright/test';
import { API, ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * La auditoría del 20-oct (decisión 0101), en la pantalla.
 *
 * Lo del servidor está en `base-de-datos/pruebas/la-auditoria-del-20-oct.prueba.ts`; aquí,
 * lo que solo se ve con el dedo.
 */

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro

/**
 * **El precio escrito con IVA se queda como se escribió.** Se guarda sin IVA y al
 * céntimo, y al salir del campo se volvía a calcular con IVA: uno de cada seis precios
 * al 21 % cambiaba un céntimo delante de quien lo escribía («pongo 0,32 y pone 0,31»).
 */
test('un precio escrito con IVA no cambia al salir del campo', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await irA(page, 'almacen/productos');

  await page.getByRole('button', { name: /^Añad/ }).first().click();
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });
  await hoja.getByLabel('¿Qué producto es?').fill('Cerveza quinto');
  await hoja.getByText('Cerveza quinto', { exact: true }).first().click();

  await hoja.getByRole('radio', { name: 'Con IVA' }).click();
  const precio = hoja.getByRole('textbox', { name: 'Precio de la caja', exact: true });
  await precio.fill('0,32');
  await precio.blur();

  await expect(precio).toHaveValue('0,32');
  await expect(hoja.getByText('Se guarda 0,26 € sin IVA (21 %).')).toBeVisible();
});

/**
 * **Dos toques seguidos apuntan una vez.** La app manda cada comando con una clave
 * nueva, así que lo que impide la entrada doble es que el botón se apague al primer
 * toque. Con mala cobertura es justo cuando se toca dos veces.
 */
test('un doble toque en «Apuntar la entrada» apunta una sola vez', async ({ page, request }) => {
  const nombre = `Harina de la auditoría ${String(Date.now())}`;
  const rosa = await tokenDe(request, ROSA);
  const creado = await ejecutarEnLaApi<{ productoId: string }>(request, rosa, 'crear_producto', {
    nombre,
    unidad_de_uso: 'kg',
    factor: 1,
    precio_centimos: 90,
    cantidad_inicial: 10,
  });
  const productoId = creado.productoId;

  await entrarEnLaApp(page, ROSA);
  await irA(page, 'almacen/productos/todo');
  await page.getByLabel('Buscar en tu género').fill(nombre);
  await page.locator(`[aria-label="Ha llegado ${nombre}"] >> visible=true`).click();
  const llega = page.getByRole('dialog', { name: new RegExp(`Ha llegado género · ${nombre}`) });
  await llega.getByLabel(/^Cuánto/).fill('5');
  await llega.getByRole('button', { name: 'Apuntar la entrada' }).dblclick();
  await expect(llega).toHaveCount(0);

  const respuesta = await request.get(`${API}/v1/consultas/un_producto?producto_id=${productoId}`, {
    headers: { authorization: `Bearer ${rosa}` },
  });
  const ficha = (await respuesta.json()) as { datos: { producto: { cantidad: number } } };
  expect(ficha.datos.producto.cantidad).toBe(15);
});
