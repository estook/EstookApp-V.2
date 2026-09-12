import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * M6½ · lo que pasa durante el servicio, de punta a punta.
 *
 * Fichar, apuntar una merma, mover género con el + y el −, cerrar la caja y mirar
 * las horas del equipo. **Ninguna de estas cosas existía antes de M6½**, y todas
 * tienen algo en común: se hacen con prisa, con una mano y a menudo desde el
 * móvil de quien no lleva el local. Por eso se prueban desde la pantalla, en los
 * dos proyectos, y no solo contra la API.
 *
 * Y cada una comprueba también **quién no ve qué**, llamando a la API a pelo:
 * que una camarera apunte una merma sin recibir un solo precio, y que un cocinero
 * no llegue a las horas de sus compañeros. Esconderlo en la pantalla no protege
 * nada; lo que se comprueba es que el dato no viaja (regla 4).
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';
const CLAVE = 'estook en desarrollo';

/** Rosa lleva Bar Centro: ve todo lo suyo, sueldos y precios incluidos. */
const ROSA = 'rosa@ejemplo.estook.com';
/** Marcos cocina en Bar Centro: ficha, apunta mermas, y no ve horas ajenas. */
const MARCOS = 'marcos@ejemplo.estook.com';
/** Sara está en la sala de Bar Centro: ficha y apunta mermas, sin un precio. */
const SARA = 'sara@ejemplo.estook.com';

async function entrar(page: Page, correo: string) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
    } catch {
      /* en navegación privada no se puede, y no pasa nada */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByLabel('Tu correo').fill(correo);
  await page.getByLabel('Tu contraseña').fill(CLAVE);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entra en Estook' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

/** El que se ve: `Tabla` pinta cada fila dos veces, una para cada ancho. */
function loQueSeVe(page: Page, texto: string) {
  return page.locator(`text=${texto} >> visible=true`).first();
}

async function tokenDe(peticion: APIRequestContext, correo: string): Promise<string> {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `dia-${correo}-${Date.now()}-${Math.random()}` },
    data: { correo, contrasena: CLAVE },
  });
  const cuerpo = (await respuesta.json()) as { datos: { token: string } };
  return cuerpo.datos.token;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- la forma la afirma quien llama, igual que en inventario.spec.ts
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

/** Un producto de Bar Centro con género dentro, dado de alta por Rosa. */
async function unProductoConGenero(
  peticion: APIRequestContext,
  nombre: string,
  producto: Record<string, unknown>,
): Promise<string> {
  const rosa = await tokenDe(peticion, ROSA);
  const creado = await ejecutar<{ productoId: string }>(peticion, rosa, 'crear_producto', {
    nombre,
    ...producto,
  });
  expect(creado.estado, 'Rosa tiene que poder dar de alta el producto').toBe(200);
  return creado.datos?.productoId ?? '';
}

// ── 1 · Fichar ───────────────────────────────────────────────────────────────

test.describe('fichar', () => {
  // El navegador dice dónde está, como lo diría un móvil al que se le da permiso.
  test.use({
    geolocation: { latitude: 43.3623, longitude: -8.4115 },
    permissions: ['geolocation'],
  });

  test('se ficha desde el Panel, con la ubicación, y quien lleva el local lo ve', async ({
    page,
    request,
  }, info) => {
    // **Una persona por proyecto.** Fichar es de uno, y dos navegadores fichando
    // a la vez con la misma persona se contestarían «ya estás dentro» el uno al
    // otro. Rosa no entra aquí: su Panel lo tocan las pruebas del Panel.
    const quien = ({ escritorio: MARCOS, 'movil-pequeno': SARA } as Record<string, string>)[
      info.project.name
    ];
    test.skip(quien === undefined, 'En Bar Centro no queda nadie libre para este proyecto.');
    if (quien === undefined) return;

    await entrar(page, quien);

    const entrada = page.getByRole('button', { name: 'Fichar la entrada' });
    const salida = page.getByRole('button', { name: 'Fichar la salida' });
    await expect(entrada.or(salida)).toBeVisible({ timeout: 15_000 });

    // Si un intento anterior se quedó dentro, se sale primero: la prueba mide
    // entrar y salir, no el estado en el que la dejó otra.
    if (await salida.isVisible()) {
      await salida.click();
      await expect(entrada).toBeVisible({ timeout: 15_000 });
    }

    await entrada.click();
    await expect(page.getByText('Entrada apuntada')).toBeVisible({ timeout: 15_000 });
    await expect(salida).toBeVisible();

    await salida.click();
    await expect(page.getByText('Salida apuntada')).toBeVisible({ timeout: 15_000 });
    await expect(entrada).toBeVisible();

    // Y lo que queda guardado, mirado por quien lleva el local: el fichaje
    // **lleva ubicación**. Si el navegador no la hubiera dado, diría por qué
    // («sin señal», «la negó»), y la prueba lo cazaría aquí.
    const suyo = await tokenDe(request, quien);
    const yo = await consultar<{ personaId: string }>(request, suyo, 'quien_soy');
    const rosa = await tokenDe(request, ROSA);
    const ficha = await consultar<{
      ultimosFichajes: { salioEn: string | null; sinUbicacion: string | null }[];
    }>(request, rosa, 'una_persona', { persona_id: yo.datos?.personaId ?? '' });

    expect(ficha.estado).toBe(200);
    const ultimo = ficha.datos?.ultimosFichajes[0];
    expect(ultimo?.salioEn).not.toBeNull();
    expect(ultimo?.sinUbicacion).toBeNull();
  });
});

// ── 2 · Una merma, desde el Panel y por la sala ──────────────────────────────

test('la camarera apunta una merma desde el Panel, y quien lleva el local la ve valorada', async ({
  page,
  request,
}) => {
  const nombre = `Nata para montar ${Date.now()}`;
  await unProductoConGenero(request, nombre, {
    formato: 'Brick de 1 l',
    factor: 1000,
    unidad_de_uso: 'ml',
    precio_centimos: 350,
    cantidad_inicial: 5000,
  });

  // «Apuntar una merma» es una acción del catálogo: una dirección que abre la
  // hoja desde cualquier sitio, sin depender de qué widgets tenga cada uno.
  await entrar(page, SARA);
  await page.goto(`${APP}#/?hacer=merma`, { waitUntil: 'domcontentloaded' });
  const hoja = page.getByRole('dialog', { name: 'Apuntar una merma' });

  await hoja.getByLabel('Qué se ha ido').fill(nombre);
  await hoja.getByRole('button', { name: new RegExp(nombre) }).click();
  await hoja.getByLabel('Cuánto', { exact: true }).fill('250');
  await hoja.getByRole('radio', { name: /^Ha caducado/ }).click();
  await hoja.getByRole('button', { name: 'Apuntar', exact: true }).click();

  await expect(hoja.getByText('Apuntado', { exact: true })).toBeVisible({ timeout: 15_000 });

  // Lo que ve quien lleva el local: la merma, con su motivo y **su valor**.
  const rosa = await tokenDe(request, ROSA);
  const mermas = await consultar<{
    mermas: { producto: string; motivo: string; valorCentimos?: number | null }[];
  }>(request, rosa, 'mis_mermas');
  const suya = mermas.datos?.mermas.find((m) => m.producto === nombre);
  expect(suya?.motivo).toBe('caducado');
  expect(suya?.valorCentimos ?? 0).toBeGreaterThan(0);

  // Y lo que **no** le llega a ella: ni un precio al buscar, ni el valor de lo
  // que se ha tirado hoy, ni la lista entera de mermas.
  const sara = await tokenDe(request, SARA);
  const paraElegir = await consultar(request, sara, 'productos_para_merma', { texto: nombre });
  expect(paraElegir.estado).toBe(200);
  expect(JSON.stringify(paraElegir.datos)).not.toMatch(/coste|precio|valor/i);

  const deHoy = await consultar(request, sara, 'merma_de_hoy');
  expect(deHoy.estado).toBe(200);
  expect(JSON.stringify(deHoy.datos)).not.toMatch(/valorCentimos/);

  expect((await consultar(request, sara, 'mis_mermas')).estado).toBe(403);
});

// ── 3 · El + y el − de cada producto ─────────────────────────────────────────

test('el + apunta lo que llega con su precio puesto, y el − pregunta por qué sale', async ({
  page,
  request,
}) => {
  const nombre = `Tomate pera ${Date.now()}`;
  await unProductoConGenero(request, nombre, {
    unidad_de_uso: 'kg',
    factor: 1,
    precio_centimos: 180,
    cantidad_inicial: 10,
  });

  await entrar(page, ROSA);
  await page.goto(`${APP}#/inventario/productos/todo`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Buscar en tu género').fill(nombre);

  // El + · entra género, con el precio de la lista ya escrito.
  await page.locator(`[aria-label="Ha llegado ${nombre}"] >> visible=true`).click();
  const llega = page.getByRole('dialog', { name: new RegExp(`Ha llegado género · ${nombre}`) });
  await expect(llega.getByLabel('Precio', { exact: true })).not.toHaveValue('');
  // «Cuánto *»: es obligatorio, y el asterisco va dentro de la etiqueta.
  await llega.getByLabel(/^Cuánto/).fill('5');
  await llega.getByRole('button', { name: 'Apuntar la entrada' }).click();
  await expect(llega).toHaveCount(0);
  await expect(loQueSeVe(page, '15 kg')).toBeVisible({ timeout: 15_000 });

  // El − · sale género, y **se dice por qué**. Si es una merma, va a mermas.
  await page.locator(`[aria-label="Ha salido ${nombre}"] >> visible=true`).click();
  const sale = page.getByRole('dialog', { name: new RegExp(`Ha salido género · ${nombre}`) });
  await sale.getByRole('radio', { name: 'Ha caducado' }).click();
  await sale.getByLabel(/^Cuánto/).fill('2');
  await sale.getByRole('button', { name: 'Apuntar la salida' }).click();
  await expect(sale).toHaveCount(0);
  await expect(loQueSeVe(page, '13 kg')).toBeVisible({ timeout: 15_000 });

  // Y lo normal en cocina: se ha gastado. Eso es una salida, no una merma, y no
  // sube el coste de la comida perdida.
  await page.locator(`[aria-label="Ha salido ${nombre}"] >> visible=true`).click();
  await sale.getByRole('radio', { name: 'Gastado en cocina' }).click();
  await sale.getByLabel(/^Cuánto/).fill('1');
  await sale.getByRole('button', { name: 'Apuntar la salida' }).click();
  await expect(sale).toHaveCount(0);
  await expect(loQueSeVe(page, '12 kg')).toBeVisible({ timeout: 15_000 });

  // ── Y lo que antes no se podía decir: que se ha vendido ───────────────────
  //
  // «Gastado o vendido» era un solo botón, y con las dos cosas juntas Estook no
  // sabía si por lo que salió entró dinero. Ahora se dice, se apunta lo que se ha
  // cobrado, y **ese dinero no se suma a ninguna ganancia aquí**: espera al
  // cierre de caja, que es su único dueño.
  await page.locator(`[aria-label="Ha salido ${nombre}"] >> visible=true`).click();
  // El «cuánto» primero, que mientras no se diga «vendido» es el único campo que
  // empieza por esa palabra. Después el porqué, y entonces aparece el importe.
  await sale.getByLabel(/^Cuánto/).fill('2');
  await sale.getByRole('radio', { name: 'Vendido a un cliente' }).click();
  await sale.getByLabel('Cuánto has cobrado').fill('7,50');
  await expect(sale.getByText('Esto se cuenta en la caja del día')).toBeVisible();
  await sale.getByRole('button', { name: 'Apuntar la salida' }).click();
  await expect(sale).toHaveCount(0);
  await expect(loQueSeVe(page, '10 kg')).toBeVisible({ timeout: 15_000 });

  const rosa = await tokenDe(request, ROSA);
  const mermas = await consultar<{ mermas: { producto: string; motivo: string }[] }>(
    request,
    rosa,
    'mis_mermas',
  );
  expect(mermas.datos?.mermas.find((m) => m.producto === nombre)?.motivo).toBe('caducado');

  // La venta queda en el libro como venta, con lo que se cobró.
  const libro = await consultar<{
    movimientos: { producto: string; tipo: string; ingresoCentimos?: number | null }[];
  }>(request, rosa, 'mis_movimientos', { tipo: 'venta', limite: '50' });
  const laVenta = libro.datos?.movimientos.find((m) => m.producto === nombre);
  expect(laVenta?.ingresoCentimos).toBe(750);

  // Y sale propuesta al cerrar la caja, sin haber sumado nada por su cuenta.
  const caja = await consultar<{
    vendidoEnCamara: { concepto: string; importeCentimos: number }[];
  }>(request, rosa, 'un_cierre');
  expect(caja.datos?.vendidoEnCamara.find((v) => v.concepto === nombre)?.importeCentimos).toBe(750);
});

// ── 4 · La caja, a mano ──────────────────────────────────────────────────────

test('se cierra la caja a mano, y el día sale en Negocio › Ventas', async ({
  page,
  request,
}, info) => {
  // **Un día distinto por proyecto.** La caja es una por local y día, y dos
  // navegadores cerrando la misma se corregirían el uno al otro. Y se cuenta
  // hacia atrás desde **la jornada que dice el servidor**, no desde el reloj de
  // esta máquina: a las dos de la madrugada no son el mismo día (regla 10).
  const atras =
    ({ escritorio: 3, 'movil-pequeno': 4, 'movil-safari': 5 } as Record<string, number>)[
      info.project.name
    ] ?? 6;
  const rosa = await tokenDe(request, ROSA);
  const cierres = await consultar<{ jornada: string }>(request, rosa, 'mis_cierres');
  const jornada = Date.parse(`${cierres.datos?.jornada ?? ''}T12:00:00Z`);
  const dia = new Date(jornada - atras * 86_400_000).toISOString().slice(0, 10);

  await entrar(page, ROSA);
  await page.goto(`${APP}#/servicio/jornada/cierre?fecha=${dia}`, {
    waitUntil: 'domcontentloaded',
  });

  await page.getByLabel('Total facturado').fill('834,50');
  await page.getByLabel('Efectivo').fill('134,50');
  await page.getByLabel('Tarjeta').fill('700');
  await page.getByLabel('Tickets').fill('31');
  await page.getByRole('button', { name: 'Cerrar la caja' }).click();

  await expect(page.getByText(/Caja cerrada/).first()).toBeVisible({ timeout: 15_000 });

  // Y Negocio lo lee de ahí: el mismo cierre, sin volver a escribirlo.
  await page.goto(`${APP}#/negocio/ventas`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Ticket medio').first()).toBeVisible();
  await expect(loQueSeVe(page, '834,50')).toBeVisible();
});

// ── 5 · Las horas del equipo ─────────────────────────────────────────────────

test('quien lleva el local ve quién está dentro y las horas; un cocinero no llega', async ({
  page,
  request,
}) => {
  await entrar(page, ROSA);

  await page.goto(`${APP}#/equipo/hoy`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /^Fichar la (entrada|salida)$/ })).toBeVisible();
  await expect(page.getByText(/Hoy llevas/)).toBeVisible();

  await page.goto(`${APP}#/equipo/resumen`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Horas del equipo' })).toBeVisible();

  // Las horas de los demás son de quien lleva a esas personas. Un cocinero ve
  // las suyas en su Panel, y a la de sus compañeros **no llega**.
  const marcos = await tokenDe(request, MARCOS);
  expect((await consultar(request, marcos, 'resumen_del_equipo')).estado).toBe(403);
  expect((await consultar(request, marcos, 'fichajes_de_hoy')).estado).toBe(403);
});

// ── 6 · Lo que se pone desde la ficha de una persona, por la API ─────────────
//
// Estas hablan con la API a pelo, sin pantalla: al servidor le da igual qué
// navegador llame, y correrlas en los dos proyectos solo duplica escrituras
// contra la misma base (lo razona `playwright.config.ts`). Van una vez.

const UNA_VEZ = 'Habla con la API a pelo: basta con correrla en un proyecto.';

test('el sueldo y el horario los pone quien lleva a esa persona, y nadie más', async ({
  request,
}, info) => {
  test.skip(info.project.name !== 'escritorio', UNA_VEZ);

  const rosa = await tokenDe(request, ROSA);
  const marcos = await tokenDe(request, MARCOS);
  const deMarcos = await consultar<{ personaId: string }>(request, marcos, 'quien_soy');
  const marcosId = deMarcos.datos?.personaId ?? '';

  const sueldo = await ejecutar(request, rosa, 'poner_retribucion', {
    persona_id: marcosId,
    forma: 'por_hora',
    importe_centimos: 1150,
    puesto: 'Cocinero',
  });
  expect(sueldo.estado).toBe(200);

  // La semana de siempre, de lunes a viernes. Es de donde saldrán los avisos de
  // «mañana entras a las nueve» y el cuadrante de Fogón.
  const horario = await ejecutar(request, rosa, 'poner_horario_habitual', {
    persona_id: marcosId,
    tramos: [1, 2, 3, 4, 5].map((dia) => ({ dia, entra: '09:00', sale: '17:00' })),
  });
  expect(horario.estado).toBe(200);

  const ficha = await consultar<{ horario: unknown[]; retribucion?: unknown }>(
    request,
    rosa,
    'una_persona',
    { persona_id: marcosId },
  );
  expect(ficha.datos?.horario).toHaveLength(5);
  expect(JSON.stringify(ficha.datos?.retribucion)).toContain('por_hora');

  // Él no se pone el sueldo.
  expect(
    (
      await ejecutar(request, marcos, 'poner_retribucion', {
        persona_id: marcosId,
        forma: 'por_hora',
        importe_centimos: 9900,
      })
    ).estado,
  ).toBe(403);

  // Su ficha sí la ve, **y lo que cobra él también**: es suyo. Lo de los demás
  // es lo que no le llega.
  const suya = await consultar<{ horario: unknown[]; retribucion?: unknown }>(
    request,
    marcos,
    'una_persona',
    { persona_id: marcosId },
  );
  expect(suya.estado).toBe(200);
  expect(suya.datos?.horario).toHaveLength(5);
  expect(JSON.stringify(suya.datos?.retribucion)).toContain('por_hora');

  // Y la ficha de Rosa, no: un cocinero no lleva a nadie más que a sí mismo.
  const deRosa = await consultar<{ personaId: string }>(request, rosa, 'quien_soy');
  const ajena = await consultar(request, marcos, 'una_persona', {
    persona_id: deRosa.datos?.personaId ?? '',
  });
  expect(ajena.estado).not.toBe(200);
});

test('un fichaje olvidado se corrige con motivo, y lo que no se toca no se borra', async ({
  request,
}, info) => {
  test.skip(info.project.name !== 'escritorio', UNA_VEZ);

  const rosa = await tokenDe(request, ROSA);

  // Entra sin ubicación —la negó— y se va sin fichar la salida.
  const entro = await ejecutar<{ fichajeId: string; entroEn: string }>(
    request,
    rosa,
    'fichar_entrada',
    { sin_donde: 'la_nego' },
  );
  expect(entro.estado).toBe(200);
  const fichajeId = entro.datos?.fichajeId ?? '';

  // Las horas se cuentan desde la que puso **el servidor** al entrar, no desde el
  // reloj de esta máquina (regla 10).
  const entroEn = Date.parse(entro.datos?.entroEn ?? '');
  const horasAntes = (horas: number) => new Date(entroEn - horas * 60 * 60_000).toISOString();

  // Quien lleva el equipo lo arregla: entró a las nueve y se fue a las cinco sin
  // fichar. La salida va **sin posición**: la pone quien corrige, y el porqué es
  // el motivo. Esto antes lo rechazaba la base.
  const cerrado = await ejecutar<{ minutos: number | null }>(request, rosa, 'corregir_fichaje', {
    fichaje_id: fichajeId,
    entro_en: horasAntes(9),
    salio_en: horasAntes(1),
    motivo: 'Se fue sin fichar la salida',
  });
  expect(cerrado.estado).toBe(200);
  expect(cerrado.datos?.minutos).toBe(480);

  // Y corregir solo la entrada **no le quita la salida**. Antes la dejaba en
  // blanco, y el turno volvía a estar abierto.
  const otraVez = await ejecutar<{ minutos: number | null }>(request, rosa, 'corregir_fichaje', {
    fichaje_id: fichajeId,
    entro_en: horasAntes(10),
    motivo: 'Entró una hora antes',
  });
  expect(otraVez.estado).toBe(200);
  expect(otraVez.datos?.minutos).toBe(540);
});

test('quien lleva el local marca dónde está; un cocinero no puede moverlo', async ({
  request,
}, info) => {
  test.skip(info.project.name !== 'escritorio', UNA_VEZ);

  const rosa = await tokenDe(request, ROSA);
  const puesto = await ejecutar(request, rosa, 'poner_donde_esta_el_local', {
    latitud: 43.3623,
    longitud: -8.4115,
    radio_metros: 150,
  });
  expect(puesto.estado).toBe(200);

  const suyo = await consultar<{ elLocalSabeDondeEsta: boolean }>(request, rosa, 'mi_fichaje');
  expect(suyo.datos?.elLocalSabeDondeEsta).toBe(true);

  // Cambiar el radio **no borra** la posición: se manda solo el radio.
  expect(
    (await ejecutar(request, rosa, 'poner_donde_esta_el_local', { radio_metros: 200 })).estado,
  ).toBe(200);
  const despues = await consultar<{ elLocalSabeDondeEsta: boolean }>(request, rosa, 'mi_fichaje');
  expect(despues.datos?.elLocalSabeDondeEsta).toBe(true);

  const marcos = await tokenDe(request, MARCOS);
  expect(
    (await ejecutar(request, marcos, 'poner_donde_esta_el_local', { radio_metros: 500 })).estado,
  ).toBe(403);
});
