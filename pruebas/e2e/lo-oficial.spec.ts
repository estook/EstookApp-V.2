import { expect, test, type APIRequestContext } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { API, APP, ejecutarEnLaApi, entrarEnLaApp, irA, tokenDe } from './en-la-app.ts';

/**
 * C2 · lo oficial del chat, desde la pantalla (decisión 0075).
 *
 * Lo que tiene que funcionar con el dedo: pedir «Confirmar que lo he leído» y ver quién
 * lo ha hecho, el botón grande de confirmar, fijar arriba, cambiar el nombre y borrar
 * un canal, y mandar un producto al chat como tarjeta. Las reglas de quién puede qué,
 * una a una, están en `base-de-datos/pruebas/lo-oficial.prueba.ts`.
 *
 * Cada vuelta trabaja en un canal suyo: la base es la misma para los tres navegadores.
 */

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro

async function suId(request: APIRequestContext, token: string): Promise<string> {
  const respuesta = await request.get(`${API}/v1/consultas/quien_soy`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const cuerpo = (await respuesta.json()) as { datos: { personaId: string } };
  return cuerpo.datos.personaId;
}

async function unCanalPropio(request: APIRequestContext, nombre: string): Promise<string> {
  const rosa = await tokenDe(request, ROSA);
  const marcos = await tokenDe(request, MARCOS);
  await ejecutarEnLaApi(request, rosa, 'abrir_el_chat', {});
  await ejecutarEnLaApi(request, marcos, 'abrir_el_chat', {});
  const { canalId } = await ejecutarEnLaApi<{ canalId: string }>(request, rosa, 'crear_canal', {
    nombre,
    personas: [await suId(request, marcos)],
  });
  return canalId;
}

test('pedir que confirmen, fijarlo arriba, renombrar el canal y borrarlo', async ({
  page,
  request,
}, info) => {
  const marca = `${info.project.name}-${String(Date.now())}`;
  const nombre = `Oficial ${marca.slice(-6)}`;
  const canalId = await unCanalPropio(request, nombre);

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/chat/${canalId}`);
  const conversacion = page.getByRole('region', { name: 'Conversación' });
  await expect(conversacion.getByRole('heading', { name: nombre, level: 2 })).toBeVisible();

  // Escribe, y el interruptor de confirmar sale al escribir.
  await conversacion
    .getByRole('textbox', { name: 'Escribe un mensaje' })
    .fill(`El lunes no hay pescado ${marca}`);
  const pedir = conversacion.getByRole('button', { name: 'Pedir que confirmen que lo han leído' });
  await pedir.click();
  await expect(pedir).toHaveAttribute('aria-pressed', 'true');
  await conversacion.getByRole('button', { name: 'Mandar' }).click();

  const suyo = conversacion.getByRole('listitem').filter({ hasText: `no hay pescado ${marca}` });
  await expect(suyo.getByRole('button', { name: 'Opciones del mensaje' })).toBeVisible();
  await expect(suyo.getByText('Pide confirmar')).toBeVisible();
  await expect(suyo.getByRole('button', { name: '0 de 1 lo han confirmado' })).toBeVisible();

  // Marcos lo confirma; a Rosa le sale, y quién falta queda vacío.
  const marcos = await tokenDe(request, MARCOS);
  const mensajes = await request.get(`${API}/v1/consultas/un_canal?canal_id=${canalId}`, {
    headers: { authorization: `Bearer ${marcos}` },
  });
  const { datos } = (await mensajes.json()) as {
    datos: { mensajes: { id: string; texto: string | null }[] };
  };
  const pedido = datos.mensajes.find((m) => m.texto?.includes(marca));
  await ejecutarEnLaApi(request, marcos, 'confirmar_mensaje', { mensaje_id: pedido?.id });
  await recargarSinQueSeCaiga(page);
  await expect(suyo.getByRole('button', { name: '1 de 1 lo han confirmado' })).toBeVisible();

  // Fijarlo arriba: sale la franja, y desde ella se ve.
  await suyo.getByRole('button', { name: 'Opciones del mensaje' }).click();
  await page.getByRole('button', { name: 'Fijar arriba' }).click();
  const franja = conversacion.getByRole('button', { name: 'Fijados: 1' });
  await expect(franja).toBeVisible();
  await expect(suyo.getByText('Fijado', { exact: true })).toBeVisible();
  await franja.click();
  const fijados = page.getByRole('dialog', { name: 'Fijados' });
  await expect(fijados.getByText(`El lunes no hay pescado ${marca}`)).toBeVisible();
  await fijados.getByRole('button', { name: 'Quitar' }).click();
  await expect(franja).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Cambiarle el nombre y borrarlo.
  await conversacion.getByRole('button', { name: 'Opciones de la conversación' }).click();
  const opciones = page.getByRole('dialog', { name: nombre });
  await opciones.getByRole('button', { name: 'Cambiar el nombre' }).click();
  await opciones.getByLabel('Nombre del canal').fill(`${nombre} bis`);
  await opciones.getByRole('button', { name: 'Guardar' }).click();
  await expect(
    conversacion.getByRole('heading', { name: `${nombre} bis`, level: 2 }).first(),
  ).toBeVisible();

  await page.getByRole('dialog').getByRole('button', { name: 'Borrar el canal' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Borrar el canal' }).click();
  await expect(page).toHaveURL(/#\/chat$/);
  await expect(page.getByRole('button', { name: new RegExp(`^${nombre} bis`) })).toHaveCount(0);
});

test('a quien se lo piden le sale el botón grande, y al pulsarlo queda confirmado', async ({
  page,
  request,
}, info) => {
  const marca = `${info.project.name}-${String(Date.now())}`;
  const canalId = await unCanalPropio(request, `Confirmar ${marca.slice(-6)}`);
  const rosa = await tokenDe(request, ROSA);
  await ejecutarEnLaApi(request, rosa, 'escribir_en_el_chat', {
    canal_id: canalId,
    texto: `Norma de alérgenos nueva ${marca}`,
    pide_confirmar: true,
  });

  await entrarEnLaApp(page, MARCOS);
  await abrirSinQueSeCaiga(page, `${APP}#/chat/${canalId}`);
  const conversacion = page.getByRole('region', { name: 'Conversación' });
  const suyo = conversacion.getByRole('listitem').filter({ hasText: `alérgenos nueva ${marca}` });
  await suyo.getByRole('button', { name: 'Confirmar que lo he leído' }).click();
  await expect(suyo.getByText('Confirmado', { exact: true })).toBeVisible();
  await expect(suyo.getByRole('button', { name: 'Confirmar que lo he leído' })).toHaveCount(0);
});

test('un producto, al chat como tarjeta, que se abre en su ficha', async ({
  page,
  request,
}, info) => {
  const marca = `${info.project.name}-${String(Date.now())}`;
  const nombreDelCanal = `Tarjetas ${marca.slice(-6)}`;
  await unCanalPropio(request, nombreDelCanal);
  const producto = `Pulpo de tarjeta ${marca}`;
  const rosa = await tokenDe(request, ROSA);
  await ejecutarEnLaApi(request, rosa, 'crear_producto', {
    nombre: producto,
    unidad_de_uso: 'kg',
    zona: 'cocina',
    cantidad_inicial: 2,
  });

  await entrarEnLaApp(page, ROSA);
  await irA(page, 'almacen/productos/todo');
  await page.getByLabel('Buscar en tu género').fill(producto);
  await page.getByText(producto).filter({ visible: true }).first().click();
  const ficha = page.getByRole('dialog', { name: producto });
  await ficha.getByRole('button', { name: 'Al chat' }).click();

  const mandar = page.getByRole('dialog', { name: 'Mandar el producto al chat' });
  await mandar.getByRole('radio', { name: nombreDelCanal }).click();
  await mandar.getByLabel('Una línea, si quieres').fill('Se está acabando');
  await mandar.getByRole('button', { name: 'Mandar', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Mandado' })
    .getByRole('button', { name: 'Abrir el chat' })
    .click();

  const conversacion = page.getByRole('region', { name: 'Conversación' });
  const tarjeta = conversacion.getByRole('button', { name: new RegExp(producto) });
  await expect(tarjeta).toBeVisible();
  await expect(conversacion.getByText('Se está acabando')).toBeVisible();
  await tarjeta.click();
  await expect(page.getByRole('dialog', { name: producto })).toBeVisible();
});
