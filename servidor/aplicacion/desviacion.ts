import {
  QUE_ES_CADA_SALIDA,
  avisoDeLoQueFalta,
  causaProbable,
  centimos,
  cuadra,
  faltaComoParaAvisar,
  fechaEnElLocal,
  horaDeCorte,
  jornadasEntre,
  loGastado,
  loQueVale,
  masDias,
  parecido,
  primeraJornadaTrasContar,
  resolver,
  type CausaProbable,
  type CuentaDelFoodCost,
  type FechaOperativa,
  type HoraDeCorte,
  type ReglaFiscal,
} from '@estook/dominio';
import { avisar, quienesPuedenRecibir } from './avisos.ts';
import type { Contexto } from './contrato.ts';
import { losProductosValorados } from './consultas/inventario.ts';

/**
 * Lo gastado de verdad, la desviación y el food cost real (M8 · decisión 0079).
 *
 * Lo comparten las dos consultas de la pantalla y el aviso de lo que falta al cerrar
 * un inventario. Las cuentas son del dominio (`desviacion.ts`); aquí se lee lo que
 * necesitan: lo contado, el libro, la caja y lo que se emparejó.
 *
 * ── Por qué cada producto va entre **sus** dos últimos inventarios ──────────
 *
 * Porque el inventario es cíclico (Manifiesto 12): lo caro se cuenta cada semana y lo
 * demás una vez al mes, así que no hay un «inventario de todo» con el que partir el
 * tiempo. Cada producto tiene su ventana, y dentro de ella la cuenta es exacta: **lo
 * que había es lo contado la primera vez y lo que queda, lo contado la segunda**. El
 * libro solo pone lo que entró entre medias, y se lee **por posición** (hasta qué
 * línea del libro se contó, 0060), no por fechas: un albarán de entre contar y cerrar
 * cae en su sitio.
 */

export interface RelojYFiscoDelLocal {
  readonly zonaHoraria: string;
  readonly corte: HoraDeCorte;
  readonly territorio: string;
  readonly regimen: string;
  readonly actividad: string | null;
  readonly epigrafe: string | null;
}

export async function elRelojYElFisco(
  contexto: Contexto,
  localId: string,
): Promise<RelojYFiscoDelLocal> {
  const filas = await contexto.sql<
    {
      zona_horaria: string;
      hora_de_corte: string;
      territorio: string;
      regimen: string;
      actividad: string | null;
      epigrafe_iae: string | null;
    }[]
  >`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte,
           territorio::text as territorio, regimen::text as regimen,
           actividad::text as actividad, epigrafe_iae
      from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  return {
    zonaHoraria: fila?.zona_horaria ?? 'Europe/Madrid',
    corte: horaDeCorte(fila?.hora_de_corte ?? '05:00'),
    territorio: fila?.territorio ?? 'peninsula_y_baleares',
    regimen: fila?.regimen ?? 'iva',
    actividad: fila?.actividad ?? null,
    epigrafe: fila?.epigrafe_iae ?? null,
  };
}

/**
 * El tipo del servicio de restauración del local en una fecha, con el motor fiscal
 * de M2: un 10 % en la península, un 7 % de IGIC en Canarias, lo de su ordenanza en
 * Ceuta y Melilla. **Nulo si no se sabe**: entonces el food cost no se da.
 */
export async function elTipoDeRestauracion(
  contexto: Contexto,
  local: RelojYFiscoDelLocal,
  fecha: FechaOperativa,
): Promise<number | null> {
  const filas = await contexto.sql<
    {
      id: string;
      version: number;
      naturaleza: string | null;
      modo_de_consumo: string | null;
      categoria_fiscal: string | null;
      actividad: string | null;
      epigrafe_iae: string | null;
      tipo: string;
      vigente_desde: string;
      vigente_hasta: string | null;
      referencia_legal: string;
      fuente_url: string | null;
      activa: boolean;
    }[]
  >`
    select id::text as id, version, naturaleza::text as naturaleza,
           modo_de_consumo::text as modo_de_consumo, categoria_fiscal::text as categoria_fiscal,
           actividad::text as actividad, epigrafe_iae, tipo::text as tipo,
           to_char(vigente_desde, 'YYYY-MM-DD') as vigente_desde,
           to_char(vigente_hasta, 'YYYY-MM-DD') as vigente_hasta,
           referencia_legal, fuente_url, activa
      from estook.regla_fiscal
     where territorio::text = ${local.territorio} and regimen::text = ${local.regimen}
  `;
  const reglas = filas.map(
    (f): ReglaFiscal =>
      ({
        id: f.id,
        version: f.version,
        territorio: local.territorio,
        regimen: local.regimen,
        naturaleza: f.naturaleza,
        modoDeConsumo: f.modo_de_consumo,
        categoriaFiscal: f.categoria_fiscal,
        actividad: f.actividad,
        epigrafeIae: f.epigrafe_iae,
        tipo: Number(f.tipo),
        vigenteDesde: f.vigente_desde,
        vigenteHasta: f.vigente_hasta,
        referenciaLegal: f.referencia_legal,
        fuenteUrl: f.fuente_url,
        activa: f.activa,
      }) as ReglaFiscal,
  );
  // Servir de comer y de beber para tomar en el local: un servicio, y el caso de casi
  // todo lo que pasa por una caja de hostelería.
  const resuelto = resolver(reglas, {
    territorio: local.territorio,
    regimen: local.regimen,
    naturaleza: 'prestacion_de_servicios',
    modoDeConsumo: 'en_el_local',
    categoriaFiscal: 'alimento',
    actividad: local.actividad,
    epigrafeIae: local.epigrafe,
    fechaDeDevengo: fecha,
  } as Parameters<typeof resolver>[1]);
  return resuelto.estado === 'resuelto' ? resuelto.regla.tipo : null;
}

// ── Lo gastado de verdad, producto a producto ────────────────────────────────

export interface GastadoDeUnProducto {
  readonly id: string;
  readonly nombre: string;
  readonly zona: string;
  readonly unidadDeUso: string;
  /** Las dos veces que se contó, y las jornadas de caja que caen entre ellas. */
  readonly desde: string;
  readonly hasta: string;
  readonly ventasDesde: FechaOperativa;
  readonly ventasHasta: FechaOperativa;
  readonly habia: number;
  readonly entro: number;
  readonly queda: number;
  readonly gastado: number;
  /** Lo apuntado como salida, venta de cámara, consumo o merma entre las dos veces. */
  readonly apuntado: number;
  readonly mermas: number;
  /** Lo que costó cada unidad, a precio medio, al contarlo la segunda vez. Milésimas. */
  readonly costeMilesimas: number | null;
  /** Solo lo que se vende tal cual, emparejado con la caja (y quien ve las ventas). */
  readonly talCual: {
    readonly conceptos: readonly string[];
    readonly vendido: number;
    readonly diasSinCaja: number;
    readonly desviacion: number;
    readonly causa: CausaProbable | null;
  } | null;
  /** Líneas de la caja sin emparejar que se le parecen, vendidas en su ventana. */
  readonly seLeParecen: readonly string[];
}

/** Cuánto se tienen que parecer un producto y una línea de la caja para proponerlo. */
export const PARECIDO_PARA_PROPONER = 0.4;

interface FilaDeGastado {
  id: string;
  nombre: string;
  zona: string;
  unidad_de_uso: string;
  factor: string;
  en1: string;
  en2: string;
  hay1: string;
  hay2: string;
  decia2: string;
  entro: string;
  apuntado: string;
  venta_camara: string;
  mermas: string;
  entradas_a_mano: string[] | null;
  coste: string | null;
  albaranes_con_incidencias: number;
}

/**
 * Lo gastado de verdad de cada producto contado dos veces, con su desviación si se
 * vende tal cual. `productoIds` acota a unos productos (el aviso al cerrar);
 * `inventarioId`, a los que se contaron la última vez en ese inventario.
 */
export async function loGastadoDeVerdad(
  contexto: Contexto,
  localId: string,
  opciones: {
    readonly conVentas: boolean;
    readonly inventarioId?: string;
  },
): Promise<{ readonly productos: GastadoDeUnProducto[]; readonly contadosUnaVez: number }> {
  const local = await elRelojYElFisco(contexto, localId);
  const inventario = opciones.inventarioId ?? null;

  const filas = await contexto.sql<FilaDeGastado[]>`
    with conteos as (
      select li.producto_id, li.hay, li.decia, li.hasta_movimiento, li.contado_en,
             li.inventario_id,
             row_number() over (
               partition by li.producto_id order by li.contado_en desc, li.id desc
             ) as n
        from estook.linea_de_inventario li
        join estook.inventario i on i.id = li.inventario_id
       where li.local_id = ${localId} and i.estado = 'cerrado' and not li.recontar
    )
    select p.id::text as id, p.nombre, p.zona::text as zona,
           p.unidad_de_uso::text as unidad_de_uso, p.factor::text as factor,
           to_char(c1.contado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as en1,
           to_char(c2.contado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as en2,
           c1.hay::text as hay1, c2.hay::text as hay2, c2.decia::text as decia2,
           f.entro::text as entro, f.apuntado::text as apuntado,
           f.venta_camara::text as venta_camara, f.mermas::text as mermas,
           f.entradas_a_mano::text[] as entradas_a_mano,
           coalesce(nullif(u.coste_medio_despues, 0),
                    (estook.precio_vigente(p.id)).coste_milesimas)::text as coste,
           (select count(distinct a.id)::int
              from estook.linea_de_albaran la
              join estook.albaran a on a.id = la.albaran_id
             where la.producto_id = p.id and cardinality(la.incidencias) > 0
               and a.fecha between (c1.contado_en at time zone ${local.zonaHoraria})::date
                               and (c2.contado_en at time zone ${local.zonaHoraria})::date
           ) as albaranes_con_incidencias
      from conteos c2
      join conteos c1 on c1.producto_id = c2.producto_id and c1.n = 2
      join estook.producto p on p.id = c2.producto_id
      -- Lo que pasó por el libro entre contar y volver a contar, **por posición**. Los
      -- ajustes no se suman a nada: lo contado las dos veces ya es la verdad, y lo que
      -- hizo falta ajustar es justo lo que nadie apuntó.
      join lateral (
        select
          coalesce(sum(m.cantidad) filter (
            where m.tipo = 'entrada' or (m.tipo = 'salida' and m.origen = 'devolucion')
          ), 0) as entro,
          coalesce(-sum(m.cantidad) filter (
            where m.tipo in ('salida', 'venta', 'consumo', 'merma')
              and coalesce(m.origen, '') <> 'devolucion'
          ), 0) as apuntado,
          coalesce(-sum(m.cantidad) filter (where m.tipo = 'venta'), 0) as venta_camara,
          coalesce(-sum(m.cantidad) filter (where m.tipo = 'merma'), 0) as mermas,
          array_agg(m.cantidad::text) filter (
            where m.tipo = 'entrada' and m.cantidad > 0 and m.origen = 'a_mano'
          ) as entradas_a_mano
          from estook.movimiento_de_stock m
         where m.producto_id = p.id
           and m.id > c1.hasta_movimiento and m.id <= c2.hasta_movimiento
      ) f on true
      left join lateral (
        select m.coste_medio_despues
          from estook.movimiento_de_stock m
         where m.producto_id = p.id and m.id <= c2.hasta_movimiento
         order by m.id desc
         limit 1
      ) u on true
     where c2.n = 1
       and p.activo and not p.es_ejemplo
       and (${inventario}::uuid is null or c2.inventario_id = ${inventario}::uuid)
       and p.zona = any ((select estook.zonas_que_ve(${localId}::uuid))::estook.zona_del_producto[])
  `;

  const unaVez = await contexto.sql<{ cuantos: number }[]>`
    select count(*)::int as cuantos from (
      select li.producto_id
        from estook.linea_de_inventario li
        join estook.inventario i on i.id = li.inventario_id
        join estook.producto p on p.id = li.producto_id
       where li.local_id = ${localId} and i.estado = 'cerrado' and not li.recontar
         and p.activo and not p.es_ejemplo
       group by li.producto_id
      having count(*) = 1
    ) x
  `;

  // ── Las jornadas de caja de cada uno ────────────────────────────────────────
  const ventanas = filas.map((f) => ({
    desde: primeraJornadaTrasContar(new Date(f.en1), local.zonaHoraria, local.corte),
    hasta: primeraJornadaTrasContar(new Date(f.en2), local.zonaHoraria, local.corte),
  }));

  const caja =
    opciones.conVentas && filas.length > 0 ? await laCajaDe(contexto, localId, ventanas) : null;

  const productos = filas.map((f, i): GastadoDeUnProducto => {
    const ventana = ventanas[i] ?? { desde: '' as FechaOperativa, hasta: '' as FechaOperativa };
    const habia = Number(f.hay1);
    const entro = Number(f.entro);
    const queda = Number(f.hay2);
    const gastado = loGastado(habia, entro, queda);
    const apuntado = Number(f.apuntado);
    const mermas = Number(f.mermas);
    const dias = jornadasEntre(ventana.desde, ventana.hasta);

    const seLeParecen =
      caja === null
        ? []
        : [...caja.sinEmparejar.values()]
            .filter(
              (linea) =>
                dias.some((dia) => linea.dias.has(dia)) &&
                parecido(linea.concepto, f.nombre) >= PARECIDO_PARA_PROPONER,
            )
            .map((linea) => linea.concepto);

    const conceptos = caja?.emparejados.get(f.id) ?? null;
    let talCual: GastadoDeUnProducto['talCual'] = null;
    if (caja !== null && conceptos !== null) {
      const vendido = Number(
        dias.reduce((suma, dia) => suma + (conceptos.vendidoPorDia.get(dia) ?? 0), 0).toFixed(4),
      );
      const diasSinCaja = dias.filter((dia) => !caja.diasConLineas.has(dia)).length;
      // Lo que se sabe por qué salió: lo vendido según la caja, las mermas y las
      // salidas a cocina o a otro local. Lo vendido apuntado en cámara no: ya está en
      // la caja, y contarlo dos veces escondería lo que falta.
      const otrasSalidas = apuntado - Number(f.venta_camara) - mermas;
      const desviacion = Number((gastado - vendido - mermas - otrasSalidas).toFixed(4));
      talCual = {
        conceptos: conceptos.nombres,
        vendido,
        diasSinCaja,
        desviacion,
        causa: causaProbable({
          desviacion,
          gastado,
          unidad: f.unidad_de_uso,
          hay: queda,
          decia: Number(f.decia2),
          factor: Number(f.factor),
          diasSinCaja,
          otrosNombres: seLeParecen,
          albaranesConIncidencias: f.albaranes_con_incidencias,
          entradasAMano: (f.entradas_a_mano ?? []).map(Number),
        }),
      };
    }

    return {
      id: f.id,
      nombre: f.nombre,
      zona: f.zona,
      unidadDeUso: f.unidad_de_uso,
      desde: f.en1,
      hasta: f.en2,
      ventasDesde: ventana.desde,
      ventasHasta: masDias(ventana.hasta, -1),
      habia,
      entro,
      queda,
      gastado,
      apuntado,
      mermas,
      costeMilesimas: f.coste === null ? null : Number(f.coste),
      talCual,
      seLeParecen: talCual === null ? seLeParecen : [],
    };
  });

  return { productos, contadosUnaVez: unaVez[0]?.cuantos ?? 0 };
}

interface LaCaja {
  /** Producto → los nombres con que sale en la caja y lo vendido cada día. */
  readonly emparejados: ReadonlyMap<
    string,
    { readonly nombres: string[]; readonly vendidoPorDia: Map<string, number> }
  >;
  /** Las líneas sin emparejar ni descartar, con los días en que se vendieron. */
  readonly sinEmparejar: ReadonlyMap<
    string,
    { readonly concepto: string; readonly dias: Set<string> }
  >;
  /** Los días con la caja cerrada **y sus líneas**: sin líneas no se sabe qué se vendió. */
  readonly diasConLineas: ReadonlySet<string>;
}

/** La caja de todas las ventanas juntas, en tres lecturas. Pide `dato.ventas`. */
async function laCajaDe(
  contexto: Contexto,
  localId: string,
  ventanas: readonly { desde: FechaOperativa; hasta: FechaOperativa }[],
): Promise<LaCaja> {
  const desde = ventanas.reduce((min, v) => (v.desde < min ? v.desde : min), '9999-12-31');
  const hasta = ventanas.reduce((max, v) => (v.hasta > max ? v.hasta : max), '0000-01-01');

  const lineas = await contexto.sql<
    {
      fecha: string;
      concepto: string;
      normalizado: string;
      unidades: string;
      producto_id: string | null;
      por_venta: string | null;
      ignorado: boolean | null;
    }[]
  >`
    select to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha, l.concepto,
           l.concepto_normalizado as normalizado, l.unidades::text as unidades,
           cc.producto_id::text as producto_id, cc.por_venta::text as por_venta, cc.ignorado
      from estook.linea_de_cierre l
      join estook.cierre_de_caja c on c.id = l.cierre_id
      left join estook.concepto_de_caja cc
        on cc.local_id = c.local_id and cc.concepto_normalizado = l.concepto_normalizado
     where c.local_id = ${localId}
       and c.fecha_operativa >= ${desde}::date and c.fecha_operativa < ${hasta}::date
  `;
  const emparejadosAqui = await contexto.sql<{ producto_id: string; concepto: string }[]>`
    select producto_id::text as producto_id, concepto
      from estook.concepto_de_caja
     where local_id = ${localId} and producto_id is not null
     order by concepto
  `;

  type Emparejado = { nombres: string[]; vendidoPorDia: Map<string, number> };
  const emparejados = new Map<string, Emparejado>();
  for (const e of emparejadosAqui) {
    const uno: Emparejado = emparejados.get(e.producto_id) ?? {
      nombres: [],
      vendidoPorDia: new Map(),
    };
    uno.nombres.push(e.concepto);
    emparejados.set(e.producto_id, uno);
  }
  const sinEmparejar = new Map<string, { concepto: string; dias: Set<string> }>();
  const diasConLineas = new Set<string>();
  for (const l of lineas) {
    diasConLineas.add(l.fecha);
    if (l.producto_id !== null) {
      const uno = emparejados.get(l.producto_id);
      if (uno === undefined) continue;
      uno.vendidoPorDia.set(
        l.fecha,
        (uno.vendidoPorDia.get(l.fecha) ?? 0) + Number(l.unidades) * Number(l.por_venta ?? 1),
      );
    } else if (l.ignorado !== true) {
      const una = sinEmparejar.get(l.normalizado) ?? { concepto: l.concepto, dias: new Set() };
      una.dias.add(l.fecha);
      sinEmparejar.set(l.normalizado, una);
    }
  }
  return { emparejados, sinEmparejar, diasConLineas };
}

// ── Las líneas de la caja por emparejar ──────────────────────────────────────

export interface LineaPorEmparejar {
  readonly concepto: string;
  readonly unidades: number;
  readonly dias: number;
  /** El producto que más se le parece, si alguno se parece lo bastante. */
  readonly propuesto: { readonly id: string; readonly nombre: string } | null;
}

/** Cuántos días de caja se miran para proponer qué emparejar. */
export const DIAS_DE_CAJA_PARA_EMPAREJAR = 60;

/**
 * Las líneas de la caja de los últimos dos meses que todavía no se han dicho, con lo
 * vendido: lo que más se vende, primero. Y el producto que se les parece.
 */
export async function lasLineasPorEmparejar(
  contexto: Contexto,
  localId: string,
  hoy: FechaOperativa,
): Promise<LineaPorEmparejar[]> {
  const filas = await contexto.sql<
    { normalizado: string; concepto: string; unidades: string; dias: number }[]
  >`
    select l.concepto_normalizado as normalizado, max(l.concepto) as concepto,
           sum(l.unidades)::text as unidades, count(distinct c.fecha_operativa)::int as dias
      from estook.linea_de_cierre l
      join estook.cierre_de_caja c on c.id = l.cierre_id
     where c.local_id = ${localId}
       and c.fecha_operativa > ${hoy}::date - ${DIAS_DE_CAJA_PARA_EMPAREJAR}::int
       and not exists (
         select 1 from estook.concepto_de_caja cc
          where cc.local_id = c.local_id and cc.concepto_normalizado = l.concepto_normalizado
       )
     group by l.concepto_normalizado
     order by sum(l.unidades) desc
     limit 60
  `;
  if (filas.length === 0) return [];
  const productos = await contexto.sql<{ id: string; nombre: string }[]>`
    select p.id::text as id, p.nombre
      from estook.producto p
     where p.local_id = ${localId} and p.activo and not p.es_ejemplo
       and p.zona = any ((select estook.zonas_que_ve(${localId}::uuid))::estook.zona_del_producto[])
  `;
  return filas.map((f) => {
    let mejor: { id: string; nombre: string; cuanto: number } | null = null;
    for (const p of productos) {
      const cuanto = parecido(f.concepto, p.nombre);
      if (cuanto >= PARECIDO_PARA_PROPONER && (mejor === null || cuanto > mejor.cuanto)) {
        mejor = { ...p, cuanto };
      }
    }
    return {
      concepto: f.concepto,
      unidades: Number(f.unidades),
      dias: f.dias,
      propuesto: mejor === null ? null : { id: mejor.id, nombre: mejor.nombre },
    };
  });
}

// ── El food cost real de un periodo ──────────────────────────────────────────

export interface CuentaLeida {
  readonly cuenta: CuentaDelFoodCost;
  /** Cuántos productos con género se contaron en el periodo, y qué parte del valor son. */
  readonly contados: number;
  readonly productos: number;
  readonly parteContada: number | null;
  /** Si quien pregunta solo ve unas zonas (el jefe de cocina, la cocina). */
  readonly soloSusZonas: boolean;
}

/**
 * Dónde empieza y acaba el periodo. Por días, un mes: lo que había al acabar el día
 * de antes y lo que queda al acabar el último. **Entre dos inventarios, por posición
 * en el libro**: lo que había justo al cerrar el primero y lo que queda justo al
 * cerrar el segundo. Por días no valdría: si se cuenta el lunes por la mañana, el
 * ajuste de ese inventario cae el lunes, dentro del periodo, y no en su punto de
 * partida. Las ventas, de las jornadas que caen entre los dos conteos.
 */
export type LimitesDelPeriodo =
  | { readonly por: 'dias'; readonly desde: FechaOperativa; readonly hasta: FechaOperativa }
  | {
      readonly por: 'posicion';
      readonly desde: FechaOperativa;
      readonly hasta: FechaOperativa;
      readonly desdeMovimiento: string;
      readonly hastaMovimiento: string;
    };

/**
 * Las piezas del food cost real de un periodo. Lo que había y lo que queda salen de
 * `losProductosValorados`, la misma cifra que «Valor»; lo que entra y sale, del libro
 * entre medias, valorado igual.
 */
export async function laCuentaDelFoodCost(
  contexto: Contexto,
  localId: string,
  limites: LimitesDelPeriodo,
): Promise<CuentaLeida> {
  const local = await elRelojYElFisco(contexto, localId);
  const hoy = fechaEnElLocal(contexto.ahora, local.zonaHoraria);
  const desde = limites.desde;
  const ultimo = limites.hasta > hoy ? hoy : limites.hasta;
  const porPosicion = limites.por === 'posicion';
  const desdeId = porPosicion ? limites.desdeMovimiento : null;
  const hastaId = porPosicion ? limites.hastaMovimiento : null;

  const antes = await losProductosValorados(contexto, localId, masDias(desde, -1), null, desdeId);
  const despues = await losProductosValorados(contexto, localId, ultimo, null, hastaId);
  const suma = (lista: readonly { valorCentimos: number | null }[]) =>
    lista.reduce((total, p) => total + (p.valorCentimos ?? 0), 0);

  // Lo que entra y sale **valorado igual que el almacén**: a lo que costó al entrar, y
  // a precio medio al salir; lo que no tiene ninguno de los dos, a su precio de hoy.
  const flujos = await contexto.sql<
    { compras: string; devoluciones: string; traspasos: string; aparte: string }[]
  >`
    select
      coalesce(sum(round(m.cantidad * coalesce(nullif(m.coste_milesimas, 0),
                   nullif(m.coste_medio_despues, 0), v.coste, 0) / 1000.0))
        filter (where m.tipo = 'entrada'), 0)::text as compras,
      coalesce(sum(round(-m.cantidad * coalesce(nullif(m.coste_medio_despues, 0), v.coste, 0) / 1000.0))
        filter (where m.tipo = 'salida' and m.origen = 'devolucion'), 0)::text as devoluciones,
      coalesce(sum(round(-m.cantidad * coalesce(nullif(m.coste_medio_despues, 0), v.coste, 0) / 1000.0))
        filter (where m.tipo = 'salida' and coalesce(m.origen, '') <> 'devolucion'
                  and m.motivo like ${QUE_ES_CADA_SALIDA.traspaso.nombre} || '%'), 0)::text as traspasos,
      coalesce(sum(round(-m.cantidad * coalesce(nullif(m.coste_medio_despues, 0), v.coste, 0) / 1000.0))
        filter (where m.tipo = 'merma'
                  and estook.partida_de_la_merma(m.motivo_de_merma) <> 'perdida'), 0)::text as aparte
      from estook.movimiento_de_stock m
      join estook.producto p on p.id = m.producto_id
      left join lateral (select (estook.precio_vigente(p.id)).coste_milesimas as coste) v on true
     where m.local_id = ${localId}
       and (case when ${hastaId}::bigint is null
                 then m.fecha_operativa between ${desde}::date and ${ultimo}::date
                 else m.id > ${desdeId}::bigint and m.id <= ${hastaId}::bigint end)
       and p.activo and not p.es_ejemplo
       and p.zona = any ((select estook.zonas_que_ve(${localId}::uuid))::estook.zona_del_producto[])
  `;
  const f = flujos[0] ?? { compras: '0', devoluciones: '0', traspasos: '0', aparte: '0' };

  const cajas = await contexto.sql<{ total: string; dias: number }[]>`
    select coalesce(sum(total_centimos), 0)::text as total, count(*)::int as dias
      from estook.cierre_de_caja
     where local_id = ${localId} and fecha_operativa between ${desde}::date and ${ultimo}::date
  `;

  const zonas = await contexto.sql<{ todas: boolean }[]>`
    select (select count(*) from unnest(enum_range(null::estook.zona_del_producto)))
           = cardinality((select estook.zonas_que_ve(${localId}::uuid))::estook.zona_del_producto[]) as todas
  `;

  // Lo contado en el periodo: cuánto del valor final sale de contar y no del libro.
  const contadas = await contexto.sql<{ producto_id: string; contado_en: string }[]>`
    select li.producto_id::text as producto_id,
           to_char(li.contado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as contado_en
      from estook.linea_de_inventario li
      join estook.inventario i on i.id = li.inventario_id
     where li.local_id = ${localId} and i.estado = 'cerrado' and not li.recontar
       and li.contado_en >= ${desde}::date - 1 and li.contado_en < ${ultimo}::date + 2
  `;
  // Con la misma regla que las ventas: lo contado al empezar es el punto de partida, y
  // lo contado al acabar —también la mañana siguiente, antes de abrir— es del periodo.
  const contadosEnElPeriodo = new Set(
    contadas
      .filter((c) => {
        const tras = primeraJornadaTrasContar(
          new Date(c.contado_en),
          local.zonaHoraria,
          local.corte,
        );
        return tras > desde && tras <= masDias(ultimo, 1);
      })
      .map((c) => c.producto_id),
  );
  const queda = suma(despues);
  const valorContado = suma(despues.filter((p) => contadosEnElPeriodo.has(p.id)));

  return {
    cuenta: {
      habia: suma(antes),
      compras: Number(f.compras) - Number(f.devoluciones),
      queda,
      traspasos: Number(f.traspasos),
      aparte: Number(f.aparte),
      ventasConImpuesto: Number(cajas[0]?.total ?? 0),
      tipoDeImpuesto: await elTipoDeRestauracion(contexto, local, ultimo),
      diasDelPeriodo: jornadasEntre(desde, masDias(ultimo, 1)).length,
      diasConCaja: cajas[0]?.dias ?? 0,
    },
    contados: despues.filter((p) => contadosEnElPeriodo.has(p.id)).length,
    productos: despues.length,
    parteContada: queda > 0 ? valorContado / queda : null,
    soloSusZonas: zonas[0]?.todas !== true,
  };
}

/**
 * El periodo entre los dos últimos inventarios cerrados, por posición en el libro. Si
 * hay varios del mismo día de caja, cuenta el último de ese día: medio día de ventas
 * no es un periodo. Nulo si no hay dos.
 */
export async function losDosUltimosInventarios(
  contexto: Contexto,
  localId: string,
): Promise<Extract<LimitesDelPeriodo, { por: 'posicion' }> | null> {
  const local = await elRelojYElFisco(contexto, localId);
  // Dónde acabó cada uno en el libro: su último ajuste, o —si cuadraba todo y no dejó
  // ninguno— hasta dónde se había leído al contar.
  const filas = await contexto.sql<{ contado_en: string; hasta: string }[]>`
    select to_char(i.contado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as contado_en,
           coalesce(
             (select max(m.id) from estook.movimiento_de_stock m
               where m.local_id = i.local_id and m.correlacion_id = i.correlacion_id
                 and m.tipo = 'recuento'),
             (select max(li.hasta_movimiento) from estook.linea_de_inventario li
               where li.inventario_id = i.id),
             0
           )::text as hasta
      from estook.inventario i
     where i.local_id = ${localId} and i.estado = 'cerrado'
     order by i.cerrado_en desc
     limit 60
  `;
  const porDia = new Map<FechaOperativa, string>();
  for (const f of filas) {
    const dia = primeraJornadaTrasContar(new Date(f.contado_en), local.zonaHoraria, local.corte);
    if (!porDia.has(dia)) porDia.set(dia, f.hasta);
  }
  const [ultimo, penultimo] = [...porDia.entries()];
  if (ultimo === undefined || penultimo === undefined) return null;
  return {
    por: 'posicion',
    desde: penultimo[0],
    hasta: masDias(ultimo[0], -1),
    desdeMovimiento: penultimo[1],
    hastaMovimiento: ultimo[1],
  };
}

/** Lo que falta de lo que se vende tal cual en un inventario recién cerrado, en euros. */
export async function loQueFaltaAlCerrar(
  contexto: Contexto,
  localId: string,
  inventarioId: string,
): Promise<{
  readonly faltaCentimos: number;
  readonly gastadoCentimos: number;
  readonly productos: readonly string[];
}> {
  const puede = await contexto.sql<{ ventas: boolean }[]>`
    select estook.puede_ver('dato.ventas', ${localId}::uuid) as ventas
  `;
  if (puede[0]?.ventas !== true) return { faltaCentimos: 0, gastadoCentimos: 0, productos: [] };
  const { productos } = await loGastadoDeVerdad(contexto, localId, {
    conVentas: true,
    inventarioId,
  });
  let falta = 0;
  let gastado = 0;
  const nombres: { nombre: string; falta: number }[] = [];
  for (const p of productos) {
    if (p.talCual === null || p.costeMilesimas === null) continue;
    gastado += loQueVale(Math.max(p.gastado, 0), p.costeMilesimas) ?? 0;
    if (p.talCual.desviacion > 0 && !cuadra(p.talCual.desviacion, p.gastado)) {
      const euros = loQueVale(p.talCual.desviacion, p.costeMilesimas) ?? 0;
      falta += euros;
      nombres.push({ nombre: p.nombre, falta: euros });
    }
  }
  return {
    faltaCentimos: falta,
    gastadoCentimos: gastado,
    productos: nombres.sort((a, b) => b.falta - a.falta).map((n) => n.nombre),
  };
}

/**
 * Al cerrar un inventario, si lo que falta de lo que se vende tal cual pasa del 3 %
 * de lo gastado, se avisa a quien cierra inventarios y ve precios (0078, «lo que
 * decido yo» 9). A quien lo acaba de cerrar no: lo está viendo.
 */
export async function avisarSiFalta(
  contexto: Contexto,
  datos: {
    readonly localId: string;
    readonly organizacionId: string;
    readonly inventarioId: string;
  },
): Promise<number> {
  const falta = await loQueFaltaAlCerrar(contexto, datos.localId, datos.inventarioId);
  if (!faltaComoParaAvisar(falta.faltaCentimos, falta.gastadoCentimos)) return 0;
  const parte = falta.faltaCentimos / falta.gastadoCentimos;
  return avisar(
    contexto,
    {
      tipo: 'inventario.falta',
      organizacionId: datos.organizacionId,
      localId: datos.localId,
      clave: datos.inventarioId,
      texto: () => avisoDeLoQueFalta(centimos(falta.faltaCentimos), parte, falta.productos),
      ir: '/almacen/movimientos/desviacion',
      quien: null,
    },
    await quienesPuedenRecibir(contexto, datos.localId, 'inventario.falta'),
  );
}

/** La primera jornada de un mes y la última, a partir de «2026-10». */
export function elMes(mes: string): { desde: FechaOperativa; hasta: FechaOperativa } {
  const desde = `${mes}-01` as FechaOperativa;
  // Del día 1, treinta y un días más es siempre el mes siguiente.
  const siguiente = `${masDias(desde, 31).slice(0, 7)}-01` as FechaOperativa;
  return { desde, hasta: masDias(siguiente, -1) };
}
