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
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Entra en Estook');
}

async function irAInventario(page: Page, pestana: string) {
  await page.goto(`${APP}#/inventario/${pestana}`, { waitUntil: 'domcontentloaded' });
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
  await hoja.getByLabel('Cómo se llama').fill(`Aceite de oliva ${Date.now()}`);
  await hoja.getByLabel('Lo que te cuesta').fill('42,50');
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

  await page.getByRole('button', { name: 'Ajustar lo que hay' }).click();
  await page.getByLabel(/Cuánto hay/).fill('4000');
  await page.getByLabel('Por qué no cuadraba').fill('Se rompió un saco');
  await page.getByRole('button', { name: 'Guardar el ajuste' }).click();

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

  // Lo que antes no existía: las casillas del envase, rellenas con lo que
  // propone el catálogo.
  await expect(hoja.getByLabel('Cómo lo compras')).toHaveValue('Garrafa de 5 l');
  await expect(hoja.getByLabel('Cuánto trae')).toHaveValue('5000');
  await expect(hoja.getByText('= 5000 ml para usar.')).toBeVisible();

  // Y se cambian. La cuenta se rehace mientras se escribe, **antes** de guardar,
  // que es lo que hace que alguien note que se ha equivocado.
  await hoja.getByLabel('Cómo lo compras').fill('Garrafa de 8 l');
  await hoja.getByLabel('Cuánto trae').fill('8000');
  await expect(hoja.getByText('= 8000 ml para usar.')).toBeVisible();

  const nombre = `Aceite de 8 litros ${Date.now()}`;
  await hoja.getByLabel('Cómo se llama').fill(nombre);
  await hoja.getByLabel('Lo que te cuesta').fill('60,00');
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

  await hoja.getByLabel('Cómo se llama').fill(`Aceite tal cual ${Date.now()}`);
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

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inventario');
  // El aviso que salía antes con el 500.
  await expect(page.getByText('No he podido leer')).toHaveCount(0);
});
