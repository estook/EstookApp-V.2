import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { APP, entrarEnLaApp } from './en-la-app.ts';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * **T6 · 1 · El alta de facturación**, desde la pantalla (decisión 0126; maquetas de T6,
 * secciones 1, 2 y 7). La API de pruebas lleva **un Verifacti de mentira**: Hacienda conoce
 * unos pocos NIF, nada sale a internet, y un PDF que empieza como un PDF se da por firmado.
 *
 *   · la gerente a quien se la han dado hace los cinco pasos, y el NIF se mira al escribirlo
 *   · la dirección se la da y se la quita a la gestoría, en «Quién la lleva» (0128)
 *   · «Pide tu factura» se apaga y se enciende
 *   · la declaración responsable se lee y se baja en PDF, y dice que es un borrador
 *   · un camarero no ve la sección
 *   · el admin prueba la conexión con Verifacti y ve las once condiciones
 *
 * Varias máquinas de las pruebas corren a la vez contra la misma API: la que llega después
 * encuentra los pasos ya dados, y por eso cada paso se da solo si sigue por dar.
 */

async function abrirLaFacturacion(page: Page) {
  await entrarEnLaApp(page, 'rosa@ejemplo.estook.com');
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/facturacion`);
  await expect(page.getByRole('heading', { level: 2, name: 'Facturación' }).first()).toBeVisible();
}

const MODELO_FIRMADO = Buffer.from(
  `%PDF-1.7\n% modelo firmado de prueba\n${'0'.repeat(200)}\n%%EOF`,
);

test('el gerente hace el alta en cinco pasos, con el NIF comprobado al escribirlo', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await abrirLaFacturacion(page);
  await expect(page.getByText('En pruebas', { exact: true })).toBeVisible();

  const empresa = page.getByText('IKATZ RESTAURACION SL · B12345674');
  const seguir = page.getByRole('button', { name: 'Seguir' });
  const lista = page.getByText('Lista', { exact: true });
  await expect(empresa.or(seguir).first()).toBeVisible();

  // ── 1 · La empresa ──
  if (!(await empresa.isVisible())) {
    await seguir.click();
    await page.getByLabel('NIF de la empresa').fill('b12345674');
    // **Al escribirlo**, sin tocar nada más: Hacienda dice de quién es.
    await expect(page.getByText('✓ En Hacienda: IKATZ RESTAURACION SL')).toBeVisible();
    await expect(page.getByLabel('Razón social')).toHaveValue('IKATZ RESTAURACION SL');
    await page.getByLabel('Calle').fill('Calle Mayor');
    await page.getByLabel('Número').fill('1');
    await page.getByLabel('Código postal').fill('28013');
    // La provincia sale sola del código postal.
    await expect(page.getByText('Madrid', { exact: true })).toBeVisible();
    await page.getByLabel('Municipio').fill('Madrid');
    await page.getByRole('button', { name: 'Guardar la empresa' }).click();
  }
  await expect(empresa).toBeVisible();

  // ── 2, 3 y 4 · lo que siga por dar ──
  for (let vuelta = 0; vuelta < 3; vuelta += 1) {
    const falta = page.getByText(/Te falta: /);
    if (!(await falta.isVisible())) break;
    const texto = (await falta.textContent()) ?? '';
    if (/autorización/.test(texto)) break;
    await seguir.click();
    if (/dónde tributa/.test(texto)) {
      await expect(page.getByText('Península y Baleares · IVA')).toBeVisible();
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    } else if (/series/.test(texto)) {
      await page.getByRole('button', { name: 'No', exact: true }).click();
      await page.getByRole('button', { name: 'Guardar las series' }).click();
    } else {
      await page.getByRole('button', { name: 'Darla de alta' }).click();
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }

  // ── 5 · La autorización: una sociedad, con el modelo y el certificado de su representante ──
  await expect(page.getByText(/Te falta: la autorización ante Hacienda/).or(lista)).toBeVisible();
  if (!(await lista.isVisible())) {
    await seguir.click();
    await page.getByLabel('Nombre y apellidos').fill('Rosa Iglesias');
    await page.getByLabel('Su DNI o NIE').fill('12345678A');
    await expect(page.getByText(/La letra no cuadra/)).toBeVisible();
    await page.getByLabel('Su DNI o NIE').fill('12345678Z');
    await page.getByLabel('Calle donde vive').fill('Calle Mayor');
    await page.getByLabel('Número').fill('1');
    await page.getByLabel('Municipio').fill('Madrid');
    const bajada = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar el modelo relleno' }).click();
    expect((await bajada).suggestedFilename()).toBe('modelo-de-representacion-B12345674.pdf');

    await page.getByLabel('El modelo firmado, en PDF').setInputFiles({
      name: 'modelo-firmado.pdf',
      mimeType: 'application/pdf',
      buffer: MODELO_FIRMADO,
    });
    await expect(page.getByText('Firmada y aceptada')).toBeVisible();
    // Una hoja se cierra con «Esc» en las pruebas (lección 245).
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await expect(lista).toBeVisible();
  await expect(page.getByText('Firmada por Rosa Iglesias')).toBeVisible();
});

test('«Pide tu factura» se apaga y se vuelve a encender', async ({ page }) => {
  await abrirLaFacturacion(page);
  const interruptor = page.getByRole('switch', { name: 'Encendido' });
  // Se pulsa el rótulo: la casilla de verdad está escondida a propósito (como en Fogón).
  const antes = await interruptor.isChecked();
  await interruptor.locator('xpath=..').click();
  await expect(interruptor).toBeChecked({ checked: !antes });
  await interruptor.locator('xpath=..').click();
  await expect(interruptor).toBeChecked({ checked: antes });
});

test('la declaración responsable se lee y se baja en PDF, y dice que es un borrador', async ({
  page,
}) => {
  await abrirLaFacturacion(page);
  await page.getByRole('button', { name: 'Leerla' }).click();
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible();
  await expect(page.getByText('El componente externo: Verifacti')).toBeVisible();
  const bajada = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargarla en PDF' }).click();
  expect((await bajada).suggestedFilename()).toMatch(/^declaracion-responsable-estook-.*\.pdf$/);
});

test('la dirección se la da a la gestoría y se la quita, en «Quién la lleva» (0128)', async ({
  page,
}) => {
  // Bar Muelle: ni Rosa ni Vera (la de las capturas) están en él, y la gestoría sí.
  await entrarEnLaApp(page, 'elena@ejemplo.estook.com');
  const muelle = page.getByRole('button', { name: /Bar Muelle/ });
  if (await muelle.isVisible()) await muelle.click();
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/facturacion`);
  await expect(page.getByRole('heading', { name: 'Quién la lleva' })).toBeVisible();
  await expect(page.getByText('Siempre', { exact: true })).toBeVisible();
  const gestoria = page.getByRole('switch', {
    name: 'Asesoria Cuenta Clara lleva la facturación',
  });
  // Se pulsa el interruptor pintado: la casilla de verdad está escondida.
  const antes = await gestoria.isChecked();
  await gestoria.locator('xpath=..').click();
  await expect(gestoria).toBeChecked({ checked: !antes });
  await gestoria.locator('xpath=..').click();
  await expect(gestoria).toBeChecked({ checked: antes });
});

test('un camarero no ve la facturación en Ajustes', async ({ page }) => {
  await entrarEnLaApp(page, 'sara@ejemplo.estook.com');
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes`);
  const secciones = page.getByRole('navigation', { name: 'Secciones de Ajustes' });
  await expect(secciones).toBeVisible();
  await expect(secciones.getByText('Facturación')).toHaveCount(0);
});

test('el admin prueba la conexión con Verifacti y ve las once condiciones', async ({ page }) => {
  await entrarEnElAdmin(page);
  await page.getByRole('button', { name: 'Facturación', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Facturación' })).toBeVisible();
  await page.getByRole('button', { name: 'Probar la conexión' }).click();
  await expect(page.getByText(/Verifacti va por la versión 1\.0\.0/)).toBeVisible();
  await expect(page.getByText(/^\d+ de 11$/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Quién produce Estook/ })).toBeVisible();
});
