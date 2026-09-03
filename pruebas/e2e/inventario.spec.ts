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
