import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';

/**
 * La ficha de una persona, desde el repaso del 23-sep-2026.
 *
 *   · **Sus fichajes: los tres últimos, y «Ver todos»**, que abre el historial entero
 *     dentro del mismo panel y vuelve a la ficha.
 *   · **«En línea» es tener la app abierta**: alguien que ha entrado por la API y no
 *     tiene la app delante no sale en línea.
 *
 * **Cada prueba se hace su persona.** Las de Bar Centro fichan en otras pruebas a la
 * vez que esta (lección 18), así que aquí se invita a alguien nuevo, se le hace
 * fichar cuatro turnos por la API, y Rosa abre su ficha en la pantalla.
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';
const CLAVE = 'estook en desarrollo';
const ROSA = 'rosa@ejemplo.estook.com';

function unaVezMas(): Record<string, string> {
  return { 'x-idempotencia': `ficha-${Date.now()}-${Math.random().toString(36).slice(2)}` };
}

async function unToken(peticion: APIRequestContext, correo: string, clave = CLAVE) {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: unaVezMas(),
    data: { correo, contrasena: clave },
  });
  expect(respuesta.status(), `no se ha podido entrar como ${correo}`).toBe(200);
  return ((await respuesta.json()) as { datos: { token: string } }).datos.token;
}

async function ejecutar(
  peticion: APIRequestContext,
  token: string,
  comando: string,
  datos: unknown,
) {
  const respuesta = await peticion.post(`${API}/v1/comandos/${comando}`, {
    headers: { authorization: `Bearer ${token}`, ...unaVezMas() },
    data: datos,
  });
  return {
    estado: respuesta.status(),
    cuerpo: (await respuesta.json()) as { datos?: Record<string, unknown> },
  };
}

/** Una camarera nueva de Bar Centro, con su clave propia y cuatro turnos fichados. */
async function unaCamareraConCuatroTurnos(peticion: APIRequestContext) {
  const rosa = await unToken(peticion, ROSA);
  const yo = await peticion.get(`${API}/v1/consultas/quien_soy`, {
    headers: { authorization: `Bearer ${rosa}` },
  });
  const donde = (
    (await yo.json()) as {
      datos: { local: { id: string }; organizacion: { id: string } };
    }
  ).datos;

  const correo = `ficha.${Date.now()}${Math.random().toString(36).slice(2, 7)}@ejemplo.estook.com`;
  const invitada = await ejecutar(peticion, rosa, 'invitar_persona', {
    correo,
    nombre: 'Lucía',
    apellidos: 'De la Ficha',
    rol: 'camarero',
    local_id: donde.local.id,
    organizacion_id: donde.organizacion.id,
  });
  expect(invitada.estado, 'Rosa tiene que poder invitar a una camarera').toBe(200);
  const personaId = String(invitada.cuerpo.datos?.['personaId']);

  // Una clave puesta por otro hay que cambiarla antes de hacer nada (M4).
  const provisional = 'una clave provisional larga';
  expect(
    (
      await ejecutar(peticion, rosa, 'poner_clave_a', {
        persona_id: personaId,
        organizacion_id: donde.organizacion.id,
        nueva: provisional,
      })
    ).estado,
  ).toBe(200);
  const primeraVez = await unToken(peticion, correo, provisional);
  expect(
    (
      await ejecutar(peticion, primeraVez, 'cambiar_mi_clave', {
        actual: provisional,
        nueva: CLAVE,
      })
    ).estado,
  ).toBe(200);

  const suya = await unToken(peticion, correo);
  for (let turno = 0; turno < 4; turno++) {
    expect(
      (await ejecutar(peticion, suya, 'fichar_entrada', { sin_donde: 'la_nego' })).estado,
    ).toBe(200);
    expect((await ejecutar(peticion, suya, 'fichar_salida', { sin_donde: 'la_nego' })).estado).toBe(
      200,
    );
  }
  return { personaId, correo };
}

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

test('la ficha enseña tres fichajes, y «Ver todos» abre el historial y vuelve', async ({
  page,
  request,
}) => {
  const { personaId } = await unaCamareraConCuatroTurnos(request);

  await entrar(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/resumen?persona=${personaId}`);

  const ficha = page.getByRole('dialog', { name: 'Lucía De la Ficha' });
  // Los fichajes viven en «Historial de jornadas», plegado (la Ampliación 3, 0153).
  await ficha.getByText('Historial de jornadas', { exact: true }).click({ timeout: 15_000 });
  // Quince segundos, como la ficha de producto (almacen.spec): con las tres pasadas a la
  // vez, la API de pruebas —una sola conexión— tarda a veces más de cinco en darla. Sola
  // tarda menos de tres (14-oct).
  await expect(ficha.getByRole('heading', { name: 'Sus fichajes' })).toBeVisible({
    timeout: 15_000,
  });
  // Tres, no cuatro: el resto está detrás del botón.
  await expect(ficha.getByRole('button', { name: 'Corregir' })).toHaveCount(3);

  // Ha entrado por la API y no tiene la app delante: no está en línea.
  await expect(ficha.getByText('en línea', { exact: true })).toHaveCount(0);
  await expect(ficha.getByText(/^Última vez/)).toBeVisible();

  await ficha.getByRole('button', { name: 'Ver todos (4)' }).click();

  const historial = page.getByRole('dialog', { name: 'Fichajes de Lucía De la Ficha' });
  await expect(historial.getByText('4 fichajes, del último hacia atrás.')).toBeVisible();
  await expect(historial.getByRole('button', { name: 'Corregir' })).toHaveCount(4);

  await historial.getByRole('button', { name: '‹ Volver a la ficha' }).click();
  await ficha.getByText('Historial de jornadas', { exact: true }).click();
  await expect(ficha.getByRole('heading', { name: 'Sus fichajes' })).toBeVisible();
});

/**
 * **La ficha del trabajador** (la Ampliación 3, 0153): sin rellenar, Rosa la rellena a mano
 * y salen los cuatro cuadrados y el saldo de vacaciones, calculado por Estook.
 */
test('la ficha se rellena a mano y salen sus cuatro cuadrados y sus vacaciones', async ({
  page,
  request,
}) => {
  const { personaId } = await unaCamareraConCuatroTurnos(request);

  await entrar(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/resumen?persona=${personaId}`);
  const ficha = page.getByRole('dialog', { name: 'Lucía De la Ficha' });
  await expect(ficha.getByText('Su ficha está sin rellenar')).toBeVisible({ timeout: 15_000 });
  await expect(ficha.locator('[data-baldosa="Jornada"]')).toContainText('Sin poner');

  await ficha.getByRole('button', { name: 'Rellenar su ficha' }).click();
  const elegir = page.getByRole('dialog', { name: 'La ficha de Lucía' });
  // Las tres formas, y la recomendada es el archivo.
  await expect(
    elegir.getByRole('button', { name: /^Archivo del contrato \(recomendado\)/ }),
  ).toBeVisible();
  await expect(elegir.getByRole('button', { name: /^Foto del contrato/ })).toBeVisible();
  await elegir.getByRole('button', { name: /^A mano/ }).click();

  const formulario = page.getByRole('dialog', { name: 'La ficha de Lucía' });
  await formulario.getByLabel('Incorporación').fill('2024-03-12');
  await formulario.getByLabel('Contrato', { exact: true }).selectOption('indefinido');
  await formulario.getByLabel('Jornada', { exact: true }).selectOption('completa');
  await formulario.getByLabel('Horas a la semana').fill('40');
  await formulario.getByLabel('Categoría').fill('Camarera');
  await formulario.getByLabel('Vacaciones al año').fill('30');
  await formulario.getByLabel('DNI/NIE').fill('12345678Z');
  await formulario.getByRole('button', { name: 'Guardar la ficha' }).click();

  await expect(ficha.getByText('Ficha guardada')).toBeVisible();
  await expect(ficha.locator('[data-baldosa="Jornada"]')).toContainText('40 h');
  await expect(ficha.locator('[data-baldosa="Contrato"]')).toContainText('Indefinido');
  await expect(ficha.locator('[data-baldosa="Incorporación"]')).toContainText('12 mar 2024');
  await expect(ficha.locator('[data-baldosa="Vacaciones"]')).toContainText('30 días');
  // Lo privado, escondido de entrada.
  await expect(ficha.getByText('12345678Z')).toHaveCount(0);
  await expect(ficha.getByText('•••• 678 Z')).toBeVisible();
  await expect(
    ficha.getByText(/30 del año − 0 disfrutados − 0 aprobados = 30 disponibles/),
  ).toBeVisible();
});

/**
 * **Las nóminas** (la Ampliación 3 · 2, 0153): Equipo › Nóminas para quien lleva el local, con
 * «Subir las nóminas del mes» y a quién le falta; y **Mi ficha** para el trabajador, desde Tu
 * cuenta, con sus nóminas y sus vacaciones.
 */
test('Equipo › Nóminas para la gerente, y Mi ficha para la camarera', async ({ page, request }) => {
  const { correo } = await unaCamareraConCuatroTurnos(request);

  await entrar(page, ROSA);
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/nominas`);
  await expect(page.getByRole('heading', { level: 1, name: 'Nóminas' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole('button', { name: 'Subir las nóminas del mes' }).first(),
  ).toBeVisible();

  await entrar(page, correo);
  // El avatar sale en la barra de arriba o en el menú, según el ancho: el que se ve.
  await page.locator('button[aria-label^="Tu cuenta"]:visible').first().click();
  await page.getByRole('button', { name: /^Mi ficha/ }).click();
  await expect(page).toHaveURL(/#\/mi-ficha/);
  await expect(page.getByRole('heading', { level: 1, name: 'Mi ficha' })).toBeVisible();
  await expect(page.getByText('Tu ficha todavía está sin rellenar')).toBeVisible();
  await expect(page.getByText('Mis nóminas', { exact: true })).toBeVisible();
  // Una camarera no tiene Nóminas del equipo.
  await abrirSinQueSeCaiga(page, `${APP}#/equipo/nominas`);
  await expect(page.getByRole('button', { name: 'Subir las nóminas del mes' })).toHaveCount(0);
});
