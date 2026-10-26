import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **La entrada nueva de Estook TPV** (decisión 0118; maquetas de la entrada, 26-oct), en la
 * pantalla y con una cuenta nueva:
 *
 *   · **se entra a la sala**, sin inicio de baldosas; arriba, Fichar y el engranaje, y nada de
 *     «Editar sala»; en la tablet y el ordenador, **el plano cabe entero**
 *   · **el engranaje**: los Ajustes en grupos, cada uno con lo que dice cómo está, y «La sala y
 *     las mesas» lleva al editor
 *   · **mantener pulsado** un producto: «Se ha agotado» y «Ya hay otra vez»; y con el botón
 *     derecho, pedirlo con una nota para cocina
 */
const TPV = 'http://localhost:5178/';

test('la entrada: la sala primero, el engranaje y mantener pulsado', async ({
  page,
  request,
}, info) => {
  test.slow();
  const enElOrdenador = info.project.name === 'escritorio';
  await cuentaNueva(page, request, `entrada-${unico(info)}@correo-de-prueba.com`, 'Bar Entrada');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  for (const [seccion, nombre, precio] of [
    ['Bebidas', 'Caña', 220],
    ['Entrantes', 'Croquetas', 900],
  ] as const) {
    const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
      request,
      token,
      'crear_seccion',
      { nombre: seccion },
    );
    await ejecutarEnLaApi(request, token, 'crear_platos', {
      seccion_id: seccionId,
      platos: [{ nombre, precio_centimos: precio }],
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
  const { zonaId } = await ejecutarEnLaApi<{ zonaId: string }>(
    request,
    enLaCaja,
    'crear_zona_de_sala',
    { nombre: 'Salón' },
  );
  await ejecutarEnLaApi(request, enLaCaja, 'crear_mesa', { zona_id: zonaId, x: 60, y: 60 });
  await ejecutarEnLaApi(request, enLaCaja, 'crear_mesa', { zona_id: zonaId, x: 300, y: 60 });

  // ── Se entra a la sala: sin baldosas, con Fichar y el engranaje arriba ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1: Libre/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'Fichar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajustes', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Editar sala/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Mesas/ })).toHaveCount(0);

  // En la tablet y el ordenador, el plano entero dentro de la pantalla: sin bajar.
  if (enElOrdenador) {
    const caja = await page.getByLabel('El plano').boundingBox();
    const alto = page.viewportSize()?.height ?? 0;
    expect(caja).not.toBeNull();
    expect((caja?.y ?? 0) + (caja?.height ?? 0)).toBeLessThanOrEqual(alto);
  }

  // ── El engranaje: los grupos, y cada uno dice cómo está ──
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Lo que se vende' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^La sala y las mesas.*1 zona · 2 mesas/ }),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: /^Aparatos del local.*1 caja/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Agotados.*Nada agotado/ })).toBeVisible();
  // Lo que llega con su entrega no sale, ni apagado.
  await expect(page.getByRole('button', { name: /Impresoras/ })).toHaveCount(0);
  // La «E» devuelve a la sala desde cualquier sitio.
  await page.getByRole('button', { name: 'La sala', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1: Libre/ })).toBeVisible({
    timeout: 15_000,
  });
  // «La sala y las mesas» es el editor del plano, que ya no está arriba.
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('button', { name: /^La sala y las mesas/ }).click();
  await expect(page).toHaveURL(/#\/sala\/editar$/);
  await page.evaluate(() => {
    window.location.hash = '/';
  });

  // ── Mantener pulsado: se ha agotado, y ya hay otra vez ──
  await page.getByRole('button', { name: /^Mesa 1: Libre/ }).click();
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  await page.getByRole('button', { name: 'Entrantes', exact: true }).click({ timeout: 15_000 });
  const croquetas = page.getByRole('button', { name: /^Croquetas, 9,00 €/ });
  await croquetas.hover();
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  const hoja = page.getByRole('dialog', { name: 'Croquetas' });
  await hoja.getByRole('button', { name: '⊘ Se ha agotado' }).click();
  await expect(hoja).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Croquetas, 9,00 €, agotado/ })).toBeVisible({
    timeout: 15_000,
  });
  // Un toque en lo agotado no lo pide.
  await page.getByRole('button', { name: /^Croquetas, 9,00 €, agotado/ }).click();
  await expect(page.getByRole('button', { name: 'Mandar' })).toHaveCount(0);
  // Con el botón derecho, lo mismo que mantener: vuelve.
  await page
    .getByRole('button', { name: /^Croquetas, 9,00 €, agotado/ })
    .click({ button: 'right' });
  await page
    .getByRole('dialog', { name: 'Croquetas' })
    .getByRole('button', { name: '↺ Ya hay otra vez' })
    .click();
  await expect(page.getByRole('button', { name: /^Croquetas, 9,00 €$/ })).toBeVisible({
    timeout: 15_000,
  });

  // ── Y con una nota para cocina ──
  await page.getByRole('button', { name: /^Croquetas, 9,00 €$/ }).click({ button: 'right' });
  const conNota = page.getByRole('dialog', { name: 'Croquetas' });
  await conNota.getByRole('button', { name: '✎ Con una nota para cocina' }).click();
  await conNota.getByLabel('Nota para cocina').fill('sin jamón');
  await conNota.getByRole('button', { name: 'Pedirlo con la nota' }).click();
  if (!enElOrdenador) await page.getByRole('button', { name: /^Ver la cuenta/ }).click();
  await expect(page.locator('text="sin jamón" >> visible=true').first()).toBeVisible();
});
