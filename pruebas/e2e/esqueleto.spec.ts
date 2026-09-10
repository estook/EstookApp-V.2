import { expect, test, type Page } from '@playwright/test';

/**
 * M3 · aceptacion, punto por punto.
 *
 * «**Terminado cuando:** se navega por las ocho apps sin un salto raro en movil
 * pequeno real; la rueda funciona **con arrastre y con teclado**; deshacer
 * funciona en **tres flujos**; y todos los widgets tienen su version "todavia no
 * tengo datos".»
 *
 * Cada `test.describe` de aqui es uno de esos cuatro puntos. Si se quita
 * cualquiera, M3 deja de estar terminado.
 *
 * Corre en los dos proyectos de Playwright: escritorio y movil pequeno (375 px,
 * las medidas de un iPhone SE). Lo automatico caza los desbordes; **no sustituye
 * a mirarlo en un telefono de verdad**, que es lo que pide la regla 11.
 */
const APP = 'http://localhost:5174/';

/**
 * Las ocho de la rueda, con **el destino en el que entra cada una**.
 *
 * Ojo con la diferencia, que es la de M6½: el titulo de la pantalla ya no es el
 * nombre de la app, es **el destino**, porque es donde estas de verdad. El nombre
 * de la app va encima, pequeno. Y «donde entra» no es siempre el primero de la
 * lista: Equipo entra en Personas, porque su «Hoy» es M13 y entrar ahi seria
 * entrar en un cartel.
 */
const LAS_OCHO = [
  { id: 'inventario', nombre: 'Inventario', entra: 'Hoy' },
  { id: 'escandallos', nombre: 'Escandallos', entra: 'Hoy' },
  { id: 'carta', nombre: 'Carta', entra: 'Carta' },
  { id: 'calendario', nombre: 'Calendario', entra: 'Calendario' },
  { id: 'equipo', nombre: 'Equipo', entra: 'Hoy' },
  { id: 'servicio', nombre: 'Servicio', entra: 'Jornada' },
  { id: 'negocio', nombre: 'Negocio', entra: 'Ventas' },
  { id: 'cuaderno', nombre: 'Cuaderno', entra: 'Incidencias' },
];

/**
 * Las que ya no son un esqueleto.
 *
 * Esta lista **tiene que crecer con cada módulo**, y ese es su trabajo: el día
 * que M9 construya Escandallos, esta prueba se pondrá en rojo hasta que alguien
 * añada su línea, que es exactamente cuando hay que mirar si lo que enseña la
 * pantalla vacía sigue siendo verdad.
 */
const APPS_CON_CONTENIDO = ['inventario', 'equipo', 'servicio', 'negocio'];

/**
 * Abre una pantalla y **espera a que la aplicacion este viva**.
 *
 * `domcontentloaded` llega antes de que React monte, y con el los atajos de
 * teclado todavia no estan escuchando: pulsar Ctrl+K ahi no abre nada. Esperar a
 * que haya un titulo es esperar a que la aplicacion este pintada de verdad.
 */
async function abrir(page: Page, camino: string) {
  await page.goto(`${APP}#${camino}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
}

/**
 * Entra de verdad (M4).
 *
 * Hasta M3 esto era elegir un perfil en un desplegable de Ajustes. Ahora se
 * escribe un correo y una contrasena, y el servidor decide quien eres y que ves.
 *
 * La contrasena esta escrita en el repositorio a proposito: son las siete
 * personas de ejemplo, y la semilla que se la pone **se niega a correr en
 * produccion**. Esta razonado en `base-de-datos/semillas/acceso.ts`.
 */
const CLAVE = 'estook en desarrollo';

async function entrar(page: Page, correo: string) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });

  // Si venia una sesion de otra prueba, se tira: cada prueba entra limpia.
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

  // Al titulo, y no a que el boton desaparezca: React sustituye el nodo del boton
  // al pintarlo como «Entrando…», asi que esperar a que se desenganche no espera.
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** Entra como quien ve las ocho apps: la gerente del Bar Centro. */
async function comoGerente(page: Page) {
  await entrar(page, 'rosa@ejemplo.estook.com');
}

/** Entra como la camarera, que solo tiene cuatro apps de la rueda. */
async function comoCamarera(page: Page) {
  await entrar(page, 'sara@ejemplo.estook.com');
}

async function desborda(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
}

// ── 1 · Se navega por las ocho sin un salto raro ─────────────────────────────

test.describe('las ocho apps', () => {
  test('se abren todas, con su nombre y su primera pestana, sin desbordar', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (fallo) => errores.push(fallo.message));

    await comoGerente(page);

    for (const app of LAS_OCHO) {
      await abrir(page, `/${app.id}`);

      // El titulo es el destino, y el nombre de la app va encima. Se comprueban
      // los dos: sin el primero no se sabria donde estas, y sin el segundo la
      // pantalla de Movimientos y la de Productos parecerian la misma app.
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(app.entra);
      // El rotulo pequeno de encima del titulo, y no cualquier sitio donde ponga
      // el nombre: la barra de escritorio existe tambien en movil —escondida con
      // CSS— y las migas recortan su ultimo paso en pantalla estrecha, asi que
      // buscar el texto suelto encuentra uno escondido y la prueba se cae por
      // donde no es.
      await expect(
        page.locator('main header p').filter({ hasText: app.nombre }).first(),
      ).toBeVisible();

      // El título de la tarjeta es un `h2` **mientras la app sea un esqueleto**.
      // Inventario dejó de serlo en M6 y Equipo · Personas en M4.
      if (!APPS_CON_CONTENIDO.includes(app.id)) {
        await expect(page.getByRole('heading', { level: 2, name: app.entra })).toBeVisible();
      }

      expect(await desborda(page), `${app.nombre} desborda a lo ancho`).toBe(false);
    }

    expect(errores).toEqual([]);
  });

  test('cada destino construido se abre, y ninguno lleva a un hueco', async ({ page }) => {
    /*
      ── Lo que esta prueba caza, y antes no ────────────────────────────────────

      Antes recorria «las pestanas» de cada app, y las pestanas incluian las que
      no llevaban a ningun sitio: «Pedidos», que es M7 y ensenaba un cartel, y el
      «Mas» que era el cajon de Proveedores. Es decir: **la prueba pasaba en verde
      recorriendo dos posiciones vacias**, porque abrir un cartel es abrir algo.

      Ahora recorre lo que la aplicacion ofrece de verdad —los destinos que
      aparecen en su barra— y comprueba que cada uno tiene su titulo y su
      pregunta. Un destino sin construir no aparece en la barra, asi que si un dia
      alguien pusiera uno, esta prueba lo abriria y se caeria.
    */
    await comoGerente(page);

    let abiertos = 0;
    for (const app of LAS_OCHO) {
      await abrir(page, `/${app.id}`);

      // Los destinos de esta app, tal como los ofrece su propia navegacion: el
      // menu lateral en escritorio, la barra de abajo en movil. Con `:visible`,
      // porque las dos existen en el documento y una esta escondida con CSS.
      //
      // Y se lee el nombre **en minusculas**: la barra de movil escribe sus
      // posiciones con `text-transform: uppercase`, asi que lo que devuelve el
      // navegador es «HOY» y no «Hoy». Comparar eso con el titulo de la pantalla
      // daba un rojo que no era de la aplicacion.
      const suyos = await page
        .locator(
          `nav[aria-label="Dentro de ${app.nombre}"]:visible, nav[aria-label="${app.nombre}"]:visible`,
        )
        .first()
        .getByRole('button')
        // El boton de la rueda no es un destino, y se reconoce por lo que dice a
        // un lector de pantalla, no por su rotulo.
        .and(page.locator(':not([aria-label="Ver todas las apps"])'))
        .allInnerTexts()
        .catch(() => [] as string[]);

      const nombres = suyos
        .map((texto) => (texto.split('\n')[0] ?? '').trim().toLowerCase())
        .filter((nombre) => nombre !== '');

      const cuales = nombres.length > 0 ? nombres : [app.entra.toLowerCase()];
      for (const nombre of cuales) {
        const id = nombre
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-');
        await abrir(page, `/${app.id}/${id}`);
        // Sin distinguir mayusculas: el titulo va como se escribe y la barra lo
        // pinta en versales.
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          new RegExp(`^${nombre}$`, 'i'),
        );
        expect(await desborda(page), `${app.nombre} · ${nombre} desborda`).toBe(false);
        abiertos += 1;
      }
    }

    // Inventario tiene cuatro construidos y Equipo uno; las otras seis entran en
    // su primer destino aunque no este construido, que es lo que hay hasta que su
    // modulo llegue.
    expect(abiertos).toBeGreaterThanOrEqual(11);
  });

  test('un destino sin construir dice en que modulo llega, y no finge', async ({ page }) => {
    // Es la otra mitad de la regla: lo que no esta construido **no ocupa
    // posicion**, pero cuando se llega a el escribiendo la direccion tiene que
    // decir la verdad y con su modulo, no quedarse en blanco.
    await comoGerente(page);
    await abrir(page, '/carta/menus');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Menús');
    await expect(page.getByText('M10 · Carta, menús y análisis')).toBeVisible();
  });

  test('siempre hay forma de volver que no es el boton del navegador', async ({ page }) => {
    // «Maximo tres niveles [...] Siempre hay una forma de volver que no es el
    // boton del navegador» (B5).
    await comoGerente(page);
    await abrir(page, '/inventario/productos');

    await expect(page.getByRole('navigation', { name: 'Donde estas' })).toBeVisible();

    const volver = page.getByRole('button', { name: 'Volver a Panel' });
    const migaPanel = page.getByRole('button', { name: 'Panel', exact: true });
    await ((await volver.count()) > 0 ? volver : migaPanel).first().click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
  });

  test('una app que el rol no tiene no se abre ni escribiendo la direccion', async ({ page }) => {
    // «Esconder un boton no protege nada» (principio 7). Se entra como camarera,
    // que no tiene Inventario, y se pide Inventario a mano.
    await comoCamarera(page);

    await abrir(page, '/inventario');

    // Devuelve al Panel, sin decir si existe o no.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
  });
});

// ── 2 · La rueda, con arrastre y con teclado ─────────────────────────────────

/*
 * La rueda **es de movil**. En escritorio, B5 manda otra cosa: «barra superior y
 * menu lateral propio», con las ocho apps y sus desplegables. Por eso estas
 * pruebas fijan el ancho de un movil aunque corran en el proyecto de escritorio:
 * lo que se comprueba es la rueda, no el tamano de la ventana.
 */
test.describe('la rueda de apps', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('se abre y ensena un sector por app', async ({ page }) => {
    await comoGerente(page);

    await abrirLaRueda(page);
    await expect(page.getByRole('menu', { name: 'Elige una app' })).toBeVisible();
    await expect(page.getByRole('menuitem')).toHaveCount(8);
  });

  test('las apps que el rol no tiene no aparecen, y los sectores se reparten', async ({ page }) => {
    // El criterio de B5, comprobado de punta a punta.
    await comoCamarera(page);

    await abrirLaRueda(page);
    // Camarera: calendario, carta, servicio y cuaderno.
    await expect(page.getByRole('menuitem')).toHaveCount(4);
    await expect(page.getByRole('menuitem', { name: /Inventario/ })).toHaveCount(0);
  });

  test('funciona con teclado: flechas y Enter', async ({ page }) => {
    // B8: «toda la app manejable con teclado». Sin esto, la rueda seria la unica
    // parte de Estook por la que no se puede pasar sin raton.
    //
    // Esta prueba esperaba Escandallos, porque el cursor arrancaba en el primer
    // sector y una flecha lo movia al segundo. Eso era justo el fallo: arrancar
    // resaltando Inventario se lee como «estas aqui», y desde el Panel era
    // mentira. Ahora el cursor arranca **en ninguna**, asi que la primera flecha
    // a la derecha lleva al primer sector y la primera a la izquierda al ultimo.
    await comoGerente(page);
    await abrirLaRueda(page);

    const menu = page.getByRole('menu', { name: 'Elige una app' });
    await menu.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    // Primera flecha, el primer sector; segunda, el segundo: Escandallos.
    //
    // Se mira **la direccion y no el titulo**: desde M6½ el titulo de la pantalla
    // es el destino —«Hoy»— y no el nombre de la app, y lo que esta prueba
    // comprueba es a que app te lleva la rueda.
    await expect(page).toHaveURL(new RegExp('#/escandallos(/|$)'));
  });

  test('la primera flecha a la izquierda lleva a la ultima, no a la penultima', async ({
    page,
  }) => {
    // Desde «ninguna», hacia atras es la ultima. Sin este caso, el cursor en -1
    // caeria en la penultima al restar y nadie se enteraria.
    await comoGerente(page);
    await abrirLaRueda(page);

    const menu = page.getByRole('menu', { name: 'Elige una app' });
    await menu.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');

    // La ultima de la rueda es Cuaderno. Se mira la direccion: el titulo de la
    // pantalla es el destino —«Incidencias»— y no el nombre de la app.
    await expect(page).toHaveURL(new RegExp('#/cuaderno(/|$)'));
  });

  test('funciona con arrastre desde el centro', async ({ page }) => {
    await comoGerente(page);
    await abrirLaRueda(page);

    const lienzo = page.getByRole('menu', { name: 'Elige una app' });
    const caja = await lienzo.boundingBox();
    if (!caja) throw new Error('La rueda no se ha pintado');

    const cx = caja.x + caja.width / 2;
    const cy = caja.y + caja.height / 2;

    // Se pulsa el centro y se arrastra hacia arriba: el primer sector.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - caja.height * 0.35, { steps: 8 });

    /*
      Y **se espera a que la rueda diga que está señalando Inventario** antes de
      soltar.

      Sin esto, la prueba suelta en el mismo instante que manda el último
      movimiento, y en un navegador cargado —seis trabajadores a la vez en
      WebKit— el `pointerup` llega antes de que la aplicación haya procesado el
      `pointermove`: no hay sector señalado, así que soltar no elige nada y la
      rueda no lleva a ninguna parte. Pasaba una de cada tantas, que es la peor
      clase de rojo.

      `aria-activedescendant` es lo que la rueda usa para decir dónde está el
      dedo, así que esperar a eso es esperar exactamente a lo que hace falta.
    */
    await expect(lienzo).toHaveAttribute('aria-activedescendant', 'sector-inventario');
    await page.mouse.up();

    await expect(page).toHaveURL(new RegExp('#/inventario(/|$)'));
  });

  test('los ocho nombres caben dentro del circulo', async ({ page }) => {
    // Los nombres se escriben en horizontal, asi que en los sectores de las tres
    // y de las nueve crecen **hacia fuera**. «Escandallos» se salia del circulo,
    // y en una captura no se nota: se ve cuando alguien lo mira de cerca. Esto lo
    // mide.
    await comoGerente(page);
    await abrirLaRueda(page);

    const seSalen = await page.evaluate(() => {
      const svg = document.querySelector('svg[role=menu]');
      if (!svg) return ['no hay rueda'];

      const caja = svg.getBoundingClientRect();
      const cx = caja.x + caja.width / 2;
      const cy = caja.y + caja.height / 2;
      const radio = caja.width / 2;

      const seSale = (x: number, y: number) => Math.hypot(x - cx, y - cy) > radio;

      return Array.from(svg.querySelectorAll('text'))
        .filter((texto) => {
          const r = texto.getBoundingClientRect();
          // Las cuatro esquinas de la palabra: basta con que una se salga.
          return (
            seSale(r.left, r.top) ||
            seSale(r.right, r.top) ||
            seSale(r.left, r.bottom) ||
            seSale(r.right, r.bottom)
          );
        })
        .map((texto) => texto.textContent);
    });

    expect(seSalen, 'estos nombres se salen de la rueda').toEqual([]);
  });

  test('Esc la cierra', async ({ page }) => {
    await comoGerente(page);
    await abrirLaRueda(page);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'Elige una app' })).toBeHidden();
  });

  test('el centro lleva al Panel', async ({ page }) => {
    // «Que en el centro solo salga el logo del Panel, y al pulsarlo te lleve al
    // Panel.» Antes decía «arrastra o pulsa», que es una instrucción y no un
    // sitio, y para volver al Panel desde una app había que buscarlo.
    await comoGerente(page);
    await page.goto(`${APP}#/inventario/hoy`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await abrirLaRueda(page);
    await page.getByRole('button', { name: 'Ir al Panel' }).click();

    await expect(page.getByRole('menu', { name: 'Elige una app' })).toBeHidden();
    await expect(page).toHaveURL(new RegExp('#/$'));
  });

  test('no tiene botón de cerrar: se cierra pulsando fuera', async ({ page }) => {
    // «Quitar el botón de cerrar de abajo, que se cierre pulsando fuera.» El
    // botón quitaba sitio justo donde va el pulgar, y la rueda está ahora ahí.
    await comoGerente(page);
    await abrirLaRueda(page);

    const rueda = page.getByRole('menu', { name: 'Elige una app' });
    await expect(rueda).toBeVisible();
    await expect(
      page.locator('[aria-label="Las apps"]').getByRole('button', { name: 'Cerrar' }),
    ).toHaveCount(0);

    // Arriba, lejos del círculo, que ahora está abajo, a mano del pulgar.
    await page.mouse.click(20, 200);
    await expect(rueda).toBeHidden();
  });
});

async function abrirLaRueda(page: Page) {
  // El boton del centro de la barra de movil, o el de «Apps» si ya se esta
  // dentro de una app. Los dos abren lo mismo.
  await page
    .getByRole('button', { name: /Abrir las apps|Ver todas las apps/ })
    .first()
    .click();
}

// ── 3 · Deshacer, en tres flujos ─────────────────────────────────────────────

/**
 * Deja el Panel como de fabrica.
 *
 * ── Por que hace falta, y por que es una senal ─────────────────────────────────
 *
 * Desde M6½ el Panel **es estado del servidor**, por persona y por aparato. Eso es
 * lo correcto —«para siempre tiene que serlo tambien en el telefono»— y tiene una
 * consecuencia en las pruebas que conviene decir en voz alta: **una prueba que
 * quita un widget deja el Panel cambiado para la siguiente**. La de «la barra se
 * va sola» quita uno y deja que la barra caduque a proposito, asi que el widget se
 * queda fuera y guardado; la siguiente prueba se lo encontraba sin estar.
 *
 * Se arregla desde la propia aplicacion y no tocando la base a mano: es un camino
 * de persona —«volver al panel de siempre»— y comprobarlo de paso no sobra.
 */
async function panelDeFabrica(page: Page) {
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('button', { name: 'Volver al panel de siempre' }).click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
  // Y se espera a que este guardado de verdad: si no, la prueba de al lado se
  // encuentra el Panel a medio dejar.
  await expect(page.getByText('guardando…')).toHaveCount(0, { timeout: 10_000 });
}

/**
 * Espera a que el Panel no tenga nada pendiente de guardar.
 *
 * «guardando…» dura desde que se toca algo hasta que la cola se vacia, no hasta
 * que vuelve la primera peticion. Recargar antes de eso corta el guardado por la
 * mitad —le pasaria igual a una persona rapida— asi que la prueba espera a lo
 * mismo que espera la persona: a que deje de decir que esta guardando.
 */
async function yaEstaGuardado(page: Page) {
  await expect(page.getByText('guardando…')).toHaveCount(0, { timeout: 10_000 });
}

/**
 * Quita el primer widget del Panel, que es lo que abre la barra de deshacer.
 *
 * Antes esto lo hacia un boton de mentira —«apuntar una nota de prueba»— puesto
 * en el Panel desde M3 con un `deshacer` que no deshacia nada. Ahora es una
 * accion de verdad, y por eso vale para las tres pruebas de la barra.
 */
async function quitarUnWidget(page: Page) {
  await page.getByRole('button', { name: 'Editar' }).click();
  await page
    .getByRole('button', { name: /^Quitar .* del panel$/ })
    .first()
    .click();
}

test.describe('deshacer universal', () => {
  test('flujo 2 · el tamano de letra vuelve al de antes', async ({ page }) => {
    await comoGerente(page);
    await abrir(page, '/ajustes');

    const antes = await page.evaluate(() => document.documentElement.dataset['letra'] ?? 'normal');

    await page.getByRole('radio', { name: 'Grande' }).click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset['letra']))
      .toBe('grande');

    await page.getByRole('button', { name: /Deshacer/ }).click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset['letra'] ?? 'normal'))
      .toBe(antes);
  });

  test('flujo 3 · cambiar de local, y volver', async ({ page }) => {
    // El tercer flujo de M3 era cambiar de perfil de muestra, y M4 se llevo ese
    // andamio por delante. Su sitio lo ocupa el equivalente de verdad, que ademas
    // es mejor caso: **cambiar de local es justo lo que se hace sin querer**, y
    // «que nadie apunte una merma en el local equivocado» (Manifiesto 28) es la
    // razon por la que el selector existe.
    await entrar(page, 'nuria@ejemplo.estook.com');

    // Nuria llega a dos locales, asi que se le pregunta donde esta.
    await page.getByRole('button', { name: /Bar Playa/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');

    // El selector esta en dos sitios segun el ancho, y a proposito: la barra de
    // escritorio es `hidden lg:flex`, asi que en movil el suyo va en la barra de
    // arriba de movil. Sin el, quien trabaja en dos locales no podria cambiar con
    // el telefono, que es el aparato con el que lo va a hacer.
    const enEscritorio = page.locator('header').getByLabel('Local');
    const enMovil = page.locator('header').getByLabel('Dónde estás');
    const selector = (await enEscritorio.isVisible()) ? enEscritorio : enMovil;

    await selector.selectOption({ label: 'Bar Puerto' });

    await expect(page.getByRole('button', { name: /Deshacer/ })).toBeVisible();
    // El nombre del local se comprueba en la cabecera del Panel, y **no suelto**:
    // el selector es un `<select>`, y sus `<option>` llevan el mismo texto sin
    // estar visibles. Un `getByText` suelto encuentra la opcion, no el rotulo.
    await expect(page.locator('main p').filter({ hasText: 'Bar Puerto' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Deshacer/ }).click();
    await expect(page.locator('main p').filter({ hasText: 'Bar Playa' }).first()).toBeVisible();
  });
});

// ── 4 · Todo tiene su «todavía no tengo datos» ───────────────────────────────

test.describe('estados vacios', () => {
  test('las ocho apps dicen que ira ahi, en vez de quedarse en blanco', async ({ page }) => {
    await comoGerente(page);

    for (const app of LAS_OCHO) {
      await abrir(page, `/${app.id}`);

      if (APPS_CON_CONTENIDO.includes(app.id)) {
        // Esta prueba comprueba que **una app sin construir** dice qué irá ahí
        // en vez de quedarse muda. Inventario está construida desde M6, así que
        // ya no le toca: sus estados vacíos —la cámara vacía, nada que atender,
        // ningún proveedor— los comprueba `inventario.spec.ts`, que además sabe
        // qué datos hay delante.
        //
        // Lo que sí se sigue mirando aquí es que la pantalla no está en blanco.
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(app.entra);
        continue;
      }

      await expect(page.getByText('todavía no tengo datos')).toBeVisible();
      // Y dice en que modulo se construye: nunca una pantalla muda.
      await expect(page.getByText(/Esta pantalla se construye en M\d+/)).toBeVisible();
    }
  });

  test('la linea de lo que falta dice cual falta, y lleva ahi', async ({ page }) => {
    // «Si hay objetos sin poner que avise en panel pero con otro indicativo mas
    // pequeño y que indique cual es.» Y **no sale cuando no falta nada**: un aviso
    // que tambien aparece cuando no hay aviso se deja de leer.
    await comoGerente(page);

    const laLinea = page.getByRole('button', { name: /productos? sin precio/ });
    if ((await laLinea.count()) > 0) {
      await laLinea.first().click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Productos');
      await expect(page.getByRole('tab', { name: 'Sin precio' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    }
  });

  test('y quien no tiene genero no ve ningun widget de genero', async ({ page }) => {
    // La camarera no tiene Inventario, asi que sus widgets no existen: «las apps
    // que el rol no tiene no aparecen en ningun sitio». Lo que si tiene es el
    // resto del Panel, y ni una pantalla en blanco.
    await comoCamarera(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(page.getByRole('heading', { level: 2, name: 'Bajo mínimo' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Acciones rápidas' })).toBeVisible();
  });

  test('el buscador dice que hacer cuando no hay nada escrito', async ({ page }) => {
    await comoGerente(page);
    await page.keyboard.press('Control+k');

    await expect(page.getByRole('dialog', { name: 'Buscar en todo' })).toBeVisible();
    await expect(page.getByText('Escribe para buscar')).toBeVisible();
  });

  test('una direccion que no existe no deja una pantalla en blanco', async ({ page }) => {
    await comoGerente(page);
    await abrir(page, '/esto-no-existe/ni-esto');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
  });
});

// ── El buscador universal, que tambien es de M3 ──────────────────────────────

test.describe('el buscador universal', () => {
  test('se abre con Ctrl+K y encuentra acciones al instante', async ({ page }) => {
    await comoGerente(page);
    await page.keyboard.press('Control+k');

    await page.getByLabel('Que quieres buscar').fill('inven');
    await expect(page.getByText('Ir a Inventario')).toBeVisible();
  });

  test('aguanta erratas y no hace falta poner acentos', async ({ page }) => {
    await comoGerente(page);
    await page.keyboard.press('Control+k');

    await page.getByLabel('Que quieres buscar').fill('invetario');
    await expect(page.getByText('Ir a Inventario')).toBeVisible();

    await page.getByLabel('Que quieres buscar').fill('calenadrio');
    await expect(page.getByText('Ir a Calendario')).toBeVisible();
  });

  test('Enter abre lo que esta senalado', async ({ page }) => {
    await comoGerente(page);
    await page.keyboard.press('Control+k');

    await page.getByLabel('Que quieres buscar').fill('escandallos');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(new RegExp('#/escandallos(/|$)'));
  });

  test('solo ofrece acciones de las apps que el rol tiene', async ({ page }) => {
    await comoCamarera(page);

    await page.keyboard.press('Control+k');
    await page.getByLabel('Que quieres buscar').fill('inven');

    await expect(page.getByText('Ir a Inventario')).toHaveCount(0);
  });
});

// ── B8 · accesibilidad, lo que se puede comprobar solo ───────────────────────

test.describe('accesibilidad', () => {
  test('se llega a todo con el tabulador, y el foco se ve', async ({ page }) => {
    await comoGerente(page);

    await page.keyboard.press('Tab');
    const hayFoco = await page.evaluate(() => {
      const donde = document.activeElement;
      if (!donde || donde === document.body) return false;
      const estilo = getComputedStyle(donde);
      return estilo.outlineStyle !== 'none' || estilo.boxShadow !== 'none';
    });
    expect(hayFoco, 'B8: foco visible siempre').toBe(true);
  });

  test('los tres tamanos de letra cambian la pantalla entera', async ({ page }) => {
    await comoGerente(page);
    await abrir(page, '/ajustes');

    const medir = () =>
      page.evaluate(() => {
        const h = document.querySelector('h1');
        return h ? Number.parseFloat(getComputedStyle(h).fontSize) : 0;
      });

    await page.getByRole('radio', { name: 'Pequena' }).click();
    const pequena = await medir();

    await page.getByRole('radio', { name: 'Grande' }).click();
    const grande = await medir();

    // 0,9 y 1,15: la grande tiene que ser claramente mayor.
    expect(grande).toBeGreaterThan(pequena * 1.2);
  });

  test('con «reducir movimiento» la rueda es una rejilla', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await comoGerente(page);
    await abrirLaRueda(page);

    // Misma informacion, otra forma: botones en rejilla en vez de sectores.
    await expect(page.getByRole('menu', { name: 'Elige una app' })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Elige una app' })).toBeVisible();
  });
});

// ── El Panel de cada uno, que es uno solo ────────────────────────────────────

/**
 * Todo lo que monta, mueve o quita widgets, **en un solo bloque y de una en una**.
 *
 * ── Por qué, y por qué es la misma lección por tercera vez ───────────────────
 *
 * El Panel de cada uno se guarda por persona y por aparato (migración 0025), así
 * que **una prueba que quita un widget deja el Panel cambiado para la siguiente**.
 * En paralelo eso son dos pruebas escribiendo la misma fila a la vez, y el
 * resultado es un rojo que aparece un martes sin que nadie haya tocado nada.
 *
 * Es lo mismo que ya estaba escrito para el alta de Casa Lola —«comparten un local
 * y no se puede compartir a la vez»—, y aquí estaba a medias: las pruebas se
 * habían repartido entre tres bloques distintos, y entre bloques se corre en
 * paralelo igual. Ningún otro fichero toca el Panel de la gerente, por lo mismo.
 *
 * `default` y no `serial`: las dos corren de una en una, pero `serial` **salta las
 * siguientes** cuando una falla, y eso esconde información justo cuando más falta
 * hace.
 *
 * ── Y lo que fijan las tres últimas ──────────────────────────────────────────
 *
 * «Todo lo que personalices, si refrescas o te mueves de página y vas atrás, se
 * quita y vuelve a como estaba por defecto.» Lo vio Richi con la aplicación ya
 * desplegada, y eran **tres agujeros** en el mismo sitio:
 *
 *   1. El guardado esperaba 800 ms **también para los gestos sueltos** —quitar,
 *      añadir, cambiar el tamaño—, y ese retraso solo hace falta para el arrastre.
 *   2. Al guardar no se tocaba la caché, así que el segundo cambio salía con la
 *      versión vieja y se llevaba un «lo cambió otra persona» contra sí mismo.
 *   3. Y al desmontar la pantalla se cancelaba el reloj **y se tiraba lo
 *      pendiente**.
 *
 * Ninguna prueba lo vio porque la que había pulsaba «Listo» antes de recargar, y
 * «Listo» guarda al momento. Estas hacen lo que hace una persona: tocar algo y
 * **irse**.
 *
 * Con una raya que conviene tener clara: **irse de la pantalla no es recargar**.
 * Cambiar de pantalla no corta ninguna petición, así que ahí no se espera a nada
 * y el desmontaje tiene que apañárselas. Recargar sí la corta —a cualquier
 * aplicación—, así que ahí se espera a que «guardando…» se apague, que es
 * justamente para lo que está puesto.
 */
test.describe('el Panel de cada uno, que es uno solo', () => {
  test.describe.configure({ mode: 'default' });

  // **En un solo navegador de móvil.** El Panel es de la persona y del aparato, y
  // el móvil pequeño y Safari son dos proyectos con un mismo Panel —el de Rosa en
  // el móvil—. En la integración continua corren a la vez, y uno lo dejaba de
  // fábrica mientras el otro acababa de quitar un widget. Lo que se prueba aquí es
  // lo que guarda el servidor, que no cambia de un navegador a otro.
  test.skip(
    ({ browserName }) => browserName === 'webkit',
    'Safari y el móvil pequeño comparten el Panel del móvil, y a la vez se pisan.',
  );

  test('flujo 1 · quitar un widget del Panel, y devolverlo', async ({ page }) => {
    /*
      ── El flujo que esto sustituye ────────────────────────────────────────────

      Era un andamio de M3: un boton «Apuntar una nota de prueba» cuyo `deshacer`
      era `() => undefined`, puesto en el Panel para poder comprobar que la barra
      aparecia y contaba diez segundos sin esperar a que hubiera un comando de
      verdad que tocar. Y **se quedo publicado en el Panel de un negocio de
      verdad**.

      El de verdad es este: quitar un widget se hace sin querer —la ✕ esta a un
      centimetro del asa de arrastrar— y lo que se pierde es donde lo tenias
      puesto. Ademas se guarda en el servidor, asi que deshacer tiene que volver a
      guardar, que es un caso mas exigente que el de la nota falsa.
    */
    await comoGerente(page);
    await panelDeFabrica(page);

    await quitarUnWidget(page);

    await expect(page.getByRole('button', { name: /Deshacer/ })).toBeVisible();
    await page.getByRole('button', { name: /Deshacer/ }).click();

    // Y vuelve: la barra de deshacer del Panel no es un adorno.
    await expect(page.getByRole('button', { name: /^Quitar .* del panel$/ }).first()).toBeVisible();
  });

  test('la barra se va sola, y no deshace nada por su cuenta', async ({ page }) => {
    await comoGerente(page);
    await panelDeFabrica(page);
    await quitarUnWidget(page);

    const barra = page.getByRole('button', { name: /Deshacer/ });
    await expect(barra).toBeVisible();

    // Diez segundos, mas un poco de margen.
    await expect(barra).toBeHidden({ timeout: 13_000 });
  });

  test('Ctrl+Z tambien deshace', async ({ page }) => {
    await comoGerente(page);
    await panelDeFabrica(page);
    await quitarUnWidget(page);
    await expect(page.getByRole('button', { name: /Deshacer/ })).toBeVisible();

    await page.keyboard.press('Control+z');

    // La barra desaparece al deshacer, y el widget vuelve.
    await expect(page.getByRole('button', { name: /Deshacer/ })).toBeHidden();
    await expect(page.getByRole('button', { name: /^Quitar .* del panel$/ }).first()).toBeVisible();
  });

  test('el Panel de cada uno se puede montar, y lo montado se guarda', async ({ page }) => {
    /*
      ── Las dos pruebas que esto sustituye, y por que ──────────────────────────

      La primera comprobaba que las tarjetas del Panel dijeran «todavia no tengo
      datos», y estuvo en verde mientras M6 terminaba sin llenarlas: comprobaba
      que **siguieran vacias**. La segunda comprobaba «Productos con precio», que
      era el widget «Salud de los datos», y ese widget ya no existe: ocupaba una
      tarjeta entera para decir una cifra, y ahora es una linea en la zona de
      atencion que solo sale cuando falta algo.

      Lo que se comprueba ahora es lo que el Manifiesto promete y no existia: que
      el Panel **se monta**, y que lo montado se guarda en el servidor y sigue ahi
      al recargar. Eso ultimo es la mitad que importa: guardarlo en el navegador
      habria pasado esta prueba y habria fallado en el telefono.
    */
    await comoGerente(page);
    await panelDeFabrica(page);

    // Los widgets de fabrica, con su titulo y su origen debajo.
    await expect(page.getByRole('heading', { level: 2, name: 'Acciones rápidas' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Bajo mínimo' })).toBeVisible();

    // Se anade uno que no estaba. `panelDeFabrica` deja el Panel sin el, asi que
    // el catalogo lo ofrece siempre, corra esta prueba antes o despues que otras.
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByRole('button', { name: 'Añadir', exact: true }).first().click();
    await page.getByRole('button', { name: /Lo último apuntado/ }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Lo último apuntado' })).toBeVisible();

    // Y sigue ahi al recargar, porque se ha guardado en el servidor.
    await page.getByRole('button', { name: 'Listo' }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 2, name: 'Lo último apuntado' })).toBeVisible();
  });

  test('los widgets de género salen con datos de verdad, y con su origen debajo', async ({
    page,
  }) => {
    // Vive aquí y no en `pantalla.spec.ts` porque para comprobarlo hay que dejar
    // el Panel de fábrica, y eso es tocarlo: si lo hiciera otro fichero, lo haría
    // en mitad de estas.
    await comoGerente(page);
    await panelDeFabrica(page);

    await expect(page.getByRole('heading', { level: 2, name: 'Bajo mínimo' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Caduca esta semana' })).toBeVisible();

    // «Cada número lleva de dónde sale y de qué periodo es» (Evolución 1.0), sin
    // excepción.
    await expect(page.getByText('De tu inventario, ahora mismo')).toBeVisible();
  });

  test('sigue ahí al recargar, aunque no se pulse «Listo»', async ({ page }) => {
    await comoGerente(page);
    await panelDeFabrica(page);

    await page.getByRole('button', { name: 'Editar' }).click();
    await page
      .getByRole('button', { name: /^Quitar Caducidades del panel$/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 2, name: 'Caduca esta semana' })).toHaveCount(
      0,
    );

    // Sin pulsar «Listo»: se espera a que deje de poner «guardando…» y se recarga.
    //
    // Esperar no es hacerle la prueba fácil, es lo único honesto: recargar **en
    // mitad** de la petición la corta, y eso le pasaría a cualquier aplicación del
    // mundo. Lo que se comprueba es que **no hace falta pulsar nada** para que se
    // guarde —que era el fallo— y que el indicador dice la verdad.
    await yaEstaGuardado(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(page.getByRole('heading', { level: 2, name: 'Caduca esta semana' })).toHaveCount(
      0,
    );
  });

  test('y sigue ahí al irse a otra pantalla y volver', async ({ page }) => {
    // El caso que se perdía siempre: colocar algo y **salir en el acto**, que es
    // lo normal —se coloca y uno se va a mirar lo que ha colocado—.
    await comoGerente(page);
    await panelDeFabrica(page);

    await page.getByRole('button', { name: 'Editar' }).click();
    await page
      .getByRole('button', { name: /^Quitar Bajo mínimo del panel$/ })
      .first()
      .click();

    // Aquí **no se espera a nada**: se toca y se sale, que es el gesto que perdía
    // el cambio. Cambiar de pantalla no tira la petición —es la misma página—,
    // pero sí desmontaba el Panel, y al desmontar se tiraba lo pendiente.
    await abrir(page, '/inventario/hoy');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hoy');

    await abrir(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(page.getByRole('heading', { level: 2, name: 'Bajo mínimo' })).toHaveCount(0);
  });

  test('y el segundo cambio se guarda igual que el primero', async ({ page }) => {
    // La versión vieja en la caché hacía que **el primero se guardara y el segundo
    // no**, con un «lo cambió otra persona» contra uno mismo.
    await comoGerente(page);
    await panelDeFabrica(page);

    await page.getByRole('button', { name: 'Editar' }).click();
    await page
      .getByRole('button', { name: /^Quitar Caducidades del panel$/ })
      .first()
      .click();
    await page
      .getByRole('button', { name: /^Quitar Bajo mínimo del panel$/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Listo' }).click();

    // Dos gestos seguidos son **dos guardados en cola**: el segundo no sale hasta
    // que vuelve el primero con la versión nueva, que es lo que evita que se
    // estrellen entre ellos. Así que hay que dejar que la cola se vacíe —eso es
    // exactamente lo que dice «guardando…»— antes de recargar.
    await yaEstaGuardado(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');

    await expect(page.getByRole('heading', { level: 2, name: 'Caduca esta semana' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('heading', { level: 2, name: 'Bajo mínimo' })).toHaveCount(0);
    await expect(page.getByText('Lo cambiaste en otro aparato')).toHaveCount(0);
  });
});

// ── La rueda, sin el cuadrado naranja ────────────────────────────────────────

test.describe('la rueda se ve limpia al tocarla', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('con el dedo no pinta el anillo de foco', async ({ page }) => {
    /*
      La rueda se abre y la aplicación le da el foco al lienzo, porque es quien
      escucha las flechas. En iOS eso hace que `:focus-visible` se cumpla aunque se
      haya abierto con el dedo, así que salía **un rectángulo naranja de 2 px
      alrededor de una rueda redonda**. Lo vio Richi en su teléfono.
    */
    await comoGerente(page);
    await page
      .getByRole('button', { name: /Abrir las apps|Ver todas las apps/ })
      .first()
      .click();

    const anillo = await page.evaluate(() => {
      const svg = document.querySelector('svg[role="menu"]');
      if (!svg) return null;
      const estilo = window.getComputedStyle(svg);
      return { ancho: estilo.outlineWidth, estilo: estilo.outlineStyle, sombra: estilo.boxShadow };
    });

    expect(anillo, 'no se ha pintado la rueda').not.toBeNull();

    // El contorno, apagado.
    expect(
      anillo?.estilo === 'none' || anillo?.ancho === '0px',
      `el contorno sigue puesto: ${anillo?.estilo} ${anillo?.ancho}`,
    ).toBe(true);

    // Y el filo oscuro de B8, que va en `box-shadow`, **sin pintar nada**.
    //
    // No basta con comparar con 'none': lo que apaga una sombra en Tailwind es
    // `shadow-none`, y eso deja `rgba(0, 0, 0, 0) 0px 0px 0px 0px` en el estilo
    // calculado. Es transparente, así que no se ve — pero un `=== 'none'` lo daba
    // por encendido. Lo cazó **WebKit en integración continua**, que es el
    // navegador del iPhone donde apareció el cuadrado naranja.
    const sombra = anillo?.sombra ?? '';
    const sinPintar =
      sombra === 'none' ||
      sombra === '' ||
      // Todos los colores que lleve son transparentes: `rgba(…, 0)`.
      (sombra.match(/rgba?\([^)]*\)/g) ?? []).every((color) => /,\s*0\s*\)$/.test(color));
    expect(sinPintar, `la sombra sigue pintando: ${anillo?.sombra}`).toBe(true);
  });

  test('y con el teclado sí, que es lo que manda B8', async ({ page }) => {
    // «Foco visible siempre» no se negocia: lo que cambia es que el anillo aparece
    // al llegar con el teclado, que es lo que `:focus-visible` haría si el foco no
    // lo pusiera el código.
    await comoGerente(page);
    await page
      .getByRole('button', { name: /Abrir las apps|Ver todas las apps/ })
      .first()
      .click();

    await page.keyboard.press('ArrowRight');

    const anillo = await page.evaluate(() => {
      const svg = document.querySelector('svg[role="menu"]');
      if (!svg) return null;
      const estilo = window.getComputedStyle(svg);
      return { ancho: estilo.outlineWidth, radio: estilo.borderRadius };
    });

    expect(anillo?.ancho).toBe('2px');
    // Y redondo, siguiendo la forma de la rueda: un anillo cuadrado alrededor de
    // un círculo es lo que se veía en la captura.
    expect(anillo?.radio).not.toBe('0px');
  });
});
