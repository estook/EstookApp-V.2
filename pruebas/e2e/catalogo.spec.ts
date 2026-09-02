import { expect, test, type Page } from '@playwright/test';

/**
 * M3 · el catálogo del sistema de diseño.
 *
 * Al cerrar M3, **once de los veinte componentes de B4 no se habían pintado ni
 * una sola vez**: estaban escritos y tipados, pero sus pantallas llegan de M6 en
 * adelante. Un componente que no se ha renderizado nunca no está terminado.
 *
 * Y M3 enseñó cinco veces que los fallos de esta capa **no los ve el
 * compilador**: Montserrat que no se aplicaba, una clase que Tailwind entendía al
 * revés, un campo de dinero que no sabía leer su propio separador de miles. Todos
 * se vieron pintando.
 *
 * Esta prueba pinta los veinte y exige que ninguno rompa, que ninguno desborde y
 * que la tabla se convierta en tarjetas por debajo de 768 px. Es la red que hace
 * que el catálogo sirva para algo más que para mirarlo.
 */
const ADMIN = 'http://localhost:5176/';

/** Las seis familias, con lo que tiene que salir en cada una. */
const FAMILIAS = [
  { nombre: 'Botones', piezas: ['Boton', 'Botones', 'Etiqueta'] },
  { nombre: 'Campos', piezas: ['Campo', 'CampoMoneda', 'Selector', 'Interruptor'] },
  { nombre: 'Datos', piezas: ['Cifra', 'Tabla', 'Lista', 'Grafica', 'Paginador'] },
  {
    nombre: 'Avisos y vacíos',
    piezas: ['Aviso', 'ErrorEnCristiano', 'EstadoVacio', 'TodaviaNo', 'Cargando'],
  },
  { nombre: 'Capas', piezas: ['Hoja', 'PanelLateral', 'Tarjeta', 'Deshacer'] },
  { nombre: 'Navegar', piezas: ['Migas', 'RuedaDeApps'] },
];

async function abrir(page: Page) {
  await page.goto(ADMIN, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1, name: 'Sistema de diseño' }).waitFor();
}

async function irA(page: Page, familia: string) {
  await page.getByRole('button', { name: familia, exact: true }).click();
  await page.getByRole('heading', { level: 2 }).first().waitFor();
}

async function desborda(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
}

test.describe('el catálogo', () => {
  test('pinta los veinte componentes, sin un solo error de consola', async ({ page }) => {
    const errores: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });
    page.on('pageerror', (f) => errores.push(f.message));

    await abrir(page);

    for (const familia of FAMILIAS) {
      await irA(page, familia.nombre);

      for (const pieza of familia.piezas) {
        await expect(
          page.getByRole('heading', { level: 2, name: pieza, exact: true }),
          `falta ${pieza} en «${familia.nombre}»`,
        ).toBeVisible();
      }

      expect(await desborda(page), `«${familia.nombre}» desborda a lo ancho`).toBe(false);
    }

    expect(errores, `La consola no puede tener errores: ${errores.join(' · ')}`).toEqual([]);
  });

  test('la tabla se convierte en tarjetas por debajo de 768 px', async ({ page }) => {
    // «Tabla (que se convierte en tarjetas por debajo de 768 px)» (B4). Una tabla
    // con desplazamiento lateral en un móvil es una tabla que nadie lee entera.
    await abrir(page);
    await irA(page, 'Datos');

    const comoSeVe = () =>
      page.evaluate(() => {
        const tabla = document.querySelector('main table');
        const tarjetas = Array.from(document.querySelectorAll('main ul')).find((u) =>
          u.className.includes('md:hidden'),
        );
        return {
          tabla: tabla ? getComputedStyle(tabla).display : 'no hay',
          tarjetas: tarjetas ? getComputedStyle(tarjetas).display : 'no hay',
        };
      });

    await page.setViewportSize({ width: 1200, height: 800 });
    expect(await comoSeVe()).toEqual({ tabla: 'table', tarjetas: 'none' });

    await page.setViewportSize({ width: 375, height: 812 });
    expect(await comoSeVe()).toEqual({ tabla: 'none', tarjetas: 'flex' });
  });

  test('la hoja y el panel atrapan el foco y se cierran con Esc', async ({ page }) => {
    // Es lo que `<dialog>` trae de serie, y la razón de haberlo usado en vez de
    // pintar una capa a mano. Si alguien lo cambia, esto lo caza.
    await abrir(page);
    await irA(page, 'Capas');

    for (const [boton, titulo] of [
      ['Abrir la hoja', 'Registrar una merma'],
      ['Abrir el panel', 'Rosa Iglesias'],
    ] as const) {
      await page.getByRole('button', { name: boton }).click();

      const dialogo = page.getByRole('dialog', { name: titulo });
      await expect(dialogo).toBeVisible();

      // El foco no se sale: tabulando diez veces sigue dentro.
      for (let i = 0; i < 10; i++) await page.keyboard.press('Tab');
      const dentro = await page.evaluate(() => document.activeElement?.closest('dialog') !== null);
      expect(dentro, `el foco se ha escapado de «${titulo}»`).toBe(true);

      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
    }
  });

  test('el campo de moneda trabaja en céntimos, no en coma flotante', async ({ page }) => {
    // Regla 9. Se teclea lo que rompió la primera versión: un importe con
    // separador de miles.
    await abrir(page);
    await irA(page, 'Campos');

    const campo = page.getByLabel('Precio de compra');
    await campo.fill('10.000,50');
    await expect(page.getByText('1000050 céntimos')).toBeVisible();

    await campo.fill('');
    await expect(page.getByText('null · no es lo mismo que cero')).toBeVisible();
  });

  test('los dieciocho errores del catálogo se pintan, y ninguno enseña su código', async ({
    page,
  }) => {
    // «Ningún mensaje enseña un código ni un error de base de datos» (Auditoría
    // de flujos). Se comprueba sobre los dieciocho a la vez.
    //
    // Doce eran el catálogo cerrado de M2. M4 añadió seis, y **esta prueba falló
    // al añadirlos**, que es justo para lo que está: que añadir un error sea una
    // decisión y no un descuido. Los seis de M4 son las puertas del login:
    // no_cuadra, demasiados_intentos, falta_doble_factor, clave_por_cambiar,
    // pin_ocupado y se_queda_sin_administrador.
    await abrir(page);
    await irA(page, 'Avisos y vacíos');

    const seccion = page.locator('section', {
      has: page.getByRole('heading', { name: 'ErrorEnCristiano' }),
    });
    const avisos = seccion.getByRole('alert');
    await expect(avisos).toHaveCount(18);

    const texto = (await seccion.innerText()).toLowerCase();
    for (const codigo of [
      'sin_sesion',
      'local_ajeno',
      'fallo_nuestro',
      'faltan_datos',
      'no_cuadra',
      'falta_doble_factor',
    ]) {
      expect(texto, `se ha colado el código ${codigo}`).not.toContain(codigo);
    }
  });

  test('deshacer funciona también aquí', async ({ page }) => {
    await abrir(page);
    await irA(page, 'Capas');

    await page.getByRole('button', { name: 'Hacer algo que se pueda deshacer' }).click();
    await expect(page.getByText('Merma registrada · 2 kg de tomate')).toBeVisible();

    await page.getByRole('button', { name: /Deshacer/ }).click();
    await expect(page.getByText('Merma registrada · 2 kg de tomate')).toBeHidden();
  });
});
