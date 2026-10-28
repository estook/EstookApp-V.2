import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T3 · 2 · 2 · «Monta tus bebidas»** (decisión 0114; maquetas 1 a 3), en la pantalla y con una
 * cuenta nueva que tiene sus bebidas en el almacén:
 *
 *   · Bebidas: la caña y la doble del barril, y la Coca-Cola, con su precio, de una vez
 *   · Copas: el ron, con la dosis de la casa y el «¿Con qué?» con la Coca-Cola
 *   · y pedirlas: la caña de un toque; **el ron con Coca-Cola en dos**
 */
const TPV = 'http://localhost:5178/';

test('monta tus bebidas: la caña, la Coca-Cola y una copa, y pedirlas', async ({
  page,
  request,
}, info) => {
  test.slow();
  const enElOrdenador = info.project.name === 'escritorio';
  await cuentaNueva(page, request, `bebidas-${unico(info)}@correo-de-prueba.com`, 'Bar Bebidas');
  await pagarPro(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  // ── El almacén, por la API: lo que se prueba aquí es montarlo en el TPV ──
  // «crear_categoria» devuelve la familia si ya la tiene el local sembrado.
  const familia = async (nombre: string) =>
    (
      await ejecutarEnLaApi<{ categoriaId: string }>(request, token, 'crear_categoria', {
        nombre,
      })
    ).categoriaId;
  for (const [nombre, categoria, unidad, factor] of [
    ['Cerveza de barril', 'Bebidas con alcohol', 'ml', 30000],
    ['Ron Havana 7', 'Bebidas con alcohol', 'ml', 700],
    ['Coca-Cola', 'Bebidas sin alcohol', 'ud', 24],
  ] as const) {
    await ejecutarEnLaApi(request, token, 'crear_producto', {
      nombre,
      formato: 'Caja',
      factor,
      unidad_de_uso: unidad,
      rendimiento: 1,
      precio_centimos: 3000,
      categoria_id: await familia(categoria),
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
  await ejecutarEnLaApi(request, enLaCaja, 'montar_la_botonera', { camino: 'de_cero' });
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
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  await page.evaluate(() => {
    window.location.hash = '/ajustes/productos';
  });
  await page.getByRole('button', { name: 'Monta tus bebidas' }).click({ timeout: 15_000 });

  // ── Bebidas: la caña y la doble del barril, y la Coca-Cola ──
  await expect(page.getByRole('button', { name: 'Caña 200 ml' })).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 15_000 },
  );
  await page.getByLabel('Precio de Caña').fill('1,80');
  await page.getByLabel('Precio de Doble').fill('2,60');
  await page.getByLabel('Precio de Coca-Cola').fill('2,50');
  await page.getByRole('button', { name: 'Poner 3 en el TPV' }).click();
  await expect(page.getByRole('status')).toHaveText('✓ 3 bebidas en el TPV', { timeout: 15_000 });

  // ── Copas: el ron, con la dosis de la casa y el «¿Con qué?» ──
  await page.getByRole('radio', { name: 'Copas' }).click();
  await page.getByRole('button', { name: 'Ron Havana 7', exact: true }).click();
  await page.getByLabel('Precio de Ron Havana 7').fill('8');
  await expect(page.getByRole('switch', { name: 'Coca-Cola' })).toBeChecked();
  await page.getByRole('button', { name: 'Poner 1 copa en el TPV' }).click();
  await expect(page.getByRole('status')).toHaveText('✓ 1 copa en el TPV', { timeout: 15_000 });

  // ── Pedirlas ──
  await page.evaluate(() => {
    window.location.hash = '/';
  });
  await page.getByRole('button', { name: /^Mesa 1: Libre/ }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Abrir', exact: true }).click();
  await page.getByRole('button', { name: 'Cervezas', exact: true }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Caña, 1,80 €/ }).click();
  await page.getByRole('button', { name: 'Copas', exact: true }).click();
  await page.getByRole('button', { name: /^Ron Havana 7, 8,00 €/ }).click();
  await page
    .getByRole('dialog', { name: 'Ron Havana 7' })
    .getByRole('radio', { name: 'Coca-Cola' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Ron Havana 7' })).toHaveCount(0);
  if (!enElOrdenador) await page.getByRole('button', { name: /^Ver la cuenta/ }).click();
  await expect(page.locator('text="Coca-Cola" >> visible=true').first()).toBeVisible();
  if (!enElOrdenador) await page.getByRole('button', { name: 'Cerrar' }).first().click();
  await page.getByRole('button', { name: 'Mandar' }).click();
  await expect(page.getByRole('status')).toHaveText('Mandado: a la barra 2', { timeout: 15_000 });
});
