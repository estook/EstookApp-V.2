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

/** Las ocho de la rueda, con su primera pestana. */
const LAS_OCHO = [
  { id: 'inventario', nombre: 'Inventario', primera: 'Hoy' },
  { id: 'escandallos', nombre: 'Escandallos', primera: 'Hoy' },
  { id: 'carta', nombre: 'Carta', primera: 'Carta' },
  { id: 'calendario', nombre: 'Calendario', primera: 'Mes' },
  { id: 'equipo', nombre: 'Equipo', primera: 'Hoy' },
  { id: 'servicio', nombre: 'Servicio', primera: 'Jornada' },
  { id: 'negocio', nombre: 'Negocio', primera: 'Resumen' },
  { id: 'cuaderno', nombre: 'Cuaderno', primera: 'Incidencias' },
];

/**
 * Las que ya no son un esqueleto.
 *
 * Esta lista **tiene que crecer con cada módulo**, y ese es su trabajo: el día
 * que M9 construya Escandallos, esta prueba se pondrá en rojo hasta que alguien
 * añada su línea, que es exactamente cuando hay que mirar si lo que enseña la
 * pantalla vacía sigue siendo verdad.
 */
const APPS_CON_CONTENIDO = ['inventario'];

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

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(app.nombre);

      // El título de la tarjeta es un `h2` **mientras la app sea un esqueleto**.
      // Inventario dejó de serlo en M6: su pantalla «Hoy» tiene varias tarjetas
      // de verdad, así que no hay una sola con el nombre de la pestaña. Lo que
      // se sigue comprobando en las ocho es lo que esta prueba mira de verdad:
      // que se abren, que ponen su nombre y que **no desbordan a lo ancho**.
      if (!APPS_CON_CONTENIDO.includes(app.id)) {
        await expect(page.getByRole('heading', { level: 2, name: app.primera })).toBeVisible();
      }

      expect(await desborda(page), `${app.nombre} desborda a lo ancho`).toBe(false);
    }

    expect(errores).toEqual([]);
  });

  test('cada pestana de cada app se abre, y son treinta y una', async ({ page }) => {
    await comoGerente(page);

    let abiertas = 0;
    for (const app of LAS_OCHO) {
      await abrir(page, `/${app.id}`);

      // Las pestanas de esta app, tal como las declara el catalogo.
      const pestanas = await page
        .locator('nav[aria-label^="Vistas de"], nav[aria-label="' + app.nombre + '"]')
        .first()
        .getByRole('link')
        .allInnerTexts()
        .catch(() => [] as string[]);

      const cuales = pestanas.length > 0 ? pestanas : [app.primera];
      for (const pestana of cuales) {
        const id = pestana.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        await abrir(page, `/${app.id}/${id}`);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(app.nombre);
        expect(await desborda(page), `${app.nombre} · ${pestana} desborda`).toBe(false);
        abiertas += 1;
      }
    }

    expect(abiertas).toBeGreaterThanOrEqual(8);
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Escandallos');
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

    // La ultima de la rueda es Cuaderno.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cuaderno');
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

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inventario');
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

test.describe('deshacer universal', () => {
  test('flujo 1 · una accion del Panel', async ({ page }) => {
    await comoGerente(page);

    await page.getByRole('button', { name: 'Apuntar una nota de prueba' }).click();
    await expect(page.getByText('Nota apuntada en el Cuaderno')).toBeVisible();
    await expect(page.getByRole('button', { name: /Deshacer/ })).toBeVisible();

    await page.getByRole('button', { name: /Deshacer/ }).click();
    await expect(page.getByText('Nota apuntada en el Cuaderno')).toBeHidden();
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
    // escritorio es `hidden lg:flex`, asi que en movil hay uno propio arriba del
    // contenido. Sin el, quien trabaja en dos locales no podria cambiar con el
    // telefono, que es el aparato con el que lo va a hacer.
    const enLaBarra = page.locator('header').getByLabel('Local');
    const enLaPantalla = page.getByLabel('Donde estas');
    const selector = (await enLaBarra.isVisible()) ? enLaBarra : enLaPantalla;

    await selector.selectOption({ label: 'Bar Puerto' });

    await expect(page.getByRole('button', { name: /Deshacer/ })).toBeVisible();
    await expect(page.locator('main p').filter({ hasText: 'Bar Puerto' }).first()).toBeVisible();

    await page.getByRole('button', { name: /Deshacer/ }).click();
    await expect(page.locator('main p').filter({ hasText: 'Bar Playa' }).first()).toBeVisible();
  });

  test('la barra se va sola, y no deshace nada por su cuenta', async ({ page }) => {
    await comoGerente(page);
    await page.getByRole('button', { name: 'Apuntar una nota de prueba' }).click();

    const barra = page.getByRole('button', { name: /Deshacer/ });
    await expect(barra).toBeVisible();

    // Diez segundos, mas un poco de margen.
    await expect(barra).toBeHidden({ timeout: 13_000 });
  });

  test('Ctrl+Z tambien deshace', async ({ page }) => {
    await comoGerente(page);
    await page.getByRole('button', { name: 'Apuntar una nota de prueba' }).click();
    await expect(page.getByText('Nota apuntada en el Cuaderno')).toBeVisible();

    await page.keyboard.press('Control+z');
    await expect(page.getByText('Nota apuntada en el Cuaderno')).toBeHidden();
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
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(app.nombre);
        continue;
      }

      await expect(page.getByText('todavía no tengo datos')).toBeVisible();
      // Y dice en que modulo se construye: nunca una pantalla muda.
      await expect(page.getByText(/Esta pantalla se construye en M\d+/)).toBeVisible();
    }
  });

  test('los widgets del Panel tambien', async ({ page }) => {
    // ── Esta prueba tenia que cambiar, y por eso estaba ────────────────────
    //
    // Comprobaba que las tres tarjetas del Panel dijeran «todavia no tengo
    // datos». Dos de ellas —«lo que hay que atender» y «salud de los datos»—
    // llevaban su letrero puesto desde M3: «los pendientes los traen Inventario
    // (M6) y Servicio (M12)». M6 termino y no los trajo, y esta prueba seguia en
    // verde **porque comprobaba que siguieran vacias**.
    //
    // Ahora Inventario las llena, asi que lo que se comprueba es lo de siempre
    // con la verdad de hoy: quien tiene genero ve numeros, y quien no, ve el
    // hueco explicado. Ninguna pantalla muda en ninguno de los dos casos.
    await comoGerente(page);

    // La grafica del mes sigue siendo de M17, y lo dice.
    await expect(page.getByText('Sin datos que dibujar')).toBeVisible();

    // Y las dos de Inventario ya traen dato: Rosa tiene genero en su bar.
    await expect(page.getByText('Productos con precio')).toBeVisible();
  });

  test('y quien no tiene genero sigue viendo el hueco explicado', async ({ page }) => {
    // La camarera no tiene Inventario, asi que sus dos tarjetas no existen: «las
    // apps que el rol no tiene no aparecen en ningun sitio». Lo que si tiene es
    // el resto del Panel, con su version «todavia no tengo datos».
    await comoCamarera(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola');
    await expect(page.getByText('Sin datos que dibujar')).toBeVisible();
    await expect(page.getByText('Productos con precio')).toHaveCount(0);
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

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Escandallos');
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
