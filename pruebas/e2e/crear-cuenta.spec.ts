import { expect, test, type Page } from '@playwright/test';
import { entrarEnElAdmin } from './entrar-en-el-admin.ts';

/**
 * Crear cuenta y entrar con Google (decisión 0042), como lo hace una persona.
 *
 * La API de pruebas lleva **un correo en memoria** —no sale a internet, y el último
 * que se ha mandado a cada dirección se lee en `/api/pruebas/ultimo-correo`— y **un
 * Google de mentira**, que acepta códigos de la forma
 * `prueba|sujeto|correo|nombre`. Con eso se recorre el camino entero sin tocar a
 * nadie de fuera.
 *
 * Google no se visita: se hace lo que haría el navegador **a la vuelta**. Se deja
 * guardado lo que `irAGoogle` guarda antes de irse y se abre la app con el
 * `?code=…&state=…` que pondría Google.
 *
 * ── Lo que no se comprueba aquí, y dónde sí ─────────────────────────────────
 *
 * Si la cuenta nueva nace **en prueba** o **pendiente de pago** depende de la
 * oferta, que es una sola para todo Estook; y aquí corren varios navegadores a la
 * vez, uno de los cuales la enciende y la apaga. Así que las pruebas de crear
 * cuenta aceptan las dos salidas —el alta o elegir plan— y la regla exacta se
 * comprueba en `base-de-datos/pruebas/crear-cuenta.prueba.ts`, sin carreras.
 */
const WEB = 'http://localhost:5173/';
const APP = 'http://localhost:5174/';
const API_DE_PRUEBAS = 'http://localhost:5177/api/pruebas';
const UNA_VEZ = 'La oferta es una sola para todo Estook: se prueba desde un navegador.';

function unico(info: { project: { name: string } }): string {
  return `${info.project.name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function abrirLimpio(page: Page, direccion: string) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem('estook.sesion');
      window.sessionStorage.clear();
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  });
  await page.goto(direccion, { waitUntil: 'domcontentloaded' });
}

/** Dentro, recién creada: o el alta, o elegir plan. Nunca la puerta. */
async function haEntradoConSuCuentaNueva(page: Page) {
  await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  const titulo = page.getByRole('heading', { level: 1 });
  await expect(titulo).toHaveText(/Elige tu plan|¿Cómo te llamas\?|¿Qué tipo de local tienes\?/);
}

/** Lo que `irAGoogle` deja guardado antes de irse, con un `state` conocido. */
async function comoSiVolvieraDeGoogle(
  page: Page,
  guardado: Record<string, unknown>,
  codigo: string,
  estado = 'estado-de-prueba',
) {
  await abrirLimpio(page, APP);
  await page.evaluate(
    ([datos]) => {
      window.sessionStorage.setItem('estook.google', JSON.stringify(datos));
    },
    [
      {
        estado: 'estado-de-prueba',
        // RFC 7636: de 43 a 128 caracteres.
        verificador: 'v'.repeat(43),
        vuelta: APP,
        ...guardado,
      },
    ],
  );
  const parametros = new URLSearchParams({ code: codigo, state: estado });
  await page.goto(`${APP}?${parametros.toString()}`, { waitUntil: 'domcontentloaded' });
}

// ── La web pública ───────────────────────────────────────────────────────────

test.describe('la portada', () => {
  test('lleva a crear cuenta y a entrar, y enseña lo legal', async ({ page }) => {
    await page.goto(WEB, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tu cocina, bajo control.');

    // Los accesos: el del encabezado se esconde en móvil, el del centro no.
    const principal = page.getByRole('main');
    await expect(
      principal.getByRole('link', { name: /Crear cuenta|Empezar la prueba/ }),
    ).toHaveAttribute('href', 'app/#/crear-cuenta');
    await expect(principal.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      'app/',
    );

    await page.getByRole('link', { name: 'Privacidad' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Política de privacidad');
    await page.getByRole('link', { name: 'Condiciones' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Condiciones de uso');
  });

  test('las dos paginas dicen quien es el titular, con su NIF y su domicilio', async ({ page }) => {
    /*
      No es una formalidad: **el artículo 10 de la LSSI-CE lo exige**, y sin esto
      no se le puede cobrar a nadie. Hasta el 21 de septiembre los tres datos
      estaban vacíos a propósito —«un NIF de mentira en una página legal es peor
      que ninguno»— y la página los escondía sin romperse.

      Ahora están puestos, y esta prueba es lo que impide que un día vuelvan a
      desaparecer sin que nadie lo note: se verían las dos páginas enteras, bien
      maquetadas, y sin lo único que la ley pide.
    */
    for (const pagina of ['privacidad', 'condiciones']) {
      // Son carpetas de verdad, no una ruta de JavaScript: `estook.com/privacidad/`
      // existe aunque no arranque el guion (ver `apps/web/vite.config.ts`).
      await page.goto(`${WEB}${pagina}/`, { waitUntil: 'domcontentloaded' });
      const principal = page.getByRole('main');
      await expect(principal.getByText(/Titular:/)).toBeVisible();
      await expect(principal.getByText(/NIF:/)).toBeVisible();
      await expect(principal.getByText(/Domicilio:/)).toBeVisible();
    }
  });
});

// ── Entrar: las tres formas a la vista ───────────────────────────────────────

test('la puerta enseña Google, contraseña y PIN, y lleva a crear cuenta', async ({ page }) => {
  await abrirLimpio(page, APP);
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Con contraseña' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByRole('tab', { name: 'Con PIN' }).click();
  await expect(page.getByLabel('Tu PIN')).toBeVisible();

  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible();
  await expect(page).toHaveURL(/#\/crear-cuenta$/);

  // Y atrás vuelve a entrar, que es lo que espera quien se ha equivocado de botón.
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toBeVisible();
});

// ── Crear cuenta con correo ──────────────────────────────────────────────────

test('se crea la cuenta con el código que llega por correo', async ({ page, request }, info) => {
  const correo = `nueva-${unico(info)}@correo-de-prueba.com`;
  await abrirLimpio(page, `${APP}#/crear-cuenta`);

  // Sin negocio ni condiciones no se pide nada: se dice qué falta.
  await page.getByLabel('Tu nombre').fill('Marta');
  await page.getByRole('textbox', { name: /Tu correo/ }).fill(correo);
  await page.getByLabel('Una contraseña').fill('una frase que recuerdo');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByText('Escribe el nombre de tu negocio.')).toBeVisible();

  await page.getByLabel('El nombre de tu negocio').fill('La Taberna de Marta');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByText(/tienes que aceptar las condiciones/)).toBeVisible();

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mira tu correo' })).toBeVisible();

  const mandado = await request.get(
    `${API_DE_PRUEBAS}/ultimo-correo?para=${encodeURIComponent(correo)}`,
  );
  expect(mandado.ok()).toBe(true);
  const { asunto } = (await mandado.json()) as { asunto: string };
  const codigo = /\b(\d{6})\b/.exec(asunto)?.[1];
  expect(codigo, 'el asunto lleva el código').toBeDefined();

  // Uno mal primero: se dice sin enseñar nada más, y se puede volver a escribir.
  const malo = codigo === '000000' ? '111111' : '000000';
  await page.getByLabel('El código').fill(malo);
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByText('Ese código no es correcto.')).toBeVisible();

  await page.getByLabel('El código').fill(codigo ?? '');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await haEntradoConSuCuentaNueva(page);
});

// ── Google ───────────────────────────────────────────────────────────────────

test('con Google se crea la cuenta a la vuelta, y el código no se queda en la dirección', async ({
  page,
}, info) => {
  const id = unico(info);
  await comoSiVolvieraDeGoogle(
    page,
    { intencion: 'crear', negocio: 'Casa Google', aceptaCondiciones: true },
    `prueba|sujeto-${id}|google-${id}@correo-de-prueba.com|Lucía`,
  );
  await haEntradoConSuCuentaNueva(page);
  expect(page.url()).not.toContain('code=');
});

test('entrar con Google sin cuenta lleva a crearla', async ({ page }, info) => {
  const id = unico(info);
  await comoSiVolvieraDeGoogle(
    page,
    { intencion: 'entrar' },
    `prueba|sujeto-${id}|sin-cuenta-${id}@correo-de-prueba.com|Pedro`,
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible();
  await expect(page.getByRole('alert').first()).toBeVisible();
});

test('una vuelta de Google que no empezó aquí no entra', async ({ page }, info) => {
  const id = unico(info);
  await comoSiVolvieraDeGoogle(
    page,
    { intencion: 'entrar' },
    `prueba|sujeto-${id}|${id}@correo-de-prueba.com|Nadie`,
    'otro-estado',
  );
  await expect(page.getByText(/no coincide con la que empezaste aquí/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toBeVisible();
});

// ── La oferta, desde el admin ────────────────────────────────────────────────

test('la oferta se enciende desde el admin y la puerta la anuncia', async ({ page }, info) => {
  test.skip(info.project.name !== 'escritorio', UNA_VEZ);

  await entrarEnElAdmin(page);
  await page
    .getByRole('navigation', { name: 'Secciones del admin' })
    .getByRole('button', { name: 'Oferta' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Oferta de prueba' })).toBeVisible();

  const interruptor = page.getByRole('switch', { name: 'Oferta de prueba encendida' });
  const guardar = page.getByRole('button', { name: 'Guardar', exact: true });

  try {
    // Se pulsa el rótulo: la casilla de verdad está escondida a propósito.
    if (!(await interruptor.isChecked()))
      await page.getByText('Oferta de prueba encendida').click();
    await expect(interruptor).toBeChecked();
    await page.getByLabel('Días de prueba').fill('12');
    await guardar.click();
    await expect(page.getByText('Las cuentas nuevas entran con 12 días de prueba')).toBeVisible();

    const app = await page.context().newPage();
    await app.goto(`${APP}#/crear-cuenta`, { waitUntil: 'domcontentloaded' });
    await expect(app.getByText('12 días de prueba, sin tarjeta')).toBeVisible();
    await app.close();
  } finally {
    // Se deja apagada, que es como está Estook salvo campaña.
    await page.bringToFront();
    if (await interruptor.isChecked()) {
      await page.getByText('Oferta de prueba encendida').click();
      await guardar.click();
      await expect(page.getByText('Las cuentas nuevas pagan al empezar')).toBeVisible();
    }
  }
});
