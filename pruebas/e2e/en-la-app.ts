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
