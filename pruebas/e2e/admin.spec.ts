import { expect, test } from '@playwright/test';
import { ADMIN, codigoAhora, entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * La puerta del admin, desde la pantalla (0041, entrega A1).
 *
 * Lo que se prueba es lo que hace Ricardo: entrar con su código, ver quién tiene
 * acceso, dárselo a alguien nuevo —y ver la contraseña de un solo uso **una sola
 * vez**—, quitárselo con un motivo, y encontrarlo todo en la auditoría.
 *
 * Las reglas de acceso —quién no entra, que una sesión de la app no abre el admin,
 * el último admin total— están probadas llamando a la API a pelo, en
 * `base-de-datos/pruebas/la-puerta-del-admin.prueba.ts`. Aquí se prueba que la
 * pantalla llega a ellas.
 *
 * Cada navegador da acceso a **un correo suyo**: las pruebas corren a la vez en
 * escritorio y en móvil, y compartir persona haría que una quitara lo que la otra
 * acaba de dar.
 */

test.describe('la puerta del admin', () => {
  test('sin entrar no se ve nada del admin, ni el catálogo', async ({ page }) => {
    await page.goto(ADMIN, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: 'Entra en el admin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sistema de diseño' })).toHaveCount(0);
  });

  test('una contraseña que no es no deja entrar, y no dice si el correo existe', async ({
    page,
  }) => {
    await page.goto(ADMIN, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Tu correo').fill('plataforma@ejemplo.estook.com');
    await page.getByLabel('Tu contraseña').fill('no es esta');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText('Ese correo y esa contraseña no cuadran.')).toBeVisible();
  });

  test('se entra con el código, se da acceso a alguien, se le quita y queda apuntado', async ({
    page,
  }, info) => {
    const correo = `admin-${info.project.name}-${Date.now()}@correo-de-prueba.com`;
    const nombre = `Prueba ${info.project.name}`;

    await entrarEnElAdmin(page);

    // ── Quién tiene acceso: al menos quien ha entrado ───────────────────────
    // La tabla se pinta dos veces —tabla en escritorio, tarjetas en móvil— y una
    // está oculta: se mira la que se ve.
    await expect(page.getByText('Ada (tú)').filter({ visible: true }).first()).toBeVisible();

    // ── Dar acceso a alguien sin cuenta ─────────────────────────────────────
    await page.getByRole('button', { name: 'Dar acceso', exact: true }).click();
    const hoja = page.getByRole('dialog', { name: 'Dar acceso al admin' });
    await hoja.getByLabel('Su correo').fill(correo);
    await hoja.getByLabel('Su nombre').fill(nombre);

    // Con un código que no es, no se da nada.
    await hoja.getByLabel('Tu código, otra vez').fill('000000');
    await hoja.getByRole('button', { name: 'Dar acceso total' }).click();
    await expect(
      hoja.getByText('Ese código no es el que enseña ahora tu aplicación de autenticación.'),
    ).toBeVisible();

    await hoja.getByLabel('Tu código, otra vez').fill(codigoAhora());
    await hoja.getByRole('button', { name: 'Dar acceso total' }).click();

    const hecho = page.getByRole('dialog', { name: 'Acceso dado' });
    await expect(hecho.getByText('Esta contraseña se enseña una sola vez')).toBeVisible();
    await hecho.getByRole('button', { name: 'Hecho' }).click();

    await expect(page.getByText(correo).filter({ visible: true })).toBeVisible();

    // ── Quitárselo, con motivo ──────────────────────────────────────────────
    //
    // En escritorio es una fila y en móvil una tarjeta: se busca el botón que se
    // ve dentro de lo que lleva su correo.
    await page
      .locator('tr, li')
      .filter({ hasText: correo, visible: true })
      .getByRole('button', { name: 'Quitar el acceso' })
      .click();

    const quitar = page.getByRole('dialog', { name: `Quitar el acceso a ${nombre}` });
    await quitar.getByLabel('Por qué').fill('Era una prueba');
    await quitar.getByLabel('Tu código, otra vez').fill(codigoAhora());
    await quitar.getByRole('button', { name: 'Quitar el acceso' }).click();
    await expect(quitar).toBeHidden();

    await expect(page.getByText('Lo tuvieron')).toBeVisible();

    // ── Y en la auditoría, dicho en una frase ───────────────────────────────
    await page.getByRole('button', { name: 'Auditoría', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Auditoría' })).toBeVisible();
    await expect(page.getByText(`dio acceso total a ${nombre}, con cuenta nueva`)).toBeVisible();
    await expect(page.getByText(`quitó el acceso a ${nombre}`)).toBeVisible();
    await expect(page.getByText('Motivo: «Era una prueba»').first()).toBeVisible();

    // ── Salir de verdad ─────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Salir', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Entra en el admin' })).toBeVisible();
  });
});

/**
 * La cuenta del admin, tecleada en la **app** (entrega V, 23-sep).
 *
 * Richi entró en la app con la cuenta que solo es del admin y la app le pidió el
 * código de su segundo factor, para después decirle que no tenía negocio. Le pareció
 * que las cuentas se mezclaban. Ahora se dice a la primera, sin pedir código.
 */
test('la cuenta del admin, en la app, dice que no tiene negocio y no pide el código', async ({
  page,
}) => {
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Tu correo').fill('plataforma@ejemplo.estook.com');
  await page.getByLabel('Tu contraseña').fill('estook en desarrollo');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await expect(page.getByText('Esta cuenta no tiene ningún negocio en Estook.')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/estook\.com\/admin/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu código de seis dígitos' })).toHaveCount(0);
});
