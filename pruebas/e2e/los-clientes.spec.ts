import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { API, APP } from './en-la-app.ts';
import { codigoAhora, entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * A2 · Los clientes, en el admin (decisión 0041 · migración 0049), desde la pantalla.
 *
 * Lo que hace Richi con un cliente: encontrarlo, abrir su ficha, apuntar una nota y
 * fijarla, hacerlo de la casa con un motivo, cambiarle el correo de acceso —y que
 * el enlace del correo nuevo lo confirme en la app— y exportar la lista.
 *
 * Las reglas —quién lee la lista, que lo delicado pide motivo y código, que cada
 * enlace vale una vez— están probadas llamando a la API a pelo, en
 * `base-de-datos/pruebas/los-clientes.prueba.ts`. Aquí, que la pantalla llega.
 *
 * Cada navegador crea **sus** cuentas: corren a la vez, y compartirlas haría que
 * uno cambiara lo que el otro está mirando.
 */

function unico(info: { project: { name: string } }): string {
  return `${info.project.name}-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;
}

/**
 * Una cuenta nueva por la API, desde una dirección suya: crear cuentas tiene un
 * tope por dirección y hora, y todas las pruebas llegan desde el mismo ordenador.
 */
async function cuentaNueva(
  request: APIRequestContext,
  correo: string,
  negocio: string,
): Promise<string> {
  const desde = `10.${String(Math.floor(Math.random() * 250))}.${String(Math.floor(Math.random() * 250))}.${String(Math.floor(Math.random() * 250) + 1)}`;
  const pedir = await request.post(`${API}/v1/comandos/pedir_codigo_de_registro`, {
    headers: { 'x-idempotencia': `registro-${correo}`, 'x-forwarded-for': desde },
    data: {
      nombre: 'Lucía',
      negocio,
      correo,
      contrasena: 'una frase que recuerdo',
      aceptaCondiciones: true,
    },
  });
  expect(pedir.status(), await pedir.text()).toBe(200);
  const { asunto } = (await (
    await request.get(`${API}/pruebas/ultimo-correo?para=${encodeURIComponent(correo)}`)
  ).json()) as { asunto: string };
  const confirmar = await request.post(`${API}/v1/comandos/confirmar_registro`, {
    headers: { 'x-idempotencia': `confirmar-${correo}`, 'x-forwarded-for': desde },
    data: { correo, codigo: /\b(\d{6})\b/.exec(asunto)?.[1] ?? '' },
  });
  expect(confirmar.status(), await confirmar.text()).toBe(200);
  return ((await confirmar.json()) as { datos: { token: string } }).datos.token;
}

/** Pagar Esencial por la API: la página del Stripe de mentira paga al abrirla. */
async function pagar(request: APIRequestContext, token: string) {
  const cabeceras = (que: string) => ({
    authorization: `Bearer ${token}`,
    'x-idempotencia': `${que}-${String(Date.now())}-${String(Math.random())}`,
  });
  const empezar = await request.post(`${API}/v1/comandos/empezar_a_pagar`, {
    headers: cabeceras('pagar'),
    data: { plan: 'esencial', intervalo: 'mes' },
  });
  const { url } = ((await empezar.json()) as { datos: { url: string } }).datos;
  await request.get(url, { maxRedirects: 0 });
  const volver = await request.post(`${API}/v1/comandos/volver_del_pago`, {
    headers: cabeceras('volver'),
    data: { sesion: new URL(url).searchParams.get('sesion') ?? '' },
  });
  expect(volver.status(), await volver.text()).toBe(200);
}

/** Buscar a un cliente y abrir su ficha. La tabla se pinta dos veces: se pulsa la que se ve. */
async function abrirLaFicha(page: Page, nombre: string) {
  await page.getByLabel('Buscar').fill(nombre);
  await page
    .getByRole('button', { name: `Abrir ${nombre}` })
    .filter({ visible: true })
    .first()
    .click();
  const ficha = page.getByRole('dialog', { name: nombre });
  await expect(ficha).toBeVisible();
  return ficha;
}

test('se busca un cliente, se abre su ficha, y una nota se apunta y se fija', async ({
  page,
  request,
}, info) => {
  const nombre = `Mesón ${unico(info)}`;
  await cuentaNueva(request, `meson-${unico(info)}@correo-de-prueba.com`, nombre);

  await entrarEnElAdmin(page);
  // Lo que se cobra, arriba, sin contar ejemplos.
  await expect(page.getByText(/pagan? · .* al mes/)).toBeVisible();

  await page.getByRole('tab', { name: /^Sin pagar/ }).click();
  const ficha = await abrirLaFicha(page, nombre);
  await expect(ficha.getByText('Sin pagar', { exact: true })).toBeVisible();
  await expect(ficha.getByText('No ha pagado nunca')).toBeVisible();

  await ficha.getByRole('tab', { name: 'Notas' }).click();
  await ficha.getByLabel('Una nota').fill('Llamó: quiere probar Pro en octubre');
  await ficha.getByRole('button', { name: 'Guardar la nota' }).click();
  const nota = ficha.getByRole('listitem').filter({ hasText: 'Llamó: quiere probar Pro' });
  await expect(nota).toBeVisible();
  await nota.getByRole('button', { name: 'Fijar arriba' }).click();
  await expect(nota.getByRole('button', { name: 'Soltar' })).toBeVisible();

  // En el resumen, lo fijado.
  await ficha.getByRole('tab', { name: 'Resumen' }).click();
  await expect(ficha.getByText('Notas fijadas')).toBeVisible();

  // Y en su actividad, lo que ha hecho el admin.
  await ficha.getByRole('tab', { name: 'Actividad' }).click();
  await expect(ficha.getByText('Escribió una nota')).toBeVisible();
});

test('de la casa, con un motivo que queda en su historial', async ({ page, request }, info) => {
  const nombre = `Bar de un socio ${unico(info)}`;
  await cuentaNueva(request, `socio-${unico(info)}@correo-de-prueba.com`, nombre);

  await entrarEnElAdmin(page);
  const ficha = await abrirLaFicha(page, nombre);
  await ficha.getByRole('tab', { name: 'Suscripción' }).click();
  await ficha.getByRole('button', { name: 'Hacer de la casa' }).click();

  const hoja = page.getByRole('dialog', { name: 'De la casa' });
  await hoja.getByLabel('Por qué').fill('Es el bar de un socio');
  await hoja.getByRole('button', { name: 'Guardar' }).click();
  await expect(hoja).toHaveCount(0);

  await expect(ficha.getByText('De la casa', { exact: true }).first()).toBeVisible();
  await expect(ficha.getByText(/Estook · de la casa: Es el bar de un socio/)).toBeVisible();
});

test('el contacto comercial se edita, y el nombre se cambia con motivo', async ({
  page,
  request,
}, info) => {
  const nombre = `Asador ${unico(info)}`;
  await cuentaNueva(request, `asador-${unico(info)}@correo-de-prueba.com`, nombre);

  await entrarEnElAdmin(page);
  const ficha = await abrirLaFicha(page, nombre);
  await ficha.getByRole('tab', { name: 'Datos' }).click();
  await ficha.getByRole('button', { name: 'Editar' }).click();
  const contacto = page.getByRole('dialog', { name: 'El contacto comercial' });
  await contacto.getByLabel('Responsable del contrato').fill('Lucía Pérez');
  await contacto.getByLabel('Teléfono').fill('+34 600 111 222');
  await contacto.getByRole('button', { name: 'Guardar' }).click();
  await expect(contacto).toHaveCount(0);
  await expect(ficha.getByText('Lucía Pérez')).toBeVisible();

  await ficha.getByRole('button', { name: 'Cambiar el nombre' }).click();
  const hoja = page.getByRole('dialog', { name: 'Cambiar el nombre' });
  await hoja.getByLabel('Nombre').fill(`${nombre} Nuevo`);
  await hoja.getByLabel('Por qué').fill('Lo pidió por teléfono');
  await hoja.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('dialog', { name: `${nombre} Nuevo` })).toBeVisible();
});

test('a quien paga se le cancela al acabar el periodo, y se deshace', async ({
  page,
  request,
}, info) => {
  const nombre = `Bar que cierra ${unico(info)}`;
  const token = await cuentaNueva(request, `cierra-${unico(info)}@correo-de-prueba.com`, nombre);
  await pagar(request, token);

  await entrarEnElAdmin(page);
  const ficha = await abrirLaFicha(page, nombre);
  await ficha.getByRole('tab', { name: 'Suscripción' }).click();
  await ficha.getByRole('button', { name: 'Cancelar al acabar' }).click();
  const hoja = page.getByRole('dialog', { name: 'Cancelar al acabar' });
  await hoja.getByLabel('Por qué').fill('Cierra el bar en octubre');
  await hoja.getByRole('button', { name: 'Guardar' }).click();
  await expect(ficha.getByText('Se va al acabar').first()).toBeVisible();

  await ficha.getByRole('button', { name: 'Que siga' }).click();
  await hoja.getByLabel('Por qué').fill('Al final sigue');
  await hoja.getByRole('button', { name: 'Guardar' }).click();
  await expect(ficha.getByRole('button', { name: 'Cancelar al acabar' })).toBeVisible();
});

test('el correo de acceso se cambia con el enlace que llega al nuevo', async ({
  page,
  request,
}, info) => {
  const nombre = `Taberna ${unico(info)}`;
  const nuevo = `nuevo-${unico(info)}@correo-de-prueba.com`;
  const viejo = `viejo-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(request, viejo, nombre);

  await entrarEnElAdmin(page);
  const ficha = await abrirLaFicha(page, nombre);
  await ficha.getByRole('tab', { name: 'Personas' }).click();

  const pedirElCambio = async () => {
    await ficha.getByRole('button', { name: 'Cambiar el correo de acceso' }).click();
    const hoja = page.getByRole('dialog', { name: 'Cambiar el correo de acceso' });
    await hoja.getByLabel('El correo nuevo').fill(nuevo);
    await hoja.getByLabel('Por qué').fill('Perdió el acceso al correo viejo');
    await hoja.getByLabel('Tu código, otra vez').fill(codigoAhora());
    await hoja.getByRole('button', { name: 'Mandar los dos correos' }).click();
    await expect(hoja.getByText('Mandados los dos correos')).toBeVisible();
    await hoja.getByRole('button', { name: 'Hecho' }).click();
  };

  // Primero, quien tiene el correo de ahora lo para desde su aviso.
  await pedirElCambio();
  const aviso = (await (
    await request.get(`${API}/pruebas/ultimo-correo?para=${encodeURIComponent(viejo)}`)
  ).json()) as { texto: string };
  const parar = /#\/correo\?parar=\S+/.exec(aviso.texto)?.[0] ?? '';
  expect(parar).not.toBe('');
  const otra = await page.context().newPage();
  await abrirSinQueSeCaiga(otra, `${APP}${parar}`);
  await otra.getByRole('button', { name: 'Parar el cambio' }).click();
  await expect(otra.getByRole('heading', { name: 'Cambio parado' })).toBeVisible();
  await otra.close();

  // Y se vuelve a pedir, y esta vez se confirma.
  await pedirElCambio();

  // El enlace del correo nuevo, abierto en la app: no hace nada hasta pulsar.
  const { texto } = (await (
    await request.get(`${API}/pruebas/ultimo-correo?para=${encodeURIComponent(nuevo)}`)
  ).json()) as { texto: string };
  const enlace = /#\/correo\?confirmar=\S+/.exec(texto)?.[0] ?? '';
  expect(enlace).not.toBe('');
  await abrirSinQueSeCaiga(page, `${APP}${enlace}`);
  await expect(page.getByRole('heading', { name: 'Confirma tu correo nuevo' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar el correo' }).click();
  await expect(page.getByRole('heading', { name: 'Correo cambiado' })).toBeVisible();
  await expect(page.getByText(`Desde ahora entras con ${nuevo}`)).toBeVisible();
});

test('se exporta lo que se ve, con el código otra vez', async ({ page }) => {
  await entrarEnElAdmin(page);
  await page.getByRole('button', { name: 'Exportar' }).click();
  const hoja = page.getByRole('dialog', { name: 'Exportar los clientes' });
  await hoja.getByLabel('Tu código, otra vez').fill(codigoAhora());

  const descarga = page.waitForEvent('download');
  await hoja.getByRole('button', { name: 'Descargar el CSV' }).click();
  const fichero = await descarga;
  expect(fichero.suggestedFilename()).toMatch(/^clientes-estook-\d{4}-\d{2}-\d{2}\.csv$/);
  const contenido = readFileSync(await fichero.path(), 'utf8');
  // Con la marca de UTF-8 delante, para que Excel no rompa los acentos.
  expect(contenido.charCodeAt(0)).toBe(0xfeff);
  expect(contenido.slice(1).startsWith('Cliente;Código;Contrato;Actividad')).toBe(true);
});

test('se ordena pulsando la cabecera, y la actividad se calcula en el momento', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'escritorio', 'Las cabeceras de la tabla son del ordenador');
  await entrarEnElAdmin(page);

  const nombre = page.getByRole('columnheader', { name: 'Cliente' });
  await nombre.getByRole('button').click();
  await expect(nombre).toHaveAttribute('aria-sort', 'ascending');
  await nombre.getByRole('button').click();
  await expect(nombre).toHaveAttribute('aria-sort', 'descending');

  await page.getByRole('button', { name: 'Calcular ahora' }).click();
  await expect(page.getByText(/^Actividad del \d{2}\/\d{2}\/\d{2}$/)).toBeVisible();
});
