import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';

/**
 * Entrar en la aplicación y hablar con la API de pruebas, para las pruebas de la
 * entrega V (los vacíos, las fotos, el oscuro y las capturas).
 *
 * Las pruebas de antes llevan cada una su `entrar`; estas cuatro comparten uno, y
 * además saben **con qué tema** entrar: el tema es del aparato (0024), vive en el
 * navegador, y se pone antes de cargar para que la primera pintura ya salga en él.
 */
export const APP = 'http://localhost:5174/';
export const API = 'http://localhost:5177/api';
export const CLAVE = 'estook en desarrollo';

export type TemaDePrueba = 'claro' | 'oscuro';

/** Abre la aplicación con el aparato limpio y el tema elegido ya puesto. */
export async function abrirConTema(page: Page, tema: TemaDePrueba): Promise<void> {
  await abrirSinQueSeCaiga(page, APP);
  await page.evaluate((elTema) => {
    try {
      window.localStorage.clear();
      window.localStorage.setItem('estook.tema', elTema);
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  }, tema);
  await abrirSinQueSeCaiga(page, APP);
  await expect(page.locator('html')).toHaveAttribute('data-tema', tema);
}

export async function entrarEnLaApp(
  page: Page,
  correo: string,
  tema: TemaDePrueba = 'claro',
): Promise<void> {
  await abrirConTema(page, tema);
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
}

/**
 * **Que la app pida cada consulta suelta** (0085), para las pruebas que contestan una
 * consulta por su cuenta (`page.route` de `/consultas/lo_de_hoy`…): desde la 0085 lo que
 * se pide a la vez viaja junto, en `POST /consultas/varias`, y esas rutas no lo verían.
 * Es el mismo camino que con una API de antes del lote: contesta 404 y la app pregunta
 * suelto, así que lo que la prueba mira sigue siendo lo de siempre.
 */
export async function consultasSueltas(page: Page): Promise<void> {
  await page.route('**/v1/consultas/varias', (ruta) =>
    ruta.fulfill({ status: 404, body: '404 Not Found' }),
  );
}

export async function irA(page: Page, direccion: string): Promise<void> {
  await abrirSinQueSeCaiga(page, `${APP}#/${direccion}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
}

export async function tokenDe(peticion: APIRequestContext, correo: string): Promise<string> {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `v-${correo}-${Date.now()}-${Math.random()}` },
    data: { correo, contrasena: CLAVE },
  });
  const cuerpo = (await respuesta.json()) as { datos: { token: string } };
  return cuerpo.datos.token;
}

/** Un comando a pelo. Devuelve los datos, o falla la prueba diciendo qué contestó. */
export async function ejecutarEnLaApi<T>(
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
  const cuerpo = (await respuesta.json()) as { datos?: T; error?: unknown };
  expect(respuesta.status(), `${nombre}: ${JSON.stringify(cuerpo.error)}`).toBe(200);
  return cuerpo.datos as T;
}

/**
 * Cierra la caja de un día **aunque ya esté cerrado** (M16a, 0105).
 *
 * Desde M16a un día cerrado no se vuelve a cerrar: se reabre con un motivo. Las pruebas
 * que preparan sus cifras cerrando un día concreto lo hacen en cada navegador contra la
 * misma base, y la segunda vez se encontraba el día cerrado. Así lo reabre y lo cierra
 * con lo suyo, que es lo que hacía antes volver a cerrar.
 */
export async function cerrarLaCajaDe(
  peticion: APIRequestContext,
  token: string,
  entrada: { readonly fecha: string } & Record<string, unknown>,
): Promise<void> {
  const cabeceras = (nombre: string) => ({
    authorization: `Bearer ${token}`,
    'x-idempotencia': `${nombre}-${Date.now()}-${Math.random()}`,
  });
  const cerrar = () =>
    peticion.post(`${API}/v1/comandos/cerrar_la_caja`, {
      headers: cabeceras('cerrar_la_caja'),
      data: entrada,
    });
  let respuesta = await cerrar();
  if (respuesta.status() === 409) {
    await ejecutarEnLaApi(peticion, token, 'reabrir_la_jornada', {
      fecha: entrada.fecha,
      motivo: 'La prueba lo vuelve a cerrar con sus cifras',
    });
    respuesta = await cerrar();
  }
  expect(respuesta.status(), `cerrar_la_caja: ${await respuesta.text()}`).toBe(200);
}
