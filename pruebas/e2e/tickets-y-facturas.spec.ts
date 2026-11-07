import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { APP, consultarEnLaApi, ejecutarEnLaApi, entrarEnLaApp } from './en-la-app.ts';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';

const TPV = 'http://localhost:5178/';

/**
 * **T6 · 2 · 1 · El motor y el ticket**, desde la pantalla (decisión 0136; maqueta de T6,
 * secciones 1, 3 y 4). Con el Verifacti de mentira de la API de pruebas, que registra lo que
 * se le manda y contesta con su QR.
 *
 *   · Bar Faro, con la empresa de pruebas de Verifacti que pone el admin y sus series
 *   · Ajustes › Facturación › «Imprimir un ticket de prueba»: sale con su número
 *   · Servicio › Ventas › Tickets y facturas: el ticket con su chapa; al tocarlo, el papel
 *     como salió, con su QR, y su historia
 *   · T6 · 2 · 2 · 1 (0137): la factura de ese ticket, con su NIF comprobado; el ticket queda
 *     canjeado y no se puede canjear otra vez; una factura a mano, por cobrar, con un concepto libre
 *     y el precio sin IVA; y «Quién hace qué» en Ajustes › Facturación
 *
 * **Bar Faro no lo usa ninguna otra prueba**, y esta corre en el escritorio: la empresa de
 * pruebas es una por local.
 */

test('el ticket de prueba sale con su número, y en Tickets y facturas con su QR y su historia', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'escritorio', 'Bar Faro es uno: se prueba en el escritorio');
  test.setTimeout(120_000);
  // Con CAPTURAS_DE_FACTURAS=1 deja una foto de cada paso, en el ordenador y en el móvil.
  const pasar = async (paso: string) => {
    if (process.env['CAPTURAS_DE_FACTURAS'] === undefined) return;
    await page.screenshot({ path: info.outputPath(`${paso}-escritorio.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath(`${paso}-movil.png`), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
  };

  // El admin le pone la empresa de pruebas de Verifacti, si no la tiene ya.
  await entrarEnElAdmin(page);
  await page.getByRole('button', { name: 'Facturación', exact: true }).click();
  const enQueLocal = page.getByLabel('En qué local');
  const faro = await enQueLocal.locator('option', { hasText: 'Bar Faro' }).getAttribute('value');
  expect(faro).not.toBeNull();
  await enQueLocal.selectOption(faro ?? '');
  const quitar = page.getByRole('button', { name: 'Quitarla de ese local' });
  if (!(await quitar.isVisible())) {
    await page.getByRole('button', { name: 'Ponerla en ese local' }).click();
    await expect(quitar).toBeVisible();
  }

  // Elena, la dirección, en Bar Faro, con sus series puestas.
  await entrarEnLaApp(page, 'elena@ejemplo.estook.com');
  const token = await page.evaluate(() => window.localStorage.getItem('estook.sesion'));
  await ejecutarEnLaApi(page.request, token ?? '', 'cambiar_de_contexto', { local_id: faro });
  await ejecutarEnLaApi(page.request, token ?? '', 'poner_las_series', {
    ticket: 'T-BF',
    factura: 'F-BF',
    rectificativa: 'R-BF',
    otro_programa: false,
  });
  await recargarSinQueSeCaiga(page);

  // Ajustes › Facturación › Probar el papel.
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/facturacion`);
  const probar = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Probar el papel' }) })
    .last();
  await expect(probar).toContainText('PRUEBA · SIN VALIDEZ');
  await probar.getByRole('button', { name: 'Imprimir un ticket de prueba' }).click();
  await expect(probar.getByText(/Hecho: T-BF-\d{4}-\d{6}/)).toBeVisible();
  const numero = (await probar.locator('strong').first().textContent()) ?? '';

  // Servicio › Ventas › Tickets y facturas.
  await probar.getByRole('link', { name: 'Verlo en Tickets y facturas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ventas' })).toBeVisible();
  const fila = page.getByRole('row').filter({ hasText: numero });
  await expect(fila).toContainText('Ticket');
  await expect(fila).toContainText('2,70 €');
  await expect(fila).toContainText('En Hacienda');
  await fila.click();

  const hoja = page.getByRole('dialog', { name: 'El documento' });
  await expect(hoja.getByRole('img', { name: 'QR tributario' })).toBeVisible();
  await expect(hoja).toContainText('QR tributario:');
  await expect(hoja).toContainText('VERI*FACTU');
  await expect(hoja).toContainText('Factura simplificada');
  await expect(hoja).toContainText('Preparado con su número');
  await expect(hoja).toContainText('Registrado, con su QR');
  await pasar('1-el-ticket');

  // T6 · 2 · 2 · 1: su factura. El NIF se comprueba al escribirlo y trae el nombre de Hacienda.
  await hoja.getByRole('button', { name: 'Hacer factura', exact: true }).click();
  const hacer = page.getByRole('dialog', { name: 'Hacer factura' });
  await expect(hacer).toContainText('El importe es el del ticket');
  await expect(hacer).toContainText('2,70 €');
  await hacer.getByLabel('NIF', { exact: true }).fill('B84935048');
  await hacer.getByLabel('Domicilio').click();
  await expect(hacer).toContainText('En Hacienda: EJEMPLO NORTE SL');
  await expect(hacer.getByLabel('Nombre o razón social')).toHaveValue('EJEMPLO NORTE SL');
  await hacer.getByLabel('Domicilio').fill('Pol. Ugaldeguren 4, Zamudio');
  await pasar('2-hacer-factura');
  await hacer.getByRole('button', { name: 'Hacer la factura' }).click();

  const factura = page.getByRole('dialog', { name: 'El documento' });
  await expect(factura).toContainText(/F-BF-\d{4}-\d{6}/);
  await expect(factura).toContainText('Factura de un ticket');
  await expect(factura).toContainText('Para:');
  await expect(factura).toContainText('1,36 sin imp. · 10 %');
  await expect(factura).toContainText(`Sustituye a ${numero}`);
  await expect(factura.getByRole('button', { name: 'Mandar por correo' })).toBeVisible();
  await pasar('3-la-factura');

  // El ticket, canjeado: ya no ofrece otra factura, y lleva a la suya.
  await factura.getByRole('button', { name: numero }).click();
  await expect(factura.getByRole('button', { name: 'Ir a su factura' })).toBeVisible();
  await expect(factura.getByRole('button', { name: 'Hacer factura', exact: true })).toHaveCount(0);
  await expect(factura).toContainText(`Canjeado por la factura F-BF`);
  await page.keyboard.press('Escape');

  // A mano: sin lista de clientes (0139). Al escribir su NIF, lo demás sale de su última factura;
  // con otro número, eso se va; y un concepto libre, por cobrar.
  await page.getByRole('button', { name: 'Hacer una factura' }).click();
  const aMano = page.getByRole('dialog', { name: 'Hacer una factura' });
  await expect(aMano.getByText('Busca un cliente')).toHaveCount(0);
  const suNif = aMano.getByLabel('NIF', { exact: true });
  await suNif.fill('B84935048');
  await aMano.getByLabel('Nombre o razón social').click();
  await expect(aMano.getByLabel('Domicilio')).toHaveValue('Pol. Ugaldeguren 4, Zamudio');
  await expect(aMano).toContainText('De su última factura');
  await expect(aMano.getByLabel('Nombre o razón social')).toHaveValue('EJEMPLO NORTE SL');
  await suNif.fill('B12345674');
  await expect(aMano.getByLabel('Domicilio')).toHaveValue('');
  await expect(aMano.getByLabel('Nombre o razón social')).toHaveValue('');
  await suNif.fill('B84935048');
  await aMano.getByLabel('Nombre o razón social').click();
  await expect(aMano.getByLabel('Domicilio')).toHaveValue('Pol. Ugaldeguren 4, Zamudio');
  await aMano.getByRole('button', { name: 'Concepto libre' }).click();
  await aMano.getByLabel('Qué es', { exact: true }).fill('Alquiler del comedor');
  await aMano.getByLabel(/Importe, con IVA/).fill('150');
  await aMano.getByLabel(/Importe, con IVA/).blur();
  await aMano.getByRole('radio', { name: '21 %' }).click();
  await aMano.getByRole('button', { name: 'Añadirlo' }).click();
  await expect(aMano).toContainText('IVA 21 %');
  await expect(aMano).toContainText('150,00 €');
  await aMano.getByRole('radio', { name: 'Por cobrar' }).click();
  await aMano.getByLabel('Vence').fill('2030-12-15');
  await aMano.getByLabel('Correo, para mandársela (si quiere)').fill('administracion@ejemplo.es');
  await pasar('4-a-mano');
  // El correo no sale: la factura está hecha, y quien la hace no se queda creyendo que ha llegado.
  await page.route('**/comandos/mandar_el_documento', (ruta) =>
    ruta.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { codigo: 'fallo_nuestro' } }),
    }),
  );
  await aMano.getByRole('button', { name: 'Hacer la factura' }).click();
  const hecha = page.getByRole('dialog', { name: 'El documento' });
  await expect(hecha).toContainText('Vence: 15/12/2030');
  await expect(hecha).toContainText('El correo no ha salido');
  await pasar('4b-el-correo-no-salio');
  await page.unroute('**/comandos/mandar_el_documento');
  await expect(hecha.getByRole('button', { name: 'Marcar cobrada' })).toBeVisible();
  await hecha.getByRole('button', { name: 'Marcar cobrada' }).click();
  await expect(hecha).toContainText('Marcada como cobrada');
  await page.keyboard.press('Escape');

  // La lista, con el filtro y el buscador.
  await page.getByRole('button', { name: 'Facturas', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: numero })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'EJEMPLO NORTE SL' }).first()).toBeVisible();
  await pasar('5-la-lista');

  // Ajustes › Facturación › Quién hace qué: hacer facturas, sin lo fiscal.
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/facturacion`);
  const quien = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Quién hace qué' }) })
    .last();
  await expect(quien).toContainText('Hacer facturas no da acceso a la empresa ni a las series');
  await quien.getByRole('button', { name: /Factura a mano/ }).click();
  await expect(quien).toContainText('Con conceptos libres');
  await pasar('6-quien-hace-que');

  // Y en Estook TPV, lo mismo a un toque desde la sala (0137).
  const personas = await consultarEnLaApi<readonly { personaId: string; siempre: boolean }[]>(
    page.request,
    token ?? '',
    'quien_hace_que',
  );
  const { pin } = await ejecutarEnLaApi<{ pin: string }>(
    page.request,
    token ?? '',
    'regenerar_pin',
    {
      persona_id: personas.find((p) => p.siempre)?.personaId,
      local_id: faro,
    },
  );
  const llave = await ejecutarEnLaApi<{ llave: string }>(
    page.request,
    token ?? '',
    'vincular_el_primer_aparato',
    { local_id: faro, funcion: 'caja', nombre: 'Caja de Faro', cajon_nuevo: 'Cajón de Faro' },
  );
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave.llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  await page.getByRole('button', { name: 'Tickets y facturas' }).click();
  const enElTpv = page.getByRole('row').filter({ hasText: numero });
  await expect(enElTpv).toContainText('Canjeado');
  await pasar('7-en-el-tpv');
  await enElTpv.click();
  await expect(page.getByRole('button', { name: 'Ir a su factura' })).toBeVisible();
  await pasar('8-el-documento-en-el-tpv');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Hacer una factura' }).click();
  await expect(page.getByRole('dialog', { name: 'Hacer una factura' })).toContainText('Para quién');
  await pasar('9-hacer-factura-en-el-tpv');
});

test('la cocina no ve Tickets y facturas, y la sala sí (0137)', async ({ page }) => {
  await entrarEnLaApp(page, 'marcos@ejemplo.estook.com');
  await abrirSinQueSeCaiga(page, `${APP}#/servicio`);
  await expect(page.getByRole('button', { name: 'Ventas', exact: true })).toHaveCount(0);
  await entrarEnLaApp(page, 'sara@ejemplo.estook.com');
  await abrirSinQueSeCaiga(page, `${APP}#/servicio`);
  await expect(page.getByRole('button', { name: 'Ventas', exact: true })).toBeVisible();
});
