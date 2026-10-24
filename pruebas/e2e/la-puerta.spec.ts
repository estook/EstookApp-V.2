import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarEsencial, sinElAlta, unico } from './cuenta-nueva.ts';
import { consultarEnLaApi, ejecutarEnLaApi } from './en-la-app.ts';

/**
 * T1 · La puerta de Estook TPV (decisión 0107; Anexo 11.3, 11.4, 11.5 y 11.13), en la
 * pantalla y con una cuenta nueva, como el primer día de un local:
 *
 *   · **la caja**: «Vincula este aparato» → «Entrar con mi correo» → «¿Qué es este
 *     aparato?» Caja, con su cajón → la sesión no se queda: lo que queda es la llave
 *   · el PIN, «No has fichado» → el inicio, con lo que funciona
 *   · Ajustes del TPV › Aparatos › Añadir: un comandero para todos, y su código
 *   · **la tablet**, otro aparato: escribe el código y llega con su función y su nombre
 *   · PIN y bloqueo: «Solo entra quien ha fichado», guardado
 *   · desde la caja, **desvincular** la tablet: en su siguiente toque, «ya no está
 *     vinculado»
 *   · y **Bloquear** devuelve la caja al PIN
 */
const TPV = 'http://localhost:5178/';
const CLAVE = 'una frase que recuerdo';

test('la puerta: vincular la caja con el correo, la tablet con su código, el PIN y desvincular', async ({
  page,
  browser,
  request,
}, info) => {
  test.slow();
  const correo = `puerta-${unico(info)}@correo-de-prueba.com`;
  await cuentaNueva(page, request, correo, 'Bar Puerta');
  await pagarEsencial(page);
  await sinElAlta(page);
  const token = (await page.evaluate(() => window.localStorage.getItem('estook.sesion'))) ?? '';
  // El PIN de quien lleva el local: sale una vez, como en Mi acceso.
  const yo = await consultarEnLaApi<{ personaId: string; local: { id: string } }>(
    request,
    token,
    'quien_soy',
  );
  const { pin } = await ejecutarEnLaApi<{ pin: string }>(request, token, 'regenerar_pin', {
    persona_id: yo.personaId,
    local_id: yo.local.id,
  });

  // ── La caja: el primer aparato, con el correo ──
  await abrirSinQueSeCaiga(page, TPV);
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await abrirSinQueSeCaiga(page, TPV);
  await expect(page.getByRole('heading', { name: 'Vincula este aparato a tu local' })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Entrar con mi correo' }).click();
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Qué es este aparato?' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('radio', { name: /^Caja/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /Cajón 1 · nuevo/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByLabel('Cómo se llama')).toHaveValue('Caja 1');
  await page.getByRole('button', { name: 'Listo' }).click();

  // La sesión de quien vinculó no se queda en el aparato: se queda su llave.
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  const guardado = await page.evaluate(() => ({
    llave: window.localStorage.getItem('estook.tpv.llave'),
    sesion: window.localStorage.getItem('estook.sesion'),
  }));
  expect(guardado.llave).not.toBeNull();
  expect(guardado.sesion).toBeNull();

  // ── El PIN, y el inicio ──
  await page.keyboard.type(pin);
  await expect(page.getByRole('heading', { name: /No has fichado la entrada/ })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  for (const baldosa of ['Mesas', 'Fichar', 'Agotados', 'Ajustes del TPV']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${baldosa}`) })).toBeVisible();
  }
  // Lo que todavía no funciona no sale, ni apagado.
  await expect(page.getByRole('button', { name: /^Venta rápida/ })).toHaveCount(0);

  // ── Ajustes del TPV › Aparatos › Añadir: la tablet de la sala ──
  await page.getByRole('button', { name: /^Ajustes del TPV/ }).click();
  await expect(page.getByRole('button', { name: /Caja 1 · este aparato/ })).toBeVisible();
  await page.getByRole('button', { name: 'Añadir aparato' }).click();
  await page.getByRole('radio', { name: /^Comandero/ }).click();
  await expect(page.getByRole('radio', { name: /^Para todos/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.getByLabel('Cómo se llama').fill('Tablet terraza');
  await page.getByRole('button', { name: 'Sacar el código' }).click();
  await expect(
    page.getByRole('img', { name: 'El QR para vincular el aparato nuevo' }),
  ).toBeVisible();
  await expect(page.getByText(/Caduca en \d+:\d\d · sirve una vez/)).toBeVisible();
  const enLetra = (await page.getByLabel(/^Código \d/).getAttribute('aria-label')) ?? '';
  const codigo = enLetra.replace(/\D/g, '');
  expect(codigo).toMatch(/^\d{6}$/);

  // ── La tablet: otro aparato, con el código ──
  const otro = await browser.newContext();
  const tablet = await otro.newPage();
  await abrirSinQueSeCaiga(tablet, TPV);
  await expect(tablet.getByText('El código de vinculación')).toBeVisible({ timeout: 15_000 });
  await tablet.keyboard.type(codigo);
  // Llega con su función y su nombre: no hay que elegir nada.
  await expect(tablet.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  await expect(tablet.getByText(/Tablet terraza · Bar Puerta/)).toBeVisible();

  // ── PIN y bloqueo ──
  await page.getByRole('button', { name: 'Hecho' }).click();
  await expect(page.getByRole('button', { name: /Tablet terraza/ })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'PIN y bloqueo' }).click();
  await page.getByLabel(/^Solo entra quien ha fichado/).check();
  await expect(page.getByRole('status')).toContainText('Guardado');

  // ── Desvincular la tablet, desde la caja ──
  await page.getByRole('button', { name: 'Aparatos' }).click();
  await page.getByRole('button', { name: /Tablet terraza/ }).click();
  await page.getByRole('button', { name: 'Desvincular', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, desvincular' }).click();
  await expect(page.getByRole('button', { name: 'Añadir aparato' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: /Tablet terraza/ })).toHaveCount(0);

  // En su siguiente toque, la tablet lo dice y deja vincularla otra vez.
  await recargarSinQueSeCaiga(tablet);
  await expect(
    tablet.getByRole('heading', { name: /Este aparato ya no está vinculado/ }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(tablet.getByRole('button', { name: 'Vincular este aparato' })).toBeVisible();
  await otro.close();

  // ── Y Bloquear devuelve la caja al PIN ──
  await page.getByRole('button', { name: /bloquear/i }).click();
  await expect(page.getByText('Teclea tu PIN')).toBeVisible();
});
