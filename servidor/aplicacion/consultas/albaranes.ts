import { z } from 'zod';
import { conciliar, type Incidencia } from '@estook/dominio';
import { elProveedor, loQuePuedeConLosPrecios } from '../compras.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { elLocal } from './pedidos.ts';

/**
 * Lo que ha llegado y lo que se ha cobrado (M7): albaranes y facturas.
 *
 * Los albaranes son de Inventario: los ve el cocinero que los recibió, **sin un
 * importe**. Las facturas son dinero entero: las ve y las toca quien tiene
 * `dato.precio_de_compra`, y a quien no, ni le llegan.
 */

// ── Los albaranes ────────────────────────────────────────────────────────────

export interface AlbaranEnLista {
  readonly id: string;
  readonly tipo: 'entrega' | 'devolucion';
  readonly numero: string | null;
  readonly fecha: string;
  readonly proveedorId: string;
  readonly proveedor: string;
  readonly pedidoId: string | null;
  readonly numeroDePedido: number | null;
  readonly conIncidencias: boolean;
  readonly lineas: number;
  readonly quienLoRecibio: string | null;
  readonly facturaId: string | null;
  readonly totalCentimos?: number;
  /** Líneas que entraron sin precio y esperan a la factura. */
  readonly sinValorar?: number;
  readonly facturaNumero?: string | null;
}

export const entradaMisAlbaranes = z
  .object({
    vista: z.enum(['todos', 'sin_factura', 'con_incidencias', 'devoluciones']).optional(),
    proveedor_id: z.string().uuid().optional(),
    limite: z.coerce.number().int().min(1).max(200).optional(),
    salto: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export type EntradaMisAlbaranes = z.infer<typeof entradaMisAlbaranes>;

export interface SalidaMisAlbaranes {
  readonly albaranes: readonly AlbaranEnLista[];
  readonly hayMas: boolean;
  readonly cuantos: Readonly<Record<'sinFactura' | 'conIncidencias' | 'devoluciones', number>>;
  readonly puedeVerPrecios: boolean;
}

export const misAlbaranes = consulta<EntradaMisAlbaranes, SalidaMisAlbaranes>({
  nombre: 'mis_albaranes',
  entrada: entradaMisAlbaranes,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const precios = await loQuePuedeConLosPrecios(contexto, localId);
    const vista = entrada.vista ?? 'todos';
    const limite = entrada.limite ?? 50;
    const salto = entrada.salto ?? 0;

    const filas = await contexto.sql<
      {
        id: string;
        tipo: 'entrega' | 'devolucion';
        numero: string | null;
        fecha: string;
        proveedor_id: string;
        proveedor: string;
        pedido_id: string | null;
        numero_de_pedido: number | null;
        con_incidencias: boolean;
        lineas: number;
        quien: string | null;
        factura_id: string | null;
        factura_numero: string | null;
        total: string | null;
        sin_valorar: number;
      }[]
    >`
      select a.id, a.tipo::text as tipo, a.numero, to_char(a.fecha, 'YYYY-MM-DD') as fecha,
             a.proveedor_id, pv.nombre as proveedor, a.pedido_id, pd.numero as numero_de_pedido,
             a.con_incidencias,
             (select count(*)::int from estook.linea_de_albaran l where l.albaran_id = a.id) as lineas,
             pe.nombre as quien, a.factura_id, f.numero as factura_numero,
             (select sum(coalesce(l.importe_facturado_centimos, l.importe_centimos))::text
                from estook.linea_de_albaran l where l.albaran_id = a.id) as total,
             (select count(*)::int from estook.linea_de_albaran l
               where l.albaran_id = a.id and l.cantidad > 0
                 and l.importe_centimos is null and l.importe_facturado_centimos is null) as sin_valorar
        from estook.albaran a
        join estook.proveedor pv on pv.id = a.proveedor_id
        left join estook.pedido_de_compra pd on pd.id = a.pedido_id
        left join estook.persona pe on pe.id = a.recibido_por
        left join estook.factura_de_compra f on f.id = a.factura_id
       where a.local_id = ${localId}
         and (${entrada.proveedor_id ?? null}::uuid is null
              or a.proveedor_id = ${entrada.proveedor_id ?? null}::uuid)
         and (${vista} <> 'sin_factura' or a.factura_id is null)
         and (${vista} <> 'con_incidencias' or a.con_incidencias)
         and (${vista} <> 'devoluciones' or a.tipo = 'devolucion')
       order by a.fecha desc, a.recibido_en desc
       limit ${limite + 1} offset ${salto}
    `;

    const cuantos = await contexto.sql<
      { sin_factura: number; con_incidencias: number; devoluciones: number }[]
    >`
      select count(*) filter (where factura_id is null)::int as sin_factura,
             count(*) filter (where con_incidencias)::int as con_incidencias,
             count(*) filter (where tipo = 'devolucion')::int as devoluciones
        from estook.albaran where local_id = ${localId}
    `;

    return {
      albaranes: filas.slice(0, limite).map((a) => {
        const base: AlbaranEnLista = {
          id: a.id,
          tipo: a.tipo,
          numero: a.numero,
          fecha: a.fecha,
          proveedorId: a.proveedor_id,
          proveedor: a.proveedor,
          pedidoId: a.pedido_id,
          numeroDePedido: a.numero_de_pedido,
          conIncidencias: a.con_incidencias,
          lineas: a.lineas,
          quienLoRecibio: a.quien,
          facturaId: a.factura_id,
        };
        return precios.ver
          ? {
              ...base,
              totalCentimos: a.total === null ? 0 : Number(a.total),
              sinValorar: a.sin_valorar,
              facturaNumero: a.factura_numero,
            }
          : base;
      }),
      hayMas: filas.length > limite,
      cuantos: {
        sinFactura: cuantos[0]?.sin_factura ?? 0,
        conIncidencias: cuantos[0]?.con_incidencias ?? 0,
        devoluciones: cuantos[0]?.devoluciones ?? 0,
      },
      puedeVerPrecios: precios.ver,
    };
  },
});

// ── Un albarán ───────────────────────────────────────────────────────────────

export interface LineaDelAlbaran {
  readonly id: string;
  readonly productoId: string;
  readonly producto: string;
  readonly unidadDeUso: string;
  readonly formato: string | null;
  readonly pesoVariable: boolean;
  readonly formatos: number | null;
  readonly cantidad: number;
  /** Lo que se pidió de esto, en formatos, si venía en un pedido. */
  readonly pedida: number | null;
  readonly incidencias: readonly Incidencia[];
  readonly nota: string | null;
  readonly lote: string | null;
  readonly caducaEl: string | null;
  readonly importeCentimos?: number | null;
  readonly importeFacturadoCentimos?: number | null;
  readonly costeMilesimas?: number | null;
}

interface FilaDeLineaDelAlbaran {
  id: string;
  albaran_id: string;
  producto_id: string;
  producto: string;
  unidad_de_uso: string;
  formato: string | null;
  peso_variable: boolean;
  formatos: string | null;
  cantidad: string;
  pedida: string | null;
  incidencias: Incidencia[];
  nota: string | null;
  lote: string | null;
  caduca_el: string | null;
  importe: string | null;
  facturado: string | null;
  coste: string | null;
}

async function lasLineas(
  sql: Parameters<Parameters<typeof consulta>[0]['ejecutar']>[0]['sql'],
  albaranIds: readonly string[],
): Promise<FilaDeLineaDelAlbaran[]> {
  return sql<FilaDeLineaDelAlbaran[]>`
    select l.id::text as id, l.albaran_id, l.producto_id, p.nombre as producto,
           p.unidad_de_uso::text as unidad_de_uso, p.formato, p.peso_variable,
           l.formatos::text as formatos, l.cantidad::text as cantidad,
           lp.cantidad::text as pedida, l.incidencias::text[] as incidencias, l.nota,
           lo.codigo as lote, to_char(lo.caduca_el, 'YYYY-MM-DD') as caduca_el,
           l.importe_centimos::text as importe, l.importe_facturado_centimos::text as facturado,
           l.coste_milesimas::text as coste
      from estook.linea_de_albaran l
      join estook.producto p on p.id = l.producto_id
      left join estook.lote lo on lo.id = l.lote_id
      left join estook.linea_de_pedido lp on lp.id = l.linea_de_pedido_id
     where l.albaran_id = any(${comoLista(albaranIds)}::text::uuid[])
     order by l.id
  `;
}

function componerLinea(l: FilaDeLineaDelAlbaran, conPrecios: boolean): LineaDelAlbaran {
  const numero = (valor: string | null) => (valor === null ? null : Number(valor));
  const linea: LineaDelAlbaran = {
    id: l.id,
    productoId: l.producto_id,
    producto: l.producto,
    unidadDeUso: l.unidad_de_uso,
    formato: l.formato,
    pesoVariable: l.peso_variable,
    formatos: numero(l.formatos),
    cantidad: Number(l.cantidad),
    pedida: numero(l.pedida),
    incidencias: l.incidencias,
    nota: l.nota,
    lote: l.lote,
    caducaEl: l.caduca_el,
  };
  return conPrecios
    ? {
        ...linea,
        importeCentimos: numero(l.importe),
        importeFacturadoCentimos: numero(l.facturado),
        costeMilesimas: numero(l.coste),
      }
    : linea;
}

export interface SalidaUnAlbaran {
  readonly albaran: AlbaranEnLista & { readonly notas: string | null; readonly recibidoEn: string };
  readonly lineas: readonly LineaDelAlbaran[];
  readonly puedeVerPrecios: boolean;
  readonly puedeDevolver: boolean;
}

export const unAlbaran = consulta<{ albaran_id: string }, SalidaUnAlbaran>({
  nombre: 'un_albaran',
  entrada: z.object({ albaran_id: z.string().uuid() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const precios = await loQuePuedeConLosPrecios(contexto, localId);

    const filas = await contexto.sql<
      {
        id: string;
        tipo: 'entrega' | 'devolucion';
        numero: string | null;
        fecha: string;
        proveedor_id: string;
        proveedor: string;
        pedido_id: string | null;
        numero_de_pedido: number | null;
        con_incidencias: boolean;
        quien: string | null;
        factura_id: string | null;
        factura_numero: string | null;
        notas: string | null;
        recibido_en: string;
      }[]
    >`
      select a.id, a.tipo::text as tipo, a.numero, to_char(a.fecha, 'YYYY-MM-DD') as fecha,
             a.proveedor_id, pv.nombre as proveedor, a.pedido_id, pd.numero as numero_de_pedido,
             a.con_incidencias, pe.nombre as quien, a.factura_id, f.numero as factura_numero,
             a.notas, to_char(a.recibido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as recibido_en
        from estook.albaran a
        join estook.proveedor pv on pv.id = a.proveedor_id
        left join estook.pedido_de_compra pd on pd.id = a.pedido_id
        left join estook.persona pe on pe.id = a.recibido_por
        left join estook.factura_de_compra f on f.id = a.factura_id
       where a.id = ${entrada.albaran_id} and a.local_id = ${localId}
    `;
    const a = filas[0];
    if (!a) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese albarán no está, o no es de este local.',
      });
    }

    const lineas = (await lasLineas(contexto.sql, [a.id])).map((l) =>
      componerLinea(l, precios.ver),
    );
    const total = lineas.reduce(
      (s, l) => s + (l.importeFacturadoCentimos ?? l.importeCentimos ?? 0),
      0,
    );

    const puede = await contexto.sql<{ puede: boolean }[]>`
      select estook.puede_editar('app.inventario', ${localId}::uuid) as puede
    `;

    const base: AlbaranEnLista = {
      id: a.id,
      tipo: a.tipo,
      numero: a.numero,
      fecha: a.fecha,
      proveedorId: a.proveedor_id,
      proveedor: a.proveedor,
      pedidoId: a.pedido_id,
      numeroDePedido: a.numero_de_pedido,
      conIncidencias: a.con_incidencias,
      lineas: lineas.length,
      quienLoRecibio: a.quien,
      facturaId: a.factura_id,
    };

    return {
      albaran: {
        ...(precios.ver
          ? { ...base, totalCentimos: total, facturaNumero: a.factura_numero }
          : base),
        notas: a.notas,
        recibidoEn: a.recibido_en,
      },
      lineas,
      puedeVerPrecios: precios.ver,
      puedeDevolver: puede[0]?.puede === true && a.tipo === 'entrega',
    };
  },
});

// ── Las facturas ─────────────────────────────────────────────────────────────

export interface FacturaEnLista {
  readonly id: string;
  readonly tipo: 'factura' | 'abono';
  readonly numero: string;
  readonly fecha: string;
  readonly venceEl: string | null;
  readonly proveedorId: string;
  readonly proveedor: string;
  readonly baseCentimos: number;
  readonly totalCentimos: number | null;
  readonly estado: 'sin_conciliar' | 'conciliada' | 'con_diferencia';
  readonly diferenciaCentimos: number | null;
  readonly notas: string | null;
  readonly albaranes: number;
  readonly quienLaApunto: string | null;
}

export const entradaMisFacturas = z
  .object({
    vista: z.enum(['todas', 'sin_conciliar', 'con_diferencia']).optional(),
    proveedor_id: z.string().uuid().optional(),
    limite: z.coerce.number().int().min(1).max(200).optional(),
    salto: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export type EntradaMisFacturas = z.infer<typeof entradaMisFacturas>;

interface FilaDeFactura {
  id: string;
  tipo: 'factura' | 'abono';
  numero: string;
  fecha: string;
  vence_el: string | null;
  proveedor_id: string;
  proveedor: string;
  base: string;
  total: string | null;
  estado: 'sin_conciliar' | 'conciliada' | 'con_diferencia';
  diferencia: string | null;
  notas: string | null;
  albaranes: number;
  quien: string | null;
}

function componerFactura(f: FilaDeFactura): FacturaEnLista {
  return {
    id: f.id,
    tipo: f.tipo,
    numero: f.numero,
    fecha: f.fecha,
    venceEl: f.vence_el,
    proveedorId: f.proveedor_id,
    proveedor: f.proveedor,
    baseCentimos: Number(f.base),
    totalCentimos: f.total === null ? null : Number(f.total),
    estado: f.estado,
    diferenciaCentimos: f.diferencia === null ? null : Number(f.diferencia),
    notas: f.notas,
    albaranes: f.albaranes,
    quienLaApunto: f.quien,
  };
}

export const misFacturas = consulta<
  EntradaMisFacturas,
  {
    readonly facturas: readonly FacturaEnLista[];
    readonly hayMas: boolean;
    readonly cuantos: Readonly<Record<'sinConciliar' | 'conDiferencia', number>>;
  }
>({
  nombre: 'mis_facturas',
  entrada: entradaMisFacturas,
  // La factura es dinero entero: a quien no ve precios no le llega ni la lista.
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const vista = entrada.vista ?? 'todas';
    const limite = entrada.limite ?? 50;
    const salto = entrada.salto ?? 0;

    const filas = await contexto.sql<FilaDeFactura[]>`
      select f.id, f.tipo::text as tipo, f.numero, to_char(f.fecha, 'YYYY-MM-DD') as fecha,
             to_char(f.vence_el, 'YYYY-MM-DD') as vence_el, f.proveedor_id, pv.nombre as proveedor,
             f.base_centimos::text as base, f.total_centimos::text as total, f.estado::text as estado,
             f.diferencia_centimos::text as diferencia, f.notas,
             (select count(*)::int from estook.albaran a where a.factura_id = f.id) as albaranes,
             pe.nombre as quien
        from estook.factura_de_compra f
        join estook.proveedor pv on pv.id = f.proveedor_id
        left join estook.persona pe on pe.id = f.registrada_por
       where f.local_id = ${localId}
         and (${entrada.proveedor_id ?? null}::uuid is null
              or f.proveedor_id = ${entrada.proveedor_id ?? null}::uuid)
         and (${vista} <> 'sin_conciliar' or f.estado = 'sin_conciliar')
         and (${vista} <> 'con_diferencia' or f.estado = 'con_diferencia')
       order by f.fecha desc, f.registrada_en desc
       limit ${limite + 1} offset ${salto}
    `;

    const cuantos = await contexto.sql<{ sin_conciliar: number; con_diferencia: number }[]>`
      select count(*) filter (where estado = 'sin_conciliar')::int as sin_conciliar,
             count(*) filter (where estado = 'con_diferencia')::int as con_diferencia
        from estook.factura_de_compra where local_id = ${localId}
    `;

    return {
      facturas: filas.slice(0, limite).map(componerFactura),
      hayMas: filas.length > limite,
      cuantos: {
        sinConciliar: cuantos[0]?.sin_conciliar ?? 0,
        conDiferencia: cuantos[0]?.con_diferencia ?? 0,
      },
    };
  },
});

export interface AlbaranDeLaFactura {
  readonly id: string;
  readonly tipo: 'entrega' | 'devolucion';
  readonly numero: string | null;
  readonly fecha: string;
  readonly conIncidencias: boolean;
  readonly lineas: readonly LineaDelAlbaran[];
}

async function albaranesConLineas(
  sql: Parameters<typeof lasLineas>[0],
  filas: readonly {
    id: string;
    tipo: 'entrega' | 'devolucion';
    numero: string | null;
    fecha: string;
    con_incidencias: boolean;
  }[],
): Promise<AlbaranDeLaFactura[]> {
  const lineas = await lasLineas(
    sql,
    filas.map((a) => a.id),
  );
  return filas.map((a) => ({
    id: a.id,
    tipo: a.tipo,
    numero: a.numero,
    fecha: a.fecha,
    conIncidencias: a.con_incidencias,
    lineas: lineas.filter((l) => l.albaran_id === a.id).map((l) => componerLinea(l, true)),
  }));
}

export const unaFactura = consulta<
  { factura_id: string },
  {
    readonly factura: FacturaEnLista;
    readonly albaranes: readonly AlbaranDeLaFactura[];
    readonly frase: string | null;
  }
>({
  nombre: 'una_factura',
  entrada: z.object({ factura_id: z.string().uuid() }).strict(),
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const filas = await contexto.sql<FilaDeFactura[]>`
      select f.id, f.tipo::text as tipo, f.numero, to_char(f.fecha, 'YYYY-MM-DD') as fecha,
             to_char(f.vence_el, 'YYYY-MM-DD') as vence_el, f.proveedor_id, pv.nombre as proveedor,
             f.base_centimos::text as base, f.total_centimos::text as total, f.estado::text as estado,
             f.diferencia_centimos::text as diferencia, f.notas,
             (select count(*)::int from estook.albaran a where a.factura_id = f.id) as albaranes,
             pe.nombre as quien
        from estook.factura_de_compra f
        join estook.proveedor pv on pv.id = f.proveedor_id
        left join estook.persona pe on pe.id = f.registrada_por
       where f.id = ${entrada.factura_id} and f.local_id = ${localId}
    `;
    const fila = filas[0];
    if (!fila) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa factura no está, o no es de este local.',
      });
    }

    const deLaFactura = await contexto.sql<
      {
        id: string;
        tipo: 'entrega' | 'devolucion';
        numero: string | null;
        fecha: string;
        con_incidencias: boolean;
      }[]
    >`
      select id, tipo::text as tipo, numero, to_char(fecha, 'YYYY-MM-DD') as fecha, con_incidencias
        from estook.albaran where factura_id = ${fila.id} order by fecha, recibido_en
    `;
    const albaranes = await albaranesConLineas(contexto.sql, deLaFactura);
    const factura = componerFactura(fila);

    // La frase se vuelve a decir con las mismas cuentas del dominio: así lo que se
    // lee hoy es lo mismo que se leyó al conciliar.
    const frase =
      factura.estado === 'sin_conciliar'
        ? null
        : conciliar(
            factura.tipo,
            factura.baseCentimos,
            albaranes.map((a) => ({
              tipo: a.tipo,
              lineas: a.lineas.map((l) => ({
                importeCentimos: l.importeCentimos ?? null,
                importeFacturadoCentimos: l.importeFacturadoCentimos ?? null,
              })),
            })),
          ).frase;

    return { factura, albaranes, frase };
  },
});

// ── Lo que se puede conciliar ────────────────────────────────────────────────

export const paraConciliar = consulta<
  { proveedor_id: string },
  {
    readonly proveedor: {
      readonly id: string;
      readonly nombre: string;
      readonly diasDePago: number | null;
    };
    readonly albaranes: readonly AlbaranDeLaFactura[];
  }
>({
  nombre: 'para_conciliar',
  entrada: z.object({ proveedor_id: z.string().uuid() }).strict(),
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const proveedor = await elProveedor(contexto, entrada.proveedor_id);
    if (proveedor.localId !== localId) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese proveedor no es de este local.' });
    }

    const sinFactura = await contexto.sql<
      {
        id: string;
        tipo: 'entrega' | 'devolucion';
        numero: string | null;
        fecha: string;
        con_incidencias: boolean;
      }[]
    >`
      select id, tipo::text as tipo, numero, to_char(fecha, 'YYYY-MM-DD') as fecha, con_incidencias
        from estook.albaran
       where proveedor_id = ${proveedor.id} and factura_id is null
       order by fecha, recibido_en
       limit 100
    `;

    return {
      proveedor: { id: proveedor.id, nombre: proveedor.nombre, diasDePago: proveedor.diasDePago },
      albaranes: await albaranesConLineas(contexto.sql, sinFactura),
    };
  },
});
