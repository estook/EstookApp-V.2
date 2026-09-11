import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * M7 · proveedores y compras, de punta a punta.
 *
 * «**Terminado cuando.** Un pedido recorre el ciclo, el inventario cuadra, el
 *  precio nuevo ya está repercutido […], y una factura con tres albaranes y una
 *  diferencia sale conciliada con esa diferencia señalada. Y además: las entregas
 *  de la semana salen en el Panel.»
 *
 * La factura de tres albaranes, al céntimo, la cuenta `compras.prueba.ts` contra
 * Postgres, que es donde se puede leer línea a línea. Aquí se comprueba **que
 * todo eso contesta de verdad**, por la API que usa la aplicación, y que se hace
 * desde la pantalla en un móvil: mandar un pedido, recibirlo entero en dos toques
 * y apuntar una factura que dice si cuadra mientras se escribe.
 *
 * Y lo de siempre, llamando a la API a pelo (regla 4): **un cocinero hace el
 * borrador y recibe el camión sin que le llegue un solo importe**, y mandar el
 * pedido —que compromete dinero del local— no le deja.
 */
const APP = 'http://localhost:5174/';
const API = 'http://localhost:5177/api';
const CLAVE = 'estook en desarrollo';

/** Rosa lleva Bar Centro: ve precios y puede mandar pedidos. */
const ROSA = 'rosa@ejemplo.estook.com';
/** Marcos cocina en Bar Centro: hace pedidos y recibe, sin un precio, y no los manda. */
const MARCOS = 'marcos@ejemplo.estook.com';

const UNA_VEZ = 'Habla con la API a pelo: basta con correrla en un proyecto.';

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

async function tokenDe(peticion: APIRequestContext, correo: string): Promise<string> {
  const respuesta = await peticion.post(`${API}/v1/comandos/entrar`, {
    headers: { 'x-idempotencia': `compras-${correo}-${Date.now()}-${Math.random()}` },
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

/** Lo que devuelve `un_pedido`, lo justo para estas pruebas. */
interface PedidoLeido {
  pedido: { id: string; numero: number; estado: string; llegaEl: string | null };
  lineas: { id: string; productoId: string; cantidad: number; precioCentimos?: number | null }[];
  texto: string;
  totalCentimos?: number;
  puedeEnviar: boolean;
}

/**
 * Un proveedor de Bar Centro que reparte todos los días —así siempre «toca pedir
 * hoy» y llega mañana—, con un producto suyo con género dentro.
 *
 * Con nombres que llevan el proyecto y la hora: las pruebas corren a la vez en
 * escritorio y en móvil contra la misma base, y cada una tiene que ver lo suyo.
 */
async function unProveedorConGenero(peticion: APIRequestContext, token: string, sufijo: string) {
  const nombre = `Distribuciones ${sufijo}`;
  const proveedor = await ejecutar<{ proveedorId: string }>(peticion, token, 'crear_proveedor', {
    nombre,
    contacto: 'Juan',
    dias_de_reparto: [1, 2, 3, 4, 5, 6, 7],
    plazo_de_entrega: 1,
    como_se_pide: 'telefono',
    forma_de_pago: 'transferencia',
    dias_de_pago: 30,
  });
  expect(proveedor.estado, 'Rosa tiene que poder dar de alta el proveedor').toBe(200);
  const proveedorId = proveedor.datos?.proveedorId ?? '';

  const tomate = await ejecutar<{ productoId: string }>(peticion, token, 'crear_producto', {
    nombre: `Tomate pera ${sufijo}`,
    formato: 'Caja 5 kg',
    factor: 5,
    unidad_de_uso: 'kg',
    precio_centimos: 1000,
    cantidad_inicial: 10,
    proveedor_id: proveedorId,
  });
  expect(tomate.estado, 'Rosa tiene que poder dar de alta el tomate').toBe(200);

  return { nombre, proveedorId, tomateId: tomate.datos?.productoId ?? '' };
}

async function cuantoHay(peticion: APIRequestContext, token: string, productoId: string) {
  const leido = await consultar<{ producto: { cantidad: number; precioCentimos?: number | null } }>(
    peticion,
    token,
    'un_producto',
    { producto_id: productoId },
  );
  expect(leido.estado).toBe(200);
  return leido.datos?.producto;
}

// ── 1 · El ciclo entero, por la API ─────────────────────────────────────────

test('un pedido recorre el ciclo, el inventario cuadra y la factura señala su diferencia', async ({
  request,
}, info) => {
  test.skip(info.project.name !== 'escritorio', UNA_VEZ);

  const rosa = await tokenDe(request, ROSA);
  const sufijo = `ciclo-${Date.now()}`;
  const { proveedorId, tomateId } = await unProveedorConGenero(request, rosa, sufijo);

  const aceite = await ejecutar<{ productoId: string }>(request, rosa, 'crear_producto', {
    nombre: `Aceite ${sufijo}`,
    formato: 'Garrafa 5 l',
    factor: 5,
    unidad_de_uso: 'l',
    precio_centimos: 2000,
    cantidad_inicial: 0,
    proveedor_id: proveedorId,
  });
  const aceiteId = aceite.datos?.productoId ?? '';

  // La ficha se llena sola: sabe cuándo reparte y qué te sirve.
  const ficha = await consultar<{
    proximoReparto: { llegaCuando: string } | null;
    productos: { id: string }[];
  }>(request, rosa, 'un_proveedor', { proveedor_id: proveedorId });
  expect(ficha.estado).toBe(200);
  expect(ficha.datos?.proximoReparto?.llegaCuando).toBe('mañana');
  expect(ficha.datos?.productos.map((p) => p.id).sort()).toEqual([tomateId, aceiteId].sort());

  // Lo que le pediría hoy, con su motivo. Contesta aunque no haya consumo.
  expect(
    (await consultar(request, rosa, 'sugerencia_de_pedido', { proveedor_id: proveedorId })).estado,
  ).toBe(200);

  // ── Hacerlo, cambiarlo y mandarlo ─────────────────────────────────────────
  const creado = await ejecutar<{ pedidoId: string; numero: number }>(
    request,
    rosa,
    'crear_pedido',
    {
      proveedor_id: proveedorId,
      lineas: [
        { producto_id: tomateId, cantidad: 3 },
        { producto_id: aceiteId, cantidad: 2 },
      ],
    },
  );
  expect(creado.estado).toBe(200);
  const pedidoId = creado.datos?.pedidoId ?? '';
  const numero = creado.datos?.numero ?? 0;

  expect(
    (
      await ejecutar(request, rosa, 'cambiar_pedido', {
        pedido_id: pedidoId,
        lineas: [
          { producto_id: tomateId, cantidad: 4 },
          { producto_id: aceiteId, cantidad: 2 },
        ],
      })
    ).estado,
  ).toBe(200);

  const leido = await consultar<PedidoLeido>(request, rosa, 'un_pedido', { pedido_id: pedidoId });
  expect(leido.estado).toBe(200);
  // El pedido escrito para el proveedor: como se compra, y **sin un precio**.
  expect(leido.datos?.texto).toContain('Hola, Juan.');
  expect(leido.datos?.texto).toContain('4 × Caja 5 kg');
  expect(leido.datos?.texto).not.toContain('€');
  // Y a quien ve precios, lo que se espera pagar: 4 × 10 € + 2 × 20 €.
  expect(leido.datos?.totalCentimos).toBe(8000);

  const hoy = await consultar<{ hoy: string }>(request, rosa, 'compras_de_hoy');
  expect(hoy.estado).toBe(200);
  const fecha = hoy.datos?.hoy ?? '';

  expect(
    (
      await ejecutar(request, rosa, 'enviar_pedido', {
        pedido_id: pedidoId,
        canal: 'whatsapp',
        llega_el: fecha,
      })
    ).estado,
  ).toBe(200);

  // ── Sale donde se mira cada mañana ────────────────────────────────────────
  const deHoy = await consultar<{ llegan: { pedidoId: string }[] }>(
    request,
    rosa,
    'compras_de_hoy',
  );
  expect(deHoy.datos?.llegan.map((l) => l.pedidoId)).toContain(pedidoId);

  const viene = await consultar<{ dias: { ocurrencias: { titulo: string; capa: string }[] }[] }>(
    request,
    rosa,
    'lo_que_viene',
  );
  expect(viene.estado).toBe(200);
  expect(
    viene.datos?.dias[0]?.ocurrencias.some(
      (o) => o.capa === 'entrega' && o.titulo.includes(`pedido ${numero}`),
    ),
    'la entrega del pedido tiene que salir hoy en «Lo que viene»',
  ).toBe(true);

  const abiertos = await consultar<{ pedidos: { id: string }[] }>(request, rosa, 'mis_pedidos', {
    vista: 'abiertos',
  });
  expect(abiertos.datos?.pedidos.map((p) => p.id)).toContain(pedidoId);

  // ── Recibirlo con cambios: falta una caja y el tomate viene más caro ──────
  const lineaDe = (productoId: string) =>
    leido.datos?.lineas.find((l) => l.productoId === productoId)?.id ?? '';

  const recibido = await ejecutar<{
    albaranId: string;
    estadoDelPedido: string;
    incidencias: { producto: string; incidencias: string[] }[];
    precios?: { producto: string; frase: string }[];
  }>(request, rosa, 'recibir_albaran', {
    pedido_id: pedidoId,
    entero: false,
    numero: `A-${sufijo}`,
    lineas: [
      {
        linea_de_pedido_id: lineaDe(tomateId),
        producto_id: tomateId,
        formatos: 3,
        precio_centimos: 1100,
      },
      { linea_de_pedido_id: lineaDe(aceiteId), producto_id: aceiteId, formatos: 2 },
    ],
  });
  expect(recibido.estado).toBe(200);
  expect(recibido.datos?.estadoDelPedido).toBe('recibido_con_incidencias');
  const delTomate = recibido.datos?.incidencias.find((i) => i.producto.startsWith('Tomate'));
  expect(delTomate?.incidencias.sort()).toEqual(['falta', 'precio']);
  expect(recibido.datos?.precios?.length ?? 0).toBeGreaterThan(0);
  const albaranId = recibido.datos?.albaranId ?? '';

  // El inventario cuadra —10 kg de antes y 3 cajas de 5— y el precio nuevo ya
  // es el del tomate, que es lo que leerán los escandallos.
  const tomate = await cuantoHay(request, rosa, tomateId);
  expect(tomate?.cantidad).toBe(25);
  expect(tomate?.precioCentimos).toBe(1100);

  const albaranes = await consultar<{ albaranes: { id: string }[] }>(
    request,
    rosa,
    'mis_albaranes',
  );
  expect(albaranes.datos?.albaranes.map((a) => a.id)).toContain(albaranId);
  const albaran = await consultar<{ lineas: unknown[] }>(request, rosa, 'un_albaran', {
    albaran_id: albaranId,
  });
  expect(albaran.datos?.lineas).toHaveLength(2);

  // ── Devolver una garrafa al día siguiente ─────────────────────────────────
  const devuelto = await ejecutar<{ albaranId: string }>(request, rosa, 'devolver_al_proveedor', {
    proveedor_id: proveedorId,
    motivo: 'Llegó una garrafa rota',
    lineas: [{ producto_id: aceiteId, formatos: 1, importe_centimos: 2000 }],
  });
  expect(devuelto.estado).toBe(200);
  expect((await cuantoHay(request, rosa, aceiteId))?.cantidad).toBe(5);

  // ── La factura: se apunta, y se comprueba después con sus albaranes ───────
  // Lo que ha llegado suma 3 × 11 € + 2 × 20 € = 73 €, menos la garrafa devuelta:
  // 53 €. La factura dice 55 €: te cobran 2 € de más.
  const pendientes = await consultar<{ albaranes: { id: string }[] }>(
    request,
    rosa,
    'para_conciliar',
    {
      proveedor_id: proveedorId,
    },
  );
  expect(pendientes.datos?.albaranes.map((a) => a.id).sort()).toEqual(
    [albaranId, devuelto.datos?.albaranId ?? ''].sort(),
  );

  const apuntada = await ejecutar<{ facturaId: string; estado: string }>(
    request,
    rosa,
    'registrar_factura',
    { proveedor_id: proveedorId, numero: `F-${sufijo}`, fecha, base_centimos: 5500 },
  );
  expect(apuntada.estado).toBe(200);
  expect(apuntada.datos?.estado).toBe('sin_conciliar');
  const facturaId = apuntada.datos?.facturaId ?? '';

  const conciliada = await ejecutar<{ estado: string; diferenciaCentimos: number; frase: string }>(
    request,
    rosa,
    'conciliar_factura',
    { factura_id: facturaId, albaranes: [albaranId, devuelto.datos?.albaranId ?? ''] },
  );
  expect(conciliada.estado).toBe(200);
  expect(conciliada.datos?.estado).toBe('con_diferencia');
  expect(conciliada.datos?.diferenciaCentimos).toBe(200);
  expect(conciliada.datos?.frase).toMatch(/te cobran 2,00\s€ de más/);

  const facturas = await consultar<{ facturas: { id: string }[] }>(request, rosa, 'mis_facturas');
  expect(facturas.datos?.facturas.map((f) => f.id)).toContain(facturaId);
  const factura = await consultar<{ frase: string | null }>(request, rosa, 'una_factura', {
    factura_id: facturaId,
  });
  expect(factura.datos?.frase).toMatch(/te cobran 2,00\s€ de más/);

  // ── Lo pactado, y que se diga cuando no se cumple ─────────────────────────
  const pactado = await ejecutar<{ pactadoId: string }>(request, rosa, 'pactar_precio', {
    producto_id: tomateId,
    proveedor_id: proveedorId,
    precio_centimos: 1000,
  });
  expect(pactado.estado).toBe(200);
  const precios = await consultar<{ pactados: { id: string; porEncima: boolean }[] }>(
    request,
    rosa,
    'comparar_precios',
  );
  expect(precios.datos?.pactados.find((p) => p.id === pactado.datos?.pactadoId)?.porEncima).toBe(
    true,
  );
  expect(
    (await ejecutar(request, rosa, 'dejar_de_pactar', { pactado_id: pactado.datos?.pactadoId }))
      .estado,
  ).toBe(200);

  // ── Y un pedido que no sigue: se cancela con su motivo ────────────────────
  const otro = await ejecutar<{ pedidoId: string }>(request, rosa, 'crear_pedido', {
    proveedor_id: proveedorId,
    lineas: [{ producto_id: tomateId, cantidad: 1 }],
  });
  expect(
    (
      await ejecutar(request, rosa, 'cancelar_pedido', {
        pedido_id: otro.datos?.pedidoId,
        motivo: 'Nos hemos equivocado de proveedor',
      })
    ).estado,
  ).toBe(200);
  const cancelado = await consultar<PedidoLeido>(request, rosa, 'un_pedido', {
    pedido_id: otro.datos?.pedidoId ?? '',
  });
  expect(cancelado.datos?.pedido.estado).toBe('cancelado');
});

// ── 2 · Lo que un cocinero hace, y lo que no le llega ────────────────────────

test('un cocinero hace el pedido y lo recibe sin ver un euro, y mandarlo no le deja', async ({
  request,
}, info) => {
  test.skip(info.project.name !== 'escritorio', UNA_VEZ);

  const rosa = await tokenDe(request, ROSA);
  const marcos = await tokenDe(request, MARCOS);
  const { proveedorId, tomateId } = await unProveedorConGenero(
    request,
    rosa,
    `cocina-${Date.now()}`,
  );

  const creado = await ejecutar<{ pedidoId: string }>(request, marcos, 'crear_pedido', {
    proveedor_id: proveedorId,
    lineas: [{ producto_id: tomateId, cantidad: 2 }],
  });
  expect(creado.estado, 'el borrador lo hace quien sabe lo que falta').toBe(200);
  const pedidoId = creado.datos?.pedidoId ?? '';

  // **El dato no viaja**: ni el total, ni el precio de una línea.
  const suyo = await consultar<PedidoLeido>(request, marcos, 'un_pedido', { pedido_id: pedidoId });
  expect(suyo.estado).toBe(200);
  expect(suyo.datos).not.toHaveProperty('totalCentimos');
  expect(suyo.datos?.lineas[0]).not.toHaveProperty('precioCentimos');
  expect(suyo.datos?.puedeEnviar).toBe(false);

  // Mandarlo compromete dinero del local: `accion.enviar_pedidos`.
  expect(
    (await ejecutar(request, marcos, 'enviar_pedido', { pedido_id: pedidoId, canal: 'telefono' }))
      .estado,
  ).toBe(403);
  // Y las facturas y la comparativa son dinero entero: ni le llegan.
  expect((await consultar(request, marcos, 'mis_facturas')).estado).toBe(403);
  expect((await consultar(request, marcos, 'comparar_precios')).estado).toBe(403);

  // Lo manda Rosa, y lo recibe Marcos: entero, sin tocar un precio.
  expect(
    (await ejecutar(request, rosa, 'enviar_pedido', { pedido_id: pedidoId, canal: 'telefono' }))
      .estado,
  ).toBe(200);
  const recibido = await ejecutar<Record<string, unknown>>(request, marcos, 'recibir_albaran', {
    pedido_id: pedidoId,
    entero: true,
  });
  expect(recibido.estado).toBe(200);
  expect(recibido.datos?.['estadoDelPedido']).toBe('recibido');
  expect(recibido.datos).not.toHaveProperty('totalCentimos');
  expect((await cuantoHay(request, rosa, tomateId))?.cantidad).toBe(20);
});

// ── 3 · Desde la pantalla ────────────────────────────────────────────────────

test('desde la pantalla: se manda, sale en Hoy, y se recibe entero en dos toques', async ({
  page,
  request,
}, info) => {
  const rosa = await tokenDe(request, ROSA);
  const sufijo = `${info.project.name}-${Date.now()}`;
  const { nombre, proveedorId, tomateId } = await unProveedorConGenero(request, rosa, sufijo);
  const creado = await ejecutar<{ pedidoId: string; numero: number }>(
    request,
    rosa,
    'crear_pedido',
    {
      proveedor_id: proveedorId,
      lineas: [{ producto_id: tomateId, cantidad: 2 }],
    },
  );
  const pedidoId = creado.datos?.pedidoId ?? '';
  const numero = creado.datos?.numero ?? 0;

  await entrar(page, ROSA);
  await page.goto(`${APP}#/inventario/compras/pedidos?pedido=${pedidoId}`, {
    waitUntil: 'domcontentloaded',
  });

  // ── Mandarlo: Estook no lo manda solo; se apunta cuando se ha mandado ─────
  const ficha = page.getByRole('dialog', { name: `Pedido ${numero} · ${nombre}` });
  await expect(ficha.getByRole('heading', { name: 'Mandárselo' })).toBeVisible();
  await expect(ficha.getByText('2 × Caja 5 kg de Tomate pera')).toBeVisible();

  await ficha.getByRole('button', { name: 'Se lo he dicho de otra forma' }).click();
  await ficha.getByRole('button', { name: 'Sí, ya está mandado' }).click();
  await expect(ficha.getByText(/Apuntado: mandado/)).toBeVisible();
  await expect(ficha.getByRole('button', { name: 'Recibir lo que ha llegado' })).toBeVisible();

  // ── Y sale en «Hoy», con su botón de recibir ──────────────────────────────
  await page.goto(`${APP}#/inventario/hoy`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 2, name: 'Compras de hoy' })).toBeVisible();
  await expect(page.getByText(nombre).first()).toBeVisible();

  // ── Recibir: el botón de «Hoy» abre la recepción directamente ─────────────
  await page.goto(`${APP}#/inventario/compras/pedidos?pedido=${pedidoId}&recibir=1`, {
    waitUntil: 'domcontentloaded',
  });
  const recibir = page.getByRole('dialog', { name: `Recibir el pedido ${numero}` });
  await expect(recibir.getByRole('heading', { name: '¿Ha llegado entero?' })).toBeVisible();
  await recibir.getByRole('button', { name: 'Sí, ha llegado entero' }).click();
  await expect(recibir.getByText('Apuntado: ha entrado todo en cámara')).toBeVisible();

  // Y el género está dentro: 10 kg de antes y dos cajas de 5.
  expect((await cuantoHay(request, rosa, tomateId))?.cantidad).toBe(20);
});

test('un cocinero ve su borrador sin un precio, y quién lo tiene que mandar', async ({
  page,
  request,
}, info) => {
  const rosa = await tokenDe(request, ROSA);
  const marcos = await tokenDe(request, MARCOS);
  const sufijo = `${info.project.name}-${Date.now()}`;
  const { nombre, proveedorId, tomateId } = await unProveedorConGenero(request, rosa, sufijo);
  const creado = await ejecutar<{ pedidoId: string; numero: number }>(
    request,
    marcos,
    'crear_pedido',
    {
      proveedor_id: proveedorId,
      lineas: [{ producto_id: tomateId, cantidad: 3 }],
    },
  );

  await entrar(page, MARCOS);
  await page.goto(`${APP}#/inventario/compras/pedidos?pedido=${creado.datos?.pedidoId ?? ''}`, {
    waitUntil: 'domcontentloaded',
  });

  const ficha = page.getByRole('dialog', {
    name: `Pedido ${creado.datos?.numero ?? 0} · ${nombre}`,
  });
  await expect(ficha.getByText('Queda en borrador')).toBeVisible();
  await expect(ficha.getByRole('heading', { name: 'Mandárselo' })).toHaveCount(0);
  // Ni un importe en la ficha: el servidor no se lo manda.
  await expect(ficha.getByText(/€/)).toHaveCount(0);
});

test('la factura dice si cuadra mientras se escribe', async ({ page, request }, info) => {
  const rosa = await tokenDe(request, ROSA);
  const sufijo = `${info.project.name}-${Date.now()}`;
  const { nombre, proveedorId, tomateId } = await unProveedorConGenero(request, rosa, sufijo);

  // Llegan dos cajas a 10 €: el albarán suma 20 €.
  const creado = await ejecutar<{ pedidoId: string }>(request, rosa, 'crear_pedido', {
    proveedor_id: proveedorId,
    lineas: [{ producto_id: tomateId, cantidad: 2 }],
  });
  const pedidoId = creado.datos?.pedidoId ?? '';
  await ejecutar(request, rosa, 'enviar_pedido', { pedido_id: pedidoId, canal: 'telefono' });
  await ejecutar(request, rosa, 'recibir_albaran', { pedido_id: pedidoId, entero: true });
  const hoy = (await consultar<{ hoy: string }>(request, rosa, 'compras_de_hoy')).datos?.hoy ?? '';

  await entrar(page, ROSA);
  // «Apuntar una factura» es una acción del catálogo: una dirección que abre la hoja.
  await page.goto(`${APP}#/inventario/compras/facturas?hacer=nueva`, {
    waitUntil: 'domcontentloaded',
  });

  const hoja = page.getByRole('dialog', { name: 'Apuntar una factura' });
  await hoja.getByLabel('¿De quién es?').selectOption({ label: nombre });
  await hoja.getByLabel('Número').fill(`F-${sufijo}`);
  await hoja.getByLabel('Fecha').fill(hoy);
  await hoja.getByLabel('Base, sin impuestos').fill('21,00');

  // El albarán se marca solo, y la cuenta sale antes de guardar nada.
  await expect(hoja.getByText(/te cobran 1,00\s€ de más/)).toBeVisible();

  await hoja.getByRole('button', { name: 'Apuntar y comprobar' }).click();
  const hecha = page.getByRole('dialog', { name: 'Factura apuntada' });
  await expect(hecha.getByText('Con diferencia')).toBeVisible();
});
