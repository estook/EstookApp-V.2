import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { diaDeLaSemana, fechaEnElLocal, masDias } from '@estook/dominio';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M8 · contar el almacén, la primera entrega (decisión 0078 · migración 0060), contra
 * Postgres de verdad y llamando a la API a pelo.
 *
 *   · cuenta el cocinero y cierra quien tiene el permiso (2A), a ciegas
 *   · lo que entra entre contar y cerrar no se pierde
 *   · que lo vuelvan a contar, recontar y descartar
 *   · el cierre de un paso de siempre, por el mismo camino
 *   · los lotes se gastan solos, primero el que antes caduca, y una anulación los devuelve
 *   · la merma de la camarera también gasta del lote
 *   · el valor del almacén en cualquier fecha, solo con precios
 *   · el mínimo calculado se propone, se acepta y se apaga al cambiarlo a mano (3A)
 *   · los lunes, el aviso de lo que toca contar
 */

let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: cierra
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro: cuenta
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro: apunta mermas
const SECRETO = 'el-secreto-del-reloj-de-contar';

let rosa: string;
let marcos: string;
let sara: string;

const HOY = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

/** La API a una hora dada: para apuntar días pasados y para el reloj. */
function apiEl(instante: string): ApiDePrueba {
  return montarLaApi(base.bd, { correo, ahora: () => new Date(instante) });
}

async function loQueHay(productoId: string): Promise<number> {
  const [fila] = await comoDuena<{ cantidad: string }>(
    'select cantidad::text as cantidad from estook.existencias where producto_id = $1',
    [productoId],
  );
  return fila === undefined ? 0 : Number(fila.cantidad);
}

async function nuevoProducto(
  token: string,
  nombre: string,
  datos: Record<string, unknown> = {},
  quien: ApiDePrueba = api,
): Promise<string> {
  return losDatos<{ productoId: string }>(
    await quien.ejecutar(token, 'crear_producto', { nombre, unidad_de_uso: 'kg', ...datos }),
  ).productoId;
}

interface Aviso {
  tipo: string;
  titulo: string;
  detalle: string | null;
  ir: string | null;
}

async function susAvisos(token: string, tipo: string): Promise<Aviso[]> {
  return losDatos<{ avisos: Aviso[] }>(await api.consultar(token, 'mis_avisos')).avisos.filter(
    (a) => a.tipo === tipo,
  );
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo });
  // Bar Centro deja de ser un ejemplo: el reloj no avisa a los ejemplos.
  await comoDuena(`update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

// ── Contar y cerrar, dos pasos (2A) ──────────────────────────────────────────

describe('cuenta el cocinero, cierra quien tiene el permiso', () => {
  let pulpo: string;
  let gambas: string;
  let inventarioId: string;

  beforeAll(async () => {
    pulpo = await nuevoProducto(rosa, 'Pulpo de contar', {
      cantidad_inicial: 10,
      precio_centimos: 3200,
    });
    gambas = await nuevoProducto(rosa, 'Gambas de contar', {
      cantidad_inicial: 4,
      precio_centimos: 1800,
    });
  });

  it('el cocinero manda lo contado, y a quien cierra le llega el aviso', async () => {
    const mandado = losDatos<{ inventarioId: string; contados: number }>(
      await api.ejecutar(marcos, 'enviar_lo_contado', {
        zona: 'cocina',
        lineas: [
          { producto_id: pulpo, hay: 7 },
          { producto_id: gambas, hay: 4 },
        ],
      }),
    );
    inventarioId = mandado.inventarioId;
    expect(mandado.contados).toBe(2);

    // Mandar no toca el libro.
    expect(await loQueHay(pulpo)).toBe(10);

    const [aviso] = await susAvisos(rosa, 'inventario.contado');
    expect(aviso?.titulo).toBe('Marcos ha contado cocina');
    expect(aviso?.detalle).toBe('2 productos, 1 no cuadra. Míralo y ciérralo.');
    expect(aviso?.ir).toBe(`/almacen/movimientos/inventario?inventario=${inventarioId}`);
  });

  it('el cocinero no lo puede cerrar', async () => {
    expect(
      elFallo(await api.ejecutar(marcos, 'cerrar_inventario', { inventario_id: inventarioId })),
    ).toBe('sin_permiso');
  });

  it('cuenta a ciegas: a quien cuenta no le llega lo que decía el libro', async () => {
    const suyo = losDatos<{ lineas: Record<string, unknown>[]; puedeCerrar: boolean }>(
      await api.consultar(marcos, 'un_inventario', { inventario_id: inventarioId }),
    );
    expect(suyo.puedeCerrar).toBe(false);
    for (const linea of suyo.lineas) {
      expect(linea).not.toHaveProperty('decia');
      expect(linea).not.toHaveProperty('diferencia');
      expect(linea).not.toHaveProperty('valorDeLaDiferenciaCentimos');
    }

    const deRosa = losDatos<{
      lineas: {
        producto: string;
        decia: number;
        diferencia: number;
        valorDeLaDiferenciaCentimos: number;
      }[];
    }>(await api.consultar(rosa, 'un_inventario', { inventario_id: inventarioId }));
    // Lo que más baila, primero: el pulpo, 3 kg a 32 €.
    expect(deRosa.lineas[0]).toMatchObject({
      producto: 'Pulpo de contar',
      decia: 10,
      diferencia: -3,
      valorDeLaDiferenciaCentimos: -9600,
    });
  });

  it('lo que entra entre contar y cerrar no se pierde', async () => {
    // Marcos contó 7 a las 7; a las 9 entran 5; Rosa cierra a las 11.
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: pulpo,
        cuanto: 5,
        como: 'unidades_de_uso',
      }),
    );
    expect(await loQueHay(pulpo)).toBe(15);

    const cerrado = losDatos<{ corregidos: number; yaCuadraban: number; fuera: number }>(
      await api.ejecutar(rosa, 'cerrar_inventario', { inventario_id: inventarioId }),
    );
    expect(cerrado).toMatchObject({ corregidos: 1, yaCuadraban: 1, fuera: 0 });
    // 15 que había, menos los 3 que faltaban al contar: 12. Con «lo que hay» de las
    // 11 serían 7, y los 5 del albarán se habrían perdido.
    expect(await loQueHay(pulpo)).toBe(12);

    const [linea] = await comoDuena<{
      tipo: string;
      cantidad: string;
      referencia: { inventario: string };
    }>(
      `select tipo::text as tipo, cantidad::text as cantidad, referencia
         from estook.movimiento_de_stock where producto_id = $1 order by id desc limit 1`,
      [pulpo],
    );
    expect(linea).toMatchObject({ tipo: 'recuento', cantidad: '-3.0000' });
    expect(linea?.referencia.inventario).toBe(inventarioId);
  });

  it('un inventario cerrado no se cierra dos veces', async () => {
    expect(
      elFallo(await api.ejecutar(rosa, 'cerrar_inventario', { inventario_id: inventarioId })),
    ).toBe('ya_hecho');
  });
});

describe('que lo vuelvan a contar, y descartar', () => {
  let merluza: string;
  let inventarioId: string;

  beforeAll(async () => {
    merluza = await nuevoProducto(rosa, 'Merluza de recontar', {
      cantidad_inicial: 8,
      precio_centimos: 1500,
    });
    inventarioId = losDatos<{ inventarioId: string }>(
      await api.ejecutar(marcos, 'enviar_lo_contado', {
        lineas: [{ producto_id: merluza, hay: 2, formatos: 1, sueltas: 0 }],
      }),
    ).inventarioId;
  });

  it('quien cierra pide que se recuente, y a quien contó le llega', async () => {
    losDatos(
      await api.ejecutar(rosa, 'pedir_que_lo_recuenten', {
        inventario_id: inventarioId,
        producto_ids: [merluza],
      }),
    );
    const [aviso] = await susAvisos(marcos, 'inventario.recontar');
    expect(aviso?.titulo).toBe('Vuelve a contar 1 producto');
    expect(aviso?.detalle).toBe('Merluza de recontar. Te lo pide Rosa.');

    const suyo = losDatos<{ paraRecontar: { productoId: string }[] }>(
      await api.consultar(marcos, 'el_inventario'),
    );
    expect(suyo.paraRecontar.map((p) => p.productoId)).toEqual([merluza]);
  });

  it('cerrar con la línea pendiente la deja fuera, y lo dice', async () => {
    // Otro inventario igual, para no tocar el que se va a recontar.
    const otro = losDatos<{ inventarioId: string }>(
      await api.ejecutar(marcos, 'enviar_lo_contado', {
        lineas: [{ producto_id: merluza, hay: 1 }],
      }),
    ).inventarioId;
    losDatos(
      await api.ejecutar(rosa, 'pedir_que_lo_recuenten', {
        inventario_id: otro,
        producto_ids: [merluza],
      }),
    );
    const cerrado = losDatos<{ corregidos: number; fuera: number }>(
      await api.ejecutar(rosa, 'cerrar_inventario', { inventario_id: otro }),
    );
    expect(cerrado).toMatchObject({ corregidos: 0, fuera: 1 });
    expect(await loQueHay(merluza)).toBe(8);
  });

  it('el cocinero recuenta, y entonces sí se cierra', async () => {
    losDatos(
      await api.ejecutar(marcos, 'recontar', {
        inventario_id: inventarioId,
        lineas: [{ producto_id: merluza, hay: 7.5 }],
      }),
    );
    // Recontar lo que no está pedido no vale.
    expect(
      elFallo(
        await api.ejecutar(marcos, 'recontar', {
          inventario_id: inventarioId,
          lineas: [{ producto_id: merluza, hay: 1 }],
        }),
      ),
    ).toBe('ya_hecho');
    losDatos(await api.ejecutar(rosa, 'cerrar_inventario', { inventario_id: inventarioId }));
    expect(await loQueHay(merluza)).toBe(7.5);
  });

  it('descartar pide motivo y no toca el libro', async () => {
    const otro = losDatos<{ inventarioId: string }>(
      await api.ejecutar(marcos, 'enviar_lo_contado', {
        lineas: [{ producto_id: merluza, hay: 0 }],
      }),
    ).inventarioId;
    expect(
      elFallo(
        await api.ejecutar(rosa, 'descartar_inventario', { inventario_id: otro, motivo: '' }),
      ),
    ).toBe('faltan_datos');
    losDatos(
      await api.ejecutar(rosa, 'descartar_inventario', {
        inventario_id: otro,
        motivo: 'Contó la cámara de al lado',
      }),
    );
    expect(await loQueHay(merluza)).toBe(7.5);
    const lista = losDatos<{
      cerrados: { id: string; estado: string; motivoDeDescarte: string | null }[];
    }>(await api.consultar(rosa, 'el_inventario'));
    expect(lista.cerrados.find((i) => i.id === otro)).toMatchObject({
      estado: 'descartado',
      motivoDeDescarte: 'Contó la cámara de al lado',
    });
  });
});

describe('contar y cerrar a la vez, como siempre', () => {
  it('cerrar_recuento deja su inventario cerrado, con quién y qué', async () => {
    const aceite = await nuevoProducto(rosa, 'Aceite de contar', {
      cantidad_inicial: 20,
      unidad_de_uso: 'l',
    });
    const cerrado = losDatos<{ inventarioId: string; corregidos: number }>(
      await api.ejecutar(rosa, 'cerrar_recuento', { lineas: [{ producto_id: aceite, hay: 18 }] }),
    );
    expect(cerrado.corregidos).toBe(1);
    expect(await loQueHay(aceite)).toBe(18);
    const [fila] = await comoDuena<{ estado: string; lineas: number }>(
      `select i.estado, (select count(*)::int from estook.linea_de_inventario l where l.inventario_id = i.id) as lineas
         from estook.inventario i where i.id = $1`,
      [cerrado.inventarioId],
    );
    expect(fila).toEqual({ estado: 'cerrado', lineas: 1 });
  });

  it('el cocinero no puede cerrar de una vez', async () => {
    const tomate = await nuevoProducto(marcos, 'Tomate de contar', { cantidad_inicial: 3 });
    expect(
      elFallo(
        await api.ejecutar(marcos, 'cerrar_recuento', {
          lineas: [{ producto_id: tomate, hay: 1 }],
        }),
      ),
    ).toBe('sin_permiso');
  });
});

// ── Los lotes se gastan solos (FEFO) ─────────────────────────────────────────

describe('los lotes se gastan solos, primero el que antes caduca', () => {
  let leche: string;

  async function susLotes(): Promise<
    { caduca_el: string; queda: string | null; como: string | null }[]
  > {
    return comoDuena(
      `select to_char(caduca_el, 'YYYY-MM-DD') as caduca_el, queda::text as queda,
              como_se_retiro as como
         from estook.lote where producto_id = $1 order by caduca_el`,
      [leche],
    );
  }

  beforeAll(async () => {
    leche = await nuevoProducto(rosa, 'Leche de los lotes', { unidad_de_uso: 'l' });
    // Entra primero la que caduca más tarde.
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: leche,
        cuanto: 6,
        como: 'unidades_de_uso',
        caduca_el: masDias(HOY, 20),
      }),
    );
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: leche,
        cuanto: 4,
        como: 'unidades_de_uso',
        caduca_el: masDias(HOY, 5),
      }),
    );
  });

  it('cada lote nace con lo que trae', async () => {
    expect((await susLotes()).map((l) => l.queda)).toEqual(['4.0000', '6.0000']);
  });

  let salida: string;

  it('lo que sale se resta del que antes caduca, y el que se acaba se retira solo', async () => {
    salida = losDatos<{ movimientoId: string }>(
      await api.ejecutar(rosa, 'apuntar_salida', { producto_id: leche, cuanto: 5 }),
    ).movimientoId;
    expect(await susLotes()).toEqual([
      { caduca_el: masDias(HOY, 5), queda: '0.0000', como: 'se_acabo' },
      { caduca_el: masDias(HOY, 20), queda: '5.0000', como: null },
    ]);
    // Y ya no avisa de que caduca.
    const hoy = losDatos<{ caducan: { productoId: string }[] }>(
      await api.consultar(rosa, 'almacen_hoy'),
    );
    expect(hoy.caducan.some((c) => c.productoId === leche)).toBe(false);
  });

  it('anular la salida lo devuelve a sus lotes, y el acabado vuelve', async () => {
    losDatos(
      await api.ejecutar(rosa, 'anular_movimiento', {
        movimiento_id: salida,
        motivo: 'Era otra cosa',
      }),
    );
    expect(await susLotes()).toEqual([
      { caduca_el: masDias(HOY, 5), queda: '4.0000', como: null },
      { caduca_el: masDias(HOY, 20), queda: '6.0000', como: null },
    ]);
  });

  it('la merma de la camarera también gasta del lote', async () => {
    losDatos(
      await api.ejecutar(sara, 'apuntar_merma', {
        producto_id: leche,
        cuanto: 1,
        motivo: 'caducado',
      }),
    );
    expect((await susLotes())[0]?.queda).toBe('3.0000');
  });

  it('y lo que falta al contar, también', async () => {
    losDatos(
      await api.ejecutar(rosa, 'cerrar_recuento', { lineas: [{ producto_id: leche, hay: 2 }] }),
    );
    // Había 9: faltan 7. Se acaba el de antes (3) y del otro salen 4.
    expect(await susLotes()).toEqual([
      { caduca_el: masDias(HOY, 5), queda: '0.0000', como: 'se_acabo' },
      { caduca_el: masDias(HOY, 20), queda: '2.0000', como: null },
    ]);
  });
});

// ── El valor del almacén en cualquier fecha ──────────────────────────────────

describe('el valor del almacén en cualquier fecha', () => {
  const HACE_TRES = masDias(HOY, -3);
  let jamon: string;

  beforeAll(async () => {
    const entonces = apiEl(`${HACE_TRES}T10:00:00Z`);
    const rosaEntonces = await entonces.entrar(ROSA);
    jamon = await nuevoProducto(
      rosaEntonces,
      'Jamón del valor',
      { cantidad_inicial: 2, precio_centimos: 10000 },
      entonces,
    );
    // Hoy entran 3 más, a 100 € el kilo también.
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: jamon,
        cuanto: 3,
        como: 'unidades_de_uso',
        precio_centimos: 10000,
      }),
    );
  });

  it('hace tres días había 2 kg, 200 €; hoy, 5 kg, 500 €', async () => {
    const entonces = losDatos<{
      productos: { id: string; cantidad: number; valorCentimos: number }[];
    }>(await api.consultar(rosa, 'valor_del_almacen', { fecha: HACE_TRES }));
    expect(entonces.productos.find((p) => p.id === jamon)).toMatchObject({
      cantidad: 2,
      valorCentimos: 20000,
    });
    const hoy = losDatos<{
      productos: { id: string; cantidad: number; valorCentimos: number }[];
      totalCentimos: number;
    }>(await api.consultar(rosa, 'valor_del_almacen', {}));
    expect(hoy.productos.find((p) => p.id === jamon)).toMatchObject({
      cantidad: 5,
      valorCentimos: 50000,
    });
    // Y el total de hoy es la suma de lo que se enseña.
    expect(hoy.totalCentimos).toBe(hoy.productos.reduce((s, p) => s + p.valorCentimos, 0));
  });

  it('el día antes de existir, no sale', async () => {
    const antes = losDatos<{ productos: { id: string }[] }>(
      await api.consultar(rosa, 'valor_del_almacen', { fecha: masDias(HACE_TRES, -1) }),
    );
    expect(antes.productos.some((p) => p.id === jamon)).toBe(false);
  });

  it('mañana no se puede, y sin precios de compra no se ve', async () => {
    expect(
      elFallo(await api.consultar(rosa, 'valor_del_almacen', { fecha: masDias(HOY, 1) })),
    ).toBe('faltan_datos');
    expect(elFallo(await api.consultar(marcos, 'valor_del_almacen', {}))).toBe('sin_permiso');
  });
});

// ── El mínimo calculado (3A) ─────────────────────────────────────────────────

describe('el mínimo calculado se propone, se acepta y se apaga a mano', () => {
  let patatas: string;

  beforeAll(async () => {
    // Un proveedor que reparte martes y viernes: entre dos repartos, cuatro días.
    const proveedor = losDatos<{ proveedorId: string }>(
      await api.ejecutar(rosa, 'crear_proveedor', {
        nombre: 'Huerta del mínimo',
        dias_de_reparto: [2, 5],
        plazo_de_entrega: 1,
      }),
    ).proveedorId;
    // Hace catorce días entraron 100 kg; desde entonces salen 3 kg al día.
    const hace = masDias(HOY, -14);
    const entonces = apiEl(`${hace}T10:00:00Z`);
    patatas = await nuevoProducto(
      await entonces.entrar(ROSA),
      'Patatas del mínimo',
      { cantidad_inicial: 100, proveedor_id: proveedor, minimo: 5 },
      entonces,
    );
    for (let dia = 13; dia >= 0; dia--) {
      const ese = apiEl(`${masDias(HOY, -dia)}T11:00:00Z`);
      losDatos(
        await ese.ejecutar(await ese.entrar(ROSA), 'apuntar_salida', {
          producto_id: patatas,
          cuanto: 3,
        }),
      );
    }
  }, 60_000);

  it('se propone con su porqué: 3 kg al día × 4 días + 20 %', async () => {
    const lo = losDatos<{
      propuestas: {
        id: string;
        minimo: number | null;
        propuesto: { minimo: number; porque: string };
      }[];
    }>(await api.consultar(rosa, 'minimos_propuestos'));
    const suya = lo.propuestas.find((p) => p.id === patatas);
    // 42 kg en 14 días son 3 al día; × 4 × 1,2 = 14,4.
    expect(suya?.minimo).toBe(5);
    expect(suya?.propuesto.minimo).toBe(14.4);
    expect(suya?.propuesto.porque).toContain('4 días');
  });

  it('aceptarlo lo pone y deja que Estook lo rehaga', async () => {
    losDatos(await api.ejecutar(rosa, 'usar_el_minimo_calculado', { producto_ids: [patatas] }));
    const [fila] = await comoDuena<{ minimo: string; minimo_calculado: boolean }>(
      'select minimo::text as minimo, minimo_calculado from estook.producto where id = $1',
      [patatas],
    );
    expect(fila).toEqual({ minimo: '14.4000', minimo_calculado: true });
    const lo = losDatos<{ propuestas: { id: string }[]; automaticos: number }>(
      await api.consultar(rosa, 'minimos_propuestos'),
    );
    expect(lo.propuestas.some((p) => p.id === patatas)).toBe(false);
    expect(lo.automaticos).toBeGreaterThanOrEqual(1);
  });

  it('el lunes, Estook lo rehace si ha cambiado lo que se gasta', async () => {
    await comoDuena(`update estook.producto set minimo = 1 where id = $1`, [patatas]);
    const lunes = masDias(HOY, 8 - diaDeLaSemana(HOY));
    expect(
      await apiEl(`${lunes}T07:10:00Z`).despachador.latir(
        { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
        SECRETO,
      ),
    ).toMatchObject({ diario: true });
    const [fila] = await comoDuena<{ minimo: string }>(
      'select minimo::text as minimo from estook.producto where id = $1',
      [patatas],
    );
    // El lunes que viene ya no hay salidas nuevas: lo gastado se reparte entre más
    // días y el mínimo baja, pero lo rehace Estook, no se queda en 1.
    expect(Number(fila?.minimo)).toBeGreaterThan(1);
  });

  it('y ese lunes, a quien cierra le llega lo que toca contar', async () => {
    const [aviso] = await susAvisos(rosa, 'inventario.toca');
    expect(aviso?.titulo).toMatch(/^Toca contar \d+ productos?$/);
    expect(aviso?.ir).toBe('/almacen/movimientos/inventario');
    // Al cocinero, no: no cierra inventarios.
    expect(await susAvisos(marcos, 'inventario.toca')).toEqual([]);
  });

  it('cambiar el mínimo a mano lo apaga', async () => {
    const ficha = losDatos<{ producto: Record<string, unknown> }>(
      await api.consultar(rosa, 'un_producto', { producto_id: patatas }),
    ).producto;
    losDatos(
      await api.ejecutar(rosa, 'cambiar_producto', {
        producto_id: patatas,
        nombre: ficha['nombre'],
        categoria_id: ficha['categoriaId'],
        formato: ficha['formato'],
        factor: ficha['factor'],
        unidad_de_uso: ficha['unidadDeUso'],
        rendimiento: ficha['rendimiento'],
        categoria_fiscal: ficha['categoriaFiscal'],
        alergenos: [],
        peso_variable: ficha['pesoVariable'],
        codigo_de_barras: ficha['codigoDeBarras'],
        minimo: 20,
        proveedor_id: ficha['proveedorId'],
        notas: ficha['notas'],
      }),
    );
    const [fila] = await comoDuena<{ minimo: string; minimo_calculado: boolean }>(
      'select minimo::text as minimo, minimo_calculado from estook.producto where id = $1',
      [patatas],
    );
    expect(fila).toEqual({ minimo: '20.0000', minimo_calculado: false });
  });
});

// ── Lo que toca contar ───────────────────────────────────────────────────────

describe('lo que toca contar', () => {
  it('lo que nunca se ha contado toca, y lo recién contado ya no', async () => {
    const queso = await nuevoProducto(rosa, 'Queso de tocar', {
      cantidad_inicial: 3,
      precio_centimos: 2000,
    });
    const antes = losDatos<{ tocaContar: { productos: { id: string }[]; frase: string } }>(
      await api.consultar(marcos, 'el_inventario'),
    );
    expect(antes.tocaContar.productos.some((p) => p.id === queso)).toBe(true);

    losDatos(
      await api.ejecutar(rosa, 'cerrar_recuento', { lineas: [{ producto_id: queso, hay: 3 }] }),
    );
    const despues = losDatos<{ tocaContar: { productos: { id: string }[] } }>(
      await api.consultar(marcos, 'el_inventario'),
    );
    // Aunque cuadrara —y no deja línea en el libro— ya está contado.
    expect(despues.tocaContar.productos.some((p) => p.id === queso)).toBe(false);
  });

  it('a la camarera no le enseña nada del inventario', async () => {
    expect(elFallo(await api.consultar(sara, 'el_inventario'))).toBe('sin_permiso');
  });
});
