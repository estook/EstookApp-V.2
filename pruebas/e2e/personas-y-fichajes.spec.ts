import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga, recargarSinQueSeCaiga } from './abrir.ts';

/**
 * H1 · Personas y fichajes (decisiones 0057, 0062 y 0068), desde la pantalla.
 *
 *   1 · Dar de alta a alguien **sin correo**, poner **el aparato del local** y que
 *       esa persona fiche con su PIN: entrada, pausa, vuelta y salida.
 *   2 · **Mis fichajes**: la pausa y una corrección se ven, con lo de antes, también
 *       para quien no tiene la app Equipo.
 *   3 · **El registro para la Inspección** y **el informe en PDF**, pedidos desde la
 *       pantalla. El motor de la API de pruebas es de mentira: aquí se mira que se
 *       piden bien y llegan; cómo quedan se mira con `pnpm documentos:muestra`.
 *
 * Cada proyecto usa su propia gente: corren a la vez contra la misma API.
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';
const CLAVE = 'estook en desarrollo';
const ROSA = 'rosa@ejemplo.estook.com';

async function entrar(page: Page, correo: string) {
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
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function tokenDe(peticion: APIRequestContext, correo: string, pin?: string): Promise<string> {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `h1-${correo}-${Date.now()}-${Math.random()}` },
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

/** Teclea un PIN en el aparato, cifra a cifra, como con el dedo. */
async function teclear(page: Page, pin: string) {
  for (const cifra of pin) {
    await page.getByRole('button', { name: cifra, exact: true }).click();
  }
}

test('sin correo, y fichando con su PIN en el aparato del local', async ({ page }, info) => {
  // Es el recorrido entero —alta, aparato y cuatro fichajes—: con la batería
  // completa en paralelo pasó de los 30 segundos en el móvil pequeño.
  test.slow();
  const nombre = `Extra ${info.project.name}`;
  await entrar(page, ROSA);

  // ── 1 · Darle de alta sin correo ───────────────────────────────────────────
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/personas/con-acceso?hacer=invitar`);
  const alta = page.getByRole('dialog', { name: 'Invitar a alguien' });
  await alta.getByLabel('No tiene correo, o no lo quiere dar').check();
  await expect(alta.getByLabel('Su correo', { exact: true })).toHaveCount(0);
  await alta.getByLabel('Su nombre').fill(nombre);
  await alta.getByLabel('Qué hace aquí').selectOption('cocinero');
  await alta.getByRole('button', { name: 'Invitar' }).click();

  const hojaDelPin = page.getByRole('dialog', { name: `El PIN de ${nombre}` });
  await expect(hojaDelPin).toBeVisible();
  const pin = /\d{6}/.exec((await hojaDelPin.textContent()) ?? '')?.[0] ?? '';
  expect(pin).toMatch(/^\d{6}$/);
  // Y dice dónde se usa ese PIN: sin correo no se entra en la app (30-sep).
  await expect(hojaDelPin).toContainText('no entra en la app');
  await hojaDelPin.getByRole('button', { name: 'Hecho' }).click();

  // ── 2 · Poner este aparato para fichar, en Ajustes ─────────────────────────
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/local`);
  await page.getByRole('button', { name: 'Usar este aparato para fichar' }).click();
  const poner = page.getByRole('dialog', { name: 'Usar este aparato para fichar' });
  await poner.getByLabel('Cómo se llama').fill(`Tablet ${info.project.name}`);
  await poner.getByRole('button', { name: 'Ponerlo' }).click();
  await expect(page.getByText(`Este aparato es «Tablet ${info.project.name}»`)).toBeVisible();

  // Abrirla cierra la sesión de Rosa en este aparato: se queda en el local.
  await page.getByRole('button', { name: 'Abrir la pantalla de fichar' }).click();
  await expect(page.getByText('Teclea tu PIN para fichar')).toBeVisible();
  await expect(page.getByText('Bar Centro', { exact: true })).toBeVisible();
  const token = await page.evaluate(() => window.localStorage.getItem('estook.sesion'));
  expect(token).toBeNull();

  // ── 3 · Ficharlo todo con el PIN ───────────────────────────────────────────
  const hacer = async (boton: string, dice: string) => {
    await teclear(page, pin);
    await expect(page.getByText(`Hola, ${nombre}`)).toBeVisible();
    await page.getByRole('button', { name: boton }).click();
    await expect(page.getByRole('status')).toContainText(`${dice}, ${nombre}`);
  };
  await hacer('Fichar la entrada', 'Entrada apuntada');
  await hacer('Empezar pausa', 'Pausa empezada');
  await hacer('Volver de la pausa', 'De vuelta de la pausa');
  await hacer('Fichar la salida', 'Salida apuntada');

  // Un PIN que no es de nadie de aquí lo dice, sin decir de quién podría ser.
  await teclear(page, pin === '000000' ? '999999' : '000000');
  await expect(page.getByRole('alert')).toContainText('Ese PIN no es de nadie de este local');

  // ── 4 · Y en su ficha, quien lo lleva lo ve fichado «en el aparato del local» ─
  const rosa = await tokenDe(page.request, ROSA);
  const gente = await consultar<{ filas: { personaId: string; nombre: string }[] }>(
    page.request,
    rosa,
    'resumen_del_equipo',
    { periodo: 'semana' },
  );
  const suyo = gente.filas.find((f) => f.nombre === nombre);
  expect(suyo).toBeDefined();
  const ficha = await consultar<{
    sinCorreo: boolean;
    ultimosFichajes: { sinUbicacion: string | null; pausas: unknown[] }[];
  }>(page.request, rosa, 'una_persona', { persona_id: suyo?.personaId ?? '' });
  expect(ficha.sinCorreo).toBe(true);
  expect(ficha.ultimosFichajes[0]?.sinUbicacion).toBe('aparato_del_local');
  expect(ficha.ultimosFichajes[0]?.pausas).toHaveLength(1);

  // Su correo, cuando lo dé: sigue siendo la misma persona.
  await ejecutar(page.request, rosa, 'poner_correo', {
    persona_id: suyo?.personaId,
    correo: `extra-${info.project.name}-${Date.now()}@correo-de-prueba.com`,
  });

  // Y el aparato se quita: deja de valer al momento.
  const aparatos = await consultar<{ terminalId: string; nombre: string }[]>(
    page.request,
    rosa,
    'aparatos_para_fichar',
  );
  const este = aparatos.find((a) => a.nombre === `Tablet ${info.project.name}`);
  await ejecutar(page.request, rosa, 'quitar_aparato_para_fichar', {
    terminal_id: este?.terminalId,
  });
  await recargarSinQueSeCaiga(page);
  await expect(page.getByText('Este aparato no está puesto para fichar')).toBeVisible();
});

test('mis fichajes: la pausa y la corrección, con lo de antes a la vista', async ({
  page,
}, info) => {
  const rosa = await tokenDe(page.request, ROSA);
  const quien = await consultar<{ organizacion: { id: string }; local: { id: string } }>(
    page.request,
    rosa,
    'quien_soy',
  );

  // Alguien nuevo, con correo, solo de esta prueba: así no choca con los otros proyectos.
  const correo = `turno-${info.project.name}-${Date.now()}@correo-de-prueba.com`;
  const alta = await ejecutar<{ personaId: string; pin: string }>(
    page.request,
    rosa,
    'invitar_persona',
    {
      correo,
      nombre: 'Lucía',
      rol: 'camarero',
      organizacion_id: quien.organizacion.id,
      local_id: quien.local.id,
    },
  );
  const lucia = await tokenDe(page.request, correo, alta.pin);

  await ejecutar(page.request, lucia, 'fichar_entrada', { sin_donde: 'sin_senal' });
  await ejecutar(page.request, lucia, 'empezar_pausa', {});
  await ejecutar(page.request, lucia, 'acabar_pausa', {});
  const salida = await ejecutar<{ fichajeId: string }>(page.request, lucia, 'fichar_salida', {
    sin_donde: 'sin_senal',
  });

  await ejecutar(page.request, rosa, 'corregir_fichaje', {
    fichaje_id: salida.fichajeId,
    entro_en: new Date(Date.now() - 4 * 3_600_000).toISOString(),
    motivo: 'Entró antes y no fichó',
  });

  // Lucía no tiene la app Equipo, y sus fichajes los ve igual.
  await abrirSinQueSeCaiga(page, APP);
  await page.evaluate((token) => {
    window.localStorage.setItem('estook.sesion', token);
  }, lucia);
  await abrirSinQueSeCaiga(page, `${APP}#/mis-fichajes`);
  await expect(page.getByRole('heading', { level: 1, name: 'Mis fichajes' })).toBeVisible();
  await expect(
    page.getByText(/Corregido por Rosa el .*: «Entró antes y no fichó»\. Antes:/),
  ).toBeVisible();
  await expect(page.getByText(/pausa de/)).toBeVisible();

  // Y le ha llegado el aviso a la campana.
  const avisos = await consultar<{ avisos: { tipo: string; ir: string | null }[] }>(
    page.request,
    lucia,
    'mis_avisos',
  );
  expect(
    avisos.avisos.some((a) => a.tipo === 'fichaje.corregido' && a.ir === '/mis-fichajes'),
  ).toBe(true);
});

test('el registro para la Inspección, las pausas en Ajustes y el informe en PDF', async ({
  page,
}) => {
  await entrar(page, ROSA);

  // Las pausas: cuenta y deja de contar, y se guarda.
  await abrirSinQueSeCaiga(page, `${APP}#/ajustes/local`);
  const cuenta = page.getByLabel('La pausa cuenta como trabajo');
  await cuenta.check();
  await expect(page.getByText('Guardado.', { exact: true })).toBeVisible();
  await cuenta.uncheck();
  await expect(cuenta).not.toBeChecked();

  // El registro de jornada, en hoja y en PDF.
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/fichajes`);
  for (const [boton, tipo] of [
    ['En hoja de cálculo', 'text/csv'],
    ['En PDF', 'application/pdf'],
  ] as const) {
    const llega = page.waitForResponse((r) => r.url().includes('/consultas/registro_de_jornada'));
    await page.getByRole('button', { name: boton }).click();
    const respuesta = await llega;
    expect(respuesta.status()).toBe(200);
    const cuerpo = (await respuesta.json()) as { datos: { tipo: string; huella: string } };
    expect(cuerpo.datos.tipo).toBe(tipo);
    expect(cuerpo.datos.huella).toMatch(/^[0-9a-f]{64}$/);
  }

  // Tu semana, en PDF, en un aparato **que sabe compartir**, como el Windows de
  // Richi: el navegador de las pruebas no sabe, y así se prueba el caso que falló.
  await page.addInitScript(() => {
    Object.assign(navigator, {
      canShare: () => true,
      share: () => Promise.resolve(),
    });
  });
  // Con algo que contar: sin datos el PDF ya no se ofrece (auditoría del 9-oct). Una
  // caja de hace siete días cae siempre en la semana pasada; si ya estaba, da igual.
  const rosa = await tokenDe(page.request, ROSA);
  await page.request.post(`${API}/v1/comandos/cerrar_la_caja`, {
    headers: {
      authorization: `Bearer ${rosa}`,
      'x-idempotencia': `pdf-${String(Date.now())}-${String(Math.random())}`,
    },
    data: {
      fecha: new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10),
      total_centimos: 80_000,
      tickets: 20,
    },
  });
  await abrirSinQueSeCaiga(page, `${APP}#/negocio/informes/semana`);
  const llega = page.waitForResponse((r) => r.url().includes('/consultas/mi_informe_en_pdf'));
  // **Se descarga de verdad**, también donde se sabe compartir (30-sep): antes, en
  // un Windows que comparte, solo salía la hoja de compartir y no se podía guardar.
  const baja = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar en PDF' }).click();
  expect((await llega).status()).toBe(200);
  expect((await baja).suggestedFilename()).toMatch(/\.pdf$/);
  await expect(page.getByRole('status').filter({ hasText: 'Descargado' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compartir' })).toBeVisible();
});
