import { expect, test, type Page } from '@playwright/test';

/**
 * El local en Google, desde la pantalla (M7, entrega 5 · decisión 0040).
 *
 * La API de pruebas lleva **un Google de mentira** —no hay clave, y no sale a
 * internet—, que contesta siempre «Bar Centro». Lo que se prueba es el camino de
 * una persona: buscar el local por su nombre, tocarlo, y ver su ficha guardada con
 * su valoración y lo gastado del tope.
 *
 * **Sin tocar la ubicación del fichaje**: se deja apagado «Medir los fichajes desde
 * su ubicación de Google». Las pruebas de fichar miden metros desde la de Bar
 * Centro, y cambiarla aquí las haría depender del orden.
 */
const APP = 'http://localhost:5174/';
const CLAVE = 'estook en desarrollo';
const ROSA = 'rosa@ejemplo.estook.com';

async function entrar(page: Page, correo: string) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  });
  // Se vuelve a abrir, no se recarga: el Safari de las pruebas (WebKit) se cae a veces
  // por dentro al recargar justo después de vaciar el almacenamiento. Pasó en la
  // integración continua el 22-sep, y la prueba pasó al repetirla (regla 24).
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test('se busca el local en Google, se elige y queda su ficha con lo gastado del tope', async ({
  page,
}) => {
  await entrar(page, ROSA);
  await page.goto(`${APP}#/ajustes/conexiones`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 2, name: 'Tu local en Google' })).toBeVisible();

  // O lo busca por primera vez, o ya estaba enlazado (el otro navegador corre a la
  // vez) y se vuelve a buscar: las dos llevan al mismo buscador.
  const buscarPrimero = page.getByRole('button', { name: 'Buscar mi local en Google' });
  const buscarOtraVez = page.getByRole('button', { name: 'No es este: buscarlo' });
  await expect(buscarPrimero.or(buscarOtraVez)).toBeVisible();
  await buscarPrimero.or(buscarOtraVez).click();

  await page.getByLabel('Nombre del local y ciudad').fill('Bar Centro');
  const encontrado = page.getByRole('option', { name: /Bar Centro/ });
  await expect(encontrado).toBeVisible();
  await encontrado.click();

  const suUbicacion = page.getByRole('checkbox', { name: /Medir los fichajes desde su ubicación/ });
  await suUbicacion.uncheck();
  await page.getByRole('button', { name: 'Es este' }).click();

  await expect(page.getByText(/La ubicación para fichar sigue siendo la que tenías/)).toBeVisible();
  await expect(page.getByText('★ 4,4 · 212 reseñas')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Verlo en Google Maps' })).toBeVisible();
  // Y lo gastado del tope, a la vista: es lo que se pidió cuidar.
  await expect(page.getByText(/Este mes: \d+ de 40 fichas/)).toBeVisible();

  // Traerla otra vez el mismo día no vuelve a pedirla: una vez cada 24 horas.
  await page.getByRole('button', { name: 'Traerlo otra vez de Google' }).click();
  await expect(page.getByText(/Ya se trajo en las últimas 24 horas/)).toBeVisible();
});
