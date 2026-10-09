import { z } from 'zod';
import {
  comoVaFrenteAlObjetivo,
  fechaEnElLocal,
  foodCostReal,
  loQueVale,
  type CausaProbable,
  type FechaOperativa,
  type Semaforo,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import {
  elMes,
  elRelojYElFisco,
  laCuentaDelFoodCost,
  lasLineasPorEmparejar,
  loGastadoDeVerdad,
  losDosUltimosInventarios,
  type LimitesDelPeriodo,
  type LineaPorEmparejar,
} from '../desviacion.ts';
import { puedeVerPrecios } from './almacen.ts';

/**
 * Lo que enseña la desviación (M8 · decisión 0079, la segunda entrega).
 *
 *   la_desviacion       lo gastado de verdad de cada producto entre sus dos últimos
 *                       inventarios, y la desviación de lo que se vende tal cual,
 *                       con su causa; y las líneas de la caja por emparejar
 *   el_food_cost_real   (lo que había + lo comprado − lo que queda) ÷ lo vendido sin
 *                       IVA, entre los dos últimos inventarios o en un mes
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
}

const enEuros = loQueVale;

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
    };
  },
});

// ── El food cost real ───────────────────────────────────────────────────────

export const entradaElFoodCostReal = z
  .object({
    /** Entre los dos últimos inventarios, o un mes natural. Sin decirlo, lo primero si lo hay. */
    periodo: z.enum(['inventarios', 'mes']).optional(),
    mes: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'El mes se escribe así: 2026-10.')
      .optional(),
  })
  .strict();

export type EntradaElFoodCostReal = z.infer<typeof entradaElFoodCostReal>;

export interface SalidaElFoodCostReal {
  readonly periodo: 'inventarios' | 'mes';
  readonly desde: FechaOperativa;
  readonly hasta: FechaOperativa;
  readonly hoy: FechaOperativa;
  /** Los dos últimos inventarios, si los hay: para ofrecer ese periodo. */
  readonly inventarios: { readonly desde: FechaOperativa; readonly hasta: FechaOperativa } | null;
  readonly habiaCentimos: number;
  readonly comprasCentimos: number;
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
        : { por: 'dias', ...elMes(entrada.mes ?? hoy.slice(0, 7)) };
    const { desde, hasta } = limites;
    if (desde > hoy) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['mes'],
        porque: 'Ese mes todavía no ha empezado: elige este o uno de antes.',
      });
    }

    const leida = await laCuentaDelFoodCost(contexto, localId, limites);
    const real = foodCostReal(leida.cuenta);

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
      hasta: hasta > hoy ? hoy : hasta,
      hoy,
      inventarios:
        inventarios === null ? null : { desde: inventarios.desde, hasta: inventarios.hasta },
      habiaCentimos: leida.cuenta.habia,
      comprasCentimos: leida.cuenta.compras,
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
    };
  },
});
