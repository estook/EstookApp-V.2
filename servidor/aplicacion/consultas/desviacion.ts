import { z } from 'zod';
import {
  comoVaFrenteAlObjetivo,
  fechaEnElLocal,
  foodCostReal,
  laBrechaDelFoodCost,
  loQueSeEscapa,
  loQueVale,
  loVendidoPorProducto,
  type CausaProbable,
  type FechaOperativa,
  type LaBrechaDelFoodCost,
  type LineaCobrada,
  type Semaforo,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import {
  elMes,
  elTrimestre,
  laSemana,
  elRelojYElFisco,
  laCuentaDelFoodCost,
  lasLineasPorEmparejar,
  loGastadoDeVerdad,
  losDosUltimosInventarios,
  type LimitesDelPeriodo,
  type GastadoDeUnProducto,
  type LineaPorEmparejar,
} from '../desviacion.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { loVendidoBaja } from '../lo-vendido.ts';
import { puedeVerPrecios } from './almacen.ts';

/**
 * Lo que enseña la desviación (M8 · decisión 0079, la segunda entrega).
 *
 *   la_desviacion       lo gastado de verdad de cada producto entre sus dos últimos
 *                       inventarios, y la desviación de lo que se vende tal cual,
 *                       con su causa; las líneas de la caja por emparejar; y, con
 *                       Estook TPV, lo que se escapa (M20 · 2, 0151)
 *   el_food_cost_real   (lo que había + lo comprado − lo que queda) ÷ lo vendido sin
 *                       IVA, entre los dos últimos inventarios o en un mes; y, con
 *                       Estook TPV, el de tus escandallos al lado (M20 · 2, 0151)
 *
 * **El dinero, solo a quien ve precios de compra; lo vendido, solo a quien ve las
 * ventas** (0078, «lo que decido yo» 7). Quien cierra inventarios sin esos permisos
 * ve cantidades.
 */

async function puedeVerVentas(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_ver('dato.ventas', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

// ── La desviación ───────────────────────────────────────────────────────────

export interface ProductoGastado {
  readonly id: string;
  readonly nombre: string;
  readonly zona: string;
  readonly unidadDeUso: string;
  /** Cuándo se contó las dos veces. */
  readonly desde: string;
  readonly hasta: string;
  readonly habia: number;
  readonly entro: number;
  readonly queda: number;
  readonly gastado: number;
  readonly apuntado: number;
  /** Con precios de compra: lo gastado en euros, a precio medio. */
  readonly gastadoCentimos?: number | null;
  /** Lo que se vende tal cual y está emparejado con la caja. */
  readonly talCual: {
    readonly conceptos: readonly string[];
    /** Las jornadas de caja que entran: de la primera a la última, las dos incluidas. */
    readonly ventasDesde: FechaOperativa;
    readonly ventasHasta: FechaOperativa;
    readonly vendido: number;
    readonly diasSinCaja: number;
    readonly desviacion: number;
    readonly desviacionCentimos?: number | null;
    readonly causa: CausaProbable | null;
  } | null;
  /** Si no está emparejado: las líneas de la caja que se le parecen. */
  readonly seLeParecen: readonly string[];
}

export interface Emparejado {
  readonly concepto: string;
  readonly productoId: string | null;
  readonly producto: string | null;
  readonly porVenta: number;
  readonly unidadDeUso: string | null;
}

/** Un producto que se sale del margen (M20 · 2, 0151). */
export interface ProductoQueSeEscapa {
  readonly id: string;
  readonly nombre: string;
  readonly unidadDeUso: string;
  /** Lo que falta: lo gastado que el libro no sabe dónde fue. */
  readonly falta: number;
  /** Lo que tenía que salir: lo vendido, las mermas y lo sacado a mano. */
  readonly debiaSalir: number;
  /** La parte de lo que tenía que salir que falta, en fracción. */
  readonly parte: number | null;
  /** Con precios de compra: lo que vale lo que falta. */
  readonly centimos?: number | null;
}

/**
 * Lo que se escapa del almacén entre los dos últimos inventarios, con Estook TPV (M20 · 2,
 * 0151). Solo los productos que restan las ventas, contados dos veces desde que el TPV resta,
 * y sin nada vendido sin escandallo entre medias (0094, la A).
 */
export interface LoQueSeEscapaEnElAlmacen {
  /** Entre qué dos inventarios, de los productos vigilados. Nulo si no hay ninguno. */
  readonly desde: string | null;
  readonly hasta: string | null;
  readonly vigilados: number;
  /** Los que se salen del margen, el que más dinero se lleva primero. */
  readonly seSalen: readonly ProductoQueSeEscapa[];
  /** Con precios de compra: lo que valen todos los que se salen. */
  readonly centimos?: number | null;
  /** Los platos que se vendieron sin escandallo entre esos inventarios (cinco como mucho). */
  readonly sinEscandallo: readonly string[];
  /** Cuántos platos distintos fueron: puede haber más de los cinco que se nombran. */
  readonly platosSinEscandallo: number;
  /** Los productos que se venden y no se vigilan por esos platos. */
  readonly aMedias: number;
}

export interface SalidaLaDesviacion {
  readonly hoy: FechaOperativa;
  readonly puedeVerPrecios: boolean;
  readonly puedeVerVentas: boolean;
  readonly productos: readonly ProductoGastado[];
  /** Los que solo se han contado una vez: con el segundo inventario, salen. */
  readonly contadosUnaVez: number;
  /** Con las ventas: lo que la caja vende y nadie ha dicho qué es. */
  readonly porEmparejar: readonly LineaPorEmparejar[];
  readonly emparejados: readonly Emparejado[];
  /** Con Estook TPV restando lo vendido: lo que se escapa. Nulo sin él. */
  readonly seEscapa: LoQueSeEscapaEnElAlmacen | null;
}

const enEuros = loQueVale;

/** Cuántos platos sin escandallo se nombran como mucho: los demás, «y N más». */
const PLATOS_QUE_SE_NOMBRAN = 5;

/**
 * Lo que se escapa (M20 · 2): de los productos que restan las ventas, los que se salen del
 * margen. **El cálculo es del dominio** (`loQueSeEscapa`); aquí solo se elige qué se vigila.
 */
async function loQueSeEscapaDe(
  contexto: Contexto,
  localId: string,
  productos: readonly GastadoDeUnProducto[],
  conPrecios: boolean,
): Promise<LoQueSeEscapaEnElAlmacen> {
  // Se vigila lo que vende el TPV, contado dos veces con él ya restando. La lejía no: no la
  // resta ninguna venta, y todo lo gastado saldría «falta».
  const conElTpv = productos.filter((p) => p.vendidoEnElTpv > 0 && p.todoConElTpv);
  const vigilados = conElTpv.filter((p) => p.vendidosSinEscandallo === 0);
  const aMedias = conElTpv.filter((p) => p.vendidosSinEscandallo > 0);

  const cuenta = loQueSeEscapa(
    vigilados.map((p) => ({
      id: p.id,
      gastado: p.gastado,
      apuntado: p.apuntado,
      costeMilesimas: conPrecios ? p.costeMilesimas : null,
    })),
  );
  const deCadaUno = new Map(vigilados.map((p) => [p.id, p]));

  const desde = vigilados.reduce<string | null>(
    (min, p) => (min === null || p.desde < min ? p.desde : min),
    null,
  );
  const hasta = vigilados.reduce<string | null>(
    (max, p) => (max === null || p.hasta > max ? p.hasta : max),
    null,
  );

  // Los platos sin escandallo, de la ventana de los que se quedaron a medias.
  let sinEscandallo: string[] = [];
  let platosSinEscandallo = 0;
  const primero = aMedias[0];
  if (primero !== undefined) {
    const de = aMedias.reduce((min, p) => (p.desde < min ? p.desde : min), primero.desde);
    const a = aMedias.reduce((max, p) => (p.hasta > max ? p.hasta : max), primero.hasta);
    const platos = await contexto.sql<{ nombre: string }[]>`
      select coalesce(max(p.nombre), max(b.nombre)) as nombre
        from estook.linea_bajada b
        left join estook.plato p on p.id = b.plato_id
       where b.local_id = ${localId}::uuid and b.estado = 'sin_escandallo'
         and b.bajada_en > ${de}::timestamptz and b.bajada_en <= ${a}::timestamptz
       group by coalesce(b.plato_id::text, b.nombre)
       order by sum(b.cantidad) desc, 1
    `;
    platosSinEscandallo = platos.length;
    sinEscandallo = platos.slice(0, PLATOS_QUE_SE_NOMBRAN).map((p) => p.nombre);
  }

  return {
    desde,
    hasta,
    vigilados: cuenta.vigilados,
    seSalen: cuenta.seSalen.map((e) => {
      const p = deCadaUno.get(e.id);
      return {
        id: e.id,
        nombre: p?.nombre ?? '',
        unidadDeUso: p?.unidadDeUso ?? '',
        falta: e.falta,
        debiaSalir: e.debiaSalir,
        parte: e.parte,
        ...(conPrecios ? { centimos: e.centimos } : {}),
      };
    }),
    ...(conPrecios ? { centimos: cuenta.centimos } : {}),
    sinEscandallo,
    platosSinEscandallo,
    aMedias: aMedias.length,
  };
}

export const laDesviacion = consulta<Record<string, never>, SalidaLaDesviacion>({
  nombre: 'la_desviacion',
  entrada: z.object({}).strict(),
  exige: 'accion.cerrar_recuento',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const conPrecios = await puedeVerPrecios(contexto, localId);
    const conVentas = await puedeVerVentas(contexto, localId);
    const local = await elRelojYElFisco(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, local.zonaHoraria);

    const { productos, contadosUnaVez } = await loGastadoDeVerdad(contexto, localId, { conVentas });

    const lista: ProductoGastado[] = productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      zona: p.zona,
      unidadDeUso: p.unidadDeUso,
      desde: p.desde,
      hasta: p.hasta,
      habia: p.habia,
      entro: p.entro,
      queda: p.queda,
      gastado: p.gastado,
      apuntado: p.apuntado,
      ...(conPrecios ? { gastadoCentimos: enEuros(p.gastado, p.costeMilesimas) } : {}),
      talCual:
        p.talCual === null
          ? null
          : {
              conceptos: p.talCual.conceptos,
              ventasDesde: p.ventasDesde,
              ventasHasta: p.ventasHasta,
              vendido: p.talCual.vendido,
              diasSinCaja: p.talCual.diasSinCaja,
              desviacion: p.talCual.desviacion,
              ...(conPrecios
                ? { desviacionCentimos: enEuros(p.talCual.desviacion, p.costeMilesimas) }
                : {}),
              causa: p.talCual.causa,
            },
      seLeParecen: p.seLeParecen,
    }));

    // Arriba lo que se vende tal cual y no cuadra, lo que más dinero (o más cantidad)
    // primero; después lo demás, por lo que más se ha gastado.
    const peso = (p: ProductoGastado) =>
      p.talCual === null || p.talCual.causa === null
        ? 0
        : Math.abs(p.talCual.desviacionCentimos ?? p.talCual.desviacion);
    lista.sort(
      (a, b) =>
        peso(b) - peso(a) ||
        (b.gastadoCentimos ?? 0) - (a.gastadoCentimos ?? 0) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );

    const emparejados = conVentas
      ? await contexto.sql<
          {
            concepto: string;
            producto_id: string | null;
            producto: string | null;
            por_venta: string;
            unidad_de_uso: string | null;
          }[]
        >`
          select cc.concepto, cc.producto_id::text as producto_id, p.nombre as producto,
                 cc.por_venta::text as por_venta, p.unidad_de_uso::text as unidad_de_uso
            from estook.concepto_de_caja cc
            left join estook.producto p on p.id = cc.producto_id
           where cc.local_id = ${localId}
           order by cc.ignorado, cc.concepto
        `
      : [];

    const seEscapa = (await loVendidoBaja(contexto, localId))
      ? await loQueSeEscapaDe(contexto, localId, productos, conPrecios)
      : null;

    return {
      hoy,
      puedeVerPrecios: conPrecios,
      puedeVerVentas: conVentas,
      productos: lista,
      contadosUnaVez,
      porEmparejar: conVentas ? await lasLineasPorEmparejar(contexto, localId, hoy) : [],
      emparejados: emparejados.map((e) => ({
        concepto: e.concepto,
        productoId: e.producto_id,
        producto: e.producto,
        porVenta: Number(e.por_venta),
        unidadDeUso: e.unidad_de_uso,
      })),
      seEscapa,
    };
  },
});

// ── El food cost real ───────────────────────────────────────────────────────

export const entradaElFoodCostReal = z
  .object({
    /**
     * Entre los dos últimos inventarios, una semana (de lunes a domingo), un mes o un trimestre
     * natural (0142). Sin decirlo, lo primero si lo hay, y si no, el mes.
     */
    periodo: z.enum(['inventarios', 'semana', 'mes', 'trimestre']).optional(),
    /** Un día de la semana que se mira: «2026-11-04». Sin él, la de hoy. */
    dia: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'El día se escribe así: 2026-11-04.')
      .optional(),
    mes: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'El mes se escribe así: 2026-10.')
      .optional(),
  })
  .strict();

export type EntradaElFoodCostReal = z.infer<typeof entradaElFoodCostReal>;

export interface SalidaElFoodCostReal {
  readonly periodo: 'inventarios' | 'semana' | 'mes' | 'trimestre';
  readonly desde: FechaOperativa;
  readonly hasta: FechaOperativa;
  readonly hoy: FechaOperativa;
  /** Los dos últimos inventarios, si los hay: para ofrecer ese periodo. */
  readonly inventarios: { readonly desde: FechaOperativa; readonly hasta: FechaOperativa } | null;
  readonly habiaCentimos: number;
  /** Todo lo que entró, compras y altas: es lo que suma la cuenta. */
  readonly comprasCentimos: number;
  /** De eso, lo que ya había al dar de alta productos (auditoría del 20-oct). */
  readonly deAltaCentimos: number;
  readonly quedaCentimos: number;
  readonly traspasosCentimos: number;
  readonly aparteCentimos: number;
  readonly consumoRealCentimos: number;
  readonly ventasConImpuestoCentimos: number;
  readonly ventasSinImpuestoCentimos: number | null;
  /** El tipo de restauración del local: 0,10. Nulo si no se sabe. */
  readonly tipoDeImpuesto: number | null;
  /** En %, con un decimal. */
  readonly real: number | null;
  /** El objetivo de materia prima del local, en fracción, y cómo va frente a él. */
  readonly objetivo: number | null;
  readonly semaforo: Semaforo;
  readonly diasDelPeriodo: number;
  readonly faltanDiasDeCaja: number;
  readonly exacto: boolean;
  readonly contados: number;
  readonly productos: number;
  readonly parteContada: number | null;
  readonly soloSusZonas: boolean;
  /**
   * Con Estook TPV, el food cost de tus escandallos y la diferencia con el real (M20 · 2, 0151).
   * Nulo sin ventas en el TPV, sin permiso para ver lo que cuesta un plato, o si solo ves unas
   * zonas: el real sería de tus zonas y el de los escandallos, de todo.
   */
  readonly escandallos: LaBrechaDelFoodCost | null;
}

/**
 * El food cost de tus escandallos en unas jornadas: lo vendido en Estook TPV, con el coste que
 * tenía al venderse (`linea_bajada`), con la misma cuenta que Negocio › Ventas › Por producto.
 */
async function laBrechaDe(
  contexto: Contexto,
  localId: string,
  desde: FechaOperativa,
  hasta: FechaOperativa,
  real: ReturnType<typeof foodCostReal>,
  tipoDeImpuesto: number | null,
): Promise<LaBrechaDelFoodCost | null> {
  const puede = await loQuePuede(contexto, localId, ['dato.coste_de_plato']);
  if (!puede.ver('dato.coste_de_plato')) return null;
  const filas = await contexto.sql<
    {
      linea_id: string;
      plato_id: string | null;
      menu_id: string | null;
      menu_de: string | null;
      nombre: string;
      cantidad: number;
      importe_centimos: number;
      estado: LineaCobrada['estado'];
      coste_milesimas: string | null;
    }[]
  >`
    select b.linea_id::text as linea_id, b.plato_id::text as plato_id,
           b.menu_id::text as menu_id, b.menu_de::text as menu_de, b.nombre,
           b.cantidad, b.importe_centimos, b.estado,
           b.coste_milesimas::text as coste_milesimas
      from estook.linea_bajada b
     where b.local_id = ${localId}::uuid
       and b.jornada between ${desde}::date and ${hasta}::date
  `;
  if (filas.length === 0) return null;
  const vendido = loVendidoPorProducto(
    filas.map((f) => ({
      lineaId: f.linea_id,
      platoId: f.plato_id,
      menuId: f.menu_id,
      menuDe: f.menu_de,
      nombre: f.nombre,
      seccion: null,
      cantidad: f.cantidad,
      importeCentimos: f.importe_centimos,
      estado: f.estado,
      costeMilesimas: f.coste_milesimas === null ? null : Number(f.coste_milesimas),
    })),
    tipoDeImpuesto,
  );
  return laBrechaDelFoodCost(real, {
    coste: vendido.coste,
    ventasConCoste: vendido.ventasConCoste,
    ventas: vendido.ventas,
  });
}

export const elFoodCostReal = consulta<EntradaElFoodCostReal, SalidaElFoodCostReal>({
  nombre: 'el_food_cost_real',
  entrada: entradaElFoodCostReal,
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    // Dos permisos, como el food cost del Panel (`LO_QUE_PIDE_EL_INDICADOR`): las
    // ventas, que pide la consulta, y los precios de compra, que se miran aquí.
    if (!(await puedeVerPrecios(contexto, localId))) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'El food cost se calcula con los precios de compra, y tu acceso no los ve.',
      });
    }
    const local = await elRelojYElFisco(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, local.zonaHoraria);
    const inventarios = await losDosUltimosInventarios(contexto, localId);

    const periodo = entrada.periodo ?? (inventarios === null ? 'mes' : 'inventarios');
    if (periodo === 'inventarios' && inventarios === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['periodo'],
        porque: 'Hacen falta dos inventarios cerrados en días distintos. Mientras, elige un mes.',
      });
    }
    const limites: LimitesDelPeriodo =
      periodo === 'inventarios' && inventarios !== null
        ? inventarios
        : {
            por: 'dias',
            ...(periodo === 'semana'
              ? laSemana((entrada.dia ?? hoy) as FechaOperativa)
              : periodo === 'trimestre'
                ? elTrimestre(entrada.mes ?? hoy.slice(0, 7))
                : elMes(entrada.mes ?? hoy.slice(0, 7))),
          };
    const { desde, hasta } = limites;
    if (desde > hoy) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: [periodo === 'semana' ? 'dia' : 'mes'],
        porque: 'Ese periodo todavía no ha empezado: elige este o uno de antes.',
      });
    }

    const leida = await laCuentaDelFoodCost(contexto, localId, limites);
    const real = foodCostReal(leida.cuenta);
    const ultimo = hasta > hoy ? hoy : hasta;
    const escandallos = leida.soloSusZonas
      ? null
      : await laBrechaDe(contexto, localId, desde, ultimo, real, leida.cuenta.tipoDeImpuesto);

    const objetivos = await contexto.sql<{ valor: string | null }[]>`
      select valor::text as valor from estook.objetivo
       where local_id = ${localId} and clave = 'materia_prima' and hasta is null
    `;
    const objetivo =
      objetivos[0]?.valor === null || objetivos[0]?.valor === undefined
        ? null
        : Number(objetivos[0].valor);

    return {
      periodo,
      desde,
      hasta: ultimo,
      hoy,
      inventarios:
        inventarios === null ? null : { desde: inventarios.desde, hasta: inventarios.hasta },
      habiaCentimos: leida.cuenta.habia,
      comprasCentimos: leida.cuenta.compras,
      deAltaCentimos: leida.deAlta,
      quedaCentimos: leida.cuenta.queda,
      traspasosCentimos: leida.cuenta.traspasos,
      aparteCentimos: leida.cuenta.aparte,
      consumoRealCentimos: real.consumoReal,
      ventasConImpuestoCentimos: leida.cuenta.ventasConImpuesto,
      ventasSinImpuestoCentimos: real.ventasSinImpuesto,
      tipoDeImpuesto: leida.cuenta.tipoDeImpuesto,
      real: real.real,
      objetivo,
      semaforo: comoVaFrenteAlObjetivo('materia_prima', real.real, objetivo),
      diasDelPeriodo: leida.cuenta.diasDelPeriodo,
      faltanDiasDeCaja: real.faltanDiasDeCaja,
      exacto: real.exacto,
      contados: leida.contados,
      productos: leida.productos,
      parteContada: leida.parteContada,
      soloSusZonas: leida.soloSusZonas,
      escandallos,
    };
  },
});
