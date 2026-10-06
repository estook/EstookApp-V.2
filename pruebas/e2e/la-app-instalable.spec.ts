import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';

/**
 * I · La app instalable (decisión 0070), desde la pantalla.
 *
 *   1 · **Fichar sin señal**: se guarda en el móvil, se dice, y sale solo al volver,
 *       marcado «sin conexión».
 *   2 · **El aparato del local sin wifi**: el PIN se guarda cifrado y se apunta al
 *       volver la conexión.
 *   3 · **Sin señal, lo último que se vio**: con el trabajador de servicio, la app abre
 *       sin red y enseña lo guardado, con el aviso arriba.
 *   4 · **Ajustes → Avisos**: este móvil, la columna «Móvil» y cuándo suena.
 *
 * Cada proyecto usa su propia gente: corren a la vez contra la misma API.
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';
const CLAVE = 'estook en desarrollo';
const ROSA = 'rosa@ejemplo.estook.com';

async function tokenDe(peticion: APIRequestContext, correo: string, pin?: string): Promise<string> {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `i-${correo}-${Date.now()}-${Math.random()}` },
    data: pin === undefined ? { correo, contrasena: CLAVE } : { correo, pin },
  });
  expect(respuesta.status(), await respuesta.text()).toBe(200);
  return ((await respuesta.json()) as { datos: { token: string } }).datos.token;
}

async function ejecutar<T>(
  peticion: APIRequestContext,
  token: string,
  nombre: string,
  entrada: unknown,
): Promise<T> {
  const respuesta = await peticion.post(`${API}/v1/comandos/${nombre}`, {
    headers: {
      authorization: `Bearer ${token}`,
      'x-idempotencia': `${nombre}-${Date.now()}-${Math.random()}`,
    },
    data: entrada,
  });
  expect(respuesta.status(), `${nombre}: ${await respuesta.text()}`).toBe(200);
  return ((await respuesta.json()) as { datos: T }).datos;
}

async function consultar<T>(
  peticion: APIRequestContext,
  token: string,
  nombre: string,
  parametros: Record<string, string> = {},
): Promise<T> {
  const query = new URLSearchParams(parametros).toString();
  const respuesta = await peticion.get(
    `${API}/v1/consultas/${nombre}${query === '' ? '' : `?${query}`}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  expect(respuesta.status(), `${nombre}: ${await respuesta.text()}`).toBe(200);
  return ((await respuesta.json()) as { datos: T }).datos;
}

/** Alguien nuevo, con correo, solo de esta prueba: así no choca con los otros proyectos. */
async function alguienNuevo(
  peticion: APIRequestContext,
  cual: string,
  conCorreo: boolean,
): Promise<{ personaId: string; pin: string; token: string | null; rosa: string }> {
  const rosa = await tokenDe(peticion, ROSA);
  const quien = await consultar<{ organizacion: { id: string }; local: { id: string } }>(
    peticion,
    rosa,
    'quien_soy',
  );
  const correo = `i-${cual}-${Date.now()}-${Math.trunc(Math.random() * 1e6)}@correo-de-prueba.com`;
  const alta = await ejecutar<{ personaId: string; pin: string }>(
    peticion,
    rosa,
    'invitar_persona',
    {
      ...(conCorreo ? { correo } : {}),
      nombre: conCorreo ? 'Lucía' : `Sin wifi ${cual}`,
      rol: 'camarero',
      organizacion_id: quien.organizacion.id,
      local_id: quien.local.id,
    },
  );
  return {
    personaId: alta.personaId,
    pin: alta.pin,
    token: conCorreo ? await tokenDe(peticion, correo, alta.pin) : null,
    rosa,
  };
}

async function entrarCon(page: Page, token: string, donde = '') {
  await abrirSinQueSeCaiga(page, APP);
  await page.evaluate((elToken) => {
    window.localStorage.setItem('estook.sesion', elToken);
  }, token);
  await abrirSinQueSeCaiga(page, `${APP}#/${donde}`);
}

test('fichar sin señal: se guarda, se dice, y sale solo al volver', async ({
  page,
  context,
}, info) => {
  test.slow();
  const lucia = await alguienNuevo(page.request, info.project.name, true);
  await entrarCon(page, lucia.token ?? '', 'mis-fichajes');
  await expect(page.getByRole('heading', { level: 1, name: 'Mis fichajes' })).toBeVisible();
  await abrirSinQueSeCaiga(page, `${APP}#/?hacer=fichar`);
  const hoja = page.getByRole('dialog', { name: 'Qué quieres hacer' });
  const fichar = hoja.getByRole('button', { name: 'Fichar la entrada' });
  await expect(fichar).toBeVisible();

  await context.setOffline(true);
  await fichar.click();
  await expect(hoja.getByText('Entrada guardada sin señal: sale sola al volver.')).toBeVisible();
  await expect(page.getByText(/^Sin conexión/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /1 sin mandar/ })).toBeVisible();
  // Y la pantalla ya lo da por hecho: no se ficha dos veces.
  await expect(hoja.getByRole('button', { name: 'Fichar la salida' })).toBeVisible();
  await page.keyboard.press('Escape');

  await context.setOffline(false);
  await expect(page.getByRole('button', { name: /sin mandar/ })).toHaveCount(0, {
    timeout: 30_000,
  });

  const suyos = await consultar<{ fichajes: { sinConexion?: { entrada: boolean } }[] }>(
    page.request,
    lucia.rosa,
    'fichajes_de_una_persona',
    { persona_id: lucia.personaId },
  );
  expect(suyos.fichajes).toHaveLength(1);
  expect(suyos.fichajes[0]?.sinConexion?.entrada).toBe(true);
  await ejecutar(page.request, lucia.token ?? '', 'fichar_salida', { sin_donde: 'sin_senal' });
});

test('el aparato del local sin wifi: el PIN se guarda cifrado y se apunta al volver', async ({
  page,
  context,
}, info) => {
  test.slow();
  const extra = await alguienNuevo(page.request, info.project.name, false);
  const puesto = await ejecutar<{ llave: string; nombre: string }>(
    page.request,
    extra.rosa,
    'poner_aparato_para_fichar',
    { nombre: `Tablet sin wifi ${info.project.name}` },
  );
  await abrirSinQueSeCaiga(page, APP);
  await page.evaluate((llave) => {
    window.localStorage.clear();
    window.localStorage.setItem('estook.aparato-para-fichar', JSON.stringify(llave));
  }, puesto);
  await abrirSinQueSeCaiga(page, `${APP}#/aparato-para-fichar`);
  await expect(page.getByText('Teclea tu PIN para fichar')).toBeVisible();
  // Al encenderse con wifi se prepara: ya tiene su llave pública guardada.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(window.localStorage.getItem('estook.aparato-para-fichar.datos') ?? '{}') as {
            clavePublica?: unknown;
          },
      ),
    )
    .toMatchObject({ clavePublica: expect.any(String) });

  await context.setOffline(true);
  for (const cifra of extra.pin) {
    await page.getByRole('button', { name: cifra, exact: true }).click();
  }
  await expect(page.getByText('Sin conexión', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Fichar la entrada' }).click();
  await expect(
    page.getByText('Entrada guardada. Se apunta sola al volver la conexión.'),
  ).toBeVisible();
  await expect(page.getByText(/1 fichaje por mandar/)).toBeVisible();
  // En el aparato no queda ningún PIN legible.
  const guardado = await page.evaluate(
    () =>
      new Promise<string>((resolver) => {
        const peticion = indexedDB.open('estook');
        peticion.onsuccess = () => {
          const todo = peticion.result.transaction('pendientes').objectStore('pendientes').getAll();
          todo.onsuccess = () => {
            resolver(JSON.stringify(todo.result));
          };
        };
      }),
  );
  expect(guardado).toContain('pin_cifrado');
  expect(guardado).not.toContain(extra.pin);

  await context.setOffline(false);
  await expect(page.getByText(/por mandar/)).toHaveCount(0, { timeout: 45_000 });
  const suyos = await consultar<{
    fichajes: { sinUbicacion: string | null; sinConexion?: { entrada: boolean } }[];
  }>(page.request, extra.rosa, 'fichajes_de_una_persona', { persona_id: extra.personaId });
  expect(suyos.fichajes[0]?.sinUbicacion).toBe('aparato_del_local');
  expect(suyos.fichajes[0]?.sinConexion?.entrada).toBe(true);
});

test.describe('con el trabajador de servicio', () => {
  test.use({ serviceWorkers: 'allow' });
  // En el WebKit de Playwright (Linux), recargar sin red con el trabajador puesto
  // acaba en «WebKit encountered an internal error» antes de llegar a la app (1-oct).
  // En Chrome se prueba aquí; en un iPhone de verdad, en el paso 5 de Richi.
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Playwright no recarga sin red en WebKit con el trabajador de servicio',
  );

  test('sin señal, Estook abre y enseña lo último que se vio', async ({ page, context }, info) => {
    test.slow();
    const lucia = await alguienNuevo(page.request, `${info.project.name}-sw`, true);
    await entrarCon(page, lucia.token ?? '', 'mis-fichajes');
    await expect(page.getByRole('heading', { level: 1, name: 'Mis fichajes' })).toBeVisible();
    // El trabajador, puesto y mandando; y lo visto, guardado en el móvil.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await recargarSinQueSeCaiga(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Mis fichajes' })).toBeVisible();
    await page.waitForTimeout(3_000);

    await context.setOffline(true);
    await recargarSinQueSeCaiga(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Mis fichajes' })).toBeVisible();
    await expect(page.getByText(/^Sin conexión · lo de las \d\d:\d\d/)).toBeVisible();
    await context.setOffline(false);
  });

  test('abrirla con mala señal no borra lo guardado: si la señal se va, sigue ahí', async ({
    page,
    context,
  }, info) => {
    // Lo cazó una captura (1-oct): al volver a abrir la app, lo que se guardaba en los
    // primeros segundos —todavía sin leer nada— pisaba lo bueno. Con la API lenta y la
    // señal yéndose justo entonces, sin red salía la pantalla de entrar.
    test.slow();
    const lucia = await alguienNuevo(page.request, `${info.project.name}-lenta`, true);
    await entrarCon(page, lucia.token ?? '', 'mis-fichajes');
    await expect(page.getByRole('heading', { level: 1, name: 'Mis fichajes' })).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(3_000);

    // Se vuelve a abrir con una señal tan mala que la API tarda seis segundos…
    await page.route('**/api/v1/**', async (ruta) => {
      await new Promise((resolver) => setTimeout(resolver, 6_000));
      await ruta.continue().catch(() => undefined);
    });
    await recargarSinQueSeCaiga(page);
    await page.waitForTimeout(3_000);
    // …y a mitad, se va del todo. Con la petición colgada, la app espera cuatro
    // segundos a `quien_soy` antes de dar la señal por perdida (0070): de ahí el tope.
    await context.setOffline(true);
    await recargarSinQueSeCaiga(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Mis fichajes' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/^Sin conexión · lo de las \d\d:\d\d/)).toBeVisible();
    await context.setOffline(false);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});

test('Ajustes → Avisos: este móvil, la columna «Móvil» y cuándo suena', async ({ page }, info) => {
  const lucia = await alguienNuevo(page.request, `${info.project.name}-ajustes`, true);
  await entrarCon(page, lucia.token ?? '', 'ajustes/avisos');
  await expect(page.getByRole('heading', { name: /^Este (móvil|ordenador)$/ })).toBeVisible();
  await expect(page.getByText('Móvil', { exact: true }).first()).toBeVisible();

  // De fábrica, «entras en cinco minutos» suena en el móvil; se apaga con un toque.
  const entras = page.getByRole('switch', { name: 'Entras en cinco minutos: en el móvil' });
  await expect(entras).toBeChecked();
  // Se toca lo que se ve —el interruptor pintado—, como en `los-avisos.spec.ts`.
  const guardado = page.waitForResponse((r) => r.url().includes('/guardar_mis_avisos'));
  await entras.locator('xpath=..').click();
  expect((await guardado).status()).toBe(200);
  await expect(entras).not.toBeChecked();
  await recargarSinQueSeCaiga(page);
  await expect(
    page.getByRole('switch', { name: 'Entras en cinco minutos: en el móvil' }),
  ).not.toBeChecked();

  // Cuándo suena: en su turno, o fuera de sus horas de silencio, con las horas.
  const cuando = page.getByRole('radiogroup', { name: 'Cuándo suena el móvil' });
  const guardadoElModo = page.waitForResponse((r) => r.url().includes('/guardar_cuando_suena'));
  await cuando.getByRole('radio', { name: /Siempre, menos en mis horas de silencio/ }).click();
  expect((await guardadoElModo).status()).toBe(200);
  await expect(page.getByLabel('Silencio desde')).toHaveValue('23:00');
  await expect(page.getByLabel('hasta')).toHaveValue('08:00');
  const movil = await consultar<{ cuandoSuena: { modo: string; deFabrica: boolean } }>(
    page.request,
    lucia.token ?? '',
    'mi_movil',
  );
  expect(movil.cuandoSuena).toMatchObject({ modo: 'fuera_del_silencio', deFabrica: false });
});

/**
 * Lo que la pantalla solo hace con un móvil de verdad o con un fichaje raro: que la API
 * contesta. Las reglas, una a una, en `base-de-datos/pruebas/la-app-instalable.prueba.ts`.
 */
test('revisar un fichaje, apuntar uno que falta y el móvil, contra la API', async ({
  page,
}, info) => {
  const HORA = 60 * 60 * 1000;
  const lucia = await alguienNuevo(page.request, `${info.project.name}-revisar`, true);
  const suyo = lucia.token ?? '';

  // Con más de doce horas sin señal, el fichaje queda por revisar; Rosa lo da por bueno.
  const entrada = await page.request.post(`${API}/v1/comandos/fichar_entrada`, {
    headers: {
      authorization: `Bearer ${suyo}`,
      'x-idempotencia': `entrada-${Date.now()}-${Math.random()}`,
      'x-hecho-hace': String(13 * HORA),
    },
    data: { sin_donde: 'sin_senal' },
  });
  expect(entrada.status(), await entrada.text()).toBe(200);
  await ejecutar(page.request, suyo, 'fichar_salida', { sin_donde: 'sin_senal' });
  const antes = await consultar<{ fichajes: { fichajeId: string; porRevisar: boolean }[] }>(
    page.request,
    lucia.rosa,
    'fichajes_de_una_persona',
    { persona_id: lucia.personaId },
  );
  const porRevisar = antes.fichajes.find((f) => f.porRevisar);
  expect(porRevisar).toBeDefined();
  await ejecutar(page.request, lucia.rosa, 'dar_por_bueno_el_fichaje', {
    fichaje_id: porRevisar?.fichajeId,
  });

  // Uno que se le olvidó hace tres días, apuntado a mano con su porqué.
  const dia = new Date(Date.now() - 3 * 24 * HORA);
  dia.setUTCHours(8, 0, 0, 0);
  const hecho = await ejecutar<{ minutos: number }>(
    page.request,
    lucia.rosa,
    'apuntar_fichaje_que_falta',
    {
      persona_id: lucia.personaId,
      entro_en: dia.toISOString(),
      salio_en: new Date(dia.getTime() + 4 * HORA).toISOString(),
      motivo: 'Fichó en la tablet sin conexión con otro PIN',
    },
  );
  expect(hecho.minutos).toBe(240);

  // El móvil: se pone, se prueba (con el de mentira) y se quita.
  const direccion = `https://fcm.googleapis.com/fcm/send/e2e-${info.project.name}-${Date.now()}`;
  await ejecutar(page.request, suyo, 'poner_este_movil', {
    direccion,
    p256dh: `B${'A'.repeat(86)}`,
    auth: 'A'.repeat(22),
    aparato: 'Android · Chrome',
  });
  await ejecutar(page.request, suyo, 'probar_mi_movil', {});
  await ejecutar(page.request, suyo, 'quitar_este_movil', { direccion });
  const despues = await consultar<{ moviles: unknown[] }>(page.request, suyo, 'mi_movil');
  expect(despues.moviles).toEqual([]);
});
