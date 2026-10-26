import { expect, test, type APIRequestContext, type Browser } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T4 · 2 · La barra y la alergia de la mesa** (decisión 0117; maquetas de T4 3, 4 y 5), en la
 * pantalla y con una cuenta nueva:
 *
 *   · en la mesa, **Opciones › Alergias › Gluten**; al tocar las croquetas, que lo llevan, la
 *     sala avisa antes de pedirlas: «Pedirlo, la cocina lo verá»
 *   · la pantalla de barra **entra sin PIN** y ve solo la caña, con la franja de la alergia; al
 *     tacharla, la sala ve en la cuenta **✓ con su hora**
 *   · la de cocina ve las croquetas con **«LLEVA GLUTEN»**, sin confirmar nada
 */
const TPV = 'http://localhost:5178/';
/** Sin el aviso al segundo (en las pruebas no llega), las pantallas preguntan solas. */
const LO_QUE_TARDA = 45_000;

async function sinSesion<T>(
  request: APIRequestContext,
  nombre: string,
  entrada: unknown,
): Promise<T> {
  const respuesta = await request.post(`${API}/v1/comandos/${nombre}`, {
    // Sin el título: lleva «✓», y una cabecera solo admite letras sin acento.
    headers: { 'x-idempotencia': `${nombre}-${String(Math.random()).slice(2)}` },
    data: entrada,
  });
  expect(respuesta.status(), await respuesta.text()).toBe(200);
  return ((await respuesta.json()) as { datos: T }).datos;
}

/** Abre Estook TPV en otra ventana, como el aparato de esa llave. */
async function enOtraVentana(browser: Browser, llave: string) {
  const contexto = await browser.newContext();
  const pagina = await contexto.newPage();
  await abrirSinQueSeCaiga(pagina, TPV);
  await pagina.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(pagina, TPV);
  return { contexto, pagina };
}

test('la barra y la alergia: avisar al pedir, la franja en rojo, y el ✓ con su hora', async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(300_000);
  const enElOrdenador = info.project.name === 'escritorio';
  await cuentaNueva(page, request, `barra-${unico(info)}@correo-de-prueba.com`, 'Bar Barra');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  // ── La carta (las croquetas llevan gluten), la caja, la mesa y las dos pantallas ──
  const plato: Record<string, string> = {};
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
    const hechos = await ejecutarEnLaApi<{ creados: { platoId: string }[] }>(
      request,
      token,
      'crear_platos',
      { seccion_id: seccionId, platos: [{ nombre, precio_centimos: precio }] },
    );
    plato[nombre] = hechos.creados[0]?.platoId ?? '';
  }
  await ejecutarEnLaApi(request, token, 'cambiar_plato', {
    plato_id: plato['Croquetas'],
    version: 1,
    alergenos: ['gluten'],
  });
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  const caja = await ejecutarEnLaApi<{ llave: string; tuPinNuevo: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  const dentro = await sinSesion<{ turno: string }>(request, 'entrar_con_pin', {
    llave: caja.llave,
    pin: caja.tuPinNuevo,
  });
  const enLaCaja = `tpv.${dentro.turno}.${caja.llave}`;
  const { zonaId } = await ejecutarEnLaApi<{ zonaId: string }>(
    request,
    enLaCaja,
    'crear_zona_de_sala',
    { nombre: 'Salón' },
  );
  await ejecutarEnLaApi(request, enLaCaja, 'crear_mesa', { zona_id: zonaId, x: 60, y: 60 });
  const llaveDe = async (funcion: 'barra' | 'cocina', nombre: string) => {
    const { codigo } = await ejecutarEnLaApi<{ codigo: string }>(
      request,
      enLaCaja,
      'sacar_codigo_para_vincular',
      { funcion, nombre },
    );
    return (await sinSesion<{ llave: string }>(request, 'vincular_con_codigo', { codigo })).llave;
  };
  // Las dos pantallas, encendidas antes de pedir, como en un local: la caja se bloquea a los
  // dos minutos sin tocarla, y abrirlas después tardaría más que eso.
  const barra = await enOtraVentana(browser, await llaveDe('barra', 'Barra'));
  await expect(barra.pagina.getByText('Nada que servir')).toBeVisible({ timeout: 15_000 });
  await expect(barra.pagina.getByText('Teclea tu PIN')).toHaveCount(0);
  const cocina = await enOtraVentana(browser, await llaveDe('cocina', 'Cocina'));
  await expect(cocina.pagina.getByText('Nada que sacar')).toBeVisible({ timeout: 15_000 });

  // ── En la caja: la mesa, su alergia, y el aviso al pedir ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((llave) => {
    window.localStorage.setItem('estook.tpv.llave', llave);
  }, caja.llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(caja.tuPinNuevo);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  await page.evaluate(() => {
    window.location.hash = '/';
  });
  await page.getByRole('button', { name: /^Mesa 1: Libre/ }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();

  await page
    .locator('button:has-text("Opciones") >> visible=true')
    .first()
    .click({ timeout: 15_000 });
  const opciones = page.getByRole('dialog', { name: 'Mesa 1' });
  await opciones.getByRole('button', { name: /^⚠ Alergias/ }).click();
  await opciones.getByRole('button', { name: 'Gluten', exact: true }).click();
  await opciones.getByRole('button', { name: 'Guardar' }).click();
  await expect(opciones).toHaveCount(0, { timeout: 15_000 });

  await page.getByRole('button', { name: 'Entrantes', exact: true }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Croquetas, 9,00 €/ }).click();
  const aviso = page.getByRole('dialog', { name: '⚠ Croquetas lleva gluten' });
  await expect(aviso).toBeVisible({ timeout: 15_000 });
  await aviso.getByRole('button', { name: 'Pedirlo, la cocina lo verá' }).click();
  await expect(aviso).toHaveCount(0);
  await page.getByRole('button', { name: 'Bebidas', exact: true }).click();
  await page.getByRole('button', { name: /^Caña, 2,20 €/ }).click();
  await page.getByRole('button', { name: 'Mandar' }).click();
  await expect(page.getByRole('status')).toHaveText(/^Mandado/, { timeout: 15_000 });

  // ── La barra: solo la caña, con la franja de la alergia ──
  const enLaBarra = barra.pagina.getByRole('article', { name: 'Mesa 1' });
  await expect(enLaBarra).toBeVisible({ timeout: LO_QUE_TARDA });
  await expect(enLaBarra.getByText('⚠ ALERGIA · GLUTEN')).toBeVisible();
  await expect(enLaBarra.getByRole('button', { name: /Caña/ })).toBeVisible();
  await expect(enLaBarra.getByRole('button', { name: /Croquetas/ })).toHaveCount(0);
  await expect(barra.pagina.locator('body')).not.toContainText('€');

  // ── La cocina: las croquetas, «LLEVA GLUTEN» ──
  const enLaCocina = cocina.pagina.getByRole('article', { name: 'Mesa 1' });
  await expect(enLaCocina).toBeVisible({ timeout: LO_QUE_TARDA });
  await expect(enLaCocina.getByText('LLEVA GLUTEN')).toBeVisible();
  await expect(enLaCocina.getByRole('button', { name: /Caña/ })).toHaveCount(0);
  await cocina.contexto.close();

  // ── La barra tacha la caña: a Acabados, y en la cuenta de la sala, ✓ con su hora ──
  await enLaBarra.getByRole('button', { name: /Caña/ }).click();
  await expect(barra.pagina.getByRole('article', { name: 'Mesa 1' })).toHaveCount(0, {
    timeout: 15_000,
  });
  await barra.pagina.getByRole('tab', { name: /^Acabados · 1/ }).click();
  await expect(barra.pagina.getByRole('article', { name: 'Mesa 1' })).toBeVisible();
  await barra.contexto.close();

  await page.bringToFront();
  if (!enElOrdenador) await page.getByRole('button', { name: /^Ver la cuenta/ }).click();
  await expect(page.locator('text=/^✓ \\d\\d:\\d\\d$/ >> visible=true').first()).toBeVisible({
    timeout: LO_QUE_TARDA,
  });
  await expect(page.locator('text=/^⚠ Lleva gluten$/ >> visible=true').first()).toBeVisible();
});
