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
 *   · T6 · 2 · 2 · 2 (0140): devolver una de dos raciones y lo cobrado de más, corregir los datos del
 *     cliente, la señal que la factura final descuenta sola, y anular con su motivo
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
  // El IVA de un concepto libre se elige: no viene puesto (0139).
  await expect(aMano.getByRole('button', { name: 'Añadirlo' })).toBeDisabled();
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

  // T6 · 2 · 2 · 2 (0140): lo emitido se corrige con otro documento. Dos raciones y un café.
  const conDos = await ejecutarEnLaApi<{ documentoId: string; numero: string }>(
    page.request,
    token ?? '',
    'hacer_factura_a_mano',
    {
      cliente: {
        clase: 'empresa',
        nombre: 'EJEMPLO NORTE SL',
        identificador: 'B84935048',
        domicilio: 'Pol. Ugaldeguren 4, Zamudio',
      },
      lineas: [
        { nombre: 'Menú de grupo', cantidad: 2, importe: 7000, tipo: 0.1 },
        { nombre: 'Café', cantidad: 1, importe: 150, tipo: 0.1 },
      ],
      cobrada: true,
    },
  );
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByLabel('Buscar por número, cliente o NIF').fill(conDos.numero);
  await page.getByRole('row').filter({ hasText: conDos.numero }).click();
  const laDos = page.getByRole('dialog', { name: 'El documento' });
  await expect(laDos.getByRole('button', { name: 'Corregir los datos' })).toBeVisible();
  // Hacienda todavía no ha contestado: anular no sale, y devolver sí.
  await expect(laDos.getByRole('button', { name: 'Anular', exact: true })).toHaveCount(0);
  await laDos.getByRole('button', { name: 'Devolver', exact: true }).click();

  // Una de las dos raciones: «1 de 2», y el importe es el de una.
  const devolver = page.getByRole('dialog', { name: 'Devolver' });
  await devolver.getByRole('radio', { name: 'Solo algunos' }).click();
  await devolver.getByRole('checkbox', { name: 'Devolver Menú de grupo' }).click();
  await devolver.getByLabel('Cuántos de Menú de grupo').fill('1');
  await expect(devolver.getByRole('button', { name: 'Devolver 35,00 €' })).toBeEnabled();
  await pasar('10-devolver-una-de-dos');
  await devolver.getByRole('button', { name: 'Devolver 35,00 €' }).click();

  const laDevolucion = page.getByRole('dialog', { name: 'El documento' });
  await expect(laDevolucion).toContainText(/R-BF-\d{4}-\d{6}/);
  await expect(laDevolucion).toContainText('Factura rectificativa');
  await expect(laDevolucion).toContainText(`Rectifica: ${conDos.numero}`);
  await expect(laDevolucion).toContainText('Motivo: Mal hecho');
  await expect(laDevolucion).toContainText('-35,00 EUR');
  // Una devolución ni se devuelve ni se corrige: solo reimprimir, descargar y mandar.
  await expect(laDevolucion.getByRole('button', { name: /^Devolver/ })).toHaveCount(0);
  await pasar('11-la-devolucion');

  // Lo cobrado de más: dinero de una línea, sin devolver ninguna ración.
  await laDevolucion.getByRole('button', { name: conDos.numero }).click();
  await expect(laDevolucion).toContainText('Devuelta en parte');
  await laDevolucion.getByRole('button', { name: 'Devolver lo que queda' }).click();
  const deMas = page.getByRole('dialog', { name: 'Devolver' });
  await deMas.getByRole('radio', { name: 'Se cobró de más' }).click();
  await deMas.getByRole('checkbox', { name: 'Devolver Café' }).click();
  await deMas.getByLabel('¿Cuánto de más?').fill('0,50');
  await deMas.getByLabel('¿Cuánto de más?').blur();
  await pasar('12-se-cobro-de-mas');
  await deMas.getByRole('button', { name: 'Devolver 0,50 €' }).click();
  const otra = page.getByRole('dialog', { name: 'El documento' });
  await expect(otra).toContainText('Motivo: Se cobró de más');
  await expect(otra).toContainText('-0,50 EUR');

  // Corregir los datos: la anterior se queda, marcada «Corregida», y lleva a la nueva.
  await otra.getByRole('button', { name: conDos.numero }).click();
  await otra.getByRole('button', { name: 'Corregir los datos' }).click();
  const corregir = page.getByRole('dialog', { name: 'Corregir los datos del cliente' });
  await expect(corregir.getByLabel('NIF', { exact: true })).toHaveValue('B84935048');
  await expect(corregir.getByRole('button', { name: 'Hacer la factura corregida' })).toBeDisabled();
  await corregir.getByLabel('Domicilio').fill('Polígono Ugaldeguren III, 4, 48170 Zamudio');
  await pasar('13-corregir-los-datos');
  await corregir.getByRole('button', { name: 'Hacer la factura corregida' }).click();
  const corregida = page.getByRole('dialog', { name: 'El documento' });
  await expect(corregida).toContainText('Corrección de datos');
  await expect(corregida).toContainText('Polígono Ugaldeguren III, 4, 48170 Zamudio');
  await expect(corregida).toContainText('Motivo: Corrige el domicilio');
  await corregida.getByRole('button', { name: conDos.numero }).click();
  await expect(corregida).toContainText('Corregida');
  await expect(corregida.getByRole('button', { name: 'Ir a su corrección' })).toBeVisible();
  await expect(corregida.getByRole('button', { name: /^Devolver/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByLabel('Buscar por número, cliente o NIF').fill('');

  // La señal, y la factura final la descuenta sola.
  await page.getByRole('button', { name: 'Factura de una señal' }).click();
  const senal = page.getByRole('dialog', { name: 'Factura de la señal' });
  await senal.getByLabel('NIF', { exact: true }).fill('B12345674');
  await senal.getByLabel('Nombre o razón social').click();
  await expect(senal.getByLabel('Nombre o razón social')).toHaveValue('IKATZ RESTAURACION SL');
  await senal.getByLabel('Domicilio').fill('Calle Mayor 12, Bilbao');
  await senal.getByLabel('Para qué es').fill('Señal de la comida del 14-nov');
  await senal.getByLabel(/Cobrado, con IVA/).fill('300');
  await senal.getByLabel(/Cobrado, con IVA/).blur();
  await pasar('14-la-senal');
  await senal.getByRole('button', { name: 'Hacer la factura de la señal' }).click();
  const laSenal = page.getByRole('dialog', { name: 'El documento' });
  await expect(laSenal).toContainText('Señal');
  await expect(laSenal).toContainText('300,00 EUR');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Hacer una factura' }).click();
  const laFinal = page.getByRole('dialog', { name: 'Hacer una factura' });
  await laFinal.getByLabel('NIF', { exact: true }).fill('B12345674');
  await laFinal.getByLabel('Nombre o razón social').click();
  await expect(laFinal.getByRole('checkbox', { name: /Descontar su señal/ })).toBeChecked();
  await laFinal.getByRole('button', { name: 'Concepto libre' }).click();
  await laFinal.getByLabel('Qué es', { exact: true }).fill('Comida de empresa');
  await laFinal.getByLabel(/Importe, con IVA/).fill('1000');
  await laFinal.getByLabel(/Importe, con IVA/).blur();
  await laFinal.getByRole('radio', { name: '10 %' }).click();
  await laFinal.getByRole('button', { name: 'Añadirlo' }).click();
  await expect(laFinal).toContainText('700,00 €');
  await pasar('15-descontar-la-senal');
  await laFinal.getByRole('button', { name: 'Hacer la factura' }).click();
  const conSenal = page.getByRole('dialog', { name: 'El documento' });
  await expect(conSenal).toContainText('Descuenta la señal F-BF');
  await expect(conSenal).toContainText('Señal ya facturada');
  await page.keyboard.press('Escape');

  // Anular. Lo que dice Hacienda llega por un aviso firmado, por el mismo camino que de verdad.
  const decirHacienda = async (
    numero: string,
    estado: string,
    mas: Record<string, string> = {},
  ) => {
    const r = await page.request.post(
      `http://localhost:5177/api/pruebas/hacienda?${new URLSearchParams({ numero, estado, ...mas }).toString()}`,
    );
    expect(r.ok()).toBe(true);
  };
  const otroTicket = await ejecutarEnLaApi<{ documentoId: string; numero: string }>(
    page.request,
    token ?? '',
    'imprimir_un_ticket_de_prueba',
    {},
  );
  await decirHacienda(otroTicket.numero, 'Correcto');
  await recargarSinQueSeCaiga(page);
  await page.getByRole('row').filter({ hasText: otroTicket.numero }).click();
  await page
    .getByRole('dialog', { name: 'El documento' })
    .getByRole('button', { name: 'Anular', exact: true })
    .click();
  const paraAnular = page.getByRole('dialog', { name: 'Anular' });
  await expect(paraAnular).toContainText('Anular es solo para lo que nunca debió existir');
  const anularlo = paraAnular.getByRole('button', { name: `Anular ${otroTicket.numero}` });
  await expect(anularlo).toBeDisabled();
  await paraAnular.getByLabel('Por qué lo anulas').fill('Salió repetido al probar la impresora');
  await pasar('16-anular');
  await anularlo.click();
  const anulandolo = page.getByRole('dialog', { name: 'El documento' });
  await expect(anulandolo).toContainText('Anulando');
  await expect(anulandolo).toContainText('Se pidió anularlo');
  await pasar('17-anulando');
  await decirHacienda(otroTicket.numero, 'Anulado', { operacion: 'Anulación' });
  await recargarSinQueSeCaiga(page);
  await page.getByRole('row').filter({ hasText: otroTicket.numero }).click();
  const anulado = page.getByRole('dialog', { name: 'El documento' });
  await expect(anulado).toContainText('Salió repetido al probar la impresora');
  await expect(anulado).toContainText('Hacienda: anulado');
  // Solo mirar, con quién y por qué.
  await expect(anulado.getByRole('button', { name: 'Descargar' })).toHaveCount(0);
  await expect(anulado.getByRole('button', { name: 'Reimprimir' })).toHaveCount(0);
  await expect(anulado.getByRole('button', { name: 'Mandar por correo' })).toHaveCount(0);
  await pasar('18-anulado');
  await page.keyboard.press('Escape');

  // Lo que rechaza Hacienda: sale arriba con «Corregir», y al corregirlo deja de salir.
  const rechazada = await ejecutarEnLaApi<{ documentoId: string; numero: string }>(
    page.request,
    token ?? '',
    'hacer_factura_a_mano',
    {
      cliente: {
        clase: 'empresa',
        nombre: 'EJEMPLO NORTE SL',
        identificador: 'B84935048',
        domicilio: 'Domicilio que estaba mal',
      },
      lineas: [{ nombre: 'Comida', cantidad: 1, importe: 5000, tipo: 0.1 }],
      cobrada: true,
    },
  );
  await decirHacienda(rechazada.numero, 'Incorrecto', { mensaje: 'Un dato no cuadra' });
  await recargarSinQueSeCaiga(page);
  await expect(page.getByText('Un dato no cuadra')).toBeVisible();
  await page.getByRole('button', { name: 'Corregir', exact: true }).click();
  const paraCorregir = page.getByRole('dialog', { name: 'Corregir' });
  await paraCorregir.getByLabel('Domicilio').fill('Pol. Ugaldeguren 4, Zamudio');
  await pasar('19-corregir-lo-rechazado');
  await paraCorregir.getByRole('button', { name: 'Hacer la factura corregida' }).click();
  await expect(page.getByRole('dialog', { name: 'El documento' })).toContainText(
    `Corrige ${rechazada.numero}, que rechazó Hacienda`,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByText('Un dato no cuadra')).toHaveCount(0);

  // Las devoluciones, en su filtro.
  await page.getByRole('button', { name: 'Devoluciones', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Devolución' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Todos', exact: true }).click();

  // Ajustes › Facturación › Quién hace qué: hacer facturas, sin lo fiscal.
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/facturacion`);
  const quien = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Quién hace qué' }) })
    .last();
  await expect(quien).toContainText('Hacer facturas no da acceso a la empresa ni a las series');
  await quien.getByRole('button', { name: /Factura a mano/ }).click();
  await expect(quien).toContainText('Con conceptos libres');
  await expect(quien.getByRole('button', { name: /Devolver/ })).toBeVisible();
  await expect(quien.getByRole('button', { name: /Corregir los datos del cliente/ })).toBeVisible();
  await expect(quien.getByRole('button', { name: /^Anular/ })).toBeVisible();
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
