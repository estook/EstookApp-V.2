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
 * **R3 · 2 · 1 · La caja, segunda parte** (decisión 0152; maqueta corregida del 23-nov), desde la
 * pantalla de la caja, con una cuenta nueva de la casa:
 *
 *   · **«Quédate el cambio»** al cobrar en efectivo: la propina se apunta, no se da el cambio
 *   · **el aviso de retirar**, arriba con los demás: «Retirar» abre el cajón ya rellenado para la caja
 *     fuerte
 *   · **cerrar escribiendo el total**, y en el resultado **las propinas con su reparto**
 *   · en el menú de la caja, **«Entregar la caja»**, con el PIN de quien la recibe
 *
 * Que los importes, los permisos, la entrega y el aviso al gerente sean los de verdad lo mira
 * `base-de-datos/pruebas/la-caja-segunda-parte.prueba.ts`; aquí, que una persona lo ve y lo hace.
 */
const TPV = 'http://localhost:5178/';

async function comoAdmin(request: APIRequestContext): Promise<string> {
  const entrada = await request.post(`${API}/v1/comandos/entrar_en_admin`, {
    headers: { 'x-idempotencia': `admin-${String(Date.now())}-${String(Math.random())}` },
    data: { correo: ADMIN_DE_EJEMPLO, contrasena: CLAVE_DE_EJEMPLO },
  });
  const { datos } = (await entrada.json()) as { datos: { token: string } };
  await ejecutarEnLaApi(request, datos.token, 'superar_doble_factor', { codigo: codigoAhora() });
  return datos.token;
}

test('la caja, segunda parte: la propina, retirar, escribir el total, el reparto y entregarla', async ({
  page,
  request,
}, info) => {
  test.setTimeout(180_000);
  const foto = async (paso: string) => {
    if (process.env['CAPTURAS_DE_LA_CAJA'] === undefined) return;
    await page.screenshot({ path: info.outputPath(`${paso}.png`), fullPage: true });
  };

  // ── La cuenta, de la casa, con la empresa de pruebas de Hacienda ──
  const correo = `caja-r32-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(page, request, correo, 'Bar Propinas');
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
    motivo: 'La prueba de la caja, segunda parte',
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
    ticket: 'T-PR',
    factura: 'F-PR',
    rectificativa: 'R-PR',
    otro_programa: false,
  });

  // ── Un plato, la caja con su cajón, y quien lleva el local ficha ──
  const { seccionId } = await ejecutarEnLaApi<{ seccionId: string }>(
    request,
    token,
    'crear_seccion',
    { nombre: 'Principales' },
  );
  const hechos = await ejecutarEnLaApi<{ creados: { platoId: string }[] }>(
    request,
    token,
    'crear_platos',
    { seccion_id: seccionId, platos: [{ nombre: 'Entrecot', precio_centimos: 4000 }] },
  );
  const plato = hechos.creados[0]?.platoId ?? '';
  const { llave, tuPinNuevo: pin } = await ejecutarEnLaApi<{ llave: string; tuPinNuevo: string }>(
    request,
    token,
    'vincular_el_primer_aparato',
    { local_id: yo.local.id, funcion: 'caja', nombre: 'Caja 1', cajon_nuevo: 'Cajón 1' },
  );
  await request.post(`${API}/v1/comandos/fichar_en_la_caja`, {
    headers: { 'x-idempotencia': `fichar-${unico(info)}` },
    data: { llave, pin, que: 'entrada' },
  });
  const dentro = (await (
    await request.post(`${API}/v1/comandos/entrar_con_pin`, {
      headers: { 'x-idempotencia': `pin-${unico(info)}` },
      data: { llave, pin },
    })
  ).json()) as { datos: { turno: string } };
  const enLaCaja = `tpv.${dentro.datos.turno}.${llave}`;

  // Los ajustes de la segunda parte, encendidos; y «Retirar» desde 50 €, la cifra más baja.
  await ejecutarEnLaApi(request, enLaCaja, 'guardar_ajustes_de_la_caja', {
    caja_la_abren: 'encargados',
    recuento_al_abrir: false,
    contar_a_ciegas: true,
    fondo_de_siempre: 2000,
    con_bizum: false,
    con_cheque: false,
    contar_escribiendo: true,
    propina_al_cobrar: true,
    repartir_propinas: true,
    retirar_desde: 5000,
  });
  await ejecutarEnLaApi(request, enLaCaja, 'abrir_caja', {
    turno_id: crypto.randomUUID(),
    contado_total: 2000,
  });
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
  const cuenta = crypto.randomUUID();
  await ejecutarEnLaApi(request, enLaCaja, 'abrir_mesa', {
    cuenta_id: cuenta,
    mesa_id: mesaId,
    personas: 2,
  });
  await ejecutarEnLaApi(request, enLaCaja, 'pedir', {
    cuenta_id: cuenta,
    platos: [{ id: crypto.randomUUID(), plato_id: plato, pase: 1 }],
  });

  // ── En la caja ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate((laLlave) => {
    window.localStorage.setItem('estook.tpv.llave', laLlave);
  }, llave);
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByText(LA_PUERTA).first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.type(pin);

  // ── Cobrar la mesa en efectivo: le dan 50 y se queda el cambio ──
  await page.getByRole('button', { name: /^Mesa 1: / }).click({ timeout: 15_000 });
  await page
    .getByRole('dialog', { name: 'Mesa 1' })
    .getByRole('button', { name: 'Cobrar', exact: true })
    .click();
  const cobrar = page.getByRole('region', { name: 'Cobrar' });
  await expect(cobrar).toContainText('40,00', { timeout: 15_000 });
  await page
    .getByRole('group', { name: 'Lo que te da' })
    .getByRole('button', { name: '50 €', exact: true })
    .click();
  await cobrar.getByRole('button', { name: 'Quédate el cambio' }).click();
  await expect(cobrar.getByText('Propina', { exact: true })).toBeVisible();
  await foto('01-la-propina');
  await page.getByRole('button', { name: /^Cobrar 40,00/ }).click();
  await expect(page.getByText('10,00 € quedan apuntados como propina.')).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Listo · la mesa queda libre' }).click();

  // ── En el cajón hay 20 + 40 + 10 = 70 €: pasa de 50 y sale «Retirar» ──
  const avisos = page.getByRole('region', { name: 'Avisos' });
  await expect(avisos.getByText('El cajón pasa de 50 €')).toBeVisible({ timeout: 45_000 });
  await foto('02-el-aviso-de-retirar');
  await avisos.getByRole('button', { name: /^Retirar/ }).click();
  // Lo que pasa del fondo (20 €), en billetes de 50: 50 €.
  await expect(page.getByRole('button', { name: 'A la caja fuerte', pressed: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByLabel('Cuánto')).toHaveValue('50,00');
  await foto('03-retirar');
  await page.getByRole('button', { name: /^Sacar 50,00/ }).click();
  await expect(page.getByText(/Queda apuntado a nombre de/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Listo', exact: true }).click();
  await expect(page.getByText('El cajón pasa de 50 €')).toHaveCount(0, { timeout: 45_000 });

  // ── «Entregar la caja», en el menú: pide el PIN de quien la recibe ──
  const laCaja = page.getByRole('button', { name: 'Caja', exact: true });
  await laCaja.click();
  await page.getByRole('menuitem', { name: 'Entregar la caja' }).click();
  await expect(page.getByRole('heading', { name: 'Cuenta lo que hay en el cajón' })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Escribir el total', exact: true }).click();
  await page.getByLabel('Total contado').fill('20');
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Quién se queda con la caja?' })).toBeVisible();
  await foto('04-entregar');
  // Con el suyo, no: la caja ya la lleva quien está.
  await page.keyboard.type(pin);
  await expect(page.getByText(/La caja ya la llevas tú/)).toBeVisible({ timeout: 15_000 });

  // ── Cerrar escribiendo el total: 20 €, y el resultado con las propinas ──
  await page.evaluate(() => {
    window.location.hash = '#/caja/cerrar';
  });
  await page.getByRole('button', { name: 'Escribir el total', exact: true }).click({
    timeout: 15_000,
  });
  await page.getByLabel('Total contado').fill('20');
  await foto('05-cerrar-escribiendo');
  await page.getByRole('button', { name: 'Seguir', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar caja y ver el resultado' }).click();
  await expect(page.getByRole('heading', { name: 'Caja cerrada' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Efectivo · cuadra')).toBeVisible();
  const lasPropinas = page.getByRole('region', { name: 'Las propinas' });
  await expect(lasPropinas).toContainText('10,00');
  await foto('06-las-propinas');
  await lasPropinas.getByRole('button', { name: 'Repartirlas' }).click();
  await expect(lasPropinas.getByText('Repartidas entre 1. Salen en el Z.')).toBeVisible({
    timeout: 15_000,
  });
  await foto('07-repartidas');
});
