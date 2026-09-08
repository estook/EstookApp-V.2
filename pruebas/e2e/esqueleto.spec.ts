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
  { id: 'equipo', nombre: 'Equipo', entra: 'Personas' },
  { id: 'servicio', nombre: 'Servicio', entra: 'Jornada' },
  { id: 'negocio', nombre: 'Negocio', entra: 'Resumen' },
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
const APPS_CON_CONTENIDO = ['inventario', 'equipo'];

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
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Entra en Estook');
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
  // «Listo» guarda ya, sin esperar al reloj de los ochocientos milisegundos.
  await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
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
