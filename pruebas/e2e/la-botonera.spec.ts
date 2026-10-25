import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T3 · 1 · La botonera** (decisión 0111; Anexo 11.10 y 11.11), en la pantalla y con una
 * cuenta nueva, como el primer día de un local con su carta ya en Estook:
 *
 *   · Ajustes del TPV › Productos: los tres caminos, y «Traer toda la carta»
 *   · las páginas con sus dos preguntas ya contestadas por su nombre (Refrescos, de la barra)
 *   · el pan, de «Nadie», sin tocar su página
 *   · un producto nuevo, desde el TPV, que nace también en la carta de Estook
 *   · pedir con la botonera: cada cosa a quien la prepara, y lo que dice al mandar
 */
const TPV = 'http://localhost:5178/';

test('la botonera: montarla en el TPV con toda la carta, cambiar lo suyo y pedir con ella', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `botonera-${unico(info)}@correo-de-prueba.com`, 'Bar Botones');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  // ── La carta, por la API: lo que se prueba aquí es la botonera ──
  for (const [seccion, platos] of [
    [
      'Entrantes',
      [
        ['Croquetas', 900],
        ['Pan', 150],
      ],
    ],
    ['Refrescos', [['Coca-Cola', 250]]],
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

  // ── La caja, vinculada con el correo; y una mesa, para pedir ──
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

  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, `${TPV}#/ajustes/productos`);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();

  // ── Los tres caminos: con la carta en Estook, se recomienda traerla entera ──
  await page.evaluate(() => {
    window.location.hash = '/ajustes/productos';
  });
  await expect(
    page.getByRole('heading', { name: '¿Cómo quieres montar los botones del TPV?' }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('radio', { name: /^Traer toda la carta/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(
    page.getByText(/Recomendado: tu carta ya está en Estook · 2 secciones, 3 platos/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Traer la carta' }).click();

  // ── Una página por sección, con sus dos preguntas contestadas por su nombre ──
  const entrantes = page.getByRole('region', { name: 'Página Entrantes' });
  const refrescos = page.getByRole('region', { name: 'Página Refrescos' });
  await expect(entrantes.getByText('1 botón')).toBeVisible({ timeout: 15_000 });
  await expect(
    refrescos.getByRole('radiogroup', { name: '¿Quién lo prepara?' }).getByRole('radio', {
      name: 'Barra',
    }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(
    refrescos.getByRole('radiogroup', { name: '¿En qué pase sale?' }).getByRole('radio', {
      name: 'Bebidas',
    }),
  ).toHaveAttribute('aria-checked', 'true');

  // ── El pan no va en Entrantes: va en «Pan y agua», de «Nadie», sin tocar nada (0112) ──
  const panYAgua = page.getByRole('region', { name: 'Página Pan y agua' });
  await expect(panYAgua.getByRole('button', { name: 'Pan', exact: true })).toBeVisible();
  await expect(
    panYAgua.getByRole('radiogroup', { name: '¿Quién lo prepara?' }).getByRole('radio', {
      name: 'Nadie',
    }),
  ).toHaveAttribute('aria-checked', 'true');

  // ── Un producto nuevo, que nace también en la carta ──
  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  const hojaNueva = page.getByRole('dialog', { name: 'Nuevo producto' });
  await hojaNueva.getByLabel('Nombre', { exact: true }).fill('Tortilla');
  await hojaNueva.getByLabel('Precio, con IVA').fill('8');
  await hojaNueva.getByRole('button', { name: 'Crear el producto' }).click();
  await expect(entrantes.getByRole('button', { name: 'Tortilla', exact: true })).toBeVisible({
    timeout: 15_000,
  });
  // ── Pedir con la botonera ──
  await page.evaluate(() => {
    window.location.hash = '/';
  });
  await page.getByRole('button', { name: /^Mesa 1: Libre/ }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  // El pan se pregunta al sentarse: un toque, uno por comensal.
  await page.getByRole('button', { name: 'Pan para 2 · 3,00' }).click({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Pan para 2/ })).toHaveCount(0);
  // Una mesa recién abierta empieza en Bebidas: la página de Refrescos.
  await page.getByRole('button', { name: /^Coca-Cola, 2,50 €/ }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Entrantes', exact: true }).click();
  await expect(page.getByRole('radio', { name: '1.º', checked: true })).toBeVisible();
  await page.getByRole('button', { name: /^Tortilla, 8,00 €/ }).click();
  await page.getByRole('button', { name: 'Mandar' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Mandado: a cocina 1, a la barra 1 y 1 tal cual · sale el 1.º',
    { timeout: 15_000 },
  );

  // ── La tortilla está en la carta de Estook, en su sección (la que lee la caja). Se mira al
  // final: entrar otra vez con el PIN deja sin valer el turno de la pantalla. ──
  const otraVez = (await (
    await request.post(`${API}/v1/comandos/entrar_con_pin`, {
      headers: { 'x-idempotencia': `pin-2-${unico(info)}` },
      data: { llave, pin },
    })
  ).json()) as { datos: { turno: string } };
  const carta = await consultarEnLaApi<{
    carta: { nombre: string; platos: { nombre: string; precioCentimos: number | null }[] }[];
  }>(request, `tpv.${otraVez.datos.turno}.${llave}`, 'la_botonera');
  expect(
    carta.carta.find((s) => s.nombre === 'Entrantes')?.platos.find((p) => p.nombre === 'Tortilla')
      ?.precioCentimos,
  ).toBe(800);
});
