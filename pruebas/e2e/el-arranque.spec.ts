import { expect, test, type Page } from '@playwright/test';
import { abrirSinQueSeCaiga } from './abrir.ts';
import { APP, entrarEnLaApp } from './en-la-app.ts';

/**
 * **El arranque, en el tema del aparato y sin parpadeo** (18-oct).
 *
 * En el iPhone de Richi, con el oscuro: el logo sobre claro, una pantalla casi vacía,
 * una franja clara abajo y luego el Panel. Ahora el tema se pone antes de pintar
 * (`tema-al-arrancar.js`) y, mientras se comprueba la sesión, sigue el mismo logo.
 * Aquí el código y «quién soy» se hacen esperar, para mirar cada momento.
 */
for (const tema of ['claro', 'oscuro'] as const) {
  test(`el arranque sale en ${tema}, con el mismo logo hasta el Panel`, async ({ page }) => {
    await entrarEnLaApp(page, 'rosa@ejemplo.estook.com', tema);
    const fondo = tema === 'oscuro' ? 'rgb(21, 24, 28)' : 'rgb(241, 239, 234)';
    const logo = tema === 'oscuro' ? 'img.en-oscuro' : 'img.en-claro';
    const elOtro = tema === 'oscuro' ? 'img.en-claro' : 'img.en-oscuro';

    await page.route('**/assets/index-*.js', async (ruta) => {
      await new Promise((r) => setTimeout(r, 1500));
      await ruta.continue();
    });
    await page.route('**/consultas/quien_soy', async (ruta) => {
      await new Promise((r) => setTimeout(r, 2000));
      await ruta.continue();
    });
    // La primera vez en este aparato: nada guardado de quién eres (la otra prueba, abajo).
    await olvidarLoGuardado(page);
    // Sin esperar a que acabe: lo que se mira es lo de mientras.
    const abriendo = abrirSinQueSeCaiga(page, APP);

    // 1 · Antes de que llegue el código: el fondo y el logo, ya en su tema.
    await expect(page.locator(`.arrancando ${logo}`)).toBeVisible();
    await expect(page.locator(`.arrancando ${elOtro}`)).toBeHidden();
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
    ).toBe(fondo);

    // 2 · Con el código y sin saber todavía quién eres: el mismo logo, no unas líneas.
    await expect(page.getByText('Cargando tu sesión')).toBeAttached({ timeout: 10_000 });
    await expect(page.locator(`.arrancando ${logo}`)).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(fondo);

    // 3 · Y el Panel.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await abriendo;
  });
}

/**
 * **La vuelta, sin esperar al logo** (la pausa del 5-nov; Richi: «el logo aparece mucho
 * rato»). Quien ya entró en este aparato abre con lo guardado de quién es, y el Panel sale
 * antes de que Irlanda conteste; luego se pregunta igual y la app se pone al día.
 */
test('al volver a abrirla, el Panel sale sin esperar a «quién soy»', async ({ page }) => {
  await entrarEnLaApp(page, 'rosa@ejemplo.estook.com');
  // Que quede guardado quién eres (se guarda dos segundos después de leerlo).
  await expect.poll(() => hayQuienSoyGuardado(page), { timeout: 10_000 }).toBe(true);

  let contestado = false;
  await page.route('**/consultas/quien_soy', async (ruta) => {
    await new Promise((r) => setTimeout(r, 4000));
    await ruta.continue();
    contestado = true;
  });
  const abriendo = abrirSinQueSeCaiga(page, APP);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 3500 });
  expect(contestado).toBe(false);
  await expect(page.getByText('Cargando tu sesión')).toHaveCount(0);
  await abriendo;
});

/**
 * Borra lo guardado en el aparato (la base `estook`). Con la app abierta el borrado espera
 * a que se cierre, que es al volver a abrirla: la nueva la crea vacía.
 */
async function olvidarLoGuardado(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((hecho) => {
        const borrar = indexedDB.deleteDatabase('estook');
        borrar.onsuccess = () => {
          hecho();
        };
        borrar.onblocked = () => {
          hecho();
        };
        borrar.onerror = () => {
          hecho();
        };
      }),
  );
}

/** Si ya está guardado quién eres. Sin abrir la base si no existe (se crearía vacía). */
async function hayQuienSoyGuardado(page: Page): Promise<boolean> {
  return page.evaluate(
    async () =>
      (await indexedDB.databases()).some((b) => b.name === 'estook') &&
      new Promise<boolean>((hecho) => {
        const abrir = indexedDB.open('estook');
        abrir.onsuccess = () => {
          const bd = abrir.result;
          if (!bd.objectStoreNames.contains('cache')) {
            bd.close();
            hecho(false);
            return;
          }
          const leer = bd.transaction('cache').objectStore('cache').getAll();
          leer.onsuccess = () => {
            bd.close();
            hecho(JSON.stringify(leer.result).includes('quien_soy'));
          };
        };
        abrir.onerror = () => {
          hecho(false);
        };
      }),
  );
}
