import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **Cada aparato, a lo suyo** (decisión 0115; Richi, 25-oct), en la pantalla y con una cuenta
 * nueva:
 *
 *   · en el comandero, **sin fichar no se entra**, y no se ficha ahí
 *   · en la caja, **«Fichar» en naranja**: se ficha con el PIN sin entrar en la caja
 *   · y el comandero entra **directo a la sala**: ni inicio, ni fichar, ni ajustes
 */
const TPV = 'http://localhost:5178/';

test('el comandero sin fichar no entra; se ficha en la caja; y el comandero va a la sala', async ({
  page,
  browser,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `aparatos-${unico(info)}@correo-de-prueba.com`, 'Bar Aparatos');
  await pagarPro(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  // ── La caja y un comandero para todos, por la API: lo que se prueba es usarlos ──
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  const caja = await ejecutarEnLaApi<{ llave: string; tuPinNuevo: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  const pin = caja.tuPinNuevo;
  const dentro = (await (
    await request.post(`${API}/v1/comandos/entrar_con_pin`, {
      headers: { 'x-idempotencia': `pin-${unico(info)}` },
      data: { llave: caja.llave, pin },
    })
  ).json()) as { datos: { turno: string } };
  const enLaCaja = `tpv.${dentro.datos.turno}.${caja.llave}`;
  const { zonaId } = await ejecutarEnLaApi<{ zonaId: string }>(
    request,
    enLaCaja,
    'crear_zona_de_sala',
    { nombre: 'Salón' },
  );
  await ejecutarEnLaApi(request, enLaCaja, 'crear_mesa', { zona_id: zonaId, x: 60, y: 60 });
  const { codigo } = await ejecutarEnLaApi<{ codigo: string }>(
    request,
    enLaCaja,
    'sacar_codigo_para_vincular',
    { funcion: 'comandero', nombre: 'Tablet de la sala' },
  );
  const comandero = (
    (await (
      await request.post(`${API}/v1/comandos/vincular_con_codigo`, {
        headers: { 'x-idempotencia': `codigo-${unico(info)}` },
        data: { codigo },
      })
    ).json()) as { datos: { llave: string } }
  ).datos;

  // ── En el comandero, sin fichar: no entra ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((llave) => {
    window.localStorage.setItem('estook.tpv.llave', llave);
  }, comandero.llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  // En el comandero no hay «Fichar»: es de la caja.
  await expect(page.getByRole('button', { name: 'Fichar', exact: true })).toHaveCount(0);
  await page.keyboard.type(pin);
  await expect(page.getByRole('heading', { name: 'Sin fichar' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/ficha la entrada en la caja o en Estook/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Fichar la entrada/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Volver' }).click();

  // ── En la caja, el botón naranja: fichar sin entrar ──
  const otro = await browser.newContext();
  const laCaja = await otro.newPage();
  await abrirSinQueSeCaiga(laCaja, TPV);
  await laCaja.evaluate((llave) => {
    window.localStorage.setItem('estook.tpv.llave', llave);
  }, caja.llave);
  await abrirSinQueSeCaiga(laCaja, TPV);
  await expect(laCaja.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await laCaja.getByRole('button', { name: 'Fichar', exact: true }).click();
  await expect(laCaja.getByText('Fichar · teclea tu PIN')).toBeVisible();
  await laCaja.keyboard.type(pin);
  await laCaja.getByRole('button', { name: 'Fichar la entrada' }).click();
  await expect(laCaja.getByRole('status')).toHaveText(/^✓ .* · entrada a las \d\d:\d\d$/, {
    timeout: 15_000,
  });
  // Ha fichado sin entrar: la caja sigue en el PIN.
  await expect(laCaja.getByText('Teclea tu PIN')).toBeVisible();
  await otro.close();

  // ── Y en el comandero, ya fichado: directo a la sala ──
  await page.keyboard.type(pin);
  await expect(page.getByRole('button', { name: /^Mesa 1: Libre/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: 'La sala' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fichar', exact: true })).toHaveCount(0);
  // Los ajustes y el inicio son de la caja: aquí, la sala.
  for (const direccion of ['/ajustes', '/inicio', '/fichar', '/agotados']) {
    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, direccion);
    await expect(page.getByRole('button', { name: /^Mesa 1: Libre/ })).toBeVisible();
  }
});
