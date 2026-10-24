import { expect, test, type Locator } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T2 · La sala** (decisión 0110; Anexo 11.8 a 11.10), en la pantalla y con una cuenta
 * nueva, como el primer día de un local:
 *
 *   · la caja, vinculada con el correo de quien crea el restaurante, que sale con su PIN
 *   · **en el ordenador, el plano se dibuja en el TPV**: «Dibujar la sala» → la sala vacía
 *     → dos mesas tocando la paleta, una de 6 plazas; «Listo» (en el móvil no se dibuja:
 *     «Edita la sala en una tablet o en la caja», y el plano se pone por la API)
 *   · el plano con **Todas · Mías**; abrir la mesa para dos y pedir con **los pases en
 *     pestañas**: Bebidas se marca solo, Entrantes marca el 1.º y Principales el 2.º
 *   · **cuatro platos en diez toques o menos, desde el plano** (10.3), contados
 *   · lo que dice al mandar, marchar el 2.º, y la mesa en el plano con sus iniciales
 */
const TPV = 'http://localhost:5178/';

test('la sala: dibujarla en el TPV, abrir la mesa, pedir con los pases en pestañas y mandar', async ({
  page,
  request,
}, info) => {
  test.slow();
  const enElOrdenador = info.project.name === 'escritorio';
  await cuentaNueva(page, request, `sala-${unico(info)}@correo-de-prueba.com`, 'Bar Sala');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  // ── La carta, por la API: lo que se prueba aquí es la sala ──
  for (const [seccion, plato, precio] of [
    ['Entrantes', 'Croquetas', 900],
    ['Principales', 'Entrecot', 2200],
    ['Bebidas', 'Caña', 250],
  ] as const) {
    const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
      request,
      token,
      'crear_seccion',
      { nombre: seccion },
    );
    await ejecutarEnLaApi(request, token, 'crear_platos', {
      seccion_id: seccionId,
      platos: [{ nombre: plato, precio_centimos: precio }],
    });
  }

  // ── La caja, vinculada con el correo: sale con el PIN de quien lleva el local (0109) ──
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  const { llave, tuPinNuevo } = await ejecutarEnLaApi<{ llave: string; tuPinNuevo: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  const pin = tuPinNuevo;
  expect(pin).toMatch(/^\d{6}$/);

  if (!enElOrdenador) {
    // En el móvil no se dibuja: el plano, por la API, desde la caja.
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
    await ejecutarEnLaApi(request, enLaCaja, 'crear_mesa', { zona_id: zonaId, x: 60, y: 60 });
    await ejecutarEnLaApi(request, enLaCaja, 'crear_mesa', {
      zona_id: zonaId,
      x: 300,
      y: 60,
      plazas: 6,
    });
  }

  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  // Sin mesas se cae en el inicio; con mesas, en las mesas (0108).
  if (enElOrdenador) {
    await page.getByRole('button', { name: /^Mesas/ }).click({ timeout: 15_000 });
  }

  if (enElOrdenador) {
    // ── Dibujar la sala en el TPV, a ojo ──
    await page.getByRole('button', { name: 'Dibujar la sala' }).click({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Empieza tu sala' })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Empezar con la sala vacía' }).click();
    await page.getByRole('button', { name: 'Poner cuadrada' }).click();
    await expect(page.getByRole('button', { name: 'Mesa 1', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: 'Poner cuadrada' }).click();
    await expect(page.getByRole('button', { name: 'Mesa 2', exact: true })).toBeVisible({
      timeout: 15_000,
    });
    // La 2, de 6 plazas: crece sola, sin escribir un número.
    await page.getByRole('radio', { name: '6', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('6 pl.')).toBeVisible({ timeout: 15_000 });
    // Ningún número de centímetros en la pantalla del editor (Anexo 11.15).
    await expect(page.getByText(/\bcm\b|centímetro/i)).toHaveCount(0);
    await page.getByRole('button', { name: 'Listo' }).click();
  }

  // ── El plano: todas las mesas, y «Mías» ──
  await expect(page.getByRole('radio', { name: 'Todas', checked: true })).toBeVisible({
    timeout: 15_000,
  });

  // **Cuatro platos en diez toques o menos, desde el plano** (10.3): se cuentan.
  let toques = 0;
  const tocar = async (donde: Locator) => {
    toques += 1;
    await donde.click();
  };
  await tocar(page.getByRole('button', { name: /^Mesa 1: Libre/ }));
  await tocar(page.getByRole('button', { name: '2', exact: true }));
  await tocar(page.getByRole('button', { name: 'Abrir', exact: true }));
  // Una mesa recién abierta empieza en Bebidas: la pestaña y su página.
  await expect(page.getByRole('radio', { name: 'Bebidas', checked: true })).toBeVisible({
    timeout: 15_000,
  });
  await tocar(page.getByRole('button', { name: /^Caña, 2,50 €/ }));
  // Entrantes marca el 1.º; Principales, el 2.º.
  await tocar(page.getByRole('button', { name: 'Entrantes', exact: true }));
  await expect(page.getByRole('radio', { name: '1.º', checked: true })).toBeVisible();
  await tocar(page.getByRole('button', { name: /^Croquetas, 9,00 €/ }));
  await tocar(page.getByRole('button', { name: /^Croquetas, 9,00 €/ }));
  await tocar(page.getByRole('button', { name: 'Principales', exact: true }));
  await expect(page.getByRole('radio', { name: '2.º', checked: true })).toBeVisible();
  await tocar(page.getByRole('button', { name: /^Entrecot, 22,00 €/ }));
  await tocar(page.getByRole('button', { name: 'Mandar' }));
  expect(toques, 'una comanda de cuatro platos en diez toques o menos (10.3)').toBeLessThanOrEqual(
    10,
  );
  await expect(page.getByRole('status')).toHaveText(
    'Mandado: a cocina 2 y a la barra 1 · sale el 1.º, el 2.º espera',
    { timeout: 15_000 },
  );
  // La pestaña del 2.º dice cómo va.
  await expect(page.getByRole('radio', { name: /^2\.º, en espera/ })).toBeVisible({
    timeout: 15_000,
  });

  // Marcha el camarero, cuando quiera: la cocina no ve si la mesa va acabando.
  if (!enElOrdenador) {
    await page.getByRole('button', { name: /Ver la cuenta/ }).click();
  }
  await expect(page.getByRole('heading', { name: '2.º · en espera' })).toBeVisible();
  await page.getByRole('button', { name: 'Marchar ya' }).click();
  await page.getByRole('button', { name: 'Marchar el 2.º' }).click();
  await expect(page.getByRole('heading', { name: '2.º · en marcha' })).toBeVisible({
    timeout: 15_000,
  });
  if (!enElOrdenador) {
    await page.getByRole('button', { name: 'Cerrar' }).first().click();
  }

  // Y en el plano, la mesa 1 come, con mis iniciales, y «Mías» la enseña.
  await page.getByRole('button', { name: 'Volver al plano' }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1: Comiendo/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: /^Mesa 2: Libre · 6/ })).toBeVisible();
  await page.getByRole('radio', { name: /^Mías/ }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1: / })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Mesa 2: / })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Todas' }).click();

  // Las opciones de la mesa, desde el plano: la nota para cocina se pone y se queda.
  await page.getByRole('button', { name: /^Mesa 1: / }).click();
  await page.getByRole('button', { name: /^Nota para cocina/ }).click();
  await page.getByLabel('Nota para cocina').fill('Tienen prisa');
  await page.getByRole('button', { name: 'Guardar la nota' }).click();
  await page.getByRole('button', { name: /^Mesa 1: / }).click();
  await expect(page.getByRole('button', { name: /^Nota para cocina\s*Tienen prisa/ })).toBeVisible({
    timeout: 15_000,
  });
});
