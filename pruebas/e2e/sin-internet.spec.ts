import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T5 · 2 · 1 · Cada aparato aguanta solo** (decisión 0122), con el navegador sin red de
 * verdad, como el «terminado cuando» con el iPhone en modo avión:
 *
 *   · con internet, la caja lee la sala y la carta, y quien entra queda apuntado
 *   · **sin internet** se abre la mesa 1, se piden dos croquetas y se manda: sale «guardado
 *     aquí», la franja dice cuántas cosas faltan y «Ver» las enseña
 *   · se bloquea y **se vuelve a entrar sin internet** con el mismo PIN
 *   · vuelve internet: «Conexión recuperada · 3 cosas subidas, ninguna repetida», y en Estook
 *     la mesa tiene las croquetas **una vez**, mandadas
 */
const TPV = 'http://localhost:5178/';

test('sin internet se sigue: abrir la mesa, pedir, mandar, bloquear y entrar; al volver, sube una vez', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `sin-internet-${unico(info)}@correo-de-prueba.com`, 'Bar Corte');
  await pagarPro(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
    request,
    token,
    'crear_seccion',
    { nombre: 'Entrantes' },
  );
  await ejecutarEnLaApi(request, token, 'crear_platos', {
    seccion_id: seccionId,
    platos: [{ nombre: 'Croquetas', precio_centimos: 900 }],
  });
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  const { llave, tuPinNuevo: pin } = await ejecutarEnLaApi<{ llave: string; tuPinNuevo: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  const entrarPorLaApi = async (clave: string) => {
    const dentro = (await (
      await request.post(`${API}/v1/comandos/entrar_con_pin`, {
        headers: { 'x-idempotencia': `${clave}-${unico(info)}` },
        data: { llave, pin },
      })
    ).json()) as { datos: { turno: string } };
    return `tpv.${dentro.datos.turno}.${llave}`;
  };
  const enLaCaja = await entrarPorLaApi('pin');
  const { zonaId } = await ejecutarEnLaApi<{ zonaId: string }>(
    request,
    enLaCaja,
    'crear_zona_de_sala',
    { nombre: 'Salón' },
  );
  await ejecutarEnLaApi(request, enLaCaja, 'crear_mesa', { zona_id: zonaId, x: 60, y: 60 });

  // ── Con internet: la caja lee la sala y la carta, y quien entra queda apuntado ──
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
  const guardado = (clave: string) =>
    page.evaluate((c) => window.localStorage.getItem(c) ?? '', clave);
  await expect
    .poll(() => guardado('estook.tpv.copia.la_carta'), { timeout: 15_000 })
    .toContain('Croquetas');
  await expect.poll(() => guardado('estook.tpv.copia.aparato')).toContain('clavePublica');
  await expect
    .poll(() => guardado('estook.tpv.quien-entro-hoy'), { timeout: 15_000 })
    .toContain('"permisos"');

  // ── Sin internet: abrir la mesa 1, pedir dos croquetas y mandar ──
  await page.context().setOffline(true);
  await page.getByRole('button', { name: /^Mesa 1: Libre/ }).click();
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  await page.getByRole('button', { name: 'Entrantes', exact: true }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Croquetas, 9,00 €/ }).click();
  await page.getByRole('button', { name: /^Croquetas, 9,00 €/ }).click();
  await page.getByRole('button', { name: 'Mandar' }).click();
  await expect(
    page
      .getByText('Guardado en este aparato: la cocina lo recibe al volver internet')
      .locator('visible=true'),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText(/^Sin conexión\. Se guarda aquí.*· 3 por subir$/).locator('visible=true'),
  ).toBeVisible();
  const cuentaId = /mesa\/([0-9a-f-]{36})/.exec(page.url())?.[1] ?? '';
  expect(cuentaId).not.toBe('');

  // Lo que espera, a la vista.
  await page.getByRole('button', { name: 'Ver', exact: true }).locator('visible=true').click();
  await expect(page.getByRole('heading', { name: 'Por subir · 3 cosas' })).toBeVisible();
  await expect(page.getByText('Mesa 1 · 2 platos pedidos')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).first().click();

  // En el plano, la mesa 1 ocupada aunque Estook aún no lo sepa.
  await page.getByRole('button', { name: 'Volver al plano' }).first().click();
  await expect(page.getByRole('button', { name: /^Mesa 1: Sin mandar/ })).toBeVisible({
    timeout: 15_000,
  });

  // ── Se bloquea, y se vuelve a entrar sin internet con el mismo PIN ──
  await page.getByRole('button', { name: /: bloquear$/ }).click();
  await expect(
    page.getByText('Sin conexión: entra quien ya entró hoy en este aparato.'),
  ).toBeVisible({
    timeout: 15_000,
  });
  await page.keyboard.type(pin);
  await expect(page.getByRole('button', { name: /^Mesa 1: Sin mandar/ })).toBeVisible({
    timeout: 15_000,
  });

  // ── Vuelve internet: sube solo, una vez ──
  await page.context().setOffline(false);
  await expect(
    page.getByText('Conexión recuperada · 3 cosas subidas, ninguna repetida'),
  ).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: /^Mesa 1: Comiendo/ })).toBeVisible({
    timeout: 15_000,
  });
  expect(await guardado('estook.tpv.por-subir')).toBe('');

  const otraVez = await entrarPorLaApi('comprobar');
  const respuesta = await request.get(`${API}/v1/consultas/la_mesa?cuenta_id=${cuentaId}`, {
    headers: { authorization: `Bearer ${otraVez}` },
  });
  const { datos: mesa } = (await respuesta.json()) as {
    datos: { platos: { nombre: string; cantidad: number; estado: string }[] };
  };
  expect(mesa.platos).toHaveLength(1);
  expect(mesa.platos[0]).toMatchObject({ nombre: 'Croquetas', cantidad: 2 });
  expect(mesa.platos[0]?.estado).not.toBe('sin_mandar');
});
