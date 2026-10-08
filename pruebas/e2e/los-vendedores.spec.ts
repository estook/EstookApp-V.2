import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * A3 · Los vendedores (decisión 0076 · migración 0058), desde la pantalla.
 *
 * Lo que hace Richi: dar de alta a un vendedor, hacerle un código con descuento y
 * sacar su QR. Lo que ve quien llega por el enlace: el descuento en la portada, el
 * código ya escrito al crear la cuenta y el descuento al elegir plan. Y lo que ve
 * Richi después: con quién vino ese cliente y las cifras del vendedor.
 *
 * Las reglas —quién lo lee, que el código no se cambia, cuándo se pone el descuento
 * en Stripe— están probadas contra la base en `los-vendedores.prueba.ts`.
 *
 * Cada navegador hace **su** vendedor y **su** código: corren a la vez.
 */
const WEB = 'http://localhost:5173/';
const APP = 'http://localhost:5174/';
const API_DE_PRUEBAS = 'http://localhost:5177/api/pruebas';

function unico(): string {
  return `${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 1e4))}`;
}

/** La sección Vendedores del admin. */
async function aVendedores(page: Page) {
  await page
    .getByRole('navigation', { name: 'Secciones del admin' })
    .getByRole('button', { name: 'Vendedores' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vendedores' })).toBeVisible();
}

/** Da de alta a un vendedor con un código del 50 % y devuelve el código. */
async function unVendedorConCodigo(page: Page, nombre: string, codigo: string) {
  await entrarEnElAdmin(page);
  await aVendedores(page);
  await page.getByRole('button', { name: 'Nuevo vendedor' }).first().click();
  const alta = page.getByRole('dialog', { name: 'Nuevo vendedor' });
  await alta.getByLabel('Nombre').fill(nombre);
  await alta.getByLabel('Teléfono').fill('+34 600 123 456');
  await alta.getByRole('button', { name: 'Crear el vendedor' }).click();

  const ficha = page.getByRole('dialog', { name: nombre });
  await expect(ficha).toBeVisible();
  await ficha.getByRole('button', { name: 'Nuevo código' }).click();
  const hoja = page.getByRole('dialog', { name: 'Nuevo código' });
  await hoja.getByLabel('El código').fill(codigo.toLowerCase());
  await expect(hoja.getByText(`Su enlace: estook.com/?ref=${codigo}`)).toBeVisible();
  await hoja.getByLabel('Campaña').fill('Bares del barrio');
  await hoja.getByLabel('Descuento para el cliente').selectOption('50');
  await hoja.getByRole('button', { name: 'Crear el código' }).click();
  await expect(hoja).toHaveCount(0);
  await expect(ficha.getByText(codigo, { exact: true })).toBeVisible();
  await expect(ficha.getByText(/50 % el primer mes/)).toBeVisible();
  return ficha;
}

test('un vendedor, su código con descuento y su QR', async ({ page }) => {
  const codigo = `JUAN${unico()}`;
  const ficha = await unVendedorConCodigo(page, `Juan ${unico()}`, codigo);

  await ficha.getByRole('button', { name: 'El QR' }).click();
  const qr = page.getByRole('dialog', { name: `El QR de ${codigo}` });
  await expect(qr.getByRole('img', { name: `QR de ${codigo}` })).toBeVisible();
  await expect(qr.getByText(`https://estook.com/?ref=${codigo}`)).toBeVisible();
  const descarga = page.waitForEvent('download');
  await qr.getByRole('button', { name: 'Bajar en PNG' }).click();
  expect((await descarga).suggestedFilename()).toBe(`estook-${codigo.toLowerCase()}.png`);
});

test('quien llega por el enlace ve el descuento, crea su cuenta con el código, y el admin sabe con quién vino', async ({
  page,
  request,
}, info) => {
  const codigo = `ANA${unico()}`;
  const vendedor = `Ana ${unico()}`;
  await unVendedorConCodigo(page, vendedor, codigo);

  // La portada, con el enlace del vendedor.
  const web = await page.context().newPage();
  await abrirSinQueSeCaiga(web, `${WEB}?ref=${codigo}`);
  await expect(web.getByText(`Con ${codigo}: 50 % el primer mes`)).toBeVisible();
  await expect(
    web.getByRole('main').getByRole('link', { name: /Crear cuenta|Empezar la prueba/ }),
  ).toHaveAttribute('href', `app/?ref=${codigo}#/crear-cuenta`);
  await web.close();

  // Crear cuenta, con el código ya escrito.
  const app = await page.context().newPage();
  await abrirSinQueSeCaiga(app, `${APP}?ref=${codigo}#/crear-cuenta`);
  await expect(app.getByLabel('Código de vendedor')).toHaveValue(codigo);
  await expect(app.getByText('Código correcto: 50 % el primer mes.')).toBeVisible();

  const negocio = `Bar de ${vendedor}`;
  const correo = `bar-${unico()}-${info.project.name}@correo-de-prueba.com`;
  await app.getByLabel('El nombre de tu negocio').fill(negocio);
  await app.getByRole('checkbox').check();
  await app.getByLabel('Tu nombre').fill('Marta');
  await app.getByRole('textbox', { name: /Tu correo/ }).fill(correo);
  await app.getByLabel('Una contraseña').fill('una frase que recuerdo');
  await app.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(app.getByRole('heading', { level: 1, name: 'Mira tu correo' })).toBeVisible();
  const { asunto } = (await (
    await request.get(`${API_DE_PRUEBAS}/ultimo-correo?para=${encodeURIComponent(correo)}`)
  ).json()) as { asunto: string };
  await app.getByLabel('El código').fill(/\b(\d{6})\b/.exec(asunto)?.[1] ?? '');
  await app.getByRole('button', { name: 'Crear mi cuenta' }).click();

  // Al elegir plan, su descuento.
  await expect(app.getByText(`Con ${codigo}: 50 % el primer mes`)).toBeVisible();
  await app.getByRole('tab', { name: /Cada año/ }).click();
  await expect(app.getByText(/El descuento es para el pago mensual/)).toBeVisible();
  await app.close();

  // Y en el admin: en Clientes, con quién vino; en Vendedores, que lo ha traído.
  await page
    .getByRole('dialog', { name: vendedor })
    .getByRole('button', { name: 'Cerrar', exact: true })
    .first()
    .click();
  await page
    .getByRole('navigation', { name: 'Secciones del admin' })
    .getByRole('button', { name: 'Clientes' })
    .click();
  await page.getByLabel('Buscar').fill(codigo);
  await expect(page.getByRole('heading', { name: '1 cliente', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: `Abrir ${negocio}` })
    .filter({ visible: true })
    .first()
    .click();
  const ficha = page.getByRole('dialog', { name: negocio });
  await expect(ficha.getByText(`Con ${vendedor} · ${codigo}`)).toBeVisible();
  await ficha.getByRole('button', { name: 'Cerrar', exact: true }).first().click();

  await aVendedores(page);
  const tarjeta = page.getByRole('button', { name: `Abrir ${vendedor}` });
  await expect(tarjeta).toContainText('Traídos');
  await expect(tarjeta).toContainText('1 este mes');
});

test('se edita, se le pone a un cliente que se olvidó del código, se cierra el código y se da de baja', async ({
  page,
  request,
}, info) => {
  // Un cliente sin código, por la API.
  const negocio = `Bar olvidadizo ${unico()}`;
  const correo = `olvido-${unico()}-${info.project.name}@correo-de-prueba.com`;
  const desde = `10.${String(Math.floor(Math.random() * 250))}.${String(Math.floor(Math.random() * 250))}.${String(Math.floor(Math.random() * 250) + 1)}`;
  const pedir = await request.post(
    'http://localhost:5177/api/v1/comandos/pedir_codigo_de_registro',
    {
      headers: { 'x-idempotencia': `registro-${correo}`, 'x-forwarded-for': desde },
      data: {
        nombre: 'Luis',
        negocio,
        correo,
        contrasena: 'una frase que recuerdo',
        aceptaCondiciones: true,
      },
    },
  );
  expect(pedir.status(), await pedir.text()).toBe(200);
  const { asunto } = (await (
    await request.get(`${API_DE_PRUEBAS}/ultimo-correo?para=${encodeURIComponent(correo)}`)
  ).json()) as { asunto: string };
  const confirmar = await request.post('http://localhost:5177/api/v1/comandos/confirmar_registro', {
    headers: { 'x-idempotencia': `confirmar-${correo}`, 'x-forwarded-for': desde },
    data: { correo, codigo: /\b(\d{6})\b/.exec(asunto)?.[1] ?? '' },
  });
  expect(confirmar.status(), await confirmar.text()).toBe(200);

  const codigo = `PEPE${unico()}`;
  const vendedor = `Pepe ${unico()}`;
  const ficha = await unVendedorConCodigo(page, vendedor, codigo);

  // Editar sus datos.
  await ficha.getByRole('button', { name: 'Editar' }).click();
  const editar = page.getByRole('dialog', { name: 'Editar el vendedor' });
  await editar.getByLabel('Notas').fill('Lo pactado: un 10 % el primer año, fuera de Estook');
  await editar.getByRole('button', { name: 'Guardar' }).click();
  await expect(editar).toHaveCount(0);
  await expect(ficha.getByText('Lo pactado: un 10 % el primer año, fuera de Estook')).toBeVisible();
  await ficha.getByRole('button', { name: 'Cerrar', exact: true }).first().click();

  // Ponérselo a un cliente que se olvidó del código.
  await page
    .getByRole('navigation', { name: 'Secciones del admin' })
    .getByRole('button', { name: 'Clientes' })
    .click();
  await page.getByLabel('Buscar').fill(negocio);
  await expect(page.getByRole('heading', { name: '1 cliente', exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: `Abrir ${negocio}` })
    .filter({ visible: true })
    .first()
    .click();
  const cliente = page.getByRole('dialog', { name: negocio });
  await cliente.getByRole('tab', { name: 'Datos' }).click();
  await expect(cliente.getByText('Directo', { exact: true })).toBeVisible();
  await cliente.getByRole('button', { name: 'Poner el vendedor' }).click();
  const poner = page.getByRole('dialog', { name: 'Con qué vendedor vino' });
  await poner.getByLabel('El código del vendedor').fill(codigo.toLowerCase());
  await poner.getByLabel('Por qué').fill('Se le olvidó el código al registrarse');
  await poner.getByRole('button', { name: 'Guardar' }).click();
  await expect(poner).toHaveCount(0);
  await expect(cliente.getByText(`${vendedor} · ${codigo}`)).toBeVisible();
  await cliente.getByRole('tab', { name: 'Actividad' }).click();
  await expect(cliente.getByText('Cambió con qué vendedor vino')).toBeVisible();
  await cliente.getByRole('button', { name: 'Cerrar', exact: true }).first().click();

  // Cerrar el código, y dar de baja al vendedor.
  await aVendedores(page);
  await page.getByRole('button', { name: `Abrir ${vendedor}` }).click();
  const suya = page.getByRole('dialog', { name: vendedor });
  await suya.getByRole('button', { name: 'Cerrar el código' }).click();
  const cerrar = page.getByRole('dialog', { name: `Cerrar ${codigo}` });
  await cerrar.getByLabel('Por qué').fill('Fin de la campaña');
  await cerrar.getByRole('button', { name: 'Cerrar el código' }).click();
  await expect(cerrar).toHaveCount(0);
  await expect(suya.getByText(/cerrado el/)).toBeVisible();

  await suya.getByRole('button', { name: 'Dar de baja' }).click();
  const baja = page.getByRole('dialog', { name: `Dar de baja a ${vendedor}` });
  await baja.getByLabel('Por qué').fill('Ya no trabaja con nosotros');
  await baja.getByRole('button', { name: 'Dar de baja' }).click();
  await expect(baja).toHaveCount(0);
  await expect(suya.getByText(/de baja desde el/)).toBeVisible();
  // Su cliente sigue siendo suyo.
  await expect(suya.getByText(negocio)).toBeVisible();
});

test('sin enlace, la casilla va plegada, y un código que no vale se avisa sin frenar', async ({
  page,
}) => {
  await abrirSinQueSeCaiga(page, `${APP}#/crear-cuenta`);
  await expect(page.getByLabel('Código de vendedor')).toHaveCount(0);
  await page.getByRole('button', { name: '¿Tienes un código de vendedor?' }).click();
  await page.getByLabel('Código de vendedor').fill('NOEXISTE');
  await expect(page.getByText(/Ese código no existe o ya no vale/)).toBeVisible();
  // El botón de crear la cuenta sigue ahí: el código es opcional.
  await expect(page.getByRole('button', { name: 'Crear cuenta', exact: true })).toBeEnabled();
});
