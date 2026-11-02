import { expect, test } from '@playwright/test';
import { laHuellaDeLaLlave } from '../../packages/dominio/src/centro-cifrado.ts';
import { PUERTO_DEL_CENTRO } from '../../packages/dominio/src/centro.ts';
import type { LosPinDelCentro } from '../../packages/dominio/src/centro-pin.ts';
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
 *   · **T5 · 2 · 2 · 2** (0124): se bloquea, y entra con su PIN quien no había entrado hoy en
 *     el aparato, porque lo mira la caja; y como no había fichado, ficha ahí mismo sin internet
 *   · vuelve internet: sube una vez, y lo fichado ya está en Estook
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
    // Y con internet recoge los PIN del local (T5 · 2 · 2 · 2), como hace el programa.
    const losPin = async () => {
      const respuesta = await request.post(`${API}/v1/comandos/los_pin_del_centro`, {
        headers: { 'x-idempotencia': `pines-${unico(info)}-${String(Date.now())}` },
        data: { llave },
      });
      expect(respuesta.ok()).toBe(true);
      return ((await respuesta.json()) as { datos: LosPinDelCentro }).datos;
    };
    centro.saberLasPersonas(await losPin());

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

    // ── T5 · 2 · 2 · 2: sin internet, el PIN lo mira la caja, y en la caja se ficha ──
    await page.getByRole('button', { name: 'Volver al plano' }).first().click();
    await page.getByRole('button', { name: /: bloquear$/ }).click();
    // Como quien no ha entrado hoy en este aparato: sin la caja, no entraría.
    await page.evaluate(() => {
      window.localStorage.removeItem('estook.tpv.quien-entro-hoy');
    });
    await expect(page.getByText('Sin internet: el PIN lo mira la caja')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Por la caja', { exact: true })).toBeVisible();
    await page.keyboard.type(pin);
    // Entró sin fichar con internet: la caja lo sabe, y ofrece fichar sin internet.
    await page.getByRole('button', { name: 'Fichar la entrada y entrar' }).click({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /^Mesa 1:/ })).toBeVisible({ timeout: 15_000 });

    // ── Vuelve internet: sube solo, una vez ──
    await page.unroute(`${API}/**`);
    await expect(
      page
        .getByText(/^Conexión recuperada · \d+ cosas? subidas?, ninguna repetida$/)
        .locator('visible=true'),
    ).toBeVisible({ timeout: 45_000 });
    await expect.poll(() => guardado('estook.tpv.por-subir'), { timeout: 15_000 }).toBe('');
    // Lo fichado en la caja sin internet ya está en Estook.
    expect((await losPin()).personas.map((p) => p.fichaje)).toEqual(['dentro']);

    // ── Ajustes del TPV › Aparatos dice quién llega a la caja ──
    await page.evaluate(() => {
      window.location.hash = '/ajustes/aparatos';
    });
    await expect(page.getByText('1 de 1 siguen sin internet')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Este · la caja para Windows')).toBeVisible();
    await expect(page.getByText('Es el centro', { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('aparatos.png') });
  } finally {
    centro.parar();
  }
});
