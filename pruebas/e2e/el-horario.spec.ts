import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { API, APP, ejecutarEnLaApi, entrarEnLaApp, tokenDe } from './en-la-app.ts';

/**
 * H2 · El horario de la semana (decisiones 0066, 0068 y 0069), por la pantalla.
 *
 *   1 · La gerente monta un tramo a Sara, pone otro y lo quita, publica, y lo ve
 *       como lo ve el equipo; Sara lo tiene en la campana, y sale en PDF.
 *   2 · Para no empezar de cero: copiar la semana anterior, que pregunta antes de
 *       pisar lo que hay. (Rellenar con el horario de siempre se fue el 9-oct: 0081.)
 *
 * **Cada vuelta usa una semana suya**, lejos en el futuro: los navegadores corren a
 * la vez contra la misma base, y una semana compartida haría que uno publicara lo
 * que el otro está montando. Y si una prueba se repite, coge otra.
 */
const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';

const PROYECTOS = ['escritorio', 'movil-pequeno', 'movil-safari'];

function laFecha(dias: number): string {
  return new Date(Date.UTC(2027, 0, 4) + dias * 86_400_000).toISOString().slice(0, 10);
}

/** Un lunes solo de esta vuelta de esta prueba. 4 de enero de 2027 es lunes. */
function unLunes(info: TestInfo, mas: number): string {
  const proyecto = Math.max(0, PROYECTOS.indexOf(info.project.name));
  const vuelta = Math.floor(Date.now() / 1000) % 2000;
  return laFecha((proyecto * 2100 + vuelta + mas) * 7);
}

function elDia(lunes: string, mas: number): { fecha: string; numero: number } {
  const fecha = new Date(Date.parse(`${lunes}T00:00:00Z`) + mas * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return { fecha, numero: Number(fecha.slice(8)) };
}

async function consultar<T>(
  peticion: APIRequestContext,
  token: string,
  nombre: string,
  entrada: Record<string, string>,
): Promise<T> {
  const respuesta = await peticion.get(
    `${API}/v1/consultas/${nombre}?${new URLSearchParams(entrada).toString()}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  expect(respuesta.status(), `${nombre}: ${await respuesta.text()}`).toBe(200);
  return ((await respuesta.json()) as { datos: T }).datos;
}

/** En el móvil el horario va día a día: se elige el día antes de tocar a nadie. */
async function elegirElDia(page: Page, nombre: string): Promise<void> {
  const pestana = page.getByRole('tab', { name: nombre, exact: true });
  if ((await pestana.count()) > 0) await pestana.click();
}

test('se monta, se publica, lo ve el equipo y sale en PDF', async ({ page }, info) => {
  test.slow();
  const lunes = unLunes(info, 0);
  const martes = elDia(lunes, 1);
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/horario?semana=${lunes}`);

  await expect(page.getByRole('tab', { name: 'Montarlo', selected: true })).toBeVisible();
  await expect(page.getByText('Sin empezar')).toBeVisible();

  // ── Un tramo a Sara, el martes ──────────────────────────────────────────────
  await elegirElDia(page, `martes ${String(martes.numero)}`);
  await page
    .getByRole('button', { name: `Sara N., martes ${String(martes.numero)}: nada` })
    .click();
  const hoja = page.getByRole('dialog', { name: `Sara N., martes ${String(martes.numero)}` });
  await hoja.getByLabel('Entra').fill('12:00');
  await hoja.getByLabel('Sale').fill('16:00');
  await hoja.getByRole('button', { name: 'Poner el tramo' }).click();
  await expect(hoja.getByText('12:00–16:00')).toBeVisible();

  // Otro, y se quita: el horario partido son dos tramos, y uno se puede quitar.
  await hoja.getByLabel('Entra').fill('20:00');
  await hoja.getByLabel('Sale').fill('23:00');
  await hoja.getByRole('button', { name: 'Poner el tramo' }).click();
  await expect(hoja.getByText('20:00–23:00')).toBeVisible();
  await hoja
    .getByRole('listitem')
    .filter({ hasText: '20:00–23:00' })
    .getByRole('button', { name: 'Quitar' })
    .click();
  await expect(hoja.getByText('20:00–23:00')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(hoja).toHaveCount(0);

  await expect(
    page.getByRole('button', { name: `Sara N., martes ${String(martes.numero)}: 12:00–16:00` }),
  ).toBeVisible();
  await expect(page.getByText('Borrador, sin publicar')).toBeVisible();

  // ── Publicar: a Sara le llega lo suyo ───────────────────────────────────────
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  const confirmar = page.getByRole('dialog', { name: 'Publicar la semana' });
  await expect(confirmar).toContainText('le llega lo suyo');
  await confirmar.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(page.getByText('Publicado. Le ha llegado el aviso a 1 persona.')).toBeVisible();
  await expect(page.getByText('Publicada', { exact: true })).toBeVisible();

  // C2 (0075): al publicar, «¿Avisar en Todo el equipo?» Sí o no.
  const alChat = page.getByRole('dialog', { name: '¿Avisar en «Todo el equipo»?' });
  await alChat.getByRole('button', { name: 'Sí, avisar' }).click();
  await expect(alChat).toHaveCount(0);
  await expect(page.getByText('Publicado, y avisado en «Todo el equipo».')).toBeVisible();

  const sara = await tokenDe(page.request, SARA);
  const loQueVe = await consultar<{ publicado: boolean; turnos: { entra: string }[] }>(
    page.request,
    sara,
    'el_horario',
    { lunes },
  );
  expect(loQueVe.publicado).toBe(true);
  // Su aviso lleva a esa semana del horario, y dice lo suyo.
  const avisos = await consultar<{ avisos: { titulo: string; detalle: string; ir: string }[] }>(
    page.request,
    sara,
    'mis_avisos',
    {},
  );
  const suyo = avisos.avisos.find((a) => a.ir === `/horario?semana=${lunes}`);
  expect(suyo?.titulo).toMatch(/^Tu horario de la semana del /);
  expect(suyo?.detalle).toBe('Martes 12:00–16:00.');

  // ── Lo que ve el equipo, y en PDF ───────────────────────────────────────────
  await page.getByRole('tab', { name: 'Lo que ve el equipo' }).click();
  await expect(page.getByRole('heading', { name: 'El de todos' })).toBeVisible();
  await elegirElDia(page, `martes ${String(martes.numero)}`);
  await expect(
    page.getByRole('button', { name: `Sara N., martes ${String(martes.numero)}: 12:00–16:00` }),
  ).toBeVisible();
  const baja = page.waitForEvent('download');
  await page.getByRole('button', { name: 'El de la pared, en PDF' }).click();
  expect((await baja).suggestedFilename()).toBe(`horario-${lunes}.pdf`);
});

test('para no empezar de cero: copiar la semana anterior, y preguntar antes de pisar', async ({
  page,
}, info) => {
  test.slow();
  const antes = unLunes(info, 3);
  const lunes = unLunes(info, 4);
  const rosa = await tokenDe(page.request, ROSA);
  const marcos = await tokenDe(page.request, MARCOS);
  const marcosId = (await consultar<{ personaId: string }>(page.request, marcos, 'quien_soy', {}))
    .personaId;

  // La semana de antes, con algo.
  await ejecutarEnLaApi(page.request, rosa, 'poner_tramo', {
    lunes: antes,
    persona_id: marcosId,
    dia: elDia(antes, 2).fecha,
    tipo: 'trabajo',
    entra: '10:00',
    sale: '14:00',
  });

  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/horario?semana=${lunes}`);
  await expect(page.getByText('Sin empezar')).toBeVisible();

  await page.getByRole('button', { name: 'Copiar la semana anterior' }).click();
  await expect(page.getByText('1 tramo puesto. Revísalos antes de publicar.')).toBeVisible();

  // Ya tiene algo: copiar otra vez pregunta antes de pisarlo.
  await page.getByRole('button', { name: 'Copiar la semana anterior' }).click();
  const pregunta = page.getByRole('dialog', { name: 'Copiar la semana anterior' });
  await expect(pregunta).toContainText('ya tiene cosas puestas');
  await pregunta.getByRole('button', { name: 'Cambiarlas' }).click();
  await expect(page.getByText('1 tramo puesto. Revísalos antes de publicar.')).toBeVisible();
  // Y ya no hay «Rellenar con el de siempre»: el horario es el de aquí (0081).
  await expect(page.getByRole('button', { name: 'Rellenar con el de siempre' })).toHaveCount(0);

  const borrador = await consultar<{ turnos: { personaId: string; entra: string }[] }>(
    page.request,
    rosa,
    'el_horario_en_borrador',
    { lunes },
  );
  const deMarcos = borrador.turnos.filter((t) => t.personaId === marcosId);
  expect(deMarcos).toHaveLength(1);
  expect(deMarcos[0]?.entra).toBe('10:00');
});

/**
 * Horarios en un solo sitio (repaso del 10-oct · 0082). «Quitar Horarios de Equipo y
 * dejarlo solo en Calendario → Turnos ("Montarlo" solo para quien puede publicar).
 * Equipo se queda en Resumen · Personas · Fichajes · Incidencias, con un acceso
 * "Horario de la semana →" en el Resumen. Todos los "Ir a Horarios" llevan a
 * Calendario.»
 */
test('el horario vive en Calendario › Turnos, y Equipo lleva a él', async ({ page }) => {
  await entrarEnLaApp(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/resumen`);
  await expect(page.getByRole('heading', { name: 'Resumen', level: 1 })).toBeVisible();
  // Equipo ya no tiene «Horarios», ni en el menú de al lado ni en la barra de abajo.
  await expect(page.getByRole('navigation').getByText('Horarios', { exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'Horario de la semana' }).click();
  await expect(page).toHaveURL(/#\/calendario\/turnos/);
  await expect(page.getByRole('heading', { name: 'Turnos', level: 1 })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Montarlo' })).toBeVisible();

  // Una dirección guardada de antes lleva al mismo sitio, con su semana.
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/horarios?semana=2026-10-05`);
  await expect(page).toHaveURL(/#\/calendario\/turnos\?semana=2026-10-05/);
});

test('quien no publica el horario lo ve en Turnos, sin «Montarlo»', async ({ page }) => {
  await entrarEnLaApp(page, SARA);
  await abrirSinQueSeCaiga(page, `${APP}#/calendario/turnos`);
  await expect(page.getByRole('heading', { name: 'Turnos', level: 1 })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Montarlo' })).toHaveCount(0);
});
