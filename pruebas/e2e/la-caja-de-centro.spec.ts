import { expect, test } from '@playwright/test';
import { laHuellaDeLaLlave } from '../../packages/dominio/src/centro-cifrado.ts';
import { PUERTO_DEL_CENTRO } from '../../packages/dominio/src/centro.ts';
import { ElCentro } from '../../apps/caja-windows/src/el-centro.ts';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * **T5 · 2 · 2 · La caja de centro** (decisión 0123), con un navegador de verdad: Estook deja de
 * contestar (internet se ha ido) pero el wifi del local sigue, y **la caja de centro** —la de
 * verdad, la del programa de Windows, escuchando aquí en el 127.0.0.1— recibe lo mandado:
 *
 *   · la caja dice dónde escucha y Estook TPV lo guarda con lo suyo
 *   · sin Estook, se abre la mesa, se piden dos croquetas y se manda: «la cocina ya lo tiene,
 *     por la caja», y arriba «Todo sigue funcionando en el local»
 *   · la caja lo tiene, con la mesa y las croquetas, para la impresora y la pantalla de cocina
 *   · vuelve internet: sube una vez
 *
 * Y de paso, que la política de seguridad de Estook TPV deja hablar con la caja (lección 243).
 */
const TPV = 'http://localhost:5178/';

test('sin internet, lo mandado llega a la caja de centro por el wifi, y al volver sube una vez', async ({
  page,
  request,
}, info) => {
  // La caja escucha en un puerto fijo: una sola vez, en el ordenador.
  test.skip(info.project.name !== 'escritorio', 'La caja de centro escucha en un solo puerto');
  test.slow();
  await cuentaNueva(
    page,
    request,
    `caja-de-centro-${unico(info)}@correo-de-prueba.com`,
    'Bar Centro',
  );
  await pagarPro(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';
  const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
    request,
    token,
    'crear_seccion',
    {
      nombre: 'Entrantes',
    },
  );
  await ejecutarEnLaApi(request, token, 'crear_platos', {
    seccion_id: seccionId,
    platos: [{ nombre: 'Croquetas', precio_centimos: 900 }],
  });
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  const vinculada = await ejecutarEnLaApi<{
    llave: string;
    tuPinNuevo: string;
    aparato: { terminalId: string };
  }>(request, token, 'vincular_el_primer_aparato', {
    local_id: yo.local.id,
    funcion: 'caja',
    nombre: 'Caja 1',
    cajon_nuevo: 'Cajón 1',
  });
  const { llave, tuPinNuevo: pin } = vinculada;
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

  // ── La caja de centro: la del programa, escuchando aquí, con lo que le da Estook ──
  const centro = new ElCentro([new URL(TPV).origin], '1.1.0', {
    imprimir: () => Promise.resolve({ salio: true, porque: null }),
    guardar: () => undefined,
    leer: () => null,
    ahora: () => Date.now(),
  });
  centro.saber(await laHuellaDeLaLlave(llave), {
    caja: vinculada.aparato.terminalId,
    aparatos: [],
    cocinaSaleEn: 'pantalla',
    barraSaleEn: 'pantalla',
    impresoras: [],
  });
  await centro.empezar(PUERTO_DEL_CENTRO, '127.0.0.1');
  try {
    // La caja dice dónde escucha, como en su latido.
    const latido = await request.post(`${API}/v1/comandos/latir_el_aparato`, {
      headers: { 'x-idempotencia': `latido-${unico(info)}` },
      data: { llave, centro: [`127.0.0.1:${String(PUERTO_DEL_CENTRO)}`] },
    });
    expect(latido.ok()).toBe(true);

    // ── Con internet: Estook TPV aprende dónde está la caja ──
    await abrirSinQueSeCaiga(page, TPV);
    await page.evaluate((laLlave) => {
      window.localStorage.setItem('estook.tpv.llave', laLlave);
    }, llave);
    await abrirSinQueSeCaiga(page, TPV);
    await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.type(pin);
    await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
    await expect(page.getByRole('button', { name: /^Mesa 1: Libre/ })).toBeVisible({
      timeout: 15_000,
    });
    const guardado = (clave: string) =>
      page.evaluate((c) => window.localStorage.getItem(c) ?? '', clave);
    await expect
      .poll(() => guardado('estook.tpv.copia.aparato'), { timeout: 15_000 })
      .toContain('elCentro');
    await expect
      .poll(() => guardado('estook.tpv.copia.la_carta'), { timeout: 15_000 })
      .toContain('Croquetas');

    // ── Se va internet, no el wifi: Estook no contesta, la caja sí ──
    await page.route(`${API}/**`, (ruta) => ruta.abort('internetdisconnected'));
    await page.getByRole('button', { name: /^Mesa 1: Libre/ }).click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir', exact: true }).click();
    await page.getByRole('button', { name: 'Entrantes', exact: true }).click({ timeout: 15_000 });
    await page.getByRole('button', { name: /^Croquetas, 9,00 €/ }).click();
    await page.getByRole('button', { name: /^Croquetas, 9,00 €/ }).click();
    await page.getByRole('button', { name: 'Mandar' }).click();
    await expect(
      page.getByText('Sin internet: la cocina ya lo tiene, por la caja').locator('visible=true'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/^Sin internet\. Todo sigue funcionando en el local/).locator('visible=true'),
    ).toBeVisible();

    // La caja lo tiene, para la impresora y la pantalla de cocina.
    const llegado = centro.loLlegado();
    expect(llegado).toHaveLength(1);
    expect(llegado[0]?.mesa.titulo).toBe('Mesa 1');
    expect(llegado[0]?.platos.map((p) => [p.nombre, p.cantidad, p.pase])).toEqual([
      ['Croquetas', 2, 1],
    ]);

    // ── Vuelve internet: sube solo, una vez ──
    await page.unroute(`${API}/**`);
    await expect(
      page.getByText(/^Conexión recuperada · \d+ cosas? subidas?, ninguna repetida$/),
    ).toBeVisible({ timeout: 45_000 });
    await expect.poll(() => guardado('estook.tpv.por-subir'), { timeout: 15_000 }).toBe('');
  } finally {
    centro.parar();
  }
});
