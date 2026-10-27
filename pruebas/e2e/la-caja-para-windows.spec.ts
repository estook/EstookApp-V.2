import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T5 · 1 · Imprimir y el cajón** (decisión 0119; maquetas de T5), en la pantalla y con una
 * cuenta nueva:
 *
 *   · **sin la caja para Windows**, Ajustes › Impresoras y cajón dice que se descargue, y no
 *     ofrece buscar (la web no puede hablar con una impresora)
 *   · **dentro del programa** (aquí, con un puente de mentira): la caja se conecta con su llave,
 *     «Buscar impresoras», «Imprimir prueba», «¿Ha salido?» y darlas de alta; y la cocina en papel
 *   · en la mesa, **«Imprimir la cuenta»**, y **marchar va directo** con la cocina en papel
 *   · si una impresora se queda **sin papel**, la sala lo dice arriba
 */
const TPV = 'http://localhost:5178/';

/** Lo que deja el programa en la ventana, de mentira: encuentra una Epson y la prueba sale. */
function elPuenteDeMentira() {
  const ventana = window as unknown as Record<string, unknown>;
  ventana['estookCaja'] = {
    version: '1.0.0',
    conectar: (datos: { llave: string }) => {
      ventana['__conectadaCon'] = datos.llave;
    },
    desconectar: () => undefined,
    buscarImpresoras: () =>
      Promise.resolve([
        { direccion: '192.168.1.50:9100', modelo: 'Epson TM-T20III', yaDadaDeAlta: null },
      ]),
    imprimirDirecto: () => Promise.resolve({ salio: true, porque: null }),
    comoVa: () => Promise.resolve({ conectada: true, porSalir: 0, porCable: null }),
    arrancaConWindows: () => Promise.resolve(false),
    ponerArrancaConWindows: () => Promise.resolve(),
  };
}

async function entrarEnLaCaja(page: Page, llave: string, pin: string) {
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1/ })).toBeVisible({ timeout: 15_000 });
}

async function darDeAlta(page: Page, nombre: string, imprime: 'Cocina' | 'Caja') {
  await page.getByRole('button', { name: 'Buscar impresoras' }).click();
  await expect(page.getByText('1 nueva en la red')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Imprimir prueba' }).click();
  await page.getByRole('button', { name: 'Sí, ha salido' }).click();
  const alta = page.getByRole('dialog', { name: 'Darla de alta' });
  await alta.getByRole('textbox').fill(nombre);
  for (const sitio of ['Cocina', 'Barra', 'Caja'] as const) {
    const boton = alta.getByRole('button', { name: sitio, exact: true });
    const puesto = (await boton.getAttribute('aria-pressed')) === 'true';
    if (puesto !== (sitio === imprime)) await boton.click();
  }
  const cajon = alta.getByRole('checkbox', { name: /cajón/ });
  if ((await cajon.isChecked()) !== (imprime === 'Caja')) await cajon.click();
  await alta.getByRole('button', { name: 'Darla de alta' }).click();
  await expect(page.getByRole('status')).toHaveText(`${nombre}, dada de alta.`, {
    timeout: 15_000,
  });
}

test('la caja para Windows: impresoras, la cuenta, marchar en papel y sin papel', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `caja-${unico(info)}@correo-de-prueba.com`, 'Bar Caja');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  const plato: Record<string, string> = {};
  for (const [seccion, nombre, precio] of [
    ['Entrantes', 'Croquetas', 900],
    ['Principales', 'Entrecot', 2200],
  ] as const) {
    const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
      request,
      token,
      'crear_seccion',
      {
        nombre: seccion,
      },
    );
    const hechos = await ejecutarEnLaApi<{ creados: { platoId: string }[] }>(
      request,
      token,
      'crear_platos',
      {
        seccion_id: seccionId,
        platos: [{ nombre, precio_centimos: precio }],
      },
    );
    plato[nombre] = hechos.creados[0]?.platoId ?? '';
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
    {
      nombre: 'Salón',
    },
  );
  const { mesaId } = await ejecutarEnLaApi<{ mesaId: string }>(request, enLaCaja, 'crear_mesa', {
    zona_id: zonaId,
    x: 60,
    y: 60,
  });
  // La mesa 1, con el 1.º en marcha y el 2.º esperando (antes de que la caja entre en la pantalla).
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
      { id: crypto.randomUUID(), plato_id: plato['Entrecot'], pase: 2 },
    ],
  });
  await ejecutarEnLaApi(request, enLaCaja, 'mandar_a_cocina', { cuenta_id: cuenta });

  // ── Sin el programa: que se descargue, y sin «Buscar impresoras» ──
  await entrarEnLaCaja(page, llave, pin);
  await page.evaluate(() => {
    window.location.hash = '/ajustes/impresoras';
  });
  await expect(page.getByText('Para imprimir, descarga la caja para Windows')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('link', { name: 'Descargar' })).toHaveAttribute(
    'href',
    /Estook-TPV-caja-para-Windows\.exe$/,
  );
  await expect(page.getByRole('button', { name: 'Buscar impresoras' })).toHaveCount(0);

  // ── Dentro del programa: se conecta con su llave, y se dan de alta las dos ──
  await page.addInitScript(elPuenteDeMentira);
  await entrarEnLaCaja(page, llave, pin);
  expect(
    await page.evaluate(() => (window as unknown as Record<string, unknown>)['__conectadaCon']),
  ).toBe(llave);
  await page.evaluate(() => {
    window.location.hash = '/ajustes/impresoras';
  });
  await darDeAlta(page, 'Cocina', 'Cocina');
  await darDeAlta(page, 'Caja', 'Caja');
  const lista = page.getByRole('region', { name: 'Las impresoras' });
  await expect(lista.getByText('Cocina', { exact: true })).toBeVisible();
  await expect(lista.getByText(/la cuenta y el ticket · con el cajón/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('192.168');

  // La cocina trabaja en papel.
  await page
    .getByRole('radiogroup', { name: 'Dónde sale lo de cocina' })
    .getByRole('radio', { name: 'Papel' })
    .click();
  await expect(
    page
      .getByRole('radiogroup', { name: 'Dónde sale lo de cocina' })
      .getByRole('radio', { name: 'Papel' }),
  ).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });

  // ── En la mesa: la cuenta sale por la de la caja ──
  await page.evaluate(() => {
    window.location.hash = '/';
  });
  await page.getByRole('button', { name: /^Mesa 1/ }).click({ timeout: 15_000 });
  const opciones = page.getByRole('dialog', { name: 'Mesa 1' });
  await opciones.getByRole('button', { name: /Imprimir la cuenta/ }).click({ timeout: 15_000 });
  await expect(opciones.getByRole('status')).toHaveText(
    'La cuenta sale por la impresora de la caja.',
    {
      timeout: 15_000,
    },
  );

  // ── Con la cocina en papel, «Marchar ya» va directo, sin preguntar ──
  await opciones.getByRole('button', { name: /Abrir la mesa/ }).click();
  // En el móvil, la cuenta va detrás de «Ver la cuenta».
  const verLaCuenta = page.getByRole('button', { name: /^Ver la cuenta/ });
  await expect(page.getByRole('button', { name: /^Entrecot/ })).toBeVisible({ timeout: 15_000 });
  if (await verLaCuenta.isVisible()) await verLaCuenta.click();
  await page.getByRole('button', { name: 'Marchar ya' }).click({ timeout: 15_000 });
  await expect(page.getByRole('dialog', { name: /¿Marchar ya el 2\.º\?/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Marchar ya' })).toHaveCount(0, {
    timeout: 15_000,
  });

  // Y en la cola de la caja: la cuenta y «¡Marcha el 2.º!», cada una por su impresora.
  const cola = (await (
    await request.post(`${API}/v1/comandos/la_cola_de_la_caja`, {
      headers: { 'x-idempotencia': `cola-${unico(info)}` },
      data: { llave },
    })
  ).json()) as {
    datos: {
      trabajos: {
        tipo: string;
        impresora: { id: string; nombre: string };
        papel: { piezas: { texto?: string }[] };
      }[];
    };
  };
  const trabajos = cola.datos.trabajos;
  expect(trabajos.map((t) => [t.tipo, t.impresora.nombre])).toEqual(
    expect.arrayContaining([
      ['precuenta', 'Caja'],
      ['comanda', 'Cocina'],
    ]),
  );
  expect(JSON.stringify(trabajos)).toContain('¡MARCHA EL 2.º!');

  // ── La de cocina se queda sin papel: la sala lo ve arriba ──
  const cocina = trabajos.find((t) => t.impresora.nombre === 'Cocina')?.impresora.id ?? '';
  await request.post(`${API}/v1/comandos/apuntar_lo_impreso`, {
    headers: { 'x-idempotencia': `papel-${unico(info)}` },
    data: { llave, trabajos: [], impresoras: [{ id: cocina, estado: 'sin_papel' }] },
  });
  await page.evaluate(() => {
    window.location.hash = '/';
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Sin papel en Cocina' })).toBeVisible({
    timeout: 20_000,
  });
});
