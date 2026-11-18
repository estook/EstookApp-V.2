import { expect, test, type APIRequestContext } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';
import { codigoAhora } from './entrar-en-el-admin.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
} from '../../base-de-datos/semillas/claves-de-ejemplo.ts';
import { LA_PUERTA } from './la-puerta-del-tpv.ts';

/**
 * **La venta rápida y Repetir pedido** (el rediseño, entrega 2; decisión 0148), desde la pantalla y
 * con una cuenta nueva de la casa, con la empresa de pruebas de Hacienda:
 *
 *   · en la puerta de la caja, **«Venta rápida»** con el PIN entra derecha en la venta, no en la sala
 *   · ticar dos cañas y una pizza y **cobrar de un toque con tarjeta**: el cobro de siempre, ya en
 *     tarjeta; al acabar, **«Listo · otra venta»** deja la venta vacía
 *   · **«Pasar a una mesa»**: lo ticado se va a la Mesa 1, que estaba libre, sin cobrar
 *   · en el plano, **«⋯ Más opciones» → «Repetir pedido»**: lo último que se mandó entra en lo que
 *     se pide de esa mesa, para mandarlo con un toque
 *
 * Que el cobro cuadre lo mira `la-caja.spec.ts`; aquí, que el camino corto se hace de verdad.
 */
const TPV = 'http://localhost:5178/';

/** El admin, por la API: el código del segundo factor es el de este medio minuto. */
async function comoAdmin(request: APIRequestContext): Promise<string> {
  const entrada = await request.post(`${API}/v1/comandos/entrar_en_admin`, {
    headers: { 'x-idempotencia': `admin-${String(Date.now())}-${String(Math.random())}` },
    data: { correo: ADMIN_DE_EJEMPLO, contrasena: CLAVE_DE_EJEMPLO },
  });
  const { datos } = (await entrada.json()) as { datos: { token: string } };
  await ejecutarEnLaApi(request, datos.token, 'superar_doble_factor', { codigo: codigoAhora() });
  return datos.token;
}

test('la venta rápida: entrar desde la puerta, cobrar de un toque, pasar a una mesa y repetir pedido', async ({
  page,
  request,
}, info) => {
  test.setTimeout(180_000);
  // Con CAPTURAS_DE_LA_RAPIDA=1 deja una foto de cada pantalla.
  const foto = async (paso: string) => {
    if (process.env['CAPTURAS_DE_LA_RAPIDA'] === undefined) return;
    await page.screenshot({ path: info.outputPath(`${paso}.png`), fullPage: true });
  };

  // ── La cuenta: nueva y de la casa, que es quien puede llevar la empresa de pruebas ──
  const correo = `rapida-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(page, request, correo, 'Bar Rápido');
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';
  const { organizacion } = await consultarEnLaApi<{ organizacion: { id: string } }>(
    request,
    token,
    'quien_soy',
  );
  const admin = await comoAdmin(request);
  await ejecutarEnLaApi(request, admin, 'admin_de_la_casa', {
    organizacion_id: organizacion.id,
    de_la_casa: true,
    motivo: 'La prueba de la venta rápida',
  });
  await recargarSinQueSeCaiga(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /¿Cómo te llamas\?|¿Qué tipo de local tienes\?|¿Dónde está tu local\?/,
    { timeout: 20_000 },
  );
  await sinElAlta(page);
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  await ejecutarEnLaApi(request, admin, 'admin_poner_la_empresa_de_pruebas', {
    local_id: yo.local.id,
  });
  await ejecutarEnLaApi(request, token, 'poner_las_series', {
    ticket: 'T-VR',
    factura: 'F-VR',
    rectificativa: 'R-VR',
    otro_programa: false,
  });

  // ── La carta y la caja, por la API; una mesa en el plano para pasarle una venta ──
  for (const [seccion, nombre, precio] of [
    ['Bebidas', 'Caña', 250],
    ['Pizzas', 'Margarita', 950],
  ] as const) {
    const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
      request,
      token,
      'crear_seccion',
      { nombre: seccion },
    );
    await ejecutarEnLaApi(request, token, 'crear_platos', {
      seccion_id: seccionId,
      platos: [{ nombre, precio_centimos: precio }],
    });
  }
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

  // ── En la puerta, «Venta rápida» con el PIN: derecha a la venta ──
  await abrirSinQueSeCaiga(page, TPV);
  // Con CAPTURAS_DE_LA_RAPIDA=claro, las fotos salen con el tema claro.
  const claro = process.env['CAPTURAS_DE_LA_RAPIDA'] === 'claro';
  await page.evaluate(
    ([laLlave, conClaro]) => {
      window.localStorage.setItem('estook.tpv.llave', laLlave);
      if (conClaro) window.localStorage.setItem('estook.tpv.tema', 'claro');
    },
    [llave, claro] as const,
  );
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText(LA_PUERTA).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Venta rápida/ }).click();
  await expect(page.getByText('Teclea tu PIN')).toBeVisible();
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  const laVenta = page.getByRole('complementary', { name: 'La venta rápida' });
  await expect(laVenta.getByRole('heading', { name: 'Venta rápida' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/#\/rapida$/);
  // Vacía, no se cobra ni se pasa.
  await expect(page.getByRole('button', { name: 'Cobrar en efectivo' })).toBeDisabled();

  // ── Dos cañas y una pizza: 14,50 € ──
  await page.getByRole('button', { name: 'Bebidas', exact: true }).click();
  await page.getByRole('button', { name: /^Caña, 2,50 €/ }).click();
  await page.getByRole('button', { name: /^Caña, 2,50 €/ }).click();
  await page.getByRole('button', { name: 'Pizzas', exact: true }).click();
  await page.getByRole('button', { name: /^Margarita, 9,50 €/ }).click();
  // El total, a la vista (en el móvil, fijo al pie).
  await expect(page.getByText(/^14,50\s€$/).filter({ visible: true })).toBeVisible();
  // Sin pases: ni «1.º» ni «Bebidas» como pase en el ticket.
  await expect(laVenta.getByText('1.º')).toHaveCount(0);
  await foto('01-la-venta');

  // ── Cobrar con tarjeta, de un toque: el cobro de siempre, ya en tarjeta ──
  await page.getByRole('button', { name: 'Cobrar en tarjeta' }).click();
  // El primer día, la caja se abre antes de cobrar: ahí mismo, sin perder la venta (no con el
  // «Abrir caja» de arriba, que lleva a la sala).
  const antes = page.getByRole('main').filter({ hasText: 'Abre la caja para cobrar' });
  await expect(antes).toBeVisible({ timeout: 15_000 });
  await antes.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  await page.getByRole('button', { name: 'Uno más de 50 €', exact: true }).click();
  await page.getByRole('button', { name: /^Abrir caja con 50,00/ }).click();
  await page.getByRole('button', { name: 'Seguir', exact: true }).click({ timeout: 15_000 });
  const cobrar = page.getByRole('region', { name: 'Cobrar' });
  await expect(cobrar.getByText('A cobrar')).toBeVisible({ timeout: 15_000 });
  await expect(cobrar).toContainText('14,50');
  await expect(
    page.getByRole('group', { name: 'Cómo paga' }).getByRole('button', { name: 'Tarjeta' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(cobrar.getByText('Cóbralo en el datáfono')).toBeVisible();
  await foto('02-el-cobro-ya-en-tarjeta');
  await page.getByRole('button', { name: 'Cobrado con tarjeta' }).click();
  await expect(page.getByText(/T-VR-\d{4}-000001/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Listo · otra venta' }).click();
  await expect(page.getByText('Cobrado. Otra venta.').filter({ visible: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(laVenta.getByText('Toca un producto para empezar.')).toBeVisible();
  await foto('03-otra-venta');

  // ── «Pasar a una mesa»: una caña a la Mesa 1, libre, sin cobrar ──
  await page.getByRole('button', { name: 'Bebidas', exact: true }).click();
  await page.getByRole('button', { name: /^Caña, 2,50 €/ }).click();
  await page.getByRole('button', { name: 'Pasar a una mesa' }).click();
  await foto('04-pasar-a-una-mesa');
  await page
    .getByRole('dialog', { name: 'Pasar a una mesa' })
    .getByRole('button', { name: 'Mesa 1: libre' })
    .click({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Mesa 1: / })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Mesa 1: Libre/ })).toHaveCount(0);

  // ── «⋯ Más opciones» → «Repetir pedido»: la caña otra vez, en lo que se pide de la Mesa 1 ──
  await page.getByRole('button', { name: /^Mesa 1: / }).click();
  const laMesa = page.getByRole('dialog', { name: 'Mesa 1' });
  await laMesa.getByRole('button', { name: 'Más opciones de la mesa' }).click();
  await foto('05-repetir-pedido');
  await page.getByRole('button', { name: /^Repetir pedido.*1 Caña/ }).click();
  await expect(page).toHaveURL(/#\/mesa\//, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Mandar/ })).toBeVisible({ timeout: 15_000 });
  await foto('06-repetido-en-la-mesa');
});
