import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fechaEnElLocal, masDias } from '@estook/dominio';
import { correoEnMemoria } from '../../servidor/infraestructura/correo.ts';
import { almacenEnMemoria } from '../../servidor/infraestructura/almacen.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M8, la segunda entrega (decisión 0079 · migración 0061), contra Postgres de verdad y
 * llamando a la API a pelo.
 *
 *   · lo gastado de verdad entre dos inventarios cuadra con una cuenta a mano
 *   · la Coca-Cola del plan: sale de la cámara más de lo que vende la caja, y se ve
 *     en la desviación con su cantidad, sus euros y su causa
 *   · emparejar la línea de la caja con el producto, una vez
 *   · el food cost real entre dos inventarios cuadra con una cuenta a mano
 *   · un día sin caja no se da por exacto, y es la causa
 *   · el aviso al cerrar, solo si falta más del 3 %
 *   · la foto de la merma, una vez y por quien la apuntó
 *   · quien no cierra inventarios no ve nada de esto; sin precios, ni un euro
 *
 * El calendario: el primer inventario el día D0 por la mañana; siete días de caja con
 * 15 Coca-Colas cada uno; una merma, una entrada; y el segundo inventario el D7 por la
 * mañana. Faltan 16 Coca-Colas que nadie apuntó.
 */

let base: BaseDePrueba;
let api: ApiDePrueba;
const correo = correoEnMemoria();
const almacen = almacenEnMemoria();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: cierra y ve todo
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero: no cierra inventarios
const SARA = 'sara@ejemplo.estook.com'; // camarera: apunta mermas
const ELENA = 'elena@ejemplo.estook.com'; // gerente también, para recibir el aviso

let rosa: string;
let marcos: string;
let sara: string;

const HOY = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');
const D0 = masDias(HOY, -8);
const D7 = masDias(HOY, -1);
const dia = (n: number) => masDias(D0, n);

let coca: string;
let pulpo: string;

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

/** La API a una hora dada, con el mismo almacén de ficheros. */
function apiEl(instante: string): ApiDePrueba {
  return montarLaApi(base.bd, { correo, almacen, ahora: () => new Date(instante) });
}

/** A las 08:00 de Madrid (antes de abrir) y a las 23:00 (después de cerrar). */
const deManana = (fecha: string) => `${fecha}T06:00:00Z`;
const deNoche = (fecha: string) => `${fecha}T21:00:00Z`;

async function comoRosaEl(instante: string): Promise<{ api: ApiDePrueba; token: string }> {
  const entonces = apiEl(instante);
  return { api: entonces, token: await entonces.entrar(ROSA) };
}

async function cerrarLaCaja(fecha: string, cocas: number, extra: Record<string, unknown>[] = []) {
  const { api: entonces, token } = await comoRosaEl(deNoche(fecha));
  losDatos(
    await entonces.ejecutar(token, 'cerrar_la_caja', {
      fecha,
      total_centimos: 30000,
      lineas: [
        { concepto: 'Coca-Cola', unidades: cocas, importe_centimos: cocas * 200 },
        { concepto: 'Pulpo a feira', unidades: 10, importe_centimos: 15000 },
        ...extra,
      ],
    }),
  );
}

interface Gastado {
  id: string;
  nombre: string;
  habia: number;
  entro: number;
  queda: number;
  gastado: number;
  apuntado: number;
  gastadoCentimos?: number | null;
  talCual: {
    conceptos: string[];
    ventasDesde: string;
    ventasHasta: string;
    vendido: number;
    diasSinCaja: number;
    desviacion: number;
    desviacionCentimos?: number | null;
    causa: { causa: string; porque: string } | null;
  } | null;
  seLeParecen: string[];
}

interface LaDesviacion {
  productos: Gastado[];
  contadosUnaVez: number;
  porEmparejar: { concepto: string; unidades: number; propuesto: { id: string } | null }[];
  emparejados: { concepto: string; productoId: string | null; porVenta: number }[];
}

async function laDesviacion(token: string): Promise<LaDesviacion> {
  return losDatos<LaDesviacion>(await api.consultar(token, 'la_desviacion'));
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { correo, almacen });
  await comoDuena(`update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);

  // ── D0, por la mañana: los productos y el primer inventario ────────────────
  const { api: d0, token } = await comoRosaEl(deManana(D0));
  coca = losDatos<{ productoId: string }>(
    await d0.ejecutar(token, 'crear_producto', {
      nombre: 'Coca-Cola 33 cl',
      unidad_de_uso: 'ud',
      zona: 'sala',
      cantidad_inicial: 200,
      precio_centimos: 60,
    }),
  ).productoId;
  pulpo = losDatos<{ productoId: string }>(
    await d0.ejecutar(token, 'crear_producto', {
      nombre: 'Pulpo cocido',
      unidad_de_uso: 'kg',
      zona: 'cocina',
      cantidad_inicial: 10,
      precio_centimos: 3200,
    }),
  ).productoId;
  const { api: d0b, token: t0b } = await comoRosaEl(`${D0}T06:30:00Z`);
  losDatos(
    await d0b.ejecutar(t0b, 'cerrar_recuento', {
      lineas: [
        { producto_id: coca, hay: 200 },
        { producto_id: pulpo, hay: 9 },
      ],
    }),
  );

  // ── Entre medias: una merma, una entrada y siete días de caja ──────────────
  const { api: d2, token: t2 } = await comoRosaEl(`${dia(2)}T12:00:00Z`);
  losDatos(
    await d2.ejecutar(t2, 'apuntar_merma', { producto_id: coca, cuanto: 2, motivo: 'roto' }),
  );
  const { api: d3, token: t3 } = await comoRosaEl(`${dia(3)}T09:00:00Z`);
  for (const [producto, cuanto, precio] of [
    [coca, 24, 60],
    [pulpo, 12, 3200],
  ] as const) {
    losDatos(
      await d3.ejecutar(t3, 'apuntar_entrada', {
        producto_id: producto,
        cuanto,
        como: 'unidades_de_uso',
        precio_centimos: precio,
      }),
    );
  }
  for (let n = 0; n < 7; n += 1) await cerrarLaCaja(dia(n), 15);

  // ── D7, por la mañana: el segundo inventario ──────────────────────────────
  // 200 + 24 − 105 vendidas − 2 rotas − 16 que nadie apuntó = 101. Y del pulpo, que la
  // cocina gasta sin apuntar y que al empezar ya no cuadraba (había 10 en el libro y
  // se contaron 9): 9 + 12 − 13 = 8.
  const { api: d7, token: t7 } = await comoRosaEl(deManana(D7));
  losDatos(
    await d7.ejecutar(t7, 'cerrar_recuento', {
      lineas: [
        { producto_id: coca, hay: 101 },
        { producto_id: pulpo, hay: 8 },
      ],
    }),
  );
}, 180_000);

afterAll(async () => {
  await base.cerrar();
});

// ── Lo gastado de verdad ─────────────────────────────────────────────────────

describe('lo gastado de verdad entre dos inventarios', () => {
  it('cuadra con una cuenta a mano sobre la base', async () => {
    const { productos } = await laDesviacion(rosa);

    // La cuenta a mano: lo contado las dos veces y lo que entró, leído de las tablas.
    const contado = await comoDuena<{ producto_id: string; hay: string }>(
      `select li.producto_id::text as producto_id, li.hay::text as hay
         from estook.linea_de_inventario li
        where li.producto_id = any ($1::uuid[])
        order by li.contado_en`,
      [[coca, pulpo]],
    );
    const entro = await comoDuena<{ producto_id: string; cuanto: string }>(
      `select producto_id::text as producto_id, sum(cantidad)::text as cuanto
         from estook.movimiento_de_stock
        where producto_id = any ($1::uuid[]) and tipo = 'entrada' and fecha_operativa > $2::date
        group by producto_id`,
      [[coca, pulpo], D0],
    );
    for (const id of [coca, pulpo]) {
      const [primero, segundo] = contado
        .filter((c) => c.producto_id === id)
        .map((c) => Number(c.hay));
      const entrada = Number(entro.find((e) => e.producto_id === id)?.cuanto ?? 0);
      const p = productos.find((x) => x.id === id);
      expect(p?.gastado).toBe((primero ?? 0) + entrada - (segundo ?? 0));
    }

    expect(productos.find((p) => p.id === coca)).toMatchObject({
      habia: 200,
      entro: 24,
      queda: 101,
      gastado: 123,
      // Lo único apuntado: la merma.
      apuntado: 2,
      gastadoCentimos: 7380,
    });
    expect(productos.find((p) => p.id === pulpo)).toMatchObject({
      gastado: 13,
      gastadoCentimos: 41600,
      // Lo que se cocina no tiene desviación hasta M9: sin ficha no se sabe cuánto debía.
      talCual: null,
    });
  });

  it('sin emparejar, la Coca-Cola de la caja se propone, y ella dice que se le parece', async () => {
    const d = await laDesviacion(rosa);
    const porEmparejar = d.porEmparejar.find((l) => l.concepto === 'Coca-Cola');
    expect(porEmparejar).toMatchObject({ unidades: 105, propuesto: { id: coca } });
    const laCoca = d.productos.find((p) => p.id === coca);
    expect(laCoca?.talCual).toBeNull();
    expect(laCoca?.seLeParecen).toContain('Coca-Cola');
  });
});

// ── La desviación de lo que se vende tal cual ────────────────────────────────

describe('la desviación de lo que se vende tal cual', () => {
  it('el cocinero no empareja ni ve la desviación', async () => {
    expect(
      elFallo(
        await api.ejecutar(marcos, 'emparejar_concepto', {
          concepto: 'Coca-Cola',
          producto_id: coca,
        }),
      ),
    ).toBe('sin_permiso');
    expect(elFallo(await api.consultar(marcos, 'la_desviacion'))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(marcos, 'el_food_cost_real'))).toBe('sin_permiso');
  });

  it('se empareja una vez, sin mirar mayúsculas ni acentos', async () => {
    losDatos(
      await api.ejecutar(rosa, 'emparejar_concepto', { concepto: 'COCA-COLA', producto_id: coca }),
    );
    const d = await laDesviacion(rosa);
    expect(d.emparejados).toEqual([
      expect.objectContaining({ concepto: 'COCA-COLA', productoId: coca, porVenta: 1 }),
    ]);
    expect(d.porEmparejar.find((l) => l.concepto === 'Coca-Cola')).toBeUndefined();
  });

  it('salen 16 que nadie apuntó, con sus euros y su causa', async () => {
    const d = await laDesviacion(rosa);
    const laCoca = d.productos.find((p) => p.id === coca);
    expect(laCoca?.talCual).toMatchObject({
      ventasDesde: D0,
      ventasHasta: dia(6),
      vendido: 105,
      diasSinCaja: 0,
      desviacion: 16,
      desviacionCentimos: 960,
      causa: {
        causa: 'sin_apuntar',
        porque:
          'Faltan 16 ud: lo más probable, comida del personal, invitaciones o roturas sin apuntar.',
      },
    });
    // Lo que no cuadra, arriba.
    expect(d.productos[0]?.id).toBe(coca);
  });

  it('una línea que no es de almacén se descarta y no vuelve a proponerse', async () => {
    losDatos(
      await api.ejecutar(rosa, 'emparejar_concepto', { concepto: 'Pulpo a feira', ignorar: true }),
    );
    const d = await laDesviacion(rosa);
    expect(d.porEmparejar.find((l) => l.concepto === 'Pulpo a feira')).toBeUndefined();
    // Y quitarlo lo vuelve a proponer.
    losDatos(
      await api.ejecutar(rosa, 'emparejar_concepto', { concepto: 'pulpo a feira', quitar: true }),
    );
    expect(
      (await laDesviacion(rosa)).porEmparejar.some((l) => l.concepto === 'Pulpo a feira'),
    ).toBe(true);
  });

  it('quien cierra inventarios sin ver precios ve cantidades, y ni un euro', async () => {
    // Luis, jefe de cocina también de Bar Centro, con los precios de compra recortados:
    // cierra inventarios y ve las ventas (0041), pero no lo que cuesta el género.
    await comoDuena(
      `insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
       select p.id, o.id, l.id, 'local', 'jefe_de_cocina'
         from estook.persona p, estook.organizacion o
         join estook.local l on l.organizacion_id = o.id and l.codigo = 'bar-centro'
        where p.correo = 'luis@ejemplo.estook.com' and o.codigo = 'bar-centro'`,
    );
    await comoDuena(
      `insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel, motivo)
       select m.id, m.local_id, 'dato.precio_de_compra', 'sin_acceso', 'la prueba de M8'
         from estook.membresia m
         join estook.persona p on p.id = m.persona_id
         join estook.local l on l.id = m.local_id
        where p.correo = 'luis@ejemplo.estook.com' and l.codigo = 'bar-centro'`,
    );
    const luis = await api.entrar('luis@ejemplo.estook.com');
    const [barCentro] = await comoDuena<{ id: string; organizacion_id: string }>(
      `select id::text as id, organizacion_id::text as organizacion_id
         from estook.local where codigo = 'bar-centro'`,
    );
    losDatos(
      await api.ejecutar(luis, 'cambiar_de_contexto', {
        organizacion_id: barCentro?.organizacion_id,
        local_id: barCentro?.id,
      }),
    );
    const d = losDatos<LaDesviacion & { puedeVerPrecios: boolean }>(
      await api.consultar(luis, 'la_desviacion'),
    );
    expect(d.puedeVerPrecios).toBe(false);
    expect(d.productos.find((p) => p.id === coca)?.talCual?.desviacion).toBe(16);
    expect(JSON.stringify(d)).not.toMatch(/Centimos/);
    expect(elFallo(await api.consultar(luis, 'el_food_cost_real'))).toBe('sin_permiso');
  });
});

// ── El food cost real ────────────────────────────────────────────────────────

interface FoodCost {
  periodo: string;
  desde: string;
  hasta: string;
  habiaCentimos: number;
  comprasCentimos: number;
  quedaCentimos: number;
  aparteCentimos: number;
  consumoRealCentimos: number;
  ventasConImpuestoCentimos: number;
  ventasSinImpuestoCentimos: number | null;
  tipoDeImpuesto: number | null;
  real: number | null;
  faltanDiasDeCaja: number;
  exacto: boolean;
  contados: number;
}

describe('el food cost real', () => {
  it('entre los dos inventarios cuadra con (había + compras − queda) a mano', async () => {
    const f = losDatos<FoodCost>(await api.consultar(rosa, 'el_food_cost_real'));
    expect(f).toMatchObject({ periodo: 'inventarios', desde: D0, hasta: dia(6) });

    // Lo que se consumió: la Coca-Cola (123 × 0,60) y el pulpo (13 × 32): 489,80 €. El ajuste
    // del primer inventario (el kilo de pulpo que ya faltaba) es su punto de partida, no
    // algo gastado en el periodo, aunque se contara la mañana del primer día.
    expect(f.habiaCentimos + f.comprasCentimos - f.quedaCentimos - f.aparteCentimos).toBe(
      f.consumoRealCentimos,
    );
    expect(f.consumoRealCentimos).toBe(48980);
    expect(f.comprasCentimos).toBe(39840);
    // Siete días de 300 € con IVA; al 10 %, 1.909,09 € sin él.
    expect(f.ventasConImpuestoCentimos).toBe(210000);
    expect(f.tipoDeImpuesto).toBe(0.1);
    expect(f.ventasSinImpuestoCentimos).toBe(190909);
    expect(f.real).toBe(25.7);
    expect(f.faltanDiasDeCaja).toBe(0);
    expect(f.exacto).toBe(true);
    expect(f.contados).toBe(2);
  });

  it('por meses también se puede pedir', async () => {
    const f = losDatos<FoodCost>(
      await api.consultar(rosa, 'el_food_cost_real', { periodo: 'mes', mes: HOY.slice(0, 7) }),
    );
    expect(f.periodo).toBe('mes');
    expect(f.desde).toBe(`${HOY.slice(0, 7)}-01`);
  });
});

// ── Un día sin caja ──────────────────────────────────────────────────────────

describe('un día sin caja', () => {
  it('no se da por exacto, y es la causa antes que culpar a nadie', async () => {
    await comoDuena(
      `delete from estook.cierre_de_caja
        where fecha_operativa = $1::date
          and local_id = (select id from estook.local where codigo = 'bar-centro')`,
      [dia(3)],
    );
    const laCoca = (await laDesviacion(rosa)).productos.find((p) => p.id === coca);
    expect(laCoca?.talCual).toMatchObject({
      vendido: 90,
      diasSinCaja: 1,
      desviacion: 31,
      causa: { causa: 'faltan_dias_de_caja' },
    });
    const f = losDatos<FoodCost>(await api.consultar(rosa, 'el_food_cost_real'));
    expect(f.faltanDiasDeCaja).toBe(1);
    expect(f.exacto).toBe(false);
    await cerrarLaCaja(dia(3), 15);
  });
});

// ── El aviso al cerrar ───────────────────────────────────────────────────────

describe('el aviso al cerrar un inventario', () => {
  let elena: string;

  beforeAll(async () => {
    // Elena, gerente también de Bar Centro: es quien recibe el aviso cuando cierra Rosa.
    await comoDuena(
      `insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
       select p.id, o.id, l.id, 'local', 'gerente'
         from estook.persona p, estook.organizacion o
         join estook.local l on l.organizacion_id = o.id and l.codigo = 'bar-centro'
        where p.correo = $1 and o.codigo = 'bar-centro'`,
      [ELENA],
    );
    elena = await api.entrar(ELENA);
  });

  it('avisa si falta más del 3 % de lo que se vende tal cual, y dice cuánto', async () => {
    // D7 se venden 15; hoy por la mañana quedan 76: faltan 10 de 25 gastadas.
    await cerrarLaCaja(D7, 15);
    const { api: hoy, token } = await comoRosaEl(deManana(HOY));
    losDatos(
      await hoy.ejecutar(token, 'cerrar_recuento', { lineas: [{ producto_id: coca, hay: 76 }] }),
    );
    const avisos = losDatos<{
      avisos: { tipo: string; titulo: string; detalle: string; ir: string }[];
    }>(await api.consultar(elena, 'mis_avisos')).avisos.filter(
      (a) => a.tipo === 'inventario.falta',
    );
    expect(avisos).toEqual([
      expect.objectContaining({
        titulo: 'Al cerrar el inventario faltan 6,00 €',
        detalle: 'Un 40 % de lo gastado: Coca-Cola 33 cl. Mira la desviación.',
        ir: '/almacen/movimientos/desviacion',
      }),
    ]);
  });

  it('si cuadra, no avisa', async () => {
    const antes = losDatos<{ avisos: { tipo: string }[] }>(
      await api.consultar(elena, 'mis_avisos'),
    ).avisos.filter((a) => a.tipo === 'inventario.falta').length;
    // Hoy no se ha vendido nada: contar 76 otra vez cuadra.
    const { api: luego, token } = await comoRosaEl(`${HOY}T07:00:00Z`);
    losDatos(
      await luego.ejecutar(token, 'cerrar_recuento', { lineas: [{ producto_id: coca, hay: 76 }] }),
    );
    const despues = losDatos<{ avisos: { tipo: string }[] }>(
      await api.consultar(elena, 'mis_avisos'),
    ).avisos.filter((a) => a.tipo === 'inventario.falta').length;
    expect(despues).toBe(antes);
  });
});

// ── La foto de la merma (4A) ─────────────────────────────────────────────────

describe('la foto de la merma', () => {
  // Lo mínimo que pasa por una JPEG: su firma y algo detrás.
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0]).toString('base64');
  let mermaDeSara: string;
  let mermaDeRosa: string;

  beforeAll(async () => {
    mermaDeSara = losDatos<{ movimientoId: string }>(
      await api.ejecutar(sara, 'apuntar_merma', { producto_id: coca, cuanto: 1, motivo: 'roto' }),
    ).movimientoId;
    mermaDeRosa = losDatos<{ movimientoId: string }>(
      await api.ejecutar(rosa, 'apuntar_merma', { producto_id: coca, cuanto: 1, motivo: 'roto' }),
    ).movimientoId;
  });

  it('la camarera pone la foto de lo que rompió, y sale en la lista de mermas', async () => {
    expect(
      losDatos<{ puesta: boolean }>(
        await api.ejecutar(sara, 'poner_foto_de_merma', {
          movimiento_id: mermaDeSara,
          tipo: 'image/jpeg',
          foto: JPEG,
        }),
      ).puesta,
    ).toBe(true);
    const lista = losDatos<{ mermas: { id: string; foto: string | null }[] }>(
      await api.consultar(rosa, 'mis_mermas'),
    );
    expect(lista.mermas.find((m) => m.id === mermaDeSara)?.foto).toBeTruthy();
    expect(lista.mermas.find((m) => m.id === mermaDeRosa)?.foto).toBeNull();
  });

  it('una vez: la foto es la prueba y no se cambia', async () => {
    expect(
      elFallo(
        await api.ejecutar(sara, 'poner_foto_de_merma', {
          movimiento_id: mermaDeSara,
          tipo: 'image/jpeg',
          foto: JPEG,
        }),
      ),
    ).toBe('ya_hecho');
  });

  it('la camarera no pone foto a la merma de otro, ni algo que no es una foto', async () => {
    expect(
      elFallo(
        await api.ejecutar(sara, 'poner_foto_de_merma', {
          movimiento_id: mermaDeRosa,
          tipo: 'image/jpeg',
          foto: JPEG,
        }),
      ),
    ).toBe('no_existe');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'poner_foto_de_merma', {
          movimiento_id: mermaDeRosa,
          tipo: 'image/jpeg',
          foto: Buffer.from('no soy una foto').toString('base64'),
        }),
      ),
    ).toBe('faltan_datos');
  });
});
