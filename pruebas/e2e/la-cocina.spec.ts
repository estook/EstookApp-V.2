import { expect, test, type APIRequestContext } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T4 · 1 · La cocina** (decisión 0116; maquetas de T4 1, 1b y 2), en la pantalla y con una
 * cuenta nueva:
 *
 *   · la pantalla de cocina **entra sin PIN**, y la mesa sale entera: el 1.º en marcha y el
 *     2.º en espera, **sin un euro**
 *   · un toque tacha; al marchar el 2.º, «¡MARCHA EL 2.º!»
 *   · «Llamar a …» le sale a la sala, que dice «Ya voy»
 *   · al tachar el último, la mesa se va a **Acabados**, y otro toque la devuelve
 */
const TPV = 'http://localhost:5178/';
/**
 * Sin el aviso al segundo (en las pruebas no llega), la pantalla vuelve a preguntar sola cada
 * 30 segundos como mucho: lo que manda la sala tarda eso en salir aquí.
 */
const LO_QUE_TARDA = 45_000;

async function sinSesion<T>(
  request: APIRequestContext,
  nombre: string,
  entrada: unknown,
  info: { readonly title: string },
): Promise<T> {
  const respuesta = await request.post(`${API}/v1/comandos/${nombre}`, {
    headers: { 'x-idempotencia': `${nombre}-${info.title}-${String(Math.random())}` },
    data: entrada,
  });
  expect(respuesta.status(), await respuesta.text()).toBe(200);
  return ((await respuesta.json()) as { datos: T }).datos;
}

test('la pantalla de cocina: el ticket entero, tachar, marchar, llamar y Acabados', async ({
  page,
  browser,
  request,
}, info) => {
  // Tres esperas de la pantalla, de hasta 30 segundos cada una (`LO_QUE_TARDA`).
  test.setTimeout(300_000);
  await cuentaNueva(page, request, `cocina-${unico(info)}@correo-de-prueba.com`, 'Bar Cocina');
  await pagarPro(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  // ── La carta, la caja, la mesa y la pantalla de cocina, por la API ──
  const plato: Record<string, string> = {};
  for (const [seccion, nombre, precio] of [
    ['Entrantes', 'Croquetas', 900],
    ['Principales', 'Entrecot', 2200],
  ] as const) {
    const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
      request,
      token,
      'crear_seccion',
      { nombre: seccion },
    );
    const hechos = await ejecutarEnLaApi<{ creados: { platoId: string }[] }>(
      request,
      token,
      'crear_platos',
      { seccion_id: seccionId, platos: [{ nombre, precio_centimos: precio }] },
    );
    plato[nombre] = hechos.creados[0]?.platoId ?? '';
  }
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  const caja = await ejecutarEnLaApi<{ llave: string; tuPinNuevo: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  const dentro = await sinSesion<{ turno: string }>(
    request,
    'entrar_con_pin',
    { llave: caja.llave, pin: caja.tuPinNuevo },
    info,
  );
  const enLaCaja = `tpv.${dentro.turno}.${caja.llave}`;
  const { zonaId } = await ejecutarEnLaApi<{ zonaId: string }>(
    request,
    enLaCaja,
    'crear_zona_de_sala',
    { nombre: 'Salón' },
  );
  const { mesaId } = await ejecutarEnLaApi<{ mesaId: string }>(request, enLaCaja, 'crear_mesa', {
    zona_id: zonaId,
    x: 60,
    y: 60,
  });
  const { codigo } = await ejecutarEnLaApi<{ codigo: string }>(
    request,
    enLaCaja,
    'sacar_codigo_para_vincular',
    { funcion: 'cocina', nombre: 'Cocina' },
  );
  const pantalla = await sinSesion<{ llave: string }>(
    request,
    'vincular_con_codigo',
    { codigo },
    info,
  );

  // ── La pantalla de cocina: sin PIN, siempre encendida ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((llave) => {
    window.localStorage.setItem('estook.tpv.llave', llave);
  }, pantalla.llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Nada que sacar')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Teclea tu PIN')).toHaveCount(0);

  // ── La sala pide y manda: el 1.º en marcha, el 2.º en espera ──
  const cuenta = crypto.randomUUID();
  await ejecutarEnLaApi(request, enLaCaja, 'abrir_mesa', {
    cuenta_id: cuenta,
    mesa_id: mesaId,
    personas: 2,
  });
  await ejecutarEnLaApi(request, enLaCaja, 'pedir', {
    cuenta_id: cuenta,
    platos: [
      { id: crypto.randomUUID(), plato_id: plato['Croquetas'], pase: 1 },
      { id: crypto.randomUUID(), plato_id: plato['Entrecot'], pase: 2, nota: 'poco hecho' },
    ],
  });
  await ejecutarEnLaApi(request, enLaCaja, 'mandar_a_cocina', { cuenta_id: cuenta });

  const tarjeta = page.getByRole('article', { name: 'Mesa 1' });
  await expect(tarjeta).toBeVisible({ timeout: LO_QUE_TARDA });
  await expect(tarjeta.getByText('1.º · en marcha')).toBeVisible();
  await expect(tarjeta.getByText('2.º · en espera')).toBeVisible();
  await expect(tarjeta.getByText('poco hecho')).toBeVisible();
  // Ni un euro.
  await expect(page.locator('body')).not.toContainText('€');

  // ── Un toque tacha; lo que espera no se toca ──
  await tarjeta.getByRole('button', { name: /Croquetas/ }).click();
  await expect(tarjeta.getByRole('button', { name: /Croquetas/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(tarjeta.getByText('ESPERANDO A QUE MARCHEN')).toBeVisible({ timeout: 15_000 });
  await expect(tarjeta.getByRole('button', { name: /Entrecot/ })).toBeDisabled();

  // ── La sala marcha el 2.º ──
  await ejecutarEnLaApi(request, enLaCaja, 'marchar', { cuenta_id: cuenta, pase: 2 });
  await expect(tarjeta.getByText('¡MARCHA EL 2.º!')).toBeVisible({ timeout: LO_QUE_TARDA });

  // ── «Llamar a …»: le sale a la sala, que dice «Ya voy» ──
  await tarjeta.getByRole('button', { name: /^🛎 Llamar a / }).click();
  await expect(tarjeta.getByText(/^🛎 Llamada a las \d\d:\d\d$/)).toBeVisible({ timeout: 15_000 });
  const otro = await browser.newContext();
  const enLaSala = await otro.newPage();
  await abrirSinQueSeCaiga(enLaSala, TPV);
  await enLaSala.evaluate((llave) => {
    window.localStorage.setItem('estook.tpv.llave', llave);
  }, caja.llave);
  await abrirSinQueSeCaiga(enLaSala, TPV);
  await expect(enLaSala.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await enLaSala.keyboard.type(caja.tuPinNuevo);
  // Quien crea el local no ha fichado: en la caja se entra igual (0115).
  await enLaSala.getByRole('button', { name: 'Entrar sin fichar' }).click({ timeout: 15_000 });
  await enLaSala.evaluate(() => {
    window.location.hash = '/';
  });
  const aviso = enLaSala.getByRole('status').filter({ hasText: 'La cocina te llama · Mesa 1' });
  await expect(aviso).toBeVisible({ timeout: LO_QUE_TARDA });
  await aviso.getByRole('button', { name: 'Ya voy' }).click();
  await expect(aviso).toHaveCount(0, { timeout: LO_QUE_TARDA });
  await otro.close();

  // ── Al tachar el último, a Acabados; y otro toque la devuelve ──
  await tarjeta.getByRole('button', { name: /Entrecot/ }).click();
  await expect(page.getByRole('article', { name: 'Mesa 1' })).toHaveCount(0, { timeout: 15_000 });
  await page.getByRole('tab', { name: /^Acabados · 1/ }).click();
  const acabada = page.getByRole('article', { name: 'Mesa 1' });
  await expect(acabada.getByText(/^✓ SALIÓ A LAS/)).toBeVisible();
  await acabada.getByRole('button', { name: /Entrecot/ }).click();
  await page.getByRole('tab', { name: /^En marcha/ }).click();
  await expect(page.getByRole('article', { name: 'Mesa 1' })).toBeVisible({ timeout: 15_000 });
});
