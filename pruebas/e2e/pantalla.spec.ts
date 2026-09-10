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
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Productos');
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

  test('la fila de la derecha son seis, y el avatar abre tu cuenta', async ({ page }) => {
    /*
      B5 pide aqui «notificaciones, chat, Fogon y avatar». Se probo a quitar el
      icono de Ajustes con el argumento de que abria la misma pantalla que el
      avatar, y **el argumento era medio bueno y la conclusion mala**: en un
      ordenador hay sitio de sobra, y quien lleva un local entra en Ajustes muchas
      veces al dia. Que este a un clic y no a dos no es duplicar.

      En movil no cabe, y alli si se queda solo el avatar: eso lo comprueba la
      prueba de la barra de movil.
    */
    await entrar(page);
    const barra = page.getByRole('banner');

    for (const que of ['Buscar en todo', 'Avisos', 'Chat del equipo', 'Fogón', 'Ajustes']) {
      await expect(barra.getByRole('button', { name: new RegExp(que) }).first()).toBeVisible();
    }

    await barra.getByRole('button', { name: /^Tu cuenta ·/ }).click();
    const hoja = page.getByRole('dialog', { name: 'Tu cuenta' });
    await expect(hoja).toBeVisible();
    await expect(hoja.getByRole('button', { name: /^Mi acceso/ })).toBeVisible();
    await expect(hoja.getByRole('button', { name: /^Salir/ })).toBeVisible();
  });
});

// ── 2 y 3 · El móvil ─────────────────────────────────────────────────────────

test.describe('la barra de arriba en móvil', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('lleva lo mismo que el ordenador menos Ajustes, y nada repetido', async ({ page }) => {
    /*
      ── El agujero, el que se abrio al taparlo, y el que se abrio al arreglarlo ─

      El agujero de M6: el buscador solo se abria con `Ctrl+K`, que en un telefono
      no existe; avisos, chat y Fogon no estaban en ninguna parte; y a Ajustes no
      se llegaba desde dentro de una app.

      El que se abrio al taparlo: se trajeron las cinco de escritorio **mas** el
      icono de Ajustes, asi que en 375 px habia seis botones y el nombre del local
      sin sitio para leerse, con Ajustes dos veces —aqui arriba y abajo—.

      Y el que se abrio al arreglar eso: se quitaron **tres de golpe** —Ajustes, el
      chat y Fogon— cuando el que sobraba era uno. «Solo queria eliminar ajustes de
      arriba en movil para que no se vea doble.» Arreglar lo que se ha visto, no lo
      que uno deduce de lo que ha visto.
    */
    await entrar(page);

    // Por su papel y no por la etiqueta `header`: las dos barras son `<header>`,
    // la de escritorio va antes en el documento y en un movil esta escondida.
    const barra = page.getByRole('banner');

    for (const que of ['Buscar en todo', 'Avisos', 'Chat del equipo', 'Fogón']) {
      await expect(barra.getByRole('button', { name: new RegExp(que) }).first()).toBeVisible();
    }
    await expect(barra.getByRole('button', { name: /^Tu cuenta ·/ })).toBeVisible();

    // Y lo unico que no esta: sale abajo, en la barra de movil.
    await expect(barra.getByRole('button', { name: 'Ajustes' })).toHaveCount(0);
  });

  test('y cabe: ninguno de los seis se sale ni se monta encima de otro', async ({ page }) => {
    /*
      Seis cosas en 375 px es justo lo que hizo que se quitaran tres, asi que
      conviene medirlo en vez de opinar. Se comprueba que la barra **no desborda a
      lo ancho** y que cada boton mantiene el toque minimo de 44 px que manda B4:
      es lo que cede es el nombre del local, que se recorta, y no los botones.
    */
    await entrar(page);

    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(desborda, 'la barra de arriba desborda a lo ancho').toBe(false);

    const barra = page.getByRole('banner');
    for (const que of ['Buscar en todo', 'Avisos', 'Chat del equipo', 'Fogón']) {
      const caja = await barra
        .getByRole('button', { name: new RegExp(que) })
        .first()
        .boundingBox();
      expect(caja, `no se ve ${que}`).not.toBeNull();
      expect(
        caja?.width ?? 0,
        `${que} se ha quedado por debajo del toque minimo`,
      ).toBeGreaterThanOrEqual(40);
      expect(
        caja?.height ?? 0,
        `${que} se ha quedado por debajo del toque minimo`,
      ).toBeGreaterThanOrEqual(40);
    }
  });

  test('el buscador se abre con el dedo, sin teclado', async ({ page }) => {
    await entrar(page);

    await page.getByRole('banner').getByRole('button', { name: 'Buscar en todo' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('los avisos y el chat dicen qué serán, en vez de no hacer nada', async ({ page }) => {
    await entrar(page);
    const barra = page.getByRole('banner');

    await barra.getByRole('button', { name: /^Avisos/ }).click();
    await expect(page.getByRole('heading', { name: 'Los avisos' })).toBeVisible();
    await page.getByRole('button', { name: 'Entendido' }).click();

    await barra.getByRole('button', { name: 'Chat del equipo' }).click();
    await expect(page.getByRole('heading', { name: 'El chat del equipo' })).toBeVisible();
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

  test('«recuérdamelo» de las ventas vuelve al entrar otra vez', async ({ page }) => {
    // El fallo: guardaba una fecha siete días en el futuro. Siete días después
    // nadie se acuerda de nada, así que en la práctica era «no me lo enseñes
    // nunca más» con otro nombre.
    //
    // Desde M6½ la tarjeta ya no pide «conecta tu TPV»: pregunta cómo entran las
    // ventas, a mano o con el TPV, y desaparece al contestarla.
    await entrar(page);

    const tarjeta = page.getByRole('heading', { name: '¿Cómo entran tus ventas?' });
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
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Productos');

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
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hoy');
      await page.getByRole('button', { name: 'Abrir Fogón' }).click();
      await expect(page.getByText('Fogón sabe que estás en')).toContainText('Inventario');
      await expect(page.getByText(/Dictarle una merma/)).toBeVisible();
    });

    test('dice dónde estás en una línea, sin cifras que nadie pidió', async ({ page }) => {
      /*
        Antes, debajo de «Estás en el Panel, en IKATZ. Fogón lo sabe sin que se lo
        digas», salía «PRODUCTOS DE ALTA · 2» **en todas las pantallas**, también
        donde no pintaba nada. Se explicaba a sí mismo en vez de ayudar. Ahora es
        una frase, como la diría una persona.
      */
      await entrar(page);
      await page.goto(`${APP}#/inventario/hoy`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hoy');

      await page.getByRole('button', { name: 'Abrir Fogón' }).click();
      const ventana = page.getByRole('dialog', { name: 'Fogón' });
      await expect(ventana.getByText('Fogón sabe que estás en')).toBeVisible();
      await expect(ventana.getByText('Productos de alta')).toHaveCount(0);
    });

    test('y sus botones hacen algo de verdad, no esperan a M22', async ({ page }) => {
      /*
        La mitad que faltaba. La ventana contaba lo que Fogón **hará** y no había
        nada que pulsar; ahora ofrece las acciones del catálogo de esta pantalla,
        que abren el alta, llevan a lo que está bajo mínimo o abren el libro. Y
        siguen sin haber botones de mentira: lo que Fogón hará cuando hable se
        cuenta, no se pinta como botón.
      */
      await entrar(page);
      await page.getByRole('button', { name: 'Abrir Fogón' }).click();

      const ventana = page.getByRole('dialog', { name: 'Fogón' });
      await expect(ventana.getByText('Lo que puedes hacer aquí ahora')).toBeVisible();

      await ventana.getByRole('button', { name: 'Ver qué hay que atender' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hoy');
    });

    test('y dice la verdad: todavía no se puede hablar con él', async ({ page }) => {
      // Sin casilla de escribir. Una casilla que no contesta es un control
      // muerto, y de eso este proyecto ya lleva bastantes.
      await entrar(page);
      await page.getByRole('button', { name: 'Abrir Fogón' }).click();

      await expect(page.getByText('Hablar con Fogón llega con el módulo 22.')).toBeVisible();
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
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hoy');

      await page
        .getByRole('banner')
        .getByRole('button', { name: /^Fogón/ })
        .click();
      await expect(page.getByText('Fogón sabe que estás en')).toContainText('Escandallos');
      await expect(page.getByText('Hablar con Fogón llega con el módulo 22.')).toBeVisible();
    });

    test('Ctrl+J abre lo mismo', async ({ page }) => {
      // B5: «⌘J Fogón». Estaba escrito, escuchado y **no abría nada**.
      await entrar(page);

      await page.keyboard.press('Control+j');
      await expect(page.getByText('Hablar con Fogón llega con el módulo 22.')).toBeVisible();
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
 * ── Y lo que cambia en M6½ ───────────────────────────────────────────────────
 *
 * Las dos tarjetas ya no son fijas. «Lo que hay que atender» son ahora dos
 * widgets —caducidades y bajo mínimo— que cada uno puede poner o quitar, y «salud
 * de los datos» **ha dejado de ser un widget**: ocupaba una tarjeta entera para
 * decir una cifra que casi siempre está en verde, y ahora es una línea en la zona
 * de atención que solo aparece cuando falta algo.
 *
 * Lo que esta prueba mira sigue siendo lo mismo, que es lo que importa: que **la
 * primera pantalla del día** enseña lo del género de verdad, y que a quien no
 * tiene la app no le enseña nada de eso.
 */
test.describe('el Panel enseña lo de Inventario', () => {
  // La prueba de los widgets de fábrica **se ha mudado a `esqueleto.spec.ts`**:
  // para comprobarlos hay que dejar el Panel de fábrica, y eso es tocarlo. El
  // Panel se guarda en el servidor por persona, así que dos ficheros que lo
  // toquen a la vez se pisan — y estos dos corren en paralelo.

  test('quien no tiene Inventario no ve ninguno de sus widgets', async ({ page }) => {
    // «Las apps que el rol no tiene no aparecen **en ningún sitio**». Sara es
    // camarera: pedirle `inventario_hoy` sería llevarle un «esto no está en tu
    // acceso» a la primera pantalla del día.
    await entrar(page, 'sara@ejemplo.estook.com');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(page.getByRole('heading', { level: 2, name: 'Bajo mínimo' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Valor de la cámara' })).toHaveCount(
      0,
    );
  });

  test('la zona de atención va arriba, y no se puede quitar', async ({ page }) => {
    // «Por encima de los widgets hay una zona fija de atención, que no se puede
    // quitar y que se ordena sola por prioridad» (Evolución 1.0, capítulo 5).
    await entrar(page);

    const zona = page.getByRole('region', { name: 'Lo que necesita tu atención' });
    await expect(zona).toBeVisible();

    // Y en modo de edición sigue ahí: lo que se monta es la rejilla de debajo.
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(zona).toBeVisible();
  });
});

// ── El aspecto · el tema y el color del local ────────────────────────────────

/**
 * La razón de contraste entre dos colores tal como los devuelve el navegador.
 *
 * Llegan como `rgb(31, 58, 95)`, así que se leen los tres números y se aplica la
 * fórmula de WCAG, la misma que `packages/ui/src/color.ts`. Aquí se repite —y es
 * una copia, que normalmente no se hace— porque lo que se está comprobando es
 * justamente **que el cálculo de allí llega hasta el píxel**: usar la función de
 * allí para comprobarla sería preguntarle al acusado.
 */
/** Los pesos de WCAG para rojo, verde y azul. */
const PESOS = [0.2126, 0.7152, 0.0722] as const;

function contrasteEntre(uno: string, otro: string): number {
  const luz = (css: string) =>
    (css.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0'])
      .slice(0, 3)
      .map(Number)
      .map((bruto) => {
        const x = bruto / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      })
      .reduce((suma, canal, i) => suma + (PESOS[i] ?? 0) * canal, 0);

  const [claro, oscuro] = [luz(uno), luz(otro)].sort((a, b) => b - a) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Deja el interruptor «usar mi color» como se quiera, esté como esté.
 *
 * No se pulsa a ciegas: **el color de marca es del local y se queda guardado**,
 * así que una prueba que suponga que empieza apagado se cae en cuanto otra —o
 * alguien mirando la aplicación— lo haya dejado encendido. Se mira y se decide.
 */
async function elInterruptor(page: Page, quiero: boolean) {
  const suyo = page.getByRole('switch', { name: /Usar mi color/ });
  await expect(suyo).toBeVisible();
  if ((await suyo.isChecked()) === quiero) return;

  // Se pulsa el rótulo: la casilla de verdad está escondida a propósito, que es
  // como se hace un interruptor accesible.
  await page.getByText('Usar mi color en toda la aplicación').click();
  await expect(suyo).toBeChecked({ checked: quiero });
}

/** Pone un color de marca desde Ajustes y espera a que la pantalla lo coja. */
async function ponerElColor(page: Page, color: string) {
  await page.evaluate((cual) => {
    const campo = document.querySelector<HTMLInputElement>('input[type="color"]');
    if (!campo) throw new Error('no está el campo de color en Ajustes');
    /*
      Se escribe el valor **por el descriptor nativo**, no con `campo.value`.

      React lleva su propia cuenta de lo que vale cada campo, y si se escribe
      encima a pelo se piensa que no ha cambiado nada y no dispara su `onChange`.
      Con el descriptor de `HTMLInputElement` esa cuenta se entera, que es lo
      mismo que pasa cuando lo cambia el selector de color del sistema —que es lo
      que hace una persona, y lo que Playwright no puede abrir—.
    */
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    // Se llama con `campo` de `this`, que es a lo que pertenece el descriptor.
    // La flecha lo deja escrito, en vez de dejar un método suelto por ahí.
    const escribir = (valor: string) => descriptor?.set?.call(campo, valor);
    escribir(cual);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  }, color);

  // Y se guarda a propósito, con su botón. El campo de color no guarda solo:
  // arrastrar un tono no es un gesto terminado, así que hay que decir «este».
  await page.getByRole('button', { name: 'Guardar este color' }).click();

  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--color-naranja').trim(),
        ),
      { message: `el acento no se ha aplicado con ${color}` },
    )
    .not.toBe('');
}

test.describe('cómo se ve · el tema y el color del local', () => {
  // De una en una: las tres tocan los ajustes del mismo local y del mismo
  // navegador, y en paralelo se pisarían. Es la lección de `esqueleto.spec.ts`.
  test.describe.configure({ mode: 'default' });

  test('el tema oscuro se elige en Ajustes y aguanta una recarga', async ({ page }) => {
    await entrar(page);
    await page.goto(`${APP}#/ajustes`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('radio', { name: /Oscuro/ }).click();

    // No se mira una clase: se mira **el color que se está pintando**.
    await expect
      .poll(async () =>
        page.evaluate(() =>
          window
            .getComputedStyle(document.documentElement)
            .getPropertyValue('--color-fondo')
            .trim(),
        ),
      )
      .toBe('#0f1517');

    // Es del aparato, como el tamaño de letra: tiene que sobrevivir a recargar.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
  });

  test('y el logotipo cambia con él, que si no se queda negro sobre negro', async ({ page }) => {
    /*
      El primer fallo que apareció al mirar el modo oscuro de verdad: el logotipo
      es tipografía charcoal sobre transparente, y en la barra de arriba se
      quedaba negro sobre negro. Se genera del mismo original una versión clara,
      tocando solo lo gris para que el naranja de la marca no se vuelva azul.

      Se mira en **la pantalla de entrar**, y no dentro de la aplicación, por dos
      razones: ahí el logotipo está siempre y en grande —dentro depende de si el
      local ha subido el suyo, y en el móvil la barra de arriba lleva el nombre
      del local en su sitio—, y además comprueba de paso que el tema se aplica
      **antes de entrar**, que es donde se ve la primera pantalla.
    */
    await abrirLimpio(page);

    const elLogo = page.getByRole('img', { name: /Estook · tu cocina/ }).first();
    await expect(elLogo).toHaveAttribute('src', /estook-logo.png/);

    // El tema vive en este aparato, así que se pone donde vive y se recarga.
    await page.evaluate(() => {
      window.localStorage.setItem('estook.tema', 'oscuro');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-tema', 'oscuro');
    await expect(elLogo).toHaveAttribute('src', /estook-logo-oscuro.png/);
  });

  test('con el color del local, el texto del botón principal se sigue leyendo', async ({
    page,
  }) => {
    /*
      La prueba que justifica todo `color.ts`, y la que caza el fallo de verdad.

      No mide un cuadrado inventado: mide **el botón principal que hay en el
      Panel**, con las clases que lleva puestas. Ese botón decía `text-charcoal`
      escrito a mano —porque el naranja de Estook es claro— y con un azul noche de
      marca el texto se quedaba negro sobre azul oscuro: 1,8:1.

      Se prueban cinco colores elegidos para hacer daño, incluido el gris del 50 %,
      que es el que no contrasta con nada.
    */
    await entrar(page);
    await page.goto(`${APP}#/ajustes`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await elInterruptor(page, true);

    // Se parte del naranja de fábrica, pulsando su pastilla. Las pastillas sí
    // guardan al tocarlas, y sin esto la primera vuelta se encontraría el color
    // que dejó la vuelta anterior —o alguien mirando la aplicación— y no habría
    // nada que guardar.
    await page.getByRole('radio', { name: 'Naranja Estook' }).click();

    for (const color of ['#1f3a5f', '#ffff00', '#000000', '#7f7f7f', '#ffd9ec']) {
      await ponerElColor(page, color);

      // Al Panel, que es donde vive el botón principal de verdad.
      await page.goto(`${APP}#/`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');

      const medido = await page.evaluate(() => {
        const acento = window
          .getComputedStyle(document.documentElement)
          .getPropertyValue('--color-naranja')
          .trim();
        const caja = document.createElement('span');
        caja.style.color = acento;
        document.body.append(caja);
        const acentoEnRgb = window.getComputedStyle(caja).color;
        caja.remove();

        const principal = Array.from(document.querySelectorAll('button')).find(
          (b) => window.getComputedStyle(b).backgroundColor === acentoEnRgb,
        );
        if (!principal) return null;
        const estilo = window.getComputedStyle(principal);
        return { fondo: estilo.backgroundColor, texto: estilo.color, que: principal.textContent };
      });

      expect(medido, `con ${color} no se ha encontrado el botón principal`).not.toBeNull();
      expect(
        contrasteEntre(medido?.fondo ?? '', medido?.texto ?? ''),
        `con ${color}, «${medido?.que ?? ''}»`,
      ).toBeGreaterThanOrEqual(4.5);

      await page.goto(`${APP}#/ajustes`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }

    // Y se deja como estaba: apagado y con el naranja de fábrica. Lo que se toca
    // aquí queda guardado en el local, así que hay que devolverlo.
    await ponerElColor(page, '#ff7a00');
    await elInterruptor(page, false);
    await expect
      .poll(async () =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--color-naranja').trim(),
        ),
      )
      .toBe('');
  });
});
