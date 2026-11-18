import { expect, test, type APIRequestContext } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';
import { LA_PUERTA, tocarEnElTpv } from './la-puerta-del-tpv.ts';

/**
 * **El rediseño, entrega 2 · 2 · Los avisos, el móvil y Ajustes** (decisión 0148), con una cuenta
 * nueva y la cocina que llama a la Mesa 1:
 *
 *   · el aviso sale **arriba a la derecha**, con su botón; la «×» lo quita de la vista y **se queda
 *     en la campana**, que cuenta cuántos hay; «Ya voy» desde la campana lo atiende
 *   · **en el móvil, la barra de abajo**: Sala · Mías · Avisos · Tú; «Tú» lleva el tema, Ajustes y
 *     Bloquear
 *   · **Ajustes en tres grupos**: Tú, El local y El dinero
 */
const TPV = 'http://localhost:5178/';
const CLAVE = 'una frase que recuerdo';
/**
 * En las pruebas el aviso al segundo no llega: la sala vuelve a leer sola, como mucho al minuto, y
 * lo que hace la cocina tarda eso en salir aquí.
 */
const LO_QUE_TARDA = 75_000;

async function otraSesion(request: APIRequestContext, correo: string): Promise<string> {
  const r = await request.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `entrar-${String(Date.now())}-${String(Math.random())}` },
    data: { correo, contrasena: CLAVE },
  });
  return ((await r.json()) as { datos: { token: string } }).datos.token;
}

test('los avisos: arriba, la «×», la campana y «Ya voy»; en el móvil la barra de abajo; Ajustes en tres', async ({
  page,
  request,
}, info) => {
  test.setTimeout(240_000);
  // Con CAPTURAS_DE_LOS_AVISOS=1 deja una foto de cada pantalla.
  const foto = async (paso: string) => {
    if (process.env['CAPTURAS_DE_LOS_AVISOS'] === undefined) return;
    await page.screenshot({ path: info.outputPath(`${paso}.png`) });
  };
  const enElMovil = info.project.name !== 'escritorio';
  const correo = `avisos-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(page, request, correo, 'Bar Avisos');
  await pagarPro(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
    request,
    token,
    'crear_seccion',
    { nombre: 'Entrantes' },
  );
  const { creados } = await ejecutarEnLaApi<{ creados: { platoId: string }[] }>(
    request,
    token,
    'crear_platos',
    { seccion_id: seccionId, platos: [{ nombre: 'Croquetas', precio_centimos: 900 }] },
  );

  // ── La caja y la pantalla de cocina; la Mesa 1 pedida y mandada ──
  const { llave, tuPinNuevo: pin } = await ejecutarEnLaApi<{ llave: string; tuPinNuevo: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  const cocina = await ejecutarEnLaApi<{ llave: string }>(
    request,
    await otraSesion(request, correo),
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'cocina', nombre: 'Cocina' },
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
  const { mesaId } = await ejecutarEnLaApi<{ mesaId: string }>(request, enLaCaja, 'crear_mesa', {
    zona_id: zonaId,
    x: 60,
    y: 60,
  });
  const cuenta = crypto.randomUUID();
  await ejecutarEnLaApi(request, enLaCaja, 'abrir_mesa', {
    cuenta_id: cuenta,
    mesa_id: mesaId,
    personas: 2,
  });
  await ejecutarEnLaApi(request, enLaCaja, 'pedir', {
    cuenta_id: cuenta,
    platos: [{ id: crypto.randomUUID(), plato_id: creados[0]?.platoId, pase: 1 }],
  });
  await ejecutarEnLaApi(request, enLaCaja, 'mandar_a_cocina', { cuenta_id: cuenta });

  // ── Entrar en la caja ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText(LA_PUERTA).first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1: / })).toBeVisible({ timeout: 15_000 });
  const campana = page.getByRole('button', { name: /^Avisos/ });
  await expect(campana).toHaveAccessibleName('Avisos');

  // ── En el móvil, la barra de abajo: Sala · Mías · Avisos · Tú ──
  if (enElMovil) {
    const abajo = page.getByRole('navigation', { name: 'Abajo' });
    for (const nombre of ['Sala', 'Mías', 'Avisos', 'Tú']) {
      await expect(abajo.getByRole('button', { name: new RegExp(`^${nombre}`) })).toBeVisible();
    }
    // Arriba ya no están el engranaje ni Bloquear: van en «Tú».
    await expect(page.getByRole('banner').getByRole('button', { name: 'Ajustes' })).toHaveCount(0);
  }

  // ── La cocina llama a la Mesa 1: el aviso sale arriba, y la campana cuenta uno ──
  const llamada = await request.post(`${API}/v1/comandos/llamar_al_camarero`, {
    headers: { 'x-idempotencia': `llamar-${unico(info)}` },
    data: { llave: cocina.llave, cuenta_id: cuenta },
  });
  expect(llamada.ok(), await llamada.text()).toBe(true);
  const arriba = page.getByRole('region', { name: 'Avisos' });
  await expect(arriba.getByText('Cocina llama · Mesa 1')).toBeVisible({ timeout: LO_QUE_TARDA });
  await expect(campana).toHaveAccessibleName('Avisos: 1');
  await foto('01-el-aviso-arriba');

  // La «×» lo quita de la vista; sigue en la campana.
  await arriba.getByRole('button', { name: /^Quitar de aquí/ }).click();
  await expect(arriba).toHaveCount(0);
  await expect(campana).toHaveAccessibleName('Avisos: 1');
  await campana.click();
  const laCampana = page.getByRole('dialog', { name: 'Avisos' });
  await expect(laCampana.getByText('Cocina llama · Mesa 1')).toBeVisible();
  await foto('02-la-campana');
  await laCampana.getByRole('button', { name: /^Ya voy/ }).click();
  await expect(laCampana).toHaveCount(0);
  await expect(campana).toHaveAccessibleName('Avisos', { timeout: LO_QUE_TARDA });

  // ── Ajustes, en tres grupos ──
  await tocarEnElTpv(page, 'Ajustes');
  for (const grupo of ['Tú', 'El local', 'El dinero']) {
    await expect(page.getByRole('region', { name: grupo })).toBeVisible({ timeout: 15_000 });
  }
  await foto('03-ajustes');

  // ── Y Bloquear, arriba o en «Tú»: vuelve al PIN ──
  await page.getByRole('banner').getByRole('button', { name: 'La sala' }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1: / })).toBeVisible({ timeout: 15_000 });
  if (enElMovil) {
    await page
      .getByRole('navigation', { name: 'Abajo' })
      .getByRole('button', { name: 'Tú' })
      .click();
    await expect(page.getByRole('dialog', { name: 'Tú' })).toBeVisible();
    await foto('04-tu');
    await page.keyboard.press('Escape');
  }
  await tocarEnElTpv(page, /: bloquear$/);
  await expect(page.getByText(LA_PUERTA).first()).toBeVisible({ timeout: 15_000 });
});
