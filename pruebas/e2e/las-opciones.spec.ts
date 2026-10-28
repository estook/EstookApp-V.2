import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T3 · 2 · 1 · Las opciones y los extras, y lo que se vende a peso** (decisión 0113; Anexo
 * 10.3), en la pantalla y con una cuenta nueva:
 *
 *   · en Productos, la hoja de la hamburguesa: «+ Grupo nuevo», Guarnición, obligatoria y una
 *   · el jamón, «Se vende a peso»
 *   · al pedir: la hamburguesa pregunta la guarnición, **un toque y está pedida**; el jamón
 *     pregunta lo que pesa y el precio sale solo
 */
const TPV = 'http://localhost:5178/';

test('las opciones: montar la guarnición, el jamón a peso, y pedirlos', async ({
  page,
  request,
}, info) => {
  test.slow();
  const enElOrdenador = info.project.name === 'escritorio';
  await cuentaNueva(page, request, `opciones-${unico(info)}@correo-de-prueba.com`, 'Bar Opciones');
  await pagarPro(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  for (const [seccion, platos] of [
    ['Principales', [['Hamburguesa', 1250]]],
    ['Para picar', [['Jamón ibérico', 12000]]],
  ] as const) {
    const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
      request,
      token,
      'crear_seccion',
      { nombre: seccion },
    );
    await ejecutarEnLaApi(request, token, 'crear_platos', {
      seccion_id: seccionId,
      platos: platos.map(([nombre, precio]) => ({ nombre, precio_centimos: precio })),
    });
  }

  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  const { llave, tuPinNuevo: pin } = await ejecutarEnLaApi<{ llave: string; tuPinNuevo: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  const dentro = (await (
    await request.post(`${API}/v1/comandos/entrar_con_pin`, {
      headers: { 'x-idempotencia': `pin-${unico(info)}` },
      data: { llave, pin },
    })
  ).json()) as { datos: { turno: string } };
  const enLaCaja = `tpv.${dentro.datos.turno}.${llave}`;
  await ejecutarEnLaApi(request, enLaCaja, 'montar_la_botonera', { camino: 'toda_la_carta' });
  const { zonaId } = await ejecutarEnLaApi<{ zonaId: string }>(
    request,
    enLaCaja,
    'crear_zona_de_sala',
    { nombre: 'Salón' },
  );
  await ejecutarEnLaApi(request, enLaCaja, 'crear_mesa', { zona_id: zonaId, x: 60, y: 60 });

  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  await page.evaluate(() => {
    window.location.hash = '/ajustes/productos';
  });

  // ── La guarnición de la hamburguesa: un grupo nuevo, desde su botón ──
  await page
    .getByRole('region', { name: 'Página Principales' })
    .getByRole('button', { name: 'Hamburguesa', exact: true })
    .click({ timeout: 15_000 });
  const hojaDelBoton = page.getByRole('dialog', { name: 'Hamburguesa' });
  await hojaDelBoton.getByRole('button', { name: '+ Grupo nuevo' }).click({ timeout: 15_000 });
  const hojaDelGrupo = page.getByRole('dialog', { name: 'Grupo nuevo' });
  await hojaDelGrupo.getByLabel('Nombre del grupo').fill('Guarnición');
  await expect(hojaDelGrupo.getByRole('radio', { name: 'Obligatoria, una' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await hojaDelGrupo.getByLabel('Opción 1').fill('Patatas');
  await hojaDelGrupo.getByLabel('Opción 2').fill('Ensalada');
  await hojaDelGrupo.getByRole('button', { name: 'Guardar' }).click();
  await expect(hojaDelBoton.getByRole('switch', { name: 'Guarnición' })).toBeChecked({
    timeout: 15_000,
  });
  await hojaDelBoton.getByRole('button', { name: 'Listo' }).click();

  // ── El jamón, a peso ──
  await page
    .getByRole('region', { name: 'Página Para picar' })
    .getByRole('button', { name: 'Jamón ibérico', exact: true })
    .click();
  const hojaDelJamon = page.getByRole('dialog', { name: 'Jamón ibérico' });
  await hojaDelJamon.getByRole('switch', { name: 'Se vende a peso' }).locator('xpath=..').click();
  await expect(hojaDelJamon.getByLabel('Precio del kilo, con IVA')).toBeVisible();
  await hojaDelJamon.getByRole('button', { name: 'Listo' }).click();

  // ── Pedir ──
  await page.evaluate(() => {
    window.location.hash = '/';
  });
  await page.getByRole('button', { name: /^Mesa 1: Libre/ }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  await page.getByRole('button', { name: 'Principales', exact: true }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Hamburguesa, 12,50 €/ }).click();
  // Una pregunta obligatoria de una: un toque y está pedida (dos en total).
  await page
    .getByRole('dialog', { name: 'Hamburguesa' })
    .getByRole('radio', { name: 'Patatas' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Hamburguesa' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Para picar', exact: true }).click();
  await page.getByRole('button', { name: /^Jamón ibérico, 120,00 €/ }).click();
  const pesar = page.getByRole('dialog', { name: 'Jamón ibérico' });
  await pesar.getByLabel('Lo que pesa, en gramos').fill('120');
  await pesar.getByRole('button', { name: 'Añadir · 14,40' }).click();
  // En la cuenta, lo elegido y lo que pesó, debajo de cada uno (en el móvil, en «Ver la cuenta»).
  if (!enElOrdenador) await page.getByRole('button', { name: /^Ver la cuenta/ }).click();
  await expect(page.locator('text="Patatas" >> visible=true').first()).toBeVisible();
  await expect(page.locator('text="120 g" >> visible=true').first()).toBeVisible();
  if (!enElOrdenador) await page.getByRole('button', { name: 'Cerrar' }).first().click();

  await page.getByRole('button', { name: 'Mandar' }).click();
  await expect(page.getByRole('status')).toHaveText(/^Mandado: a cocina 2/, { timeout: 15_000 });
});
