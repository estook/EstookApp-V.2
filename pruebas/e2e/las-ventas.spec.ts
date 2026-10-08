import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * A4 · Las ventas (decisión 0077 · migración 0059), desde la pantalla.
 *
 * Lo que hace Richi: abrir Ventas, cambiar de periodo y, desde una cifra, ir a los
 * clientes que cuenta. Y lo que pasa cuando alguien abre el enlace de un vendedor:
 * su visita se cuenta (3B), y se ve en la ficha del vendedor.
 *
 * Las cuentas —que cuadran con la base, que un cliente de ejemplo no cambia nada, lo
 * cobrado, las bajas y el correo del lunes— están probadas contra la base en
 * `las-ventas.prueba.ts` y en el dominio, en `ventas.prueba.ts`.
 */
const WEB = 'http://localhost:5173/';

function unico(): string {
  return `${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 1e4))}`;
}

test('abrir el enlace de un vendedor cuenta una visita, y se ve en su ficha', async ({ page }) => {
  const nombre = `Lola ${unico()}`;
  const codigo = `LOLA${unico()}`;
  await entrarEnElAdmin(page);
  await page
    .getByRole('navigation', { name: 'Secciones del admin' })
    .getByRole('button', { name: 'Vendedores' })
    .click();
  await page.getByRole('button', { name: 'Nuevo vendedor' }).first().click();
  const alta = page.getByRole('dialog', { name: 'Nuevo vendedor' });
  await alta.getByLabel('Nombre').fill(nombre);
  await alta.getByRole('button', { name: 'Crear el vendedor' }).click();
  const ficha = page.getByRole('dialog', { name: nombre });
  await ficha.getByRole('button', { name: 'Nuevo código' }).click();
  const hoja = page.getByRole('dialog', { name: 'Nuevo código' });
  await hoja.getByLabel('El código').fill(codigo);
  await hoja.getByRole('button', { name: 'Crear el código' }).click();
  await expect(hoja).toHaveCount(0);
  await expect(ficha.getByText('0 clientes · 0 visitas')).toBeVisible();
  await ficha.getByRole('button', { name: 'Cerrar', exact: true }).first().click();

  // Alguien abre su enlace.
  const web = await page.context().newPage();
  const contada = web.waitForResponse((r) => r.url().includes('/comandos/contar_la_visita'));
  await abrirSinQueSeCaiga(web, `${WEB}?ref=${codigo}`);
  expect((await contada).status()).toBe(200);
  await web.close();

  // Y en su ficha, una visita.
  await page.getByRole('button', { name: `Abrir ${nombre}` }).click();
  await expect(
    page.getByRole('dialog', { name: nombre }).getByText('0 clientes · 1 visita'),
  ).toBeVisible();
});

test('el tablero de ventas: las cifras, el periodo, y de una cifra a sus clientes', async ({
  page,
}) => {
  await entrarEnElAdmin(page);
  await page
    .getByRole('navigation', { name: 'Secciones del admin' })
    .getByRole('button', { name: 'Ventas' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ventas' })).toBeVisible();

  // Con el Stripe de prueba, se dice.
  await expect(
    page.getByText('Stripe está en modo prueba: nada de esto es dinero de verdad.'),
  ).toBeVisible();
  await expect(page.getByText('Entra al mes', { exact: true })).toBeVisible();
  await expect(page.getByText('Abren un enlace', { exact: true })).toBeVisible();
  for (const pregunta of [
    '¿Crecemos o solo reponemos?',
    '¿De dónde sale lo que entra al mes?',
    '¿Cuántos pagan?',
    '¿Qué canal funciona?',
    '¿Dónde se pierden?',
  ]) {
    await expect(page.getByText(pregunta)).toBeVisible();
  }

  // Otro periodo.
  await page.getByRole('tab', { name: 'Este año' }).click();
  await expect(page.getByRole('tab', { name: 'Este año' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('frente a lo mismo del año pasado')).toBeVisible();

  // De «Se están yendo» a esa pestaña de Clientes.
  await page.getByRole('button', { name: /^Se están yendo: \d+\. Ver en Clientes$/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Se están yendo/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
