import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';
import { abrirConTema, entrarEnLaApp, irA, type TemaDePrueba } from './en-la-app.ts';

/**
 * V · punto 5 · el tema oscuro, con capturas que se comparan.
 *
 * «Se hace un repaso pantalla a pantalla con capturas en los dos temas, que se
 * quedan como prueba: las pruebas de pantalla todavía no comparan capturas, y esta
 * entrega lo estrena» (mejoras antes de M8).
 *
 * ── Qué se fotografía ────────────────────────────────────────────────────────
 *
 *   · **El sistema de diseño entero**, las seis familias del catálogo del admin,
 *     en claro y en oscuro: cada botón, campo, tabla, aviso y los veinte dibujos
 *     de los vacíos. Es lo que más cubre con menos fotos, y no depende de datos.
 *   · **Pantallas de verdad de la app**, en el ordenador y en el móvil: entrar, y
 *     las de Vera, que lleva un local sin género y con la que **no entra ninguna
 *     otra prueba**: lo que sale en la foto no lo cambia nadie a la vez.
 *
 * ── Dónde viven, y por qué solo se comparan en Linux ────────────────────────
 *
 * En `capturas/linux/`, y las compara la integración continua. Una letra se pinta
 * distinta en Windows que en Linux —el suavizado no es el mismo—, así que una
 * captura hecha en un ordenador no coincide nunca con la de otro. En Windows no se
 * comparan salvo que se pida (`CON_CAPTURAS=1`), y entonces van a `capturas/win32/`,
 * que no se sube: sirven para mirarlas, no para compararlas.
 *
 * ── Cuando una pantalla cambia a propósito ──────────────────────────────────
 *
 * La integración continua sale en rojo y guarda la captura nueva en el artefacto
 * `capturas-nuevas`. `pnpm capturas:traer` la baja a su sitio: se mira, y si es lo
 * que se quería, se sube. Eso es lo que hace de esto una prueba y no un álbum.
 *
 * Solo en Chromium: Safari en Linux dibuja las fuentes a su manera y cambia de
 * versión con cada Playwright, y una prueba que falla por el motor no dice nada de
 * la aplicación.
 */
const VERA = 'vera@ejemplo.estook.com';
const TEMAS: readonly TemaDePrueba[] = ['claro', 'oscuro'];

/** Las pantallas de la app que se fotografían, con lo que tiene que haber antes. */
const PANTALLAS = [
  { nombre: 'almacen-vacio', direccion: 'almacen/resumen', espera: 'Tu cámara está vacía' },
  {
    nombre: 'productos-vacio',
    direccion: 'almacen/productos/todo',
    espera: 'Todavía no tienes género',
  },
  {
    nombre: 'pedidos-vacio',
    direccion: 'almacen/compras/pedidos',
    espera: 'No hay pedidos abiertos',
  },
  { nombre: 'ajustes-del-aparato', direccion: 'ajustes/aparato', espera: 'Tema' },
] as const;

const FAMILIAS = [
  { id: 'botones', nombre: 'Botones' },
  { id: 'campos', nombre: 'Campos' },
  { id: 'datos', nombre: 'Datos' },
  { id: 'avisos', nombre: 'Avisos y vacíos' },
  { id: 'capas', nombre: 'Capas' },
  { id: 'navegar', nombre: 'Navegar' },
] as const;

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Las capturas se comparan en Chromium: el Safari de Linux pinta las fuentes a su manera.',
);

/** Los nombres de las capturas de cada prueba, para guardar las que no coincidan. */
const fotografiadas: string[] = [];

test.beforeEach(() => {
  fotografiadas.length = 0;
});

/**
 * Si una captura no ha coincidido —o no existía—, Playwright deja la de ahora en
 * los resultados como `…-actual.png`. Se copia con el nombre que tendría en su sitio
 * a `capturas-nuevas/`, que la integración continua guarda como artefacto: es lo
 * que baja `pnpm capturas:traer`.
 */
// Playwright exige desestructurar el primer argumento aunque no se use nada de él.
// eslint-disable-next-line no-empty-pattern
test.afterEach(({}, info: TestInfo) => {
  for (const nombre of fotografiadas) {
    const actual = info.outputPath(nombre.replace(/\.png$/, '-actual.png'));
    if (!existsSync(actual)) continue;
    const destino = join(info.project.testDir, 'capturas-nuevas', process.platform);
    mkdirSync(destino, { recursive: true });
    copyFileSync(actual, join(destino, basename(info.snapshotPath(nombre))));
  }
});

/** La pantalla entera, de arriba abajo; o solo `donde`, si se dice. */
async function fotografiar(page: Page, nombre: string, donde?: Locator) {
  // Que haya llegado todo: la letra, los dibujos que se cargan aparte y lo que
  // estuviera pidiendo a la API.
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // Que **esté**, no que se vea: la tabla pinta su vacío dos veces —la de
  // ordenador y la de móvil— y una de las dos va escondida.
  const dibujos = page.locator('[data-dibujo]');
  for (let i = 0; i < (await dibujos.count()); i++) {
    await expect(dibujos.nth(i).locator('svg')).toBeAttached();
  }

  // **Suave** (25-sep): una captura distinta no para las siguientes. Con la
  // comparación dura, la prueba se paraba en la primera, y cada vuelta de GitHub
  // destapaba una más: tres vueltas de diez minutos para tres capturas que cambiaban
  // por el mismo motivo. Así sale la lista entera en una, y la prueba falla igual.
  fotografiadas.push(nombre);
  if (donde !== undefined) {
    await expect.soft(donde).toHaveScreenshot(nombre);
    return;
  }

  // La pantalla entera con la ventana **del alto de la página**, y no con «página
  // entera»: así, lo que va fijo abajo —la barra del móvil, la burbuja de Fogón—
  // sale abajo del todo, donde lo ve quien se desplaza, y no pintado encima de lo
  // que estuviera a la altura de la primera pantalla.
  const ancho = page.viewportSize()?.width ?? 1280;
  const alto = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: ancho, height: Math.min(alto, 4000) });
  await expect.soft(page).toHaveScreenshot(nombre);
}

for (const tema of TEMAS) {
  test(`captura · entrar, en ${tema}`, async ({ page }) => {
    await abrirConTema(page, tema);
    await expect(page.getByLabel('Tu correo')).toBeVisible();
    await fotografiar(page, `entrar-${tema}.png`);
  });

  // Una sola entrada para las cuatro pantallas de Vera: la API de pruebas atiende
  // de una en una, y cada entrada de más es espera para las demás pruebas.
  test(`captura · las pantallas de la app, en ${tema}`, async ({ page }) => {
    test.setTimeout(120_000);
    await entrarEnLaApp(page, VERA, tema);
    const tamano = page.viewportSize();

    for (const pantalla of PANTALLAS) {
      // Cada captura estira la ventana al alto de su página: se vuelve a la de
      // siempre antes de abrir la siguiente.
      if (tamano !== null) await page.setViewportSize(tamano);
      await irA(page, pantalla.direccion);
      await expect(page.getByText(pantalla.espera).first()).toBeVisible({ timeout: 15_000 });
      await fotografiar(page, `${pantalla.nombre}-${tema}.png`);
    }
  });

  test(`captura · el sistema de diseño, en ${tema}`, async ({ page }, info) => {
    // El catálogo se mira en el ordenador: es una herramienta de dentro, y en el
    // móvil ya se comprueba que no desborda (`catalogo.spec.ts`).
    test.skip(info.project.name !== 'escritorio', 'El catálogo se fotografía en el ordenador');
    test.setTimeout(90_000);

    await entrarEnElAdmin(page);
    await page.getByRole('button', { name: 'Sistema de diseño', exact: true }).click();
    await page.getByRole('heading', { level: 1, name: 'Sistema de diseño' }).waitFor();
    if (tema === 'oscuro') await page.getByRole('button', { name: 'Oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-tema', tema);

    for (const familia of FAMILIAS) {
      await page.getByRole('button', { name: familia.nombre, exact: true }).click();
      const piezas = page.locator(`[data-familia="${familia.id}"]`);
      await expect(piezas).toBeVisible();
      await fotografiar(page, `sistema-${familia.id}-${tema}.png`, piezas);
    }
  });
}
