import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **R2 · 2 · Servido y cambiar un plato** (decisión 0132; la pausa del 5-nov, puntos 1.2 y
 * 8.1), en la pantalla, con una cuenta nueva:
 *
 *   · con «Los camareros también marcan lo servido», la mesa tiene **«Servido»**: las croquetas
 *     se marcan con un toque, y lo que espera a marchar no se puede
 *   · **cambiar un plato** que está en marcha: «Cambiar», el otro de su sección, y **«¿Ya estaba
 *     hecho?»** con dos botones; sin PIN. La cuenta dice «En lugar de 1 Entrecot»
 */
const TPV = 'http://localhost:5178/';

test('servido y cambiar un plato: la sala marca lo que lleva y cambia sin PIN', async ({
  page,
  request,
}, info) => {
  test.slow();
  await cuentaNueva(page, request, `servido-${unico(info)}@correo-de-prueba.com`, 'Bar Servido');
  await pagarPro(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';

  // ── La carta, por la API ──
  const plato: Record<string, string> = {};
  for (const [seccion, platos] of [
    ['Entrantes', [['Croquetas', 900]]],
    [
      'Principales',
      [
        ['Entrecot', 2200],
        ['Pollo asado', 1200],
      ],
    ],
  ] as const) {
    const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
      request,
      token,
      'crear_seccion',
      { nombre: seccion },
    );
    const { creados } = await ejecutarEnLaApi<{ creados: { platoId: string; nombre: string }[] }>(
      request,
      token,
      'crear_platos',
      {
        seccion_id: seccionId,
        platos: platos.map(([nombre, precio_centimos]) => ({ nombre, precio_centimos })),
      },
    );
    for (const p of creados) plato[p.nombre] = p.platoId;
  }

  // ── La caja, su sala, la opción de servido y la mesa 1 con lo mandado, por la API ──
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
  const { mesaId } = await ejecutarEnLaApi<{ mesaId: string }>(request, enLaCaja, 'crear_mesa', {
    zona_id: zonaId,
    x: 60,
    y: 60,
  });
  await ejecutarEnLaApi(request, enLaCaja, 'guardar_la_cocina_y_la_barra', {
    aviso_min: 10,
    tarde_min: 20,
    suena: true,
    camareros_marcan: true,
  });
  const cuentaId = crypto.randomUUID();
  await ejecutarEnLaApi(request, enLaCaja, 'abrir_mesa', {
    cuenta_id: cuentaId,
    tipo: 'mesa',
    mesa_id: mesaId,
    personas: 2,
  });
  await ejecutarEnLaApi(request, enLaCaja, 'mandar_a_cocina', {
    cuenta_id: cuentaId,
    platos: [
      { id: crypto.randomUUID(), plato_id: plato['Croquetas'], pase: 1 },
      { id: crypto.randomUUID(), plato_id: plato['Entrecot'], pase: 1 },
    ],
  });

  // ── En el TPV ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();

  // **Servido**: la mesa lo tiene; las croquetas, con un toque.
  await page.getByRole('button', { name: /^Mesa 1: Esperando/ }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Marcar lo servido' }).click();
  const servido = page.getByRole('dialog', { name: 'Servido · Mesa 1' });
  await expect(servido.getByRole('heading', { name: '1.º · en cocina' })).toBeVisible({
    timeout: 15_000,
  });
  await servido.getByRole('checkbox', { name: /Croquetas/ }).click();
  await expect(servido.getByRole('checkbox', { name: /Croquetas/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await servido.getByRole('button', { name: 'Marcar 1 servido' }).click();

  // **Cambiar el entrecot**, que está en marcha: por el pollo, y «¿Ya estaba hecho?».
  const laMesa = page.getByRole('dialog', { name: 'Mesa 1' });
  await laMesa.getByRole('button', { name: /Entrecot/ }).click({ timeout: 15_000 });
  await page.getByRole('tab', { name: 'Cambiar' }).click();
  await page.getByRole('radio', { name: /Pollo asado/ }).click();
  await expect(page.getByText('La cuenta baja 10,00 €.', { exact: false })).toBeVisible();
  await expect(page.getByText('¿Ya estaba hecho?')).toBeVisible();
  await page.getByRole('button', { name: 'No, aún no' }).click();

  // La cuenta lo dice, y no ha pedido el PIN de nadie.
  await expect(laMesa.getByText('En lugar de 1 Entrecot')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Teclea el PIN')).toHaveCount(0);
  await expect(laMesa.getByText(/Quitado: Cambio del cliente/)).toBeVisible();
});
