import { expect, test } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';
import { cuentaNueva, pagarPro, sinElAlta, unico } from './cuenta-nueva.ts';
const API = 'http://localhost:5177/api';
const APP = 'http://localhost:5174/';

/**
 * T1 · La puerta de Estook TPV (decisión 0107; Anexo 11.3, 11.4, 11.5 y 11.13), en la
 * pantalla y con una cuenta nueva, como el primer día de un local:
 *
 *   · **la caja**: «Vincula este aparato» → «Entrar con mi correo» → «¿Qué es este
 *     aparato?» Caja, con su cajón → **quien crea el restaurante no tenía PIN**, así que
 *     sale con el suyo (0109) → la sesión no se queda: lo que queda es la llave
 *   · el PIN, «No has fichado» → el inicio, con lo que funciona, y «Fichar» arriba (0115)
 *   · Ajustes del TPV › Aparatos › Añadir: un comandero para todos, y su código
 *   · **la tablet**, otro aparato: escribe el código y llega con su función y su nombre
 *   · PIN y bloqueo: «Solo entra quien ha fichado», guardado
 *   · **cambiar lo que es** sin volver a vincular: la tablet pasa a ser la caja 2, con el
 *     cajón de la caja 1
 *   · desde la caja, **desvincular** la tablet: en su siguiente toque, «ya no está
 *     vinculado»
 *   · y **Bloquear** devuelve la caja al PIN
 *   · **¿Has olvidado tu PIN?** (0109): el enlace al correo da uno nuevo, y entra con él
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
  await pagarPro(page);
  await sinElAlta(page);
  // **Sin PIN**: quien crea el restaurante no tiene ninguno. Antes de la 0109 no había
  // forma de entrar en su propio TPV; ahora se lo da el primer aparato.

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

  // Su PIN, una sola vez.
  await expect(page.getByRole('heading', { name: 'Tu PIN de Bar Puerta' })).toBeVisible({
    timeout: 15_000,
  });
  const pin =
    (await page
      .getByRole('status')
      .getByText(/^\d{6}$/)
      .textContent()) ?? '';
  expect(pin).toMatch(/^\d{6}$/);
  await page.getByRole('button', { name: 'Ya lo tengo apuntado' }).click();

  // La sesión de quien vinculó no se queda en el aparato: se queda su llave.
  await expect(page.getByText('Teclea tu PIN')).toBeVisible({ timeout: 15_000 });
  const guardado = await page.evaluate(() => ({
    llave: window.localStorage.getItem('estook.tpv.llave'),
    sesion: window.localStorage.getItem('estook.sesion'),
  }));
  expect(guardado.llave).not.toBeNull();
  expect(guardado.sesion).toBeNull();

  // ── El PIN, y la sala, que es la entrada (la entrada nueva) ──
  await page.keyboard.type(pin);
  await expect(page.getByRole('heading', { name: /No has fichado la entrada/ })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar sin fichar' }).click();
  await expect(page.getByText('Tu sala aún no tiene mesas')).toBeVisible({ timeout: 15_000 });
  // Arriba, lo de todos los días: Fichar en naranja (0115) y el engranaje.
  await expect(page.getByRole('button', { name: 'Fichar', exact: true })).toBeVisible();
  // «Fichar» con la caja abierta pide el PIN a todos (0121); con el suyo, lo de quien la abrió.
  await page.getByRole('button', { name: 'Fichar', exact: true }).click();
  await expect(page.getByText('Fichar · teclea tu PIN')).toBeVisible();
  await page.keyboard.type(pin);
  await expect(page.getByText('¿Fichar la entrada?')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'No, volver' }).click();
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await expect(page.getByText('Tu sala aún no tiene mesas')).toBeVisible({ timeout: 15_000 });
  // Lo que todavía no funciona no sale, ni apagado.
  await expect(page.getByRole('button', { name: /^Venta rápida/ })).toHaveCount(0);

  // ── El engranaje › Aparatos del local › Añadir: la tablet de la sala ──
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  for (const grupo of ['Hoy', 'Lo que se vende', 'Lo que se conecta', 'Seguridad']) {
    await expect(page.getByRole('region', { name: grupo })).toBeVisible();
  }
  await page.getByRole('button', { name: /^Aparatos del local/ }).click();
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
  await page.getByLabel(/solo entra quien ha fichado/i).check();
  await expect(page.getByRole('status')).toContainText('Guardado');

  // ── Volver a vincular (0121): la tablet que borró la app vuelve la misma, sin otra ──
  await page.getByRole('button', { name: 'Aparatos' }).click();
  await page.getByRole('button', { name: /Tablet terraza/ }).click();
  await page.getByRole('button', { name: 'Sacar el código' }).click();
  await expect(
    page.getByRole('heading', { name: 'Vuelve a vincular «Tablet terraza»' }),
  ).toBeVisible({ timeout: 15_000 });
  const otraVez = ((await page.getByLabel(/^Código \d/).getAttribute('aria-label')) ?? '').replace(
    /\D/g,
    '',
  );
  expect(otraVez).toMatch(/^\d{6}$/);
  await page.getByRole('button', { name: 'Hecho' }).click();
  const sinLaApp = await browser.newContext();
  const deNuevo = await sinLaApp.newPage();
  await abrirSinQueSeCaiga(deNuevo, TPV);
  await expect(deNuevo.getByText('El código de vinculación')).toBeVisible({ timeout: 15_000 });
  await deNuevo.keyboard.type(otraVez);
  await expect(deNuevo.getByText(/Tablet terraza · Bar Puerta/)).toBeVisible({ timeout: 15_000 });
  await sinLaApp.close();

  // ── Cambiar lo que es, sin volver a vincular: la tablet pasa a ser la caja 2 ──
  await expect(page.getByRole('radio', { name: /^Comandero/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // Sin cambiar nada, no hay nada que guardar.
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  await page.getByRole('radio', { name: /^Caja/ }).click();
  await page.getByRole('radio', { name: 'Compartir Cajón 1' }).click();
  await expect(page.getByLabel('Cómo se llama')).toHaveValue('Caja 2');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('status')).toContainText('Guardado');
  await expect(page.getByRole('heading', { name: 'Caja 2' })).toBeVisible();
  await expect(page.getByText(/^Caja · Cajón 1/)).toBeVisible();

  // ── Desvincularla, desde la caja 1 ──
  await page.getByRole('button', { name: 'Desvincular', exact: true }).click();
  await page.getByRole('button', { name: 'Sí, desvincular' }).click();
  await expect(page.getByRole('button', { name: 'Añadir aparato' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('button', { name: /Caja 2/ })).toHaveCount(0);

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

  // ── ¿Has olvidado tu PIN? Un enlace al correo, sin esperar a nadie (0109) ──
  await page.getByRole('button', { name: '¿Has olvidado tu PIN?' }).click();
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByRole('button', { name: 'Mandarme el enlace' }).click();
  await expect(page.getByRole('status')).toContainText('Bar Puerta');
  const mandado = (await (
    await request.get(`${API}/pruebas/ultimo-correo?para=${encodeURIComponent(correo)}`)
  ).json()) as { texto: string };
  const enlace = /#\/correo\?pin=\S+/.exec(mandado.texto)?.[0] ?? '';
  expect(enlace).not.toBe('');

  // El enlace se abre en el móvil de quien lo pidió: en Estook, sin haber entrado.
  const movil = await browser.newContext();
  const enElMovil = await movil.newPage();
  await abrirSinQueSeCaiga(enElMovil, `${APP}${enlace}`);
  await enElMovil.getByRole('button', { name: 'Ver mi PIN nuevo' }).click();
  await expect(
    enElMovil.getByRole('heading', { name: 'Tu PIN nuevo de Bar Puerta' }),
  ).toBeVisible();
  const nuevo = (await enElMovil.getByText(/^\d{6}$/).textContent()) ?? '';
  expect(nuevo).toMatch(/^\d{6}$/);
  await movil.close();

  // Y el nuevo dice quién es: como el local pide fichar (arriba), le ofrece la entrada.
  await page.getByRole('button', { name: 'Volver al PIN' }).click();
  await page.keyboard.type(nuevo);
  await expect(page.getByRole('heading', { name: /No has fichado la entrada/ })).toBeVisible({
    timeout: 15_000,
  });
});
