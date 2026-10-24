import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { APP, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * M20A · 1 · 2 · La sala (decisión 0106), en la pantalla y con una cuenta nueva, como la
 * usaría un local el primer día:
 *
 *   · en Estook, **Ajustes › Tu sala**: una zona y dos mesas, con «Añadir mesa»
 *   · en **Estook TPV**, en una caja vinculada y con el PIN (T1): el plano, abrir la mesa para dos, **primero
 *     las bebidas** (la pestaña con la que se abre), luego la carta, y «Mandar»
 *   · lo que dice al mandar (a cocina, a la barra, qué pase sale), y la mesa en el plano
 *
 * En escritorio la cuenta va a la izquierda; en el móvil, lo que se pide ocupa la
 * pantalla y el botón grande va abajo. La prueba es la misma: lo que no se ve en uno no
 * cuenta (Playwright no encuentra lo escondido).
 */
const TPV = 'http://localhost:5178/';

test('la sala: dibujar el plano en Estook, abrir la mesa en Estook TPV, pedir y mandar', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `sala-${unico(info)}@correo-de-prueba.com`, 'Bar Sala');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  // ── Ajustes › Tu sala ──
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/local#sala`);
  await expect(page.getByRole('heading', { level: 2, name: 'Tu sala' })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: '+ Zona' }).click();
  await page.getByLabel('Nombre de la zona').fill('Salón');
  await page.getByRole('button', { name: 'Añadir', exact: true }).click();
  await page.getByRole('button', { name: 'Añadir mesa' }).click();
  await expect(page.getByRole('button', { name: 'Mesa 1, 4 plazas' })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir mesa' }).click();
  await expect(page.getByRole('button', { name: 'Mesa 2, 4 plazas' })).toBeVisible();

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

  // ── Estook TPV, en un aparato vinculado y con el PIN (T1, 0107) ──
  // El PIN de quien lleva el local (sale una vez) y la caja, vinculada con su correo. La
  // pantalla de vincular se prueba en `la-puerta.spec.ts`; aquí, la sala.
  const yo = await consultarEnLaApi<{ personaId: string; local: { id: string } }>(
    request,
    token,
    'quien_soy',
  );
  const { pin } = await ejecutarEnLaApi<{ pin: string }>(request, token, 'regenerar_pin', {
    persona_id: yo.personaId,
    local_id: yo.local.id,
  });
  const { llave } = await ejecutarEnLaApi<{ llave: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  // Sin fichar entra igual: el local no pide fichar para usar el TPV.
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  // El primero del día cae en el inicio; de ahí, a las mesas.
  await page.getByRole('button', { name: /^Mesas/ }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Mesa 1: Libre/ }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();

  // Primero las bebidas: una mesa recién abierta empieza por ahí.
  await expect(page.getByRole('tab', { name: 'Bebidas', selected: true })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: /^Caña, 2,50 €/ }).click();
  await page.getByRole('tab', { name: 'Carta' }).click();
  await page.getByRole('button', { name: /^Croquetas, 9,00 €/ }).click();
  // El principal, en el 2.º: espera a que el camarero lo marche.
  await page.getByRole('group', { name: 'Va en el' }).getByRole('button', { name: '2.º' }).click();
  await page.getByRole('button', { name: /^Entrecot, 22,00 €/ }).click();
  await page.getByRole('button', { name: 'Mandar' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Mandado: a cocina 2 y a la barra 1 · sale el 1.º, el 2.º espera',
    { timeout: 15_000 },
  );

  // Marcha el camarero, cuando quiera: la cocina no ve si la mesa va acabando.
  if (info.project.name !== 'escritorio') {
    await page.getByRole('button', { name: /Ver la cuenta/ }).click();
  }
  await expect(page.getByRole('heading', { name: '2.º · en espera' })).toBeVisible();
  await page.getByRole('button', { name: 'Marchar ya' }).click();
  // El 1.º aún no ha salido de cocina: marchar no tiene vuelta atrás, así que pregunta.
  await page.getByRole('button', { name: 'Marchar el 2.º' }).click();
  await expect(page.getByRole('heading', { name: '2.º · en marcha' })).toBeVisible({
    timeout: 15_000,
  });
  if (info.project.name !== 'escritorio') {
    await page.getByRole('button', { name: 'Cerrar' }).first().click();
  }

  // Y en el plano, la mesa 1 está comiendo.
  await page.getByRole('button', { name: 'Volver al plano' }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1: Comiendo/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: /^Mesa 2: Libre/ })).toBeVisible();

  // Las opciones de la mesa, desde el plano: la nota para cocina se pone y se queda.
  await page.getByRole('button', { name: /^Mesa 1: / }).click();
  await page.getByRole('button', { name: /^Nota para cocina/ }).click();
  await page.getByLabel('Nota para cocina').fill('Tienen prisa');
  await page.getByRole('button', { name: 'Guardar la nota' }).click();
  await page.getByRole('button', { name: /^Mesa 1: / }).click();
  await expect(page.getByRole('button', { name: /^Nota para cocina\s*Tienen prisa/ })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: /^Nota para cocina/ }).click();
  await expect(page.getByLabel('Nota para cocina')).toHaveValue('Tienen prisa');
});
