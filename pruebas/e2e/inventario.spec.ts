import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * M6 · aceptación, punto por punto.
 *
 * «**Terminado cuando.** Se da de alta un producto en 30 segundos; al cambiar el
 *  precio, el coste por unidad de uso y el medio ponderado cambian bien en un
 *  producto con factor y rendimiento distintos de 1; el stock se reconstruye
 *  entero desde los movimientos; y la previsión de agotamiento acierta el día en
 *  un producto con consumo estable.»
 *
 * Los cuatro se comprueban aquí, y **tres de los cuatro desde la pantalla**, que
 * es la lección que dejó M5: de sus catorce fallos, seis los encontró mirar la
 * aplicación en un móvil y ninguno rompía una sola prueba de las 616.
 *
 * El tercero —reconstruir el libro— se comprueba en `inventario.prueba.ts`
 * contra Postgres, porque es aritmética y no pantalla, y allí se puede leer
 * línea a línea lo que quedó guardado.
 *
 * ── Y lo que esta prueba mira y ninguna otra puede ───────────────────────────
 *
 * Que **un cocinero no recibe ni un campo de coste**, llamando a la API a pelo
 * (regla 4). Esconder la columna en la pantalla no protege nada: lo que hay que
 * comprobar es que el dato no viaja.
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';

const CLAVE = 'estook en desarrollo';
/** Rosa lleva Bar Centro: ve todo lo suyo, precios incluidos. */
const ROSA = 'rosa@ejemplo.estook.com';
/** Marcos cocina en Bar Centro: Inventario entera y **ningún importe**. */
const MARCOS = 'marcos@ejemplo.estook.com';
/** Luis está en Bar Puerto, que es de otra organización. */
const LUIS = 'luis@ejemplo.estook.com';
/** Elena es dirección del Grupo Costa: puede crear locales. */
const ELENA = 'elena@ejemplo.estook.com';
/** Ignacio lleva Zona Norte: llega a tres locales y elige entre ellos. */
const IGNACIO = 'ignacio@ejemplo.estook.com';

/**
 * Va a una pantalla **sin recargar**, que es como se anda por la aplicación.
 *
 * Con `page.goto` no vale, aunque la dirección sea la misma con otra almohadilla:
 * recarga el documento y se lleva por delante la caché de TanStack Query, que es
 * justo lo que esta prueba tiene que mirar. Con el arreglo quitado la prueba
 * pasaba igual, y una prueba que pasa con el fallo puesto no prueba nada.
 */
async function irA(page: Page, camino: string) {
  await page.evaluate((donde) => {
    window.location.hash = donde;
  }, camino);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/**
 * Cambia de local por donde lo hace una persona.
 *
 * Dos caminos, y los dos valen: el selector de la barra cuando ya se está en un
 * local, y el botón «Entrar» de la vista de la cadena cuando se viene del
 * consolidado. Se prueba el que haya, porque cuál sale depende de dónde estés.
 */
async function irAlLocal(page: Page, nombre: string) {
  const enEscritorio = page.locator('header').getByLabel('Local');
  const enMovil = page.locator('header').getByLabel('Dónde estás');
  const selector = (await enEscritorio.isVisible()) ? enEscritorio : enMovil;

  if (await selector.isVisible()) {
    await selector.selectOption({ label: nombre });
  } else {
    await page
      .getByRole('listitem')
      .filter({ hasText: nombre })
      .getByRole('button', { name: 'Entrar' })
      .click();
  }

  // Se espera al nombre en la cabecera del Panel: hasta que no está, la sesión
  // todavía puede ser la de antes.
  await expect(page.locator('main p').filter({ hasText: nombre }).first()).toBeVisible();
}

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

async function entrar(page: Page, correo: string) {
  await abrirLimpio(page);
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/**
 * Va a un destino de Inventario, con su vista si la tiene.
 *
 * `irAInventario(page, 'productos')` cae en `/inventario/productos/todo`, que es
 * lo que hace la aplicacion al entrar: un destino con vistas siempre lleva una en
 * la direccion, para que el enlace se pueda copiar y para que volver atras
 * devuelva a la vista de antes.
 */
async function irAInventario(page: Page, destino: string, vista?: string) {
  const camino = vista === undefined ? destino : `${destino}/${vista}`;
  await page.goto(`${APP}#/inventario/${camino}`, { waitUntil: 'domcontentloaded' });
}

/**
 * Pulsa el que se ve, de todos los que coinciden.
 *
 * ── Por qué hace falta esto y no vale `.first()` ─────────────────────────────
 *
 * Porque `Tabla` **pinta las filas dos veces**: una tabla de verdad para
 * escritorio y una lista de tarjetas para móvil, y esconde una de las dos con
 * CSS (`hidden md:table` y `md:hidden`). Las dos están en el DOM, así que
 * `.first()` acierta en escritorio y en móvil pulsa la que está escondida, se
 * queda esperando a que sea visible y agota el tiempo.
 *
 * Costó una prueba en rojo que parecía un fallo de la pantalla y no lo era.
 */
async function pulsarLoQueSeVe(page: Page, texto: string) {
  const candidatos = page.getByText(texto, { exact: false });
  await candidatos.first().waitFor({ state: 'attached', timeout: 15_000 });

  const cuantos = await candidatos.count();
  for (let i = 0; i < cuantos; i++) {
    const candidato = candidatos.nth(i);
    if (await candidato.isVisible()) {
      await candidato.click();
      return;
    }
  }

  throw new Error(`Ninguno de los ${cuantos} «${texto}» que hay en la página se ve.`);
}

/**
 * El texto que se ve, de todos los que coinciden.
 *
 * La versión para comprobar de `pulsarLoQueSeVe`, y por la misma razón: hay
 * pantallas que pintan lo mismo dos veces —una tabla para escritorio y una lista
 * de tarjetas para móvil— y esconden una de las dos con CSS. `.first()` acierta
 * en escritorio y en móvil apunta a la escondida, así que la comprobación falla
 * enseñando el texto correcto y diciendo «hidden».
 */
function loQueSeVe(page: Page, texto: string) {
  return page.locator(`text=${texto} >> visible=true`).first();
}

async function tokenDe(peticion: APIRequestContext, correo: string): Promise<string> {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `inv-${correo}-${Date.now()}-${Math.random()}` },
    data: { correo, contrasena: CLAVE },
  });
  const cuerpo = (await respuesta.json()) as { datos: { token: string } };
  return cuerpo.datos.token;
}

/**
 * Lee una consulta y devuelve su cuerpo con la forma que le diga quien llama.
 *
 * El tipo es una **afirmacion**, no una comprobacion: nadie valida que el
 * servidor devuelva eso. Es lo mismo que hacen `acceso.spec.ts` y `alta.spec.ts`
 * con su `as { datos: ... }` en cada llamada, y aqui se hace una sola vez para
 * que las pruebas se lean. Si el servidor cambiara de forma, lo que salta es la
 * comprobacion de abajo, que es la que importa.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- la forma la afirma quien llama, igual que el `as` de los demas ficheros de e2e
async function consultar<T>(
  peticion: APIRequestContext,
  token: string,
  nombre: string,
  parametros: Record<string, string> = {},
): Promise<{ estado: number; datos?: T | undefined }> {
  const query = new URLSearchParams(parametros).toString();
  const respuesta = await peticion.get(
    `${API}/v1/consultas/${nombre}${query === '' ? '' : `?${query}`}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  const estado = respuesta.status();
  if (estado !== 200) return { estado };
  const cuerpo = (await respuesta.json()) as { datos: T };
  return { estado, datos: cuerpo.datos };
}

/** Uno de los locales visibles, por un trozo de su nombre. */
async function unLocalDe(
  peticion: APIRequestContext,
  token: string,
  parteDelNombre: string,
): Promise<string | null> {
  const yo = await consultar<{ locales: { id: string; nombre: string }[] }>(
    peticion,
    token,
    'quien_soy',
  );

  const suyo = (yo.datos?.locales ?? []).find((l) =>
    l.nombre.toLowerCase().includes(parteDelNombre.toLowerCase()),
  );

  return suyo?.id ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- lo mismo que en `consultar`
async function ejecutar<T>(
  peticion: APIRequestContext,
  token: string,
  nombre: string,
  entrada: unknown,
): Promise<{ estado: number; datos?: T | undefined }> {
  const respuesta = await peticion.post(`${API}/v1/comandos/${nombre}`, {
    headers: {
      authorization: `Bearer ${token}`,
      'x-idempotencia': `${nombre}-${Date.now()}-${Math.random()}`,
    },
    data: entrada,
  });
  const estado = respuesta.status();
  if (estado !== 200) return { estado };
  const cuerpo = (await respuesta.json()) as { datos: T };
  return { estado, datos: cuerpo.datos };
}

// ── 1 · Un producto en treinta segundos, desde la pantalla ───────────────────

test('se da de alta un producto en menos de treinta segundos', async ({ page }) => {
  await entrar(page, ROSA);
  await irAInventario(page, 'productos');

  await expect(page.getByRole('button', { name: 'Añadir producto' })).toBeVisible();

  // El cronómetro empieza donde empieza la persona: al pulsar «Añadir».
  const arranque = Date.now();

  await page.getByRole('button', { name: 'Añadir producto' }).click();

  // **Todo dentro de la hoja.** Sin acotarlo, el buscador de la pantalla de
  // detrás y las filas de la lista también coinciden con «Aceite de oliva», y la
  // prueba acaba pulsando una fila en vez de una propuesta del catálogo. Pasó.
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });

  // **La mitad cara la hizo M5**: se escribe «aceite» y el catálogo de
  // referencia devuelve la ficha rellena, con su formato, su factor, su
  // rendimiento y sus alérgenos. Ese catálogo estaba hecho y probado desde M5 y
  // **no lo llamaba ninguna pantalla**: esta es la primera.
  await hoja.getByLabel('¿Qué producto es?').fill('aceite de oliva');

  const propuesta = hoja.getByRole('button', { name: /Aceite de oliva virgen extra/ }).first();
  await expect(propuesta).toBeVisible();

  // Y la cuenta se enseña hecha, que es la razón de que el catálogo exista:
  // «Garrafa de 5 l = 5000 ml para usar». Es lo que hace que alguien note que se
  // ha equivocado antes de guardar.
  //
  // Sin punto de millar, y **está bien**: en español las cifras de cuatro dígitos
  // se escriben sin separador, y eso es lo que hace `toLocaleString('es-ES')`.
  // Esta prueba esperaba «5.000» y la que estaba mal era la prueba.
  await expect(propuesta).toContainText('5000 ml');

  await propuesta.click();

  // Un nombre propio, que es lo que hace de verdad quien da de alta su aceite. Y
  // de paso deja que los dos proyectos de Playwright —escritorio y móvil— corran
  // contra la misma base sin chocar con «ya tienes un producto que se llama así».
  await hoja.getByLabel(/^Producto/).fill(`Aceite de oliva ${Date.now()}`);
  // Viene por litros, en garrafas de 5: el precio es el de la garrafa (M7, repaso).
  await hoja.getByLabel('Precio de cada garrafa', { exact: true }).fill('42,50');
  await hoja.getByRole('button', { name: 'Guardar el producto' }).click();

  // La ficha se abre sola con el producto creado.
  await expect(page.getByText('Lo que hay en cámara').first()).toBeVisible({ timeout: 15_000 });

  const cuanto = (Date.now() - arranque) / 1000;
  expect(cuanto, `el alta ha tardado ${cuanto.toFixed(1)} s`).toBeLessThan(30);
});

// ── 2 · El precio, con factor y rendimiento distintos de 1 ───────────────────

test('al cambiar el precio, el coste por unidad de uso cambia bien', async ({ request }) => {
  // Se hace por la API y no por la pantalla porque lo que se comprueba es la
  // aritmética con tres decimales, y leerla de un texto sería comprobar el
  // formateo en vez del cálculo.
  const token = await tokenDe(request, ROSA);

  // Pulpo: caja de 5 kg = 5.000 g, con un 55 % de rendimiento.
  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre: `Pulpo de prueba ${Date.now()}`,
    formato: 'Caja de 5 kg',
    factor: 5000,
    unidad_de_uso: 'g',
    rendimiento: 0.55,
    precio_centimos: 6000,
  });

  expect(creado.estado).toBe(200);
  const productoId = creado.datos?.productoId ?? '';

  const antes = await consultar<{ producto: { costeMilesimas: number } }>(
    request,
    token,
    'un_producto',
    { producto_id: productoId },
  );
  // 6.000 céntimos entre 2.750 g útiles = 2,182 céntimos por gramo.
  expect(antes.datos?.producto.costeMilesimas).toBe(2182);

  // Sube un 20 %.
  const cambio = await ejecutar<{ costeMilesimas: number; frase: string }>(
    request,
    token,
    'poner_precio',
    { producto_id: productoId, precio_centimos: 7200 },
  );

  expect(cambio.estado).toBe(200);
  expect(cambio.datos?.costeMilesimas).toBe(2618);
  // Y lo cuenta en cristiano, que es lo que llega a la pantalla.
  expect(cambio.datos?.frase).toBe('Ha subido un 20 %.');

  // El precio viejo **no se ha borrado**: queda en el histórico con su vigencia.
  const despues = await consultar<{ precios: { vigente: boolean; precioCentimos: number }[] }>(
    request,
    token,
    'un_producto',
    { producto_id: productoId },
  );

  const precios = despues.datos?.precios ?? [];
  expect(precios.length).toBeGreaterThanOrEqual(2);
  expect(precios.filter((p) => p.vigente)).toHaveLength(1);
  expect(precios.some((p) => !p.vigente && p.precioCentimos === 6000)).toBe(true);
});

// ── 3 · El precio medio ponderado, al entrar género ─────────────────────────

test('el precio medio ponderado se mueve al entrar género, no al editar la lista', async ({
  request,
}) => {
  const token = await tokenDe(request, ROSA);

  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre: `Harina de prueba ${Date.now()}`,
    formato: 'Saco de 25 kg',
    factor: 25000,
    unidad_de_uso: 'g',
    rendimiento: 1,
    precio_centimos: 2500,
  });
  const productoId = creado.datos?.productoId ?? '';

  // Un saco al precio de la lista: 2.500 céntimos entre 25.000 g = 100 milésimas.
  const primera = await ejecutar<{ costeMilesimas: number; cantidad: number }>(
    request,
    token,
    'apuntar_entrada',
    { producto_id: productoId, cuanto: 1, como: 'formatos' },
  );
  expect(primera.datos?.cantidad).toBe(25000);
  expect(primera.datos?.costeMilesimas).toBe(100);

  // Otro saco, más caro. Mitad y mitad: la media de 100 y 200 es 150.
  const segunda = await ejecutar<{ costeMilesimas: number; cantidad: number }>(
    request,
    token,
    'apuntar_entrada',
    { producto_id: productoId, cuanto: 1, como: 'formatos', precio_centimos: 5000 },
  );
  expect(segunda.datos?.cantidad).toBe(50000);
  expect(segunda.datos?.costeMilesimas).toBe(150);

  // Y sacar género **no toca** el precio medio.
  const salida = await ejecutar<{ costeMilesimas: number; cantidad: number }>(
    request,
    token,
    'apuntar_salida',
    { producto_id: productoId, cuanto: 10000, como: 'unidades_de_uso' },
  );
  expect(salida.datos?.cantidad).toBe(40000);
  expect(salida.datos?.costeMilesimas).toBe(150);
});

// ── 4 · La previsión de agotamiento acierta el día ──────────────────────────

test('la previsión de agotamiento acierta el día con consumo estable', async ({ request }) => {
  // Los productos de ejemplo nacen con tres semanas de consumo diario estable, a
  // propósito: sin historia, la capa inteligente de M6 no tendría nada que
  // enseñar el primer día y quien entra no vería para qué sirve.
  //
  // ── Por qué esta prueba se monta un local nuevo ────────────────────────────
  //
  // Porque los ejemplos **no se meten si ya hay género** —«Estook no mete nada
  // en tu inventario»— y las demás pruebas de este fichero llenan Bar Centro. Y
  // porque reutilizar un local sembrado ata esta prueba al orden en que corren
  // las otras: `acceso.spec.ts` invita a Luis a un segundo local, así que hasta
  // saber en cuál está depende de quién haya pasado antes. Una prueba que
  // depende del orden de las demás falla un martes sin que nadie toque nada.
  //
  // Y de paso comprueba **la reacción de M6 de punta a punta**: al crear el
  // local, `local.creado` se publica, la reacción lo escucha en la misma
  // transacción y el local nace con sus categorías y sus ejemplos puestos. Es la
  // única prueba que recorre ese camino entero.
  const token = await tokenDe(request, ELENA);

  const local = await ejecutar<{ localId: string }>(request, token, 'crear_local', {
    nombre: `Bar de prueba ${Date.now()}`,
    duplicar_de: await unLocalDe(request, token, 'puerto'),
  });
  expect(local.estado, 'la dirección tiene que poder crear un local').toBe(200);

  await ejecutar(request, token, 'cambiar_de_contexto', { local_id: local.datos?.localId });

  // Las categorías vienen de serie: «nunca vacío» (Auditoría, parte 3). Esto es
  // la reacción funcionando.
  const conCategorias = await consultar<{ categorias: unknown[] }>(request, token, 'mis_productos');
  expect(
    (conCategorias.datos?.categorias ?? []).length,
    'el local nuevo tiene que nacer con sus categorías',
  ).toBeGreaterThan(0);

  const lista = await consultar<{
    productos: {
      nombre: string;
      esEjemplo: boolean;
      cantidad: number;
      consumo: { porDia: number | null; diasMirados: number };
      diasDeCobertura: number | null;
      seAgotaEn: string | null;
    }[];
  }>(request, token, 'mis_productos', { incluir_ejemplos: 'true' });

  const conHistoria = (lista.datos?.productos ?? []).filter(
    (p) => p.esEjemplo && p.consumo.porDia !== null,
  );

  expect(conHistoria.length, 'los ejemplos tienen que traer historia').toBeGreaterThan(0);

  for (const producto of conHistoria) {
    // La cifra de consumo **viene con cuántos días se han mirado**: «cada número
    // lleva debajo de dónde sale y de qué periodo es» (Evolución 1.0).
    expect(producto.consumo.diasMirados, producto.nombre).toBeGreaterThanOrEqual(7);

    const porDia = producto.consumo.porDia ?? 1;

    if (producto.cantidad <= 0) {
      // Sin género no quedan días, y **no un número negativo**: «−1,3 días» es
      // una cifra con forma de dato que no significa nada.
      expect(producto.diasDeCobertura, producto.nombre).toBe(0);
      continue;
    }

    // Y la previsión cuadra con la cuenta: lo que hay, entre lo que se gasta.
    const dias = producto.cantidad / porDia;
    expect(producto.diasDeCobertura, producto.nombre).toBeCloseTo(dias, 1);

    expect(producto.seAgotaEn, producto.nombre).not.toBeNull();
    const cuando = new Date(producto.seAgotaEn ?? '');
    const diasHasta = (cuando.getTime() - Date.now()) / 86_400_000;
    // El criterio del Plan es acertar **el día**: se admite medio día de holgura
    // por el rato que tarda la propia prueba en llegar hasta aquí.
    expect(Math.abs(diasHasta - dias), producto.nombre).toBeLessThan(0.5);
  }

  // Y ninguno de los ejemplos nace en números rojos: la primera versión dejaba
  // los huevos en −372 unidades, y eso enseñaba la capa inteligente por su peor
  // cara el primer día.
  const enNegativo = (lista.datos?.productos ?? []).filter((p) => p.esEjemplo && p.cantidad < 0);
  expect(
    enNegativo.map((p) => p.nombre),
    'los ejemplos no pueden nacer con la cámara en negativo',
  ).toEqual([]);
});

// ── 5 · Un rol sin costes no recibe ni un campo de coste ────────────────────

test('un cocinero ve el género de su local y ni un solo precio', async ({ request }) => {
  // «Toda regla de acceso se prueba **llamando a la API a pelo**» (regla 4).
  const deRosa = await tokenDe(request, ROSA);
  // Se crea el género aquí en vez de dar por hecho que lo hay: una prueba que
  // depende de lo que hayan dejado las demás pasa en verde el día que las demás
  // cambian, sin comprobar nada.
  await ejecutar(request, deRosa, 'crear_producto', {
    nombre: `Nata de prueba ${Date.now()}`,
    formato: 'Brik de 1 l',
    factor: 1000,
    unidad_de_uso: 'ml',
    rendimiento: 1,
    precio_centimos: 320,
  });

  const deMarcos = await tokenDe(request, MARCOS);

  const lista = await consultar<{
    productos: Record<string, unknown>[];
    puedeVerPrecios: boolean;
    valorTotalCentimos?: number;
  }>(request, deMarcos, 'mis_productos', { incluir_ejemplos: 'true' });

  expect(lista.estado).toBe(200);
  expect(lista.datos?.productos.length, 'el cocinero tiene que ver el género').toBeGreaterThan(0);
  expect(lista.datos?.puedeVerPrecios).toBe(false);

  // **Los campos no llegan vacíos: no llegan.** Un campo con `null` sigue
  // diciendo que existe, y a veces eso ya es información de más.
  for (const producto of lista.datos?.productos ?? []) {
    for (const campo of ['precioCentimos', 'costeMilesimas', 'costePorUnidad', 'valorCentimos']) {
      expect(producto, `«${campo}» ha viajado hasta el cocinero`).not.toHaveProperty(campo);
    }
  }

  expect(lista.datos).not.toHaveProperty('valorTotalCentimos');

  // Y en la ficha tampoco, ni en el histórico de precios.
  const primero = lista.datos?.productos[0] as { id: string } | undefined;
  const ficha = await consultar<{
    producto: Record<string, unknown>;
    precios: unknown[];
    movimientos: Record<string, unknown>[];
  }>(request, deMarcos, 'un_producto', { producto_id: primero?.id ?? '' });

  expect(ficha.estado).toBe(200);
  expect(ficha.datos?.producto).not.toHaveProperty('costePorUnidad');
  expect(ficha.datos?.precios, 'el histórico de precios no es suyo').toEqual([]);
  for (const movimiento of ficha.datos?.movimientos ?? []) {
    expect(movimiento).not.toHaveProperty('costeMilesimas');
  }
});

test('y no puede ponerle precio a nada', async ({ request }) => {
  const deRosa = await tokenDe(request, ROSA);
  const creado = await ejecutar<{ productoId: string }>(request, deRosa, 'crear_producto', {
    nombre: `Sal de prueba ${Date.now()}`,
  });

  const deMarcos = await tokenDe(request, MARCOS);
  const intento = await ejecutar(request, deMarcos, 'poner_precio', {
    producto_id: creado.datos?.productoId,
    precio_centimos: 500,
  });

  // 403, y no un 500 con un error de Postgres en la cara: el despachador mira el
  // permiso antes de ejecutar nada.
  expect(intento.estado).toBe(403);
});

// ── 6 · Un local jamás ve el género de otro ─────────────────────────────────

test('pedir el producto de otro local devuelve que no existe', async ({ request }) => {
  const deRosa = await tokenDe(request, ROSA);
  const creado = await ejecutar<{ productoId: string }>(request, deRosa, 'crear_producto', {
    nombre: `Azafrán de prueba ${Date.now()}`,
  });

  // Luis está en Bar Puerto, que es de otra organización. Se le dice en qué
  // local está antes de preguntar: `acceso.spec.ts` lo invita a un segundo
  // local, así que a dónde entra depende de qué prueba haya corrido antes.
  const deLuis = await tokenDe(request, LUIS);
  const suyo = await unLocalDe(request, deLuis, 'puerto');
  if (suyo !== null) await ejecutar(request, deLuis, 'cambiar_de_contexto', { local_id: suyo });

  const intento = await consultar(request, deLuis, 'un_producto', {
    producto_id: creado.datos?.productoId ?? '',
  });

  // La misma respuesta para «no existe» y para «no es tuyo»: decir «existe pero
  // no es tuyo» dejaría probar identificadores para averiguar qué tiene la
  // competencia.
  expect(intento.estado).toBe(404);
});

/**
 * Y la otra mitad de lo mismo, que no estaba: **la pantalla**.
 *
 * La de arriba comprueba que el servidor no da el género de otro local. Esta
 * comprueba que la pantalla no lo **enseña**, que no es lo mismo y que era
 * mentira: al cambiar de local se llamaba a `cambiar_de_contexto` y se volvía a
 * pedir `quien_soy`, y **nada más**. Todo lo demás —los productos, lo que hay en
 * cámara, el libro, lo que caduca— seguía en la caché de TanStack Query con la
 * clave de siempre, sin el local dentro. Y la caché aguanta un minuto sin
 * caducar, así que durante ese minuto salía el género de un local con el nombre
 * de otro arriba.
 *
 * El servidor nunca estuvo en peligro. Pero una merma se apunta mirando la
 * pantalla, y «que nadie apunte una merma en el local equivocado» (Manifiesto
 * 28) es la razón por la que el selector de local existe.
 *
 * Y hay un segundo consumidor que lo hace peor: **el contexto de Fogón** se arma
 * con `inventario_hoy`, o sea con esa caché. En M22 eso es lo que se le manda al
 * modelo.
 */
test('al cambiar de local, la pantalla no se queda con el género del anterior', async ({
  page,
  request,
}) => {
  // Un producto que solo existe en Bar Puerto. Se crea desde la API, con la
  // sesión puesta ahí: el servidor lo mete en el local de la sesión, y esta
  // sesión no es la del navegador, así que no le toca el sitio a la de abajo.
  const token = await tokenDe(request, IGNACIO);
  const puerto = await unLocalDe(request, token, 'Bar Puerto');
  expect(puerto, 'Ignacio tiene que llegar al Bar Puerto').not.toBeNull();
  await ejecutar(request, token, 'cambiar_de_contexto', { local_id: puerto });

  const nombre = `Bacalao del Puerto ${Date.now()}`;
  await ejecutar(request, token, 'crear_producto', { nombre });

  // Ignacio lleva Zona Norte: entra al consolidado y elige local desde ahí.
  await entrar(page, IGNACIO);
  await irAlLocal(page, 'Bar Puerto');

  await irA(page, '#/inventario/productos');
  // Se cuenta, no se mira si se ve: la lista se pinta en tabla o en tarjetas
  // segun el ancho, y la mitad que no toca esta en el arbol pero oculta. Lo que
  // importa aqui es **de que local es el genero**, no como se dibuja.
  await expect(page.getByText(nombre)).not.toHaveCount(0);

  // Y ahora al otro. Sin el arreglo, esta lista seguía siendo la de antes.
  await irAlLocal(page, 'Bar Playa');
  await irA(page, '#/inventario/productos');
  await expect(page.getByText(nombre)).toHaveCount(0);
});

// ── 7 · Ajustar lo que hay en cámara, desde la pantalla ─────────────────────

test('si el jefe de cocina dice que hay 4, hay 4', async ({ page, request }) => {
  const token = await tokenDe(request, ROSA);
  const nombre = `Cebolla de prueba ${Date.now()}`;
  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre,
    formato: 'Saco de 10 kg',
    factor: 10000,
    unidad_de_uso: 'g',
    rendimiento: 0.85,
    precio_centimos: 1150,
  });
  await ejecutar(request, token, 'apuntar_entrada', {
    producto_id: creado.datos?.productoId,
    cuanto: 1,
    como: 'formatos',
  });

  await entrar(page, ROSA);
  await irAInventario(page, 'productos');

  await page.getByLabel('Buscar en tu género').fill(nombre);
  await pulsarLoQueSeVe(page, nombre);

  await expect(page.getByText('Lo que hay en cámara').first()).toBeVisible();

  // Ya no es un tercer botón al lado de «ha llegado» y «ha salido»: se abre desde
  // la propia cifra, que es donde alguien nota que no cuadra.
  await expect(page.getByRole('button', { name: 'Ajustar lo que hay' })).toHaveCount(0);
  await page.getByRole('button', { name: '¿No cuadra lo que hay? Corrígelo' }).click();
  await page.getByLabel('Cuánto hay de verdad').fill('4000');
  await page.getByLabel('Por qué no cuadraba').fill('Se rompió un saco');
  await page.getByRole('button', { name: 'Corregir', exact: true }).click();

  // Lo que dice la persona es lo que hay, y queda apuntado con su motivo: nadie
  // se queda bloqueado por cuadrar.
  await expect(page.getByText('Se rompió un saco')).toBeVisible({ timeout: 15_000 });
});

// ── 8 · El stock negativo se permite y se marca ─────────────────────────────

test('el stock negativo se permite, y sale marcado', async ({ request }) => {
  // «Si el sistema dice que no queda género, deja de creerse el sistema»
  // (Manifiesto 28). El programa no manda sobre el servicio.
  const token = await tokenDe(request, ROSA);
  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre: `Perejil de prueba ${Date.now()}`,
    formato: 'Manojo',
    factor: 1,
    unidad_de_uso: 'ud',
    rendimiento: 1,
  });
  const productoId = creado.datos?.productoId ?? '';

  await ejecutar(request, token, 'apuntar_entrada', {
    producto_id: productoId,
    cuanto: 2,
    como: 'unidades_de_uso',
  });

  const salida = await ejecutar<{ cantidad: number }>(request, token, 'apuntar_salida', {
    producto_id: productoId,
    cuanto: 5,
    como: 'unidades_de_uso',
  });

  expect(salida.estado).toBe(200);
  expect(salida.datos?.cantidad).toBe(-3);

  const ficha = await consultar<{ producto: { estado: string } }>(request, token, 'un_producto', {
    producto_id: productoId,
  });
  expect(ficha.datos?.producto.estado).toBe('negativo');
});

// ── 9 · El buscador universal encuentra el género ───────────────────────────

test('el buscador de la cabecera encuentra un producto', async ({ request }) => {
  const token = await tokenDe(request, ROSA);
  const nombre = `Mantequilla de prueba ${Date.now()}`;
  await ejecutar(request, token, 'crear_producto', { nombre });

  const encontrado = await consultar<{ tipo: string; titulo: string }[]>(request, token, 'buscar', {
    texto: 'mantequilla de prueba',
  });

  expect(encontrado.estado).toBe(200);
  expect((encontrado.datos ?? []).some((r) => r.tipo === 'producto')).toBe(true);
});

// ── 10 · Guardar la ficha sin tocar nada no cambia nada ─────────────────────

test('corregir el nombre no le borra al producto lo demás', async ({ request }) => {
  // ══════════════════════════════════════════════════════════════════════════
  // Esta prueba existe porque el repaso de cierre encontró cuatro pérdidas de
  // datos silenciosas en el mismo formulario
  // ══════════════════════════════════════════════════════════════════════════
  //
  // `cambiar_producto` recibe **la ficha entera**, que es lo correcto y está
  // razonado. Pero la pantalla no la rellenaba entera: la categoría y el
  // proveedor empezaban vacíos, la categoría fiscal iba fija a «alimento» y las
  // notas a nulo.
  //
  // Resultado: corregir una errata en el nombre le quitaba al producto **su
  // categoría, su proveedor y sus notas, y le cambiaba el impuesto**. Sin decir
  // nada, y sin romper ninguna prueba: el comando hacía justo lo que se le
  // pedía. El fallo estaba en lo que se le pedía.
  //
  // Se comprueba por la API a pelo y no por la pantalla a propósito: lo que hay
  // que fijar es **el contrato**, que es lo que se rompió. Que el formulario lo
  // mande bien se ve mirándolo, y con la ficha ya rellena delante.
  const token = await tokenDe(request, ROSA);

  const proveedor = await ejecutar<{ proveedorId: string }>(request, token, 'crear_proveedor', {
    nombre: `Bodega de prueba ${Date.now()}`,
  });
  const categoria = await ejecutar<{ categoriaId: string }>(request, token, 'crear_categoria', {
    nombre: `Vinos de prueba ${Date.now()}`,
  });

  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre: `Vino de prueba ${Date.now()}`,
    formato: 'Caja de 6 botellas',
    factor: 6,
    unidad_de_uso: 'ud',
    rendimiento: 1,
    categoria_fiscal: 'bebida_alcoholica',
    categoria_id: categoria.datos?.categoriaId,
    proveedor_id: proveedor.datos?.proveedorId,
    notas: 'Lo trae los martes',
    precio_centimos: 4200,
  });

  const productoId = creado.datos?.productoId ?? '';

  const antes = await consultar<{
    producto: {
      nombre: string;
      categoriaId: string | null;
      proveedorId: string | null;
      categoriaFiscal: string;
      notas: string | null;
    };
  }>(request, token, 'un_producto', { producto_id: productoId });

  // El servidor tiene que devolver **los identificadores**, no solo los nombres.
  // Sin ellos la pantalla no puede preseleccionar, y ahí empezaba todo.
  expect(antes.datos?.producto.categoriaId, 'falta el id de la categoría').not.toBeNull();
  expect(antes.datos?.producto.proveedorId, 'falta el id del proveedor').not.toBeNull();
  expect(antes.datos?.producto.categoriaFiscal).toBe('bebida_alcoholica');
  expect(antes.datos?.producto.notas).toBe('Lo trae los martes');

  // Y ahora se guarda la ficha **tal cual llegó**, cambiando solo el nombre, que
  // es lo que hace quien corrige una errata.
  const corregido = `Vino con el nombre corregido ${Date.now()}`;

  const cambio = await ejecutar(request, token, 'cambiar_producto', {
    producto_id: productoId,
    nombre: corregido,
    categoria_id: antes.datos?.producto.categoriaId,
    formato: 'Caja de 6 botellas',
    factor: 6,
    unidad_de_uso: 'ud',
    rendimiento: 1,
    categoria_fiscal: antes.datos?.producto.categoriaFiscal,
    alergenos: [],
    peso_variable: false,
    codigo_de_barras: null,
    minimo: null,
    proveedor_id: antes.datos?.producto.proveedorId,
    notas: antes.datos?.producto.notas,
  });

  expect(cambio.estado).toBe(200);

  const despues = await consultar<{
    producto: {
      nombre: string;
      categoriaId: string | null;
      proveedorId: string | null;
      categoriaFiscal: string;
      notas: string | null;
    };
  }>(request, token, 'un_producto', { producto_id: productoId });

  expect(despues.datos?.producto.nombre).toBe(corregido);

  // **Y lo demás sigue exactamente igual.** Sobre todo el impuesto: un vino
  // guardado como «alimento» tributa mal, y eso no se nota hasta la declaración.
  expect(despues.datos?.producto.categoriaId, 'se ha perdido la categoría').toBe(
    antes.datos?.producto.categoriaId,
  );
  expect(despues.datos?.producto.proveedorId, 'se ha perdido el proveedor').toBe(
    antes.datos?.producto.proveedorId,
  );
  expect(despues.datos?.producto.categoriaFiscal, 'le ha cambiado el impuesto').toBe(
    'bebida_alcoholica',
  );
  expect(despues.datos?.producto.notas, 'se han borrado las notas').toBe('Lo trae los martes');
});

// ── 11 · Y renombrar a uno que ya existe se dice en cristiano ───────────────

test('renombrar a un nombre ya usado no da «se nos ha roto algo»', async ({ request }) => {
  // «Ningún mensaje enseña un código ni un error de base de datos» (Auditoría,
  // parte 5). Sin la comprobación, el índice único saltaba sin traducir y salía
  // un 500 diciendo que se había roto algo, que es mentira: es que ya hay otro
  // que se llama así.
  const token = await tokenDe(request, ROSA);
  const yaExiste = `Tomillo de prueba ${Date.now()}`;

  await ejecutar(request, token, 'crear_producto', { nombre: yaExiste });
  const otro = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre: `Romero de prueba ${Date.now()}`,
  });

  const choque = await ejecutar(request, token, 'cambiar_producto', {
    producto_id: otro.datos?.productoId,
    nombre: yaExiste,
    categoria_id: null,
    formato: null,
    factor: 1,
    unidad_de_uso: 'ud',
    rendimiento: 1,
    categoria_fiscal: 'alimento',
    alergenos: [],
    peso_variable: false,
    codigo_de_barras: null,
    minimo: null,
    proveedor_id: null,
    notas: null,
  });

  // 409 y no 500: es «ya hecho», del catálogo de errores en cristiano.
  expect(choque.estado, 'un nombre repetido no es un fallo nuestro').not.toBe(500);
});

// ── 6 · El envase lo pone quien compra, no el catálogo ───────────────────────

/**
 * «¿Y si ellos compran garrafas de 8 l? ¿Ya tienen que hacer cálculos?»
 *
 * Elegir del catálogo **fijaba el envase**: la referencia decía «Garrafa de 5 l»
 * y eso era lo que se guardaba, sin casilla que tocar. A quien compra otra
 * medida le quedaban dos salidas y las dos malas: hacer la cuenta de cabeza, o
 * guardar un producto con un envase que no es el suyo y arrastrar el error a
 * todos los escandallos.
 *
 * El servidor **ya aceptaba** el envase junto a la referencia desde el primer
 * día. Era la pantalla la que no lo preguntaba: otra vez algo construido y
 * probado que la pantalla no llamaba. Lo vio Richi en el móvil.
 */
test('del catálogo se puede cambiar el envase, y la cuenta se rehace al escribir', async ({
  page,
}) => {
  await entrar(page, ROSA);
  await irAInventario(page, 'productos');

  await page.getByRole('button', { name: 'Añadir producto' }).click();
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });

  await hoja.getByLabel('¿Qué producto es?').fill('aceite de oliva');
  const propuesta = hoja.getByRole('button', { name: /Aceite de oliva virgen extra/ }).first();
  await expect(propuesta).toBeVisible();
  await propuesta.click();

  // Lo que propone el catálogo, contestado ya: por litros, en garrafas de 5.
  await expect(hoja.getByLabel('Cuánto trae cada garrafa')).toHaveValue('5');

  // Y se cambia. La cuenta sale hecha al escribirlo, en euros el litro y con dos
  // decimales: «0,0075 €/ml» no lo leía nadie.
  await hoja.getByLabel('Cuánto trae cada garrafa').fill('8');
  await hoja.getByLabel('Precio de cada garrafa', { exact: true }).fill('60,00');
  await expect(hoja.getByText('Sale a 7,50 € el litro')).toBeVisible();

  const nombre = `Aceite de 8 litros ${Date.now()}`;
  await hoja.getByLabel(/^Producto/).fill(nombre);
  await hoja.getByRole('button', { name: 'Guardar el producto' }).click();

  // Y lo guardado es lo suyo, no lo del catálogo.
  await expect(page.getByText('Lo que hay en cámara').first()).toBeVisible({ timeout: 15_000 });
  await expect(loQueSeVe(page, 'Garrafa de 8 l')).toBeVisible();
});

/**
 * Y el envase del catálogo llega hasta el servidor cuando no se toca.
 *
 * Al mandar ahora la pantalla el formato **siempre**, había que asegurarse de
 * que mandarlo no pisa lo que trae la referencia con un valor peor: si esta
 * pantalla mandara el formato en blanco, el producto se guardaría sin envase y
 * el catálogo dejaría de servir para nada.
 */
test('si no se toca el envase, se guarda el del catálogo', async ({ page }) => {
  await entrar(page, ROSA);
  await irAInventario(page, 'productos');

  await page.getByRole('button', { name: 'Añadir producto' }).click();
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });

  await hoja.getByLabel('¿Qué producto es?').fill('aceite de oliva');
  const propuesta = hoja.getByRole('button', { name: /Aceite de oliva virgen extra/ }).first();
  await expect(propuesta).toBeVisible();
  await propuesta.click();

  await hoja.getByLabel(/^Producto/).fill(`Aceite tal cual ${Date.now()}`);
  await hoja.getByRole('button', { name: 'Guardar el producto' }).click();

  await expect(page.getByText('Lo que hay en cámara').first()).toBeVisible({ timeout: 15_000 });
  await expect(loQueSeVe(page, 'Garrafa de 5 l')).toBeVisible();
});

// ── 7 · «Hoy», que es la pantalla que más se abre y no la probaba nadie ──────

/**
 * **La pantalla principal de M6 devolvía un 500 a todo el mundo, siempre.**
 *
 * `inventario_hoy` acaba en un bloque que busca los lotes que caducan pronto:
 *
 *     and l.caduca_el <= ${hoy}::date + ${CADUCAN_EN}
 *
 * Ese segundo parámetro viaja **sin tipo**, y Postgres no sabe si `date + ?` es
 * sumar días o sumar un intervalo: contesta `operator is not unique: date +
 * unknown` y tumba la consulta entera, no solo ese bloque.
 *
 * No lo cazó nada porque **ninguna prueba llamaba a `inventario_hoy`**: ni las de
 * Postgres, que prueban la aritmética, ni las de pantalla, que probaban
 * Productos y la ficha. La consulta estaba escrita, registrada en el catálogo,
 * llamada desde la pantalla —y rota. Salió a la luz leyendo los errores que
 * escupía la API mientras corrían las otras pruebas.
 *
 * De ahí las dos de aquí: una pregunta a la API si contesta, y la otra mira si
 * la pantalla enseña algo o el aviso de que se ha roto.
 */
test('«Hoy» contesta, en vez de caerse con un 500', async ({ request }) => {
  const token = await tokenDe(request, ROSA);

  const hoy = await consultar<{ atencion: unknown[]; caducan: unknown[] }>(
    request,
    token,
    'inventario_hoy',
    {},
  );

  expect(hoy.estado, 'inventario_hoy no contesta 200').toBe(200);
  expect(Array.isArray(hoy.datos?.atencion)).toBe(true);
  expect(Array.isArray(hoy.datos?.caducan)).toBe(true);
});

test('«Hoy» se pinta, y no con el aviso de que se ha roto', async ({ page }) => {
  await entrar(page, ROSA);
  await irAInventario(page, 'hoy');

  // El titulo es **el destino**, no la app: es donde estas de verdad.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hoy');
  // El aviso que salía antes con el 500.
  await expect(page.getByText('No he podido leer')).toHaveCount(0);
});

// ── 5 · El libro de movimientos, que se guardaba y no se podia leer ──────────

/**
 * ── Por qué esta prueba es de las que importan ───────────────────────────────
 *
 * `mis_movimientos` es una consulta nueva, y la regla 10 de «cómo trabajamos» dice
 * con estas palabras que **una consulta que ninguna prueba llama es una consulta
 * rota que todavía no sabes que lo está**. La pantalla «Hoy» de M6 estuvo escrita,
 * registrada, llamada desde la pantalla y devolviendo un `500` a todo el mundo
 * desde el primer día, y nadie se enteró porque nada la llamaba de verdad.
 *
 * Así que son dos: una le pregunta a la API si contesta —y comprueba que el filtro
 * por tipo funciona, que es lo que usan las cuatro vistas—, y la otra mira si la
 * pantalla lo pinta o sale el aviso de que se ha roto.
 */
test('el libro de movimientos contesta, y el filtro por tipo filtra', async ({ request }) => {
  const token = await tokenDe(request, ROSA);

  const todo = await consultar<{
    movimientos: { tipo: string }[];
    hayMas: boolean;
    hoy: string;
  }>(request, token, 'mis_movimientos', { limite: '100' });

  expect(todo.estado, 'mis_movimientos no contesta 200').toBe(200);
  expect(Array.isArray(todo.datos?.movimientos)).toBe(true);
  // La fecha de hoy la decide el servidor, y la pantalla la necesita para poder
  // escribir «hoy» y «ayer» sin mirar el reloj del navegador (regla 10).
  expect(todo.datos?.hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  // Rosa tiene género sembrado con su consumo, así que hay entradas y salidas.
  expect((todo.datos?.movimientos ?? []).length).toBeGreaterThan(0);

  const soloEntradas = await consultar<{ movimientos: { tipo: string }[] }>(
    request,
    token,
    'mis_movimientos',
    { tipo: 'entrada', limite: '50' },
  );

  expect(soloEntradas.estado).toBe(200);
  for (const linea of soloEntradas.datos?.movimientos ?? []) {
    expect(linea.tipo).toBe('entrada');
  }
});

test('el libro se pinta por días, con quién apuntó cada línea', async ({ page }) => {
  await entrar(page, ROSA);
  await irAInventario(page, 'movimientos', 'todo');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Movimientos');
  await expect(page.getByText('No he podido leer')).toHaveCount(0);

  // Lo que hace que el libro sirva: que cada línea lleva el saldo de después. Y
  // **sin** el aviso de cuatro líneas que se leía cada vez que se abría.
  await expect(page.getByText('Esto no se edita, se enmienda')).toHaveCount(0);
  await expect(page.getByText(/quedaron /).first()).toBeVisible({ timeout: 15_000 });
});

/**
 * ── El libro largo: el tramo, «Ver más» y buscar de verdad ──────────────────
 *
 * Esto decía «se enseñan los cien últimos. Busca por producto para encontrar los
 * de antes», y el buscador filtraba **esas cien líneas ya traídas**: buscar algo
 * de hace tres meses contestaba «nada con eso». Un filtro que solo funciona
 * cuando la lista cabe entera es un filtro que miente, y ya nos costó una vez en
 * la lista de Productos.
 */
test('el libro se acota por tramo, y busca en el servidor', async ({ page, request }) => {
  const token = await tokenDe(request, ROSA);
  // Un producto con su línea en el libro, y un nombre que no se parece a nada.
  const nombre = `Azafrán ${Date.now()}`;
  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre,
    factor: 1,
    unidad_de_uso: 'g',
    precio_centimos: 1200,
    cantidad_inicial: 50,
  });
  expect(creado.estado).toBe(200);

  await entrar(page, ROSA);
  await irAInventario(page, 'movimientos', 'todo');

  // Hasta dónde se mira, que es lo que acota de verdad. De fábrica, el trimestre.
  const tramo = page.getByLabel('Hasta dónde miro');
  await expect(tramo).toHaveValue('trimestre');
  await expect(page.getByText(/quedaron /).first()).toBeVisible({ timeout: 15_000 });

  // ── Buscar busca en el servidor, y por eso encuentra ─────────────────────
  //
  // Antes esto filtraba **las cien líneas ya traídas**, así que un producto que
  // no estuviera entre ellas contestaba «nada con eso» aunque estuviera en el
  // libro. Ahora se busca en todo el tramo, y lo que sale es solo lo suyo.
  await page.getByLabel('Buscar en el libro').fill(nombre);
  await expect(loQueSeVe(page, nombre)).toBeVisible({ timeout: 15_000 });

  // Y lo que no existe deja la lista vacía **con su frase**, en vez de recortar
  // lo que ya estaba en pantalla.
  await page.getByLabel('Buscar en el libro').fill('zzzz-nada-de-esto');
  await expect(page.getByText('Nada con eso')).toBeVisible({ timeout: 15_000 });

  // Y cambiar el tramo vuelve a preguntar al servidor, sin romperse.
  await page.getByLabel('Buscar en el libro').fill('');
  await tramo.selectOption('mes');
  await expect(tramo).toHaveValue('mes');
  await expect(page.getByText('No he podido leer el libro')).toHaveCount(0);
  await expect(page.getByText(/quedaron /).first()).toBeVisible({ timeout: 15_000 });
});

// ── 6 · Las vistas de Productos filtran de verdad ───────────────────────────

/**
 * Antes esto era un interruptor suelto en mitad de la pantalla y dos casillas.
 * Ahora son cuatro vistas, y **cada una es un filtro del servidor**: filtrar las
 * cincuenta filas ya traídas daría «no hay ninguno» en un local con trescientos
 * productos y los sin precio en la cola del alfabeto.
 */
test('la vista «Sin precio» pregunta al servidor, y no recorta la lista al llegar', async ({
  request,
}) => {
  const token = await tokenDe(request, ROSA);

  const todos = await consultar<{ productos: { precioCentimos: number | null }[] }>(
    request,
    token,
    'mis_productos',
    { limite: '200', incluir_ejemplos: 'true' },
  );
  const sinPrecio = await consultar<{ productos: { precioCentimos: number | null }[] }>(
    request,
    token,
    'mis_productos',
    { sin_precio: 'true', limite: '200', incluir_ejemplos: 'true' },
  );

  expect(sinPrecio.estado).toBe(200);
  // Ninguno de los que devuelve tiene precio, y son menos que todos.
  for (const producto of sinPrecio.datos?.productos ?? []) {
    expect(producto.precioCentimos ?? null).toBeNull();
  }
  expect((sinPrecio.datos?.productos ?? []).length).toBeLessThanOrEqual(
    (todos.datos?.productos ?? []).length,
  );
});

test('las cuatro vistas de Productos se abren, y ninguna se queda muda', async ({ page }) => {
  await entrar(page, ROSA);

  for (const vista of ['todo', 'bajo-minimo', 'sin-precio', 'desactivados']) {
    await irAInventario(page, 'productos', vista);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Productos');
    await expect(page.getByText('No he podido leer')).toHaveCount(0);
    // Con dato o sin dato, siempre hay algo escrito: «nunca una pantalla en
    // blanco» (B4).
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  }
});

// ── 7 · El alta sencilla: nombre, en qué se mide y lo que cuesta ─────────────

/**
 * ── Lo que preguntaba, y por qué estaba mal ──────────────────────────────────
 *
 * «Preguntas cosas como "cómo lo compras", "cuánto trae", "unidad con la que
 * cocinas"… no tienen sentido.» Un saco de harina obligaba a escribir «Saco de
 * 25 kg», luego «25000», luego elegir «g», y entender por qué: tres preguntas y
 * una multiplicación para decir «compro harina, a tanto el kilo».
 *
 * Y preguntaba en el sitio equivocado: **cuántos gramos lleva una ración es de la
 * ficha técnica**, que es M9. El producto solo tiene que saber en qué se mide y a
 * cuánto sale.
 *
 * Estas dos comprueban los dos caminos: el sencillo, que es el que usa cualquiera,
 * y el de envases, que sigue estando para quien compra garrafas de 8 l.
 */
test('un producto se da de alta con nombre, unidad y precio, sin hacer cuentas', async ({
  page,
}) => {
  await entrar(page, ROSA);
  await irAInventario(page, 'productos', 'todo');

  await page.getByRole('button', { name: 'Añadir producto' }).click();
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });

  // Sin escribir nada **no sale ninguna lista**: antes salían doce referencias
  // del catálogo elegidas por nada, y debajo de las doce el botón de crearlo a
  // mano, que es el que más se pulsa.
  await expect(hoja.getByRole('button', { name: 'Crearlo a mano' })).toBeVisible();

  const nombre = `Harina de fuerza ${Date.now()}`;
  await hoja.getByRole('button', { name: 'Crearlo a mano' }).click();
  await hoja.getByLabel(/^Producto/).fill(nombre);

  // ¿Cómo lo compras? Tres tarjetas, y por peso es lo más normal.
  await hoja.getByRole('radio', { name: /^Por peso/ }).click();
  await expect(hoja.getByRole('radio', { name: /^Por peso/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // Suelto, y el precio **es el del kg**. No hay nada que multiplicar.
  await hoja.getByLabel('Precio del kg', { exact: true }).fill('1,20');

  // **Cuánto hay**, que es lo que faltaba entero: antes el producto nacía a cero
  // y había que entrar en su ficha a apuntar una entrada.
  await hoja.getByLabel('Cuánto hay ahora').fill('12');

  // Y el aprovechamiento **no se pregunta**: nadie lo sabe al dar de alta.
  await expect(hoja.getByLabel(/se aprovecha/)).toHaveCount(0);

  await hoja.getByRole('button', { name: 'Guardar el producto' }).click();

  // La ficha se abre con lo que hay puesto: la cámara ya lo cuenta.
  await expect(page.getByText('Lo que hay en cámara').first()).toBeVisible({ timeout: 15_000 });
  // El que se ve: la lista de detrás pinta cada fila dos veces, una por ancho.
  await expect(loQueSeVe(page, '12 kg')).toBeVisible();
  await expect(loQueSeVe(page, nombre)).toBeVisible();
});

test('y quien compra por envases lo despliega, y la cuenta sigue saliendo', async ({ page }) => {
  await entrar(page, ROSA);
  await irAInventario(page, 'productos', 'todo');

  await page.getByRole('button', { name: 'Añadir producto' }).click();
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });

  const nombre = `Aceite en garrafa ${Date.now()}`;
  await hoja.getByRole('button', { name: 'Crearlo a mano' }).click();
  await hoja.getByLabel(/^Producto/).fill(nombre);
  await hoja.getByRole('radio', { name: /^Por litros/ }).click();

  // En garrafas de un tamaño fijo: cuánto trae cada una y lo que cuesta.
  await hoja.getByText('Viene en garrafas o bidones de un tamaño fijo').click();
  await hoja.getByLabel('Cuánto trae cada garrafa').fill('8');
  await hoja.getByLabel('Precio de cada garrafa', { exact: true }).fill('60,00');

  // La cuenta hecha, **antes** de guardar: es lo que hace que alguien se dé
  // cuenta de que se ha equivocado.
  await expect(hoja.getByText('Sale a 7,50 € el litro')).toBeVisible();

  await hoja.getByRole('button', { name: 'Guardar el producto' }).click();

  await expect(page.getByText('Lo que hay en cámara').first()).toBeVisible({ timeout: 15_000 });
  await expect(loQueSeVe(page, 'Garrafa de 8 l')).toBeVisible();
});

/**
 * «Pongo queso azul, que viene en un envase de 250 g: cuántas unidades, cuánto
 *  pesa cada una y cuánto cuestan todas o el precio unitario, y que haga el
 *  cálculo.» Seis tarros de 250 g a 3,50 € el tarro: la caja son 21,00 € y el
 *  kilo sale a 14,00 €. Nadie escribe esa cuenta: se escribe el precio que se
 *  tiene a mano y sale sola.
 */
test('el queso azul en tarros de 250 g: el precio de un tarro y la cuenta sale sola', async ({
  page,
}) => {
  await entrar(page, ROSA);
  await irAInventario(page, 'productos', 'todo');

  await page.getByRole('button', { name: 'Añadir producto' }).click();
  const hoja = page.getByRole('dialog', { name: 'Un producto nuevo' });

  const nombre = `Queso azul ${Date.now()}`;
  await hoja.getByRole('button', { name: 'Crearlo a mano' }).click();
  await hoja.getByLabel(/^Producto/).fill(nombre);

  await hoja.getByRole('radio', { name: /^Por unidades/ }).click();
  await hoja.getByLabel('Cómo viene cada una').selectOption('Tarro');
  await hoja.getByLabel(/^Qué trae cada una/).fill('250');
  await hoja.getByRole('textbox', { name: 'Cuántas vienen en cada caja' }).fill('6');
  await expect(hoja.getByText('Caja de 6 tarros de 250 g · 1,5 kg en total')).toBeVisible();

  // El precio que se tiene a mano: el de un tarro.
  await hoja.getByRole('radio', { name: 'De cada tarro' }).click();
  await hoja.getByLabel('Precio de cada tarro', { exact: true }).fill('3,50');
  await expect(hoja.getByText('La caja sale a 21,00 € · 14,00 € el kg')).toBeVisible();

  await hoja.getByRole('button', { name: 'Guardar el producto' }).click();

  await expect(page.getByText('Lo que hay en cámara').first()).toBeVisible({ timeout: 15_000 });
  await expect(loQueSeVe(page, 'Caja de 6 tarros de 250 g')).toBeVisible();
});

// ── 7½ · Lotes, congelados e IVA (M7, repaso) ───────────────────────────────

/**
 * «Si hay un producto caducado, poder quitarlo con un botón en ese lote; si no,
 *  se queda siempre y no tiene sentido.» Se quita desde «Hoy», que es donde se
 *  ve; y lo tirado sale de cámara como merma por caducado, que es lo que el food
 *  cost del mes tiene que saber.
 */
test('un lote que caduca se quita desde «Hoy», y lo tirado queda como merma', async ({
  page,
  request,
}) => {
  const token = await tokenDe(request, ROSA);
  const nombre = `Nata que caduca ${Date.now()}`;
  const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre,
    factor: 1,
    unidad_de_uso: 'l',
    precio_centimos: 250,
    cantidad_inicial: 5,
    caduca_el: manana,
  });
  expect(creado.estado).toBe(200);
  const productoId = creado.datos?.productoId ?? '';

  await entrar(page, ROSA);
  await irAInventario(page, 'hoy');

  await page
    .getByRole('listitem')
    .filter({ hasText: nombre })
    .first()
    .getByRole('button', { name: 'Quitar' })
    .click();

  const hoja = page.getByRole('dialog', { name: `Quitar ${nombre}` });
  await hoja.getByRole('radio', { name: /^Se ha tirado/ }).click();
  await hoja.getByLabel(/^Cuánto se tira/).fill('2');
  await hoja.getByRole('button', { name: 'Quitarlo' }).click();

  await expect(page.getByText(/queda apuntado como merma por caducado/)).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: nombre })).toHaveCount(0);

  const ficha = await consultar<{ producto: { cantidad: number }; lotes: unknown[] }>(
    request,
    token,
    'un_producto',
    { producto_id: productoId },
  );
  expect(ficha.datos?.lotes, 'el lote quitado ya no sale').toEqual([]);
  expect(ficha.datos?.producto.cantidad, 'lo tirado sale de cámara').toBe(3);
});

/**
 * «Poder indicar "producto congelado", cuándo se congeló, y que salga
 *  "congelado": así tienen en mente lo que hay en la cámara de congelados.»
 */
test('lo congelado se ve: su vista «Congelados» y la fecha en su ficha', async ({
  page,
  request,
}) => {
  const token = await tokenDe(request, ROSA);
  const nombre = `Carne picada ${Date.now()}`;
  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre,
    factor: 1,
    unidad_de_uso: 'kg',
    precio_centimos: 900,
    cantidad_inicial: 4,
  });
  expect(creado.estado).toBe(200);
  const productoId = creado.datos?.productoId ?? '';

  // «La mitad va al congelador»: un lote nuevo, congelado hoy.
  const congelado = await ejecutar<{ loteId: string }>(request, token, 'congelar', {
    producto_id: productoId,
  });
  expect(congelado.estado).toBe(200);

  const lista = await consultar<{ productos: { id: string; congelado: boolean }[] }>(
    request,
    token,
    'mis_productos',
    { congelados: 'true', limite: '200' },
  );
  expect(lista.datos?.productos.some((p) => p.id === productoId && p.congelado)).toBe(true);

  await entrar(page, ROSA);
  await irAInventario(page, 'productos', 'congelados');
  await expect(loQueSeVe(page, nombre)).toBeVisible();
  await pulsarLoQueSeVe(page, nombre);
  await expect(page.getByText(/^congelado el /).first()).toBeVisible();
});

/**
 * «Los precios llevan IVA; estaría genial elegir si está incluido o excluido,
 *  bien puesto.» Se guardan sin IVA (decisión 0033): se elige cómo se escriben, y
 *  a los que ya había se les quita **una vez**.
 *
 * En un local nuevo, y es a propósito: esto cambia un ajuste del local y todos
 * sus precios, y las pruebas de alta de Bar Centro escriben precios «sin IVA»
 * a la vez que esta corre.
 */
test('el IVA de los precios: se elige cómo se escriben y a los de antes se les quita una vez', async ({
  request,
}) => {
  const token = await tokenDe(request, ELENA);
  const local = await ejecutar<{ localId: string }>(request, token, 'crear_local', {
    nombre: `Bar del IVA ${Date.now()}`,
    duplicar_de: await unLocalDe(request, token, 'puerto'),
  });
  expect(local.estado).toBe(200);
  await ejecutar(request, token, 'cambiar_de_contexto', { local_id: local.datos?.localId });

  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre: `Aceite con IVA ${Date.now()}`,
    factor: 1,
    unidad_de_uso: 'l',
    precio_centimos: 1100,
  });
  expect(creado.estado).toBe(200);

  const puesto = await ejecutar(request, token, 'guardar_precios_con_iva', { con_iva: true });
  expect(puesto.estado).toBe(200);
  const como = await consultar<{ preciosConIva: boolean; ivaQuitadoEn: string | null }>(
    request,
    token,
    'mis_productos',
    { limite: '1' },
  );
  expect(como.datos?.preciosConIva).toBe(true);
  expect(como.datos?.ivaQuitadoEn).toBeNull();

  const quitado = await ejecutar<{ cambiados: number; sinTipo: number }>(
    request,
    token,
    'quitar_iva_a_los_precios',
    { confirmado: true },
  );
  expect(quitado.estado).toBe(200);
  expect(quitado.datos?.cambiados).toBeGreaterThanOrEqual(1);

  // 11,00 € con el 10 % de un alimento son 10,00 € sin él.
  const ficha = await consultar<{ producto: { precioCentimos: number } }>(
    request,
    token,
    'un_producto',
    { producto_id: creado.datos?.productoId ?? '' },
  );
  expect(ficha.datos?.producto.precioCentimos).toBe(1000);

  // Y una sola vez: la segunda contesta «ya estaba hecho» —que el catálogo de
  // errores da como 200, porque repetir no es un fallo— y **no vuelve a dividir**.
  // Eso es lo que importa: 10,00 € y no 9,09 €.
  const otraVez = await ejecutar<{ cambiados: number }>(
    request,
    token,
    'quitar_iva_a_los_precios',
    { confirmado: true },
  );
  expect(otraVez.datos?.cambiados, 'la segunda vez ha vuelto a quitar el IVA').toBeUndefined();
  const despues = await consultar<{ producto: { precioCentimos: number } }>(
    request,
    token,
    'un_producto',
    { producto_id: creado.datos?.productoId ?? '' },
  );
  expect(despues.datos?.producto.precioCentimos).toBe(1000);
});

// ── 7½ · La ficha, repasada: lo que deja, el aprovechamiento y deshacer ─────

/**
 * ── Las tres cosas que Richi no encontraba en la ficha ──────────────────────
 *
 *   · «El diseño de la tarjeta de producto es demasiado sencillo, los botones no
 *     existen.» Cada sección es ahora una tarjeta con su título y su botón.
 *   · «Hay un tag naranja que dice "sin verificar" y no sé cómo quitarlo.» El
 *     dato vive donde se lee y **con qué se arregla al lado**.
 *   · «El deshacer ha desaparecido.» Está, en lo que se edita y se puede volver
 *     a editar: la ficha, el precio de compra y el de venta.
 */
test('la ficha dice lo que deja, deja medir el aprovechamiento y se puede deshacer', async ({
  page,
  request,
}) => {
  const token = await tokenDe(request, ROSA);
  const nombre = `Botellín ${Date.now()}`;
  const creado = await ejecutar<{ productoId: string }>(request, token, 'crear_producto', {
    nombre,
    factor: 1,
    unidad_de_uso: 'ud',
    // 0,45 € de coste: con 2,50 € de venta al 10 %, el género se lleva un 20 %.
    precio_centimos: 45,
    cantidad_inicial: 24,
  });
  expect(creado.estado).toBe(200);

  await entrar(page, ROSA);
  await page.goto(`${APP}#/inventario/productos/todo?producto=${creado.datos?.productoId ?? ''}`, {
    waitUntil: 'domcontentloaded',
  });

  const ficha = page.getByRole('dialog', { name: nombre });

  // ── Lo que deja, que antes no existía ────────────────────────────────────
  await ficha.getByRole('button', { name: 'Poner precio de venta' }).click();
  const hoja = page.getByRole('dialog', { name: 'A cuánto lo vendes' });
  await hoja.getByLabel(/^Lo que cobras/).fill('2,50');
  // La cuenta se ve antes de guardar: 2,50 € con el 10 % dentro son 2,27 €.
  await expect(hoja.getByText(/te entran/i)).toContainText('2,27');
  await hoja.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(hoja).toHaveCount(0);

  // Y el margen, con el coste ya restado y sin regalarse el impuesto: 2,50 € con
  // el 10 % dentro son 2,27 €, menos 0,45 € de coste, 1,82 €.
  await expect(ficha.getByText('Te queda', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(ficha.getByText('1,82 €')).toBeVisible();

  // ── Y deshacer, que es lo que pidió ──────────────────────────────────────
  const deshacer = page.getByRole('button', { name: /Deshacer/ });
  await expect(deshacer).toBeVisible();
  await deshacer.click();
  await expect(ficha.getByRole('button', { name: 'Poner precio de venta' })).toBeVisible({
    timeout: 15_000,
  });

  // ── El aprovechamiento: se lee, y se mide desde aquí ─────────────────────
  await expect(ficha.getByText('supuesto, sin medir')).toBeVisible();
  await ficha.getByRole('button', { name: 'Lo he medido' }).click();
  const medir = page.getByRole('dialog', { name: 'Cuánto se aprovecha' });
  await medir.getByLabel(/^Lo que entra/).fill('10');
  await medir.getByLabel(/^Lo que queda limpio/).fill('8');
  await expect(medir.getByText('Se aprovecha un 80 %')).toBeVisible();
  await medir.getByRole('button', { name: 'Guardarlo' }).click();
  await expect(medir).toHaveCount(0);
  await expect(ficha.getByText('medido en esta cocina')).toBeVisible({ timeout: 15_000 });

  // Y corregir una errata en el nombre **no** lo vuelve a marcar como supuesto,
  // que es lo que hacía que la etiqueta naranja saliera en todos los productos.
  await ficha.getByRole('button', { name: 'Corregir la ficha' }).click();
  const corregir = page.getByRole('dialog', { name: 'Corregir la ficha' });
  await corregir.getByLabel(/^Producto/).fill(`${nombre} frío`);
  await corregir.getByRole('button', { name: /^Guardar/ }).click();
  await expect(corregir).toHaveCount(0);
  await expect(ficha.getByText('medido en esta cocina')).toBeVisible({ timeout: 15_000 });
});
// ── 8 · Delivery · el sitio, no la integración ──────────────────────────────

test('el reparto tiene su sitio, con Uber Eats por su nombre y sin botón de mentira', async ({
  page,
}) => {
  /*
    «Añádelo, es importante, y conectaremos únicamente Uber Eats.» El sitio se
    decide ahora y la integración es M29, que es lo mismo que se hizo con Fogón en
    M6: dónde vive algo es navegación, y dejarlo para el módulo obliga a rehacer la
    barra cuando llegue.

    Lo que **no** puede haber es un botón de conectar: «ninguna integración se da
    por disponible hasta verificar sus requisitos y capacidades reales».
  */
  await entrar(page, ROSA);
  await page.goto(`${APP}#/servicio/delivery`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Delivery');
  await expect(page.getByText('Uber Eats').first()).toBeVisible();
  await expect(page.getByText(/módulo 29/)).toBeVisible();

  // Ni un botón que prometa una conexión que no existe.
  await expect(page.getByRole('button', { name: /Conectar/ })).toHaveCount(0);
});
