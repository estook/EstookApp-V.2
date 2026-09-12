import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { horaDeCorte, jornadaDe, masDias } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Las bases, repasadas · lo que Richi pidió antes de seguir al M8.
 *
 *   · «Al apuntar merma me busca también en el catálogo de ejemplo.»
 *   · «Que quede claro si se ha vendido —y cuánto— o si se ha tirado.»
 *   · «Hay un tag naranja que dice "sin verificar" y no sé cómo quitarlo.»
 *   · «Si hay listas enormes, poder ver más, y si no, buscar por tiempo.»
 *   · «El deshacer ha desaparecido, y lo necesito al editar cosas importantes.»
 *
 * Cada bloque es una de esas frases, y cada prueba dice qué fallaba. Lo de
 * deshacer no está aquí porque vive entero en la pantalla —cada acción trae su
 * contraria escrita— y lo prueban las de extremo a extremo.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro: sin precios

let rosa: string;
let marcos: string;

/**
 * La jornada de hoy en el local de Rosa, que cierra a las 03:00.
 *
 * No es la fecha del calendario, y la diferencia importa justo aquí: lo que se
 * apunta a las dos de la madrugada pertenece a la jornada del día anterior
 * (regla 10). Comparar con la fecha de Madrid hacía que estas pruebas fallaran
 * solas de madrugada, y lo que estaba mal era la comparación.
 */
const hoy = jornadaDe(new Date(Date.now()), 'Europe/Madrid', horaDeCorte('03:00'));

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function loQueHay(productoId: string): Promise<number> {
  const [fila] = await comoDuena<{ cantidad: string }>(
    'select cantidad::text as cantidad from estook.existencias where producto_id = $1',
    [productoId],
  );
  return fila === undefined ? 0 : Number(fila.cantidad);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · La merma no busca en el catálogo de ejemplo
// ═══════════════════════════════════════════════════════════════════════════

describe('apuntar merma busca solo en tu género', () => {
  let boqueron: string;

  it('el género de verdad sale al buscarlo', async () => {
    // El local empieza vacío, y con el catálogo de ejemplo puesto es como lo ve
    // alguien que acaba de darse de alta: es exactamente la situación de la que
    // se quejó Richi.
    const puestos = losDatos<{ productos: number }>(
      await api.ejecutar(rosa, 'poner_los_ejemplos', {}),
    );
    expect(puestos.productos).toBeGreaterThan(0);

    boqueron = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Boquerón de las bases',
        unidad_de_uso: 'kg',
        cantidad_inicial: 3,
      }),
    ).productoId;

    const buscado = losDatos<{ productos: { id: string }[] }>(
      await api.consultar(rosa, 'productos_para_merma', { texto: 'boqueron' }),
    );
    expect(buscado.productos.some((p) => p.id === boqueron)).toBe(true);
  });

  it('y los de ejemplo no, aunque el nombre encaje', async () => {
    // Las semillas dejan género de ejemplo en el mismo local, marcado
    // `es_ejemplo`. Sale en la lista de Productos a propósito —«para poder
    // mirarlos y aprender de ellos»— y aquí no tiene nada que hacer: esto se abre
    // en mitad de un servicio para decir qué se acaba de romper.
    const [unEjemplo] = await comoDuena<{ id: string; nombre: string }>(
      `select p.id::text as id, p.nombre
         from estook.producto p
        where p.es_ejemplo and p.activo
          and p.local_id = (select local_id from estook.producto where id = $1)
        limit 1`,
      [boqueron],
    );
    expect(unEjemplo).toBeDefined();

    const buscado = losDatos<{ productos: { id: string }[] }>(
      await api.consultar(rosa, 'productos_para_merma', {
        texto: (unEjemplo?.nombre ?? '').slice(0, 5),
      }),
    );

    // Antes salían los primeros de la lista, y apuntarle una merma a uno no
    // contaba para nada sin que quien la apuntaba lo supiera.
    expect(buscado.productos.some((p) => p.id === unEjemplo?.id)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 · Vender y gastar dejan de ser el mismo botón
// ═══════════════════════════════════════════════════════════════════════════

describe('lo que sale dice si se vendió, y a cuánto', () => {
  let cerveza: string;

  it('se da de alta con su precio de venta', async () => {
    cerveza = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Botellín de las bases',
        unidad_de_uso: 'ud',
        cantidad_inicial: 100,
        precio_centimos: 45,
      }),
    ).productoId;

    await api.ejecutar(rosa, 'cambiar_producto', {
      producto_id: cerveza,
      nombre: 'Botellín de las bases',
      categoria_id: null,
      formato: null,
      factor: 1,
      unidad_de_uso: 'ud',
      rendimiento: 1,
      categoria_fiscal: 'bebida_alcoholica',
      alergenos: [],
      peso_variable: false,
      codigo_de_barras: null,
      minimo: null,
      proveedor_id: null,
      notas: null,
      precio_de_venta_centimos: 250,
    });

    const ficha = losDatos<{ producto: { precioDeVentaCentimos: number; ivaDeVenta: number } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: cerveza }),
    );
    expect(ficha.producto.precioDeVentaCentimos).toBe(250);
    // Nadie lo ha elegido, así que lo pone la actividad: un servicio de
    // restauración en la península va al 10 %, sea cerveza o sea sopa.
    expect(ficha.producto.ivaDeVenta).toBe(0.1);
  });

  it('«vendido» apunta una venta con lo que se ha cobrado', async () => {
    await api.ejecutar(rosa, 'apuntar_salida', {
      producto_id: cerveza,
      cuanto: 2,
      por_que: 'vendido',
      ingreso_centimos: 500,
    });

    const [linea] = await comoDuena<{ tipo: string; ingreso: string | null; motivo: string }>(
      `select tipo::text as tipo, ingreso_centimos::text as ingreso, motivo
         from estook.movimiento_de_stock
        where producto_id = $1 order by id desc limit 1`,
      [cerveza],
    );
    expect(linea?.tipo).toBe('venta');
    expect(Number(linea?.ingreso)).toBe(500);
    // El nombre del motivo lo pone el servidor desde el catálogo, no la pantalla.
    expect(linea?.motivo).toBe('Vendido a un cliente');
    expect(await loQueHay(cerveza)).toBe(98);
  });

  it('«gastado» sigue siendo una salida, y no trae dinero', async () => {
    await api.ejecutar(rosa, 'apuntar_salida', {
      producto_id: cerveza,
      cuanto: 1,
      por_que: 'gastado',
    });

    const [linea] = await comoDuena<{ tipo: string; ingreso: string | null }>(
      `select tipo::text as tipo, ingreso_centimos::text as ingreso
         from estook.movimiento_de_stock
        where producto_id = $1 order by id desc limit 1`,
      [cerveza],
    );
    expect(linea?.tipo).toBe('salida');
    expect(linea?.ingreso).toBeNull();
  });

  it('una salida que no es venta no puede traer dinero', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'apuntar_salida', {
          producto_id: cerveza,
          cuanto: 1,
          por_que: 'gastado',
          ingreso_centimos: 300,
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('una merma no entra por aquí: tiene su comando y su partida', async () => {
    // El catálogo dice cuáles son merma, y el comando no los acepta: si entraran,
    // saldrían sin partida y el coste de lo que se vende mentiría.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'apuntar_salida', {
          producto_id: cerveza,
          cuanto: 1,
          por_que: 'caducado',
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('sin decir por qué, sigue siendo «gastado»: lo de siempre no se rompe', async () => {
    await api.ejecutar(rosa, 'apuntar_salida', { producto_id: cerveza, cuanto: 1 });
    const [linea] = await comoDuena<{ tipo: string }>(
      `select tipo::text as tipo from estook.movimiento_de_stock
        where producto_id = $1 order by id desc limit 1`,
      [cerveza],
    );
    expect(linea?.tipo).toBe('salida');
  });

  it('lo vendido sale propuesto al cerrar la caja, y no suma solo', async () => {
    const caja = losDatos<{
      cierre: unknown;
      vendidoEnCamara: { concepto: string; unidades: number; importeCentimos: number }[];
    }>(await api.consultar(rosa, 'un_cierre'));

    const suyo = caja.vendidoEnCamara.find((v) => v.concepto === 'Botellín de las bases');
    expect(suyo).toBeDefined();
    expect(suyo?.unidades).toBe(2);
    expect(suyo?.importeCentimos).toBe(500);

    // **Y la caja sigue sin existir.** Es la mitad de la decisión: el dinero de
    // una jornada lo cuenta el cierre, y una salida de cámara no lo suma por su
    // cuenta. Si lo hiciera, meter además el papel de la caja contaría el día dos
    // veces y no se vería.
    expect(caja.cierre).toBeNull();
  });

  it('quien no ve precios no recibe ni lo que se cobró', async () => {
    const libro = losDatos<{
      movimientos: Record<string, unknown>[];
    }>(await api.consultar(marcos, 'mis_movimientos', { limite: '50' }));

    for (const linea of libro.movimientos) {
      expect(linea).not.toHaveProperty('ingresoCentimos');
      expect(linea).not.toHaveProperty('costeMilesimas');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 · «Sin verificar» deja de volver solo
// ═══════════════════════════════════════════════════════════════════════════

describe('el aprovechamiento se mide, y deja de volver a marcarse solo', () => {
  let pulpo: string;

  const laFicha = (nombre: string) => ({
    nombre,
    categoria_id: null,
    formato: null,
    factor: 1,
    unidad_de_uso: 'kg',
    rendimiento: 1,
    categoria_fiscal: 'alimento',
    alergenos: [],
    peso_variable: false,
    codigo_de_barras: null,
    minimo: null,
    proveedor_id: null,
    notas: null,
  });

  async function sinVerificar(): Promise<boolean> {
    const [fila] = await comoDuena<{ sin_verificar: boolean }>(
      'select sin_verificar from estook.producto where id = $1',
      [pulpo],
    );
    return fila?.sin_verificar === true;
  }

  it('nace sin medir, que es la verdad', async () => {
    pulpo = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Pulpo de las bases',
        unidad_de_uso: 'kg',
        cantidad_inicial: 5,
      }),
    ).productoId;
    expect(await sinVerificar()).toBe(true);
  });

  it('se marca como medido cuando alguien lo mide', async () => {
    await api.ejecutar(rosa, 'cambiar_producto', {
      ...laFicha('Pulpo de las bases'),
      producto_id: pulpo,
      rendimiento: 0.62,
      verificado: true,
    });
    expect(await sinVerificar()).toBe(false);
  });

  it('y corregir una errata en el nombre NO lo vuelve a marcar', async () => {
    // Este era el fallo: el servidor ponía `sin_verificar = !cambiaElCoste`, así
    // que guardar la ficha sin tocar la cuenta lo marcaba otra vez. La etiqueta
    // naranja salía en todos los productos y no había forma de quitarla.
    await api.ejecutar(rosa, 'cambiar_producto', {
      ...laFicha('Pulpo de las bases, limpio'),
      producto_id: pulpo,
      rendimiento: 0.62,
    });
    expect(await sinVerificar()).toBe(false);
  });

  it('y se puede volver a dejar por medir, a mano', async () => {
    await api.ejecutar(rosa, 'cambiar_producto', {
      ...laFicha('Pulpo de las bases, limpio'),
      producto_id: pulpo,
      rendimiento: 0.62,
      verificado: false,
    });
    expect(await sinVerificar()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 · El libro se busca entero, no solo lo que cabe en pantalla
// ═══════════════════════════════════════════════════════════════════════════

describe('el libro de movimientos se busca en el servidor', () => {
  it('busca por producto, por quién lo apuntó y por el motivo', async () => {
    const porProducto = losDatos<{ movimientos: { producto: string }[] }>(
      await api.consultar(rosa, 'mis_movimientos', { texto: 'botellin de las bases' }),
    );
    expect(porProducto.movimientos.length).toBeGreaterThan(0);
    for (const linea of porProducto.movimientos) {
      expect(linea.producto).toBe('Botellín de las bases');
    }

    const porMotivo = losDatos<{ movimientos: { motivo: string | null }[] }>(
      await api.consultar(rosa, 'mis_movimientos', { texto: 'vendido a un cliente' }),
    );
    expect(porMotivo.movimientos.length).toBeGreaterThan(0);
  });

  it('acota por tramo de fechas, con las dos puntas', async () => {
    const deHoy = losDatos<{ movimientos: unknown[] }>(
      await api.consultar(rosa, 'mis_movimientos', { desde: hoy, hasta: hoy }),
    );
    expect(deHoy.movimientos.length).toBeGreaterThan(0);

    // Y ningún tramo trae nada de fuera del tramo. Los ejemplos dejan semanas de
    // historia detrás, así que esto no es una lista vacía: es una lista acotada,
    // que es lo que hay que comprobar.
    const deAntes = losDatos<{ movimientos: { fechaOperativa: string }[] }>(
      await api.consultar(rosa, 'mis_movimientos', {
        desde: masDias(hoy, -90),
        hasta: masDias(hoy, -1),
        limite: '200',
      }),
    );
    for (const linea of deAntes.movimientos) {
      expect(linea.fechaOperativa >= masDias(hoy, -90)).toBe(true);
      expect(linea.fechaOperativa <= masDias(hoy, -1)).toBe(true);
    }
  });

  it('trae las ventas por su tipo, que es la vista nueva', async () => {
    const ventas = losDatos<{ movimientos: { tipo: string }[] }>(
      await api.consultar(rosa, 'mis_movimientos', { tipo: 'venta' }),
    );
    expect(ventas.movimientos.length).toBeGreaterThan(0);
    for (const linea of ventas.movimientos) expect(linea.tipo).toBe('venta');
  });

  it('y las mermas también, que era una vista rota', async () => {
    // La vista «Mermas» del libro mandaba `tipo=merma` y la consulta solo
    // aceptaba entrada, salida y ajuste: contestaba «datos no válidos» y la
    // pantalla salía en rojo. Estaba en la barra desde M6½.
    const mermas = losDatos<{ movimientos: unknown[] }>(
      await api.consultar(rosa, 'mis_movimientos', { tipo: 'merma' }),
    );
    expect(Array.isArray(mermas.movimientos)).toBe(true);
  });

  it('se pagina de verdad: la segunda página no repite la primera', async () => {
    const primera = losDatos<{ movimientos: { id: string }[]; hayMas: boolean }>(
      await api.consultar(rosa, 'mis_movimientos', { limite: '2' }),
    );
    expect(primera.hayMas).toBe(true);

    const segunda = losDatos<{ movimientos: { id: string }[] }>(
      await api.consultar(rosa, 'mis_movimientos', { limite: '2', salto: '2' }),
    );
    const idsDeLaPrimera = new Set(primera.movimientos.map((m) => m.id));
    for (const linea of segunda.movimientos) expect(idsDeLaPrimera.has(linea.id)).toBe(false);
  });
});
