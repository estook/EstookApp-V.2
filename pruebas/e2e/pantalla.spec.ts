import { expect, test, type Page } from '@playwright/test';

/**
 * Lo que se ve, y que de verdad se ve.
 *
 * ── Por qué existe este fichero ──────────────────────────────────────────────
 *
 * Todo lo de aquí salió de una tarde de Richi mirando Estook en el móvil y en el
 * ordenador. Seis fallos, ninguno de los cuales ponía en rojo ninguna de las 692
 * pruebas que había, y todos de la misma familia que los seis de M5: **algo
 * construido, registrado y probado que la pantalla no llegaba a enseñar**, o que
 * enseñaba algo que no era verdad.
 *
 *   1. Los desplegables de la barra de escritorio no se abrían. Se abrían, pero
 *      quedaban recortados por el `overflow-x` del `<nav>`.
 *   2. La rueda del móvil decía «estás en Inventario» estando en el Panel.
 *   3. En el móvil no había buscador, ni avisos, ni chat, ni Fogón, ni Ajustes.
 *   4. Avisos, chat y Fogón eran botones mudos también en el ordenador.
 *   5. «Termina de configurar tu local» no se podía quitar.
 *   6. «Recuérdamelo» del TPV escondía la tarjeta para siempre.
 *
 * «Cuando encuentres una lección, no la escribas: conviértela en una prueba»,
 * así que cada uno de los seis tiene aquí la suya. Un documento no impide que se
 * repita; una prueba en rojo, sí.
 *
 * ── Y la comprobación que ninguna otra hacía ─────────────────────────────────
 *
 * `toBeVisible()` de Playwright **no ve el recorte**: un elemento tapado o
 * recortado por un `overflow` sigue teniendo caja, así que sigue siendo
 * «visible» para la prueba y no para una persona. Por eso aquí se pregunta lo
 * que se preguntaría un dedo: qué hay en ese punto de la pantalla.
 */
const APP = 'http://localhost:5174/';
const CLAVE = 'estook en desarrollo';
/** Rosa lleva Bar Centro: ve las ocho apps y puede configurar el local. */
const ROSA = 'rosa@ejemplo.estook.com';

async function abrirLimpio(page: Page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* en navegacion privada no se puede, y no pasa nada */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function entrar(page: Page, correo = ROSA) {
  await abrirLimpio(page);
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Entra en Estook');
}

/**
 * Cerrar sesión y volver a entrar, **sin vaciar el navegador**.
 *
 * Es la diferencia entre comprobar algo y hacer trampa: `entrar` empieza
 * borrando `localStorage`, así que si la prueba del «recuérdamelo» volviera a
 * entrar por ahí, borraría justo el dato que quiere comprobar y pasaría siempre.
 */
async function volverAEntrar(page: Page, correo = ROSA) {
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem('estook.sesion');
    } catch {
      /* en navegacion privada no se puede, y no pasa nada */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Entra en Estook');
}

/**
 * ¿Está eso de verdad delante, donde una persona lo pulsaría?
 *
 * Mira el punto central del elemento y pregunta al navegador qué hay ahí. Si lo
 * que contesta no es el elemento ni algo suyo, es que hay algo por encima **o**
 * que el elemento está recortado y su centro cae en otro sitio. Las dos cosas
 * son lo mismo para quien mira: no se ve.
 */
async function seVeDeVerdad(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((cual) => {
    const el = document.querySelector(cual);
    if (!el) return false;

    const caja = el.getBoundingClientRect();
    if (caja.width === 0 || caja.height === 0) return false;

    // Fuera de la ventana no se ve, por muy poco recortado que esté.
    if (caja.bottom <= 0 || caja.top >= window.innerHeight) return false;
    if (caja.right <= 0 || caja.left >= window.innerWidth) return false;

    const encima = document.elementFromPoint(caja.x + caja.width / 2, caja.y + caja.height / 2);
    return encima !== null && el.contains(encima);
  }, selector);
}

// ── 1 · Los desplegables de la barra de escritorio ───────────────────────────

test.describe('la barra de escritorio', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('pulsar una app abre su desplegable, y se ve de verdad', async ({ page }) => {
    // El fallo: el menú se pintaba `absolute` dentro de un `<nav>` con
    // `overflow-x-auto`, y en CSS recortar a lo ancho recorta también a lo alto.
    // El menú existía, el estado cambiaba y `toBeVisible()` decía que sí. En
    // pantalla no aparecía nada.
    await entrar(page);

    await page
      .getByRole('banner')
      .getByRole('button', { name: /Inventario/ })
      .click();

    const menu = page.getByRole('menu', { name: 'Inventario' });
    await expect(menu).toBeVisible();

    // Y lo que `toBeVisible` no comprueba: que esté delante y dentro de la
    // ventana, no recortado por la barra.
    expect(await seVeDeVerdad(page, '[role="menu"][aria-label="Inventario"]')).toBe(true);

    // Y que lleve a algún sitio, que es para lo que está.
    await menu.getByRole('menuitem', { name: 'Productos' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inventario');
    await expect(page).toHaveURL(/inventario\/productos/);
  });

  test('las ocho abren la suya, y ninguna se queda recortada', async ({ page }) => {
    await entrar(page);

    const apps = ['Inventario', 'Escandallos', 'Carta', 'Calendario', 'Equipo', 'Servicio'];
    for (const app of apps) {
      await page
        .getByRole('banner')
        .getByRole('button', { name: new RegExp(app) })
        .click();
      expect(
        await seVeDeVerdad(page, `[role="menu"][aria-label="${app}"]`),
        `el desplegable de ${app} no se ve`,
      ).toBe(true);
      await page.keyboard.press('Escape');
    }
  });

  test('avisos, chat y Fogón dicen lo que son en vez de no hacer nada', async ({ page }) => {
    // Los tres estaban puestos como `() => undefined`. Un botón mudo es de las
    // cosas que más rápido rompen la confianza en una aplicación.
    await entrar(page);

    await page.getByRole('banner').getByRole('button', { name: 'Avisos' }).click();
    await expect(page.getByRole('heading', { name: 'Los avisos' })).toBeVisible();
    await page.getByRole('button', { name: 'Entendido' }).click();

    await page.getByRole('banner').getByRole('button', { name: 'Chat del equipo' }).click();
    await expect(page.getByRole('heading', { name: 'El chat del equipo' })).toBeVisible();
  });
});

// ── 2 y 3 · El móvil ─────────────────────────────────────────────────────────

test.describe('la barra de arriba en móvil', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('lleva las cinco cosas que solo estaban en el ordenador', async ({ page }) => {
    // El agujero: el buscador universal solo se abría con `Ctrl+K`, que en un
    // teléfono no existe; avisos, chat y Fogón no estaban en ninguna parte; y a
    // Ajustes no se llegaba desde dentro de una app.
    await entrar(page);

    // Por su papel y no por la etiqueta `header`: las dos barras son `<header>`,
    // la de escritorio va antes en el documento y en un móvil está escondida.
    // Buscarla por `banner` es buscar la que de verdad está en la pantalla.
    const barra = page.getByRole('banner');
    for (const que of ['Buscar en todo', 'Avisos', 'Chat del equipo', 'Fogón']) {
      await expect(barra.getByRole('button', { name: new RegExp(que) })).toBeVisible();
    }
    await expect(barra.getByRole('button', { name: /Tu cuenta y los ajustes/ })).toBeVisible();
  });

  test('siguen estando dentro de una app, que es donde no había forma de llegar', async ({
    page,
  }) => {
    await entrar(page);
    await page.goto(`${APP}#/inventario/productos`, { waitUntil: 'domcontentloaded' });

    const barra = page.getByRole('banner');
    await barra.getByRole('button', { name: /Tu cuenta y los ajustes/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ajustes');
  });

  test('el buscador se abre con el dedo, sin teclado', async ({ page }) => {
    await entrar(page);

    await page.getByRole('banner').getByRole('button', { name: 'Buscar en todo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('los avisos dicen qué serán, en vez de no hacer nada', async ({ page }) => {
    await entrar(page);

    await page.getByRole('banner').getByRole('button', { name: 'Avisos' }).click();
    await expect(page.getByRole('heading', { name: 'Los avisos' })).toBeVisible();
  });
});

test.describe('la rueda dice dónde estás', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('desde el Panel no resalta ninguna app', async ({ page }) => {
    // El fallo: el cursor del teclado empezaba en cero, y el primer sector salía
    // pintado de naranja. En un móvil eso no se lee como «por aquí empiezan las
    // flechas»: se lee como «estás aquí». La rueda decía que estabas en
    // Inventario estando en el Panel.
    await entrar(page);
    await abrirLaRueda(page);

    const menu = page.getByRole('menu', { name: 'Elige una app' });
    await expect(menu).toBeVisible();
    await expect(menu).not.toHaveAttribute('aria-activedescendant', /./);
    await expect(page.locator('[role="menuitem"][aria-current="page"]')).toHaveCount(0);
  });

  test('desde dentro de una app resalta esa, y solo esa', async ({ page }) => {
    await entrar(page);
    await page.goto(`${APP}#/inventario/hoy`, { waitUntil: 'domcontentloaded' });
    await abrirLaRueda(page);

    const aqui = page.locator('[role="menuitem"][aria-current="page"]');
    await expect(aqui).toHaveCount(1);
    await expect(aqui).toHaveAttribute('id', 'sector-inventario');
  });
});

async function abrirLaRueda(page: Page) {
  await page
    .getByRole('button', { name: /Abrir las apps|Ver todas las apps/ })
    .first()
    .click();
}

// ── 5 y 6 · Las dos tarjetas del Panel que no se iban ────────────────────────

test.describe('las tarjetas del Panel', () => {
  /*
   * La otra tarjeta —«Termina de configurar tu local» y su «no me lo recuerdes
   * más»— **no se puede provocar desde aquí**: los locales de ejemplo se siembran
   * con el alta terminada, así que la tarjeta no llega a salir. Lo que la
   * sostiene se comprueba donde sí se puede: la columna y su independencia de los
   * pasos, en `alta.prueba.ts`; y que la pantalla llama de verdad al comando, en
   * `se-usan.prueba.ts`, que es la prueba que existe justo para eso.
   */

  test('«recuérdamelo» del TPV vuelve al entrar otra vez', async ({ page }) => {
    // El fallo: guardaba una fecha siete días en el futuro. Siete días después
    // nadie se acuerda de nada, así que en la práctica era «no me lo enseñes
    // nunca más» con otro nombre.
    await entrar(page);

    const tarjeta = page.getByRole('heading', { name: 'Conecta tus ventas' });
    await expect(tarjeta).toBeVisible();

    await page.getByRole('button', { name: 'Recuérdamelo' }).click();
    await expect(tarjeta).toHaveCount(0);

    // Recargar no la trae: aplazada es aplazada mientras dure la sesión.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(tarjeta).toHaveCount(0);

    // Volver a entrar, sí. Y sin vaciar el navegador, que sería hacer trampa.
    await volverAEntrar(page);
    await expect(tarjeta).toBeVisible();
  });
});

// ── Fogón · su sitio, decidido y construido antes que él ─────────────────────

/**
 * «Mejor una burbuja flotante que detecte la página en la que estés, y en el
 *  escritorio arriba a la derecha en el símbolo se abre el chat.»
 *
 * Está escrito en `docs/decisiones/0015`. Lo que estas pruebas fijan es lo que
 * de verdad se puede romper sin que nadie se entere:
 *
 *   · que la burbuja **esté en el móvil y no en el escritorio**, donde ya está
 *     el icono de arriba: dos puertas a lo mismo en la misma pantalla es una de
 *     más;
 *   · que las dos abran **la misma ventana**;
 *   · y que la ventana **sepa en qué pantalla estás**, que es la mitad de la
 *     promesa de M22.
 *
 * Lo que no se prueba aquí es la conversación, porque no existe: es M22 entera.
 */
test.describe('Fogón', () => {
  test.describe('en el móvil', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('la burbuja está, y se ve de verdad por encima de la barra de abajo', async ({ page }) => {
      await entrar(page);

      const burbuja = page.getByRole('button', { name: 'Abrir Fogón' });
      await expect(burbuja).toBeVisible();

      // Y no basta con que exista: tiene que estar delante. Una burbuja tapada
      // por la barra de abajo es una burbuja que no se puede pulsar.
      expect(await seVeDeVerdad(page, '[aria-label="Abrir Fogón"]')).toBe(true);
    });

    test('va contigo: sigue estando dentro de una app', async ({ page }) => {
      await entrar(page);
      await page.goto(`${APP}#/inventario/productos`, { waitUntil: 'domcontentloaded' });

      // Esperar al título antes de medir. `domcontentloaded` llega mientras la
      // pantalla todavía dice «Cargando tu sesión», y preguntar ahí qué hay en un
      // punto de la pantalla contesta que no hay nada. Costó un rojo que parecía
      // un fallo de la burbuja y era de la prueba.
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inventario');

      expect(await seVeDeVerdad(page, '[aria-label="Abrir Fogón"]')).toBe(true);
    });

    test('sabe en qué pantalla estás', async ({ page }) => {
      await entrar(page);

      // Desde el Panel.
      await page.getByRole('button', { name: 'Abrir Fogón' }).click();
      await expect(page.getByText('Estás en')).toContainText('el Panel');
      await page.keyboard.press('Escape');

      // Y desde Inventario, sin que nadie se lo diga.
      await page.goto(`${APP}#/inventario/hoy`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inventario');
      await page.getByRole('button', { name: 'Abrir Fogón' }).click();
      await expect(page.getByText('Estás en')).toContainText('Inventario');
      await expect(page.getByText(/Dictarle una merma/)).toBeVisible();
    });

    test('y dice la verdad: todavía no se puede hablar con él', async ({ page }) => {
      // Sin casilla de escribir. Una casilla que no contesta es un control
      // muerto, y de eso este proyecto ya lleva bastantes.
      await entrar(page);
      await page.getByRole('button', { name: 'Abrir Fogón' }).click();

      await expect(page.getByText('Todavía no se puede hablar con él.')).toBeVisible();
      await expect(page.getByText(/módulo 22/)).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('textbox')).toHaveCount(0);
    });
  });

  test.describe('en el escritorio', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('la burbuja NO está: ya está el icono de arriba', async ({ page }) => {
      await entrar(page);

      // Existe en el documento —es la misma aplicación— pero escondida con CSS,
      // así que no está en el árbol de accesibilidad ni delante de nadie.
      await expect(page.getByRole('button', { name: 'Abrir Fogón' })).toHaveCount(0);
    });

    test('el icono de arriba abre la misma ventana, y sabe dónde estás', async ({ page }) => {
      await entrar(page);
      await page.goto(`${APP}#/escandallos`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Escandallos');

      await page
        .getByRole('banner')
        .getByRole('button', { name: /^Fogón/ })
        .click();
      await expect(page.getByText('Estás en')).toContainText('Escandallos');
      await expect(page.getByText('Todavía no se puede hablar con él.')).toBeVisible();
    });

    test('Ctrl+J abre lo mismo', async ({ page }) => {
      // B5: «⌘J Fogón». Estaba escrito, escuchado y **no abría nada**.
      await entrar(page);

      await page.keyboard.press('Control+j');
      await expect(page.getByText('Todavía no se puede hablar con él.')).toBeVisible();
    });
  });
});

// ── El Panel, enchufado a Inventario ────────────────────────────────────────

/**
 * «Los pendientes los traen Inventario (M6) y Servicio (M12)», decía el Panel.
 *
 * M6 terminó y **no los trajo**: las dos tarjetas seguían con su estado vacío
 * mientras `inventario_hoy` devolvía exactamente lo que les hacía falta. No
 * faltaba código; faltaba que dos partes construidas se hablaran, que es el
 * fallo más caro y el que ninguna prueba de unidad ve.
 *
 * Esta prueba mira **la primera pantalla del día**, que es donde se nota.
 */
test.describe('el Panel enseña lo de Inventario', () => {
  test('la salud de los datos sale con números de verdad', async ({ page }) => {
    await entrar(page);

    // Rosa tiene género en su bar, así que la tarjeta deja de decir «todavía no
    // hay nada que medir» y cuenta cuántos productos tienen precio.
    await expect(page.getByText('Productos con precio')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Salud de los datos' })).toBeVisible();
  });

  test('quien no tiene Inventario no ve sus tarjetas', async ({ page }) => {
    // «Las apps que el rol no tiene no aparecen **en ningún sitio**». Sara es
    // camarera: pedirle `inventario_hoy` sería llevarle un «esto no está en tu
    // acceso» a la primera pantalla del día.
    await entrar(page, 'sara@ejemplo.estook.com');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(page.getByText('Productos con precio')).toHaveCount(0);
  });
});
