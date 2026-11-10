import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, sinElAlta, unico } from './cuenta-nueva.ts';
import { API, APP, consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';
import { codigoAhora } from './entrar-en-el-admin.ts';
import {
  ADMIN_DE_EJEMPLO,
  CLAVE_DE_EJEMPLO,
} from '../../base-de-datos/semillas/claves-de-ejemplo.ts';

/**
 * **R3 · 1 · La caja** (decisión 0144; maqueta del 9-nov), desde la pantalla y con una cuenta nueva
 * de la casa, con la empresa de pruebas de Hacienda (el Verifacti de mentira de la API de pruebas):
 *
 *   · **abrir caja** desde el botón de al lado de Fichar: el primer día se cuenta el cajón
 *   · **cobrar** una mesa en efectivo (un billete de un toque y su cambio) y otra **dividida** en
 *     efectivo y tarjeta: un ticket cada una, y la mesa queda libre
 *   · **abrir el cajón** para sacar dinero, con su para qué, y **«Cómo va»** con lo que debería haber
 *   · **cerrar caja** en sus cuatro pasos: contar, el datáfono, lo de mañana y el resultado
 *   · en Estook, **Cierres de caja**, solo para ver: el día con su total y, dentro, su caja; y ni un
 *     botón de cerrar el día a mano
 *
 * Que los importes, los permisos y lo que no se toca sean los de verdad lo mira
 * `base-de-datos/pruebas/la-caja.prueba.ts`; aquí, que una persona lo ve y lo hace.
 */
const TPV = 'http://localhost:5178/';
const CLAVE = 'una frase que recuerdo';

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

async function entrarEnEstook(page: Page, correo: string): Promise<void> {
  await abrirSinQueSeCaiga(page, APP);
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  });
  await abrirSinQueSeCaiga(page, APP);
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
}

test('la caja: abrirla, cobrar en efectivo y dividido, el cajón, «Cómo va», cerrarla y verla en Estook', async ({
  page,
  request,
}, info) => {
  test.setTimeout(180_000);
  // Con CAPTURAS_DE_LA_CAJA=1 deja una foto de cada pantalla.
  const foto = async (paso: string) => {
    if (process.env['CAPTURAS_DE_LA_CAJA'] === undefined) return;
    await page.screenshot({ path: info.outputPath(`${paso}.png`), fullPage: true });
  };

  // ── La cuenta: nueva y de la casa, que es quien puede llevar la empresa de pruebas ──
  const correo = `caja-r3-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(page, request, correo, 'Bar Caja');
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
    motivo: 'La prueba de la caja',
  });
  // De la casa no paga: al recargar ya no se le pide el plan, y cae en el alta, dentro de su local.
  await recargarSinQueSeCaiga(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /¿Cómo te llamas\?|¿Qué tipo de local tienes\?|¿Dónde está tu local\?/,
    { timeout: 20_000 },
  );
  await sinElAlta(page);
  // El local nace al terminar el alta.
  const yo = await consultarEnLaApi<{ local: { id: string } }>(request, token, 'quien_soy');
  await ejecutarEnLaApi(request, admin, 'admin_poner_la_empresa_de_pruebas', {
    local_id: yo.local.id,
  });
  await ejecutarEnLaApi(request, token, 'poner_las_series', {
    ticket: 'T-CJ',
    factura: 'F-CJ',
    rectificativa: 'R-CJ',
    otro_programa: false,
  });

  // ── La carta, la caja con su cajón y dos mesas pedidas, por la API ──
  const plato: Record<string, string> = {};
  for (const [seccion, nombre, precio] of [
    ['Entrantes', 'Croquetas', 900],
    ['Principales', 'Entrecot', 2200],
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
  for (const x of [60, 300]) {
    const { mesaId } = await ejecutarEnLaApi<{ mesaId: string }>(request, enLaCaja, 'crear_mesa', {
      zona_id: zonaId,
      x,
      y: 60,
    });
    const cuenta = crypto.randomUUID();
    await ejecutarEnLaApi(request, enLaCaja, 'abrir_mesa', {
      cuenta_id: cuenta,
      mesa_id: mesaId,
      personas: 2,
    });
    // Dos croquetas y un entrecot: 40,00 €.
    await ejecutarEnLaApi(request, enLaCaja, 'pedir', {
      cuenta_id: cuenta,
      platos: [
        { id: crypto.randomUUID(), plato_id: plato['Croquetas'], pase: 1, cantidad: 2 },
        { id: crypto.randomUUID(), plato_id: plato['Entrecot'], pase: 2 },
      ],
    });
  }

  // ── Abrir caja, desde el botón de al lado de Fichar ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  await expect(page.getByText('Abrir caja · tu PIN')).toBeVisible();
  await foto('01-el-pin');
  await page.keyboard.type(pin);
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();

  // El primer día se cuenta: tres billetes de 50.
  await expect(page.getByRole('heading', { name: '¿Con cuánto empiezas?' })).toBeVisible({
    timeout: 15_000,
  });
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'Uno más de 50 €', exact: true }).click();
  }
  await foto('02-abrir-contando');
  await page.getByRole('button', { name: /^Abrir caja con 150,00/ }).click();
  await expect(page.getByRole('heading', { name: /^Caja abierta con 150,00/ })).toBeVisible({
    timeout: 15_000,
  });
  await foto('03-caja-abierta');
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();

  // ── Cobrar la mesa 1 en efectivo: le dan 50 y el cambio son 10 ──
  await page.getByRole('button', { name: /^Mesa 1: / }).click({ timeout: 15_000 });
  await page
    .getByRole('dialog', { name: 'Mesa 1' })
    .getByRole('button', { name: 'Cobrar', exact: true })
    .click();
  const cobrar = page.getByRole('region', { name: 'Cobrar' });
  await expect(cobrar.getByText('A cobrar')).toBeVisible({ timeout: 15_000 });
  await expect(cobrar).toContainText('40,00');
  await page
    .getByRole('group', { name: 'Lo que te da' })
    .getByRole('button', { name: '50 €', exact: true })
    .click();
  await expect(cobrar.getByText('Cambio')).toBeVisible();
  await expect(cobrar).toContainText('10,00');
  await foto('04-cobrar-en-efectivo');
  await page.getByRole('button', { name: /^Cobrar 40,00/ }).click();
  await expect(page.getByText(/T-CJ-\d{4}-000001/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Cambio')).toBeVisible();
  await foto('05-cobrado');
  await page.getByRole('button', { name: 'Listo · la mesa queda libre' }).click();
  await expect(page.getByRole('button', { name: /^Mesa 1: Libre/ })).toBeVisible({
    timeout: 15_000,
  });

  // ── La mesa 2, dividida: 20 en efectivo y el resto con tarjeta, en un ticket ──
  await page.getByRole('button', { name: /^Mesa 2: / }).click();
  await page
    .getByRole('dialog', { name: 'Mesa 2' })
    .getByRole('button', { name: 'Cobrar', exact: true })
    .click();
  await page
    .getByRole('group', { name: 'Cómo paga' })
    .getByRole('button', { name: 'Dividir', exact: true })
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Efectivo y tarjeta', exact: true }).click();
  await expect(page.getByText('Con tarjeta, el resto')).toBeVisible();
  await foto('06-cobrar-dividido');
  await page.getByRole('button', { name: /^Cobrar 40,00.*un ticket$/ }).click();
  await expect(page.getByText(/T-CJ-\d{4}-000002/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Listo · la mesa queda libre' }).click();
  await expect(page.getByRole('button', { name: /^Mesa 2: Libre/ })).toBeVisible({
    timeout: 15_000,
  });

  // ── Abrir el cajón: sacar 15 € para una compra ──
  const laCaja = page.getByRole('button', { name: 'Caja', exact: true });
  await laCaja.click();
  await foto('07-el-menu-de-la-caja');
  await page.getByRole('menuitem', { name: 'Abrir el cajón' }).click();
  await page.getByRole('button', { name: 'Sacar dinero', exact: true }).click();
  await page.getByLabel('Cuánto').fill('15');
  await page.getByRole('button', { name: 'Compras', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Compras', pressed: true })).toBeVisible();
  await foto('08-abrir-el-cajon');
  await page.getByRole('button', { name: /^Sacar 15,00/ }).click();
  await expect(page.getByText(/Queda apuntado a nombre de/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Listo', exact: true }).click();

  // ── «Cómo va»: 150 de fondo + 40 + 20 en efectivo − 15 sacados ──
  await laCaja.click();
  await page.getByRole('menuitem', { name: 'Cómo va' }).click();
  await expect(page.getByRole('heading', { name: 'Cajón 1 · cómo va' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Debería haber en el cajón')).toBeVisible();
  await expect(page.getByRole('main')).toContainText('195,00');
  await foto('09-como-va');

  // ── Cerrar caja: contar (195 €), el datáfono (20 €), lo de mañana y el resultado ──
  await laCaja.click();
  await page.getByRole('menuitem', { name: 'Cerrar caja' }).click();
  await expect(page.getByText('Lo que debería haber sale al final.')).toBeVisible({
    timeout: 15_000,
  });
  for (const [billete, cuantos] of [
    ['50 €', 3],
    ['20 €', 2],
    ['5 €', 1],
  ] as const) {
    for (let i = 0; i < cuantos; i += 1) {
      await page.getByRole('button', { name: `Uno más de ${billete}`, exact: true }).click();
    }
  }
  await foto('10-cerrar-contar');
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await page.getByLabel('Total del datáfono').fill('20,00');
  await foto('11-cerrar-datafono');
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lo que se queda para mañana' })).toBeVisible();
  await expect(page.getByLabel('Se queda en el cajón')).toHaveValue('150,00');
  await foto('12-cerrar-para-manana');
  await page.getByRole('button', { name: 'Cerrar caja y ver el resultado' }).click();
  await expect(page.getByRole('heading', { name: 'Caja cerrada' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Efectivo · cuadra')).toBeVisible();
  await expect(page.getByText('Tarjeta · cuadra')).toBeVisible();
  await expect(page.getByText(/Era la última caja abierta: el día queda cerrado/)).toBeVisible();
  await foto('13-caja-cerrada');
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir caja', exact: true })).toBeVisible({
    timeout: 15_000,
  });

  // ── En Estook: Cierres de caja, solo para ver (vincular cerró la sesión: se vuelve a entrar) ──
  await entrarEnEstook(page, correo);
  await abrirSinQueSeCaiga(page, `${APP}#/servicio/jornada/cierre`);
  await expect(page.getByText('Cierres de caja').first()).toBeVisible({ timeout: 15_000 });
  const elDia = page.getByRole('button', { name: /80,00.*Cuadra/ });
  await expect(elDia).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('Total facturado')).toHaveCount(0);
  await foto('14-cierres-de-caja');
  await elDia.click();
  await expect(page.getByText('Todo el día')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Cajón 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Sacado')).toBeVisible();
  await expect(page.getByText('Se quedó para mañana')).toBeVisible();
  await foto('15-un-dia-de-caja');

  // Y el día, cerrado por la caja: en Información no se ofrece cerrarlo a mano.
  await abrirSinQueSeCaiga(page, `${APP}#/servicio/jornada/informacion`);
  await expect(page.getByText(/^Cerrado/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Cerrar el día' })).toHaveCount(0);
  await foto('16-informacion');
  await page.getByRole('button', { name: 'Ver el cierre' }).click();
  await expect(page).toHaveURL(/#\/servicio\/jornada\/cierre\?dia=\d{4}-\d{2}-\d{2}/);
  await expect(page.getByText('Todo el día')).toBeVisible({ timeout: 15_000 });
});
