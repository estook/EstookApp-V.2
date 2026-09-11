import { z } from 'zod';
import {
  comoHaCambiado,
  comoPrecioPorUnidad,
  comoSeLePide,
  cuandoCae,
  fechaOperativa,
  numeroParaWhatsApp,
  puntualidad,
  quienLoDejaMejor,
  type Comparacion,
  type EstadoDeExistencias,
  type Puntualidad,
  type SugerenciaDeCompra,
} from '@estook/dominio';
import {
  elProveedor,
  elRelojDelLocal,
  loQuePuedeConLosPrecios,
  suProximoReparto,
  type CanalDePedido,
} from '../compras.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { productosActivos, productosDelProveedor } from './inventario.ts';
import { elLocal, type ProximoRepartoDicho } from './pedidos.ts';

/**
 * La ficha de un proveedor, y quién te lo deja mejor (M7).
 *
 * «Se llena solo: **qué te sirve, gasto del mes, subidas detectadas, incidencias y
 *  puntualidad**» (Manifiesto 12). Nadie escribe nada de eso: sale de los
 * albaranes, los precios y los pedidos, que ya están.
 */

export interface ProductoQueTeSirve {
  readonly id: string;
  readonly nombre: string;
  readonly formato: string | null;
  readonly unidadDeUso: string;
  readonly hayAhora: number;
  readonly estado: EstadoDeExistencias;
  readonly sugerencia: SugerenciaDeCompra | null;
  readonly precioCentimos?: number | null;
  readonly costePorUnidad?: string | null;
  readonly pactado?: {
    readonly id: string;
    readonly precioCentimos: number;
    readonly hasta: string | null;
  } | null;
}

export interface SalidaUnProveedor {
  readonly proveedor: {
    readonly id: string;
    readonly nombre: string;
    readonly notas: string | null;
    readonly activo: boolean;
    readonly cif: string | null;
    readonly contacto: string | null;
    readonly telefono: string | null;
    readonly whatsapp: string | null;
    /** El número tal cual lo quiere WhatsApp, o nulo si no hay a quién. */
    readonly whatsappNumero: string | null;
    readonly correo: string | null;
    readonly web: string | null;
    readonly comoSePide: CanalDePedido | null;
    readonly diasDeReparto: readonly number[];
    readonly plazoDeEntrega: number;
    readonly horaLimite: string | null;
    readonly comoSeLePide: string | null;
    readonly formaDePago: string | null;
    readonly diasDePago: number | null;
    readonly pedidoMinimoCentimos?: number | null;
    readonly portesCentimos?: number | null;
  };
  readonly proximoReparto: ProximoRepartoDicho | null;
  readonly productos: readonly ProductoQueTeSirve[];
  readonly pedidosAbiertos: readonly {
    readonly id: string;
    readonly numero: number;
    readonly estado: string;
    readonly llegaCuando: string | null;
  }[];
  readonly albaranes: readonly {
    readonly id: string;
    readonly tipo: 'entrega' | 'devolucion';
    readonly fecha: string;
    readonly numero: string | null;
    readonly conIncidencias: boolean;
    readonly totalCentimos?: number;
  }[];
  readonly resumen: {
    readonly albaranesDelMes: number;
    /** Líneas con algo que no cuadró, en los últimos noventa días. */
    readonly incidencias: number;
    readonly puntualidad: Puntualidad;
    readonly gastoDelMesCentimos?: number;
    readonly subidas?: readonly {
      readonly producto: string;
      readonly frase: string;
      readonly desde: string;
    }[];
  };
  readonly puedeVerPrecios: boolean;
  readonly puedeTocar: boolean;
}

export const unProveedor = consulta<{ proveedor_id: string }, SalidaUnProveedor>({
  nombre: 'un_proveedor',
  entrada: z.object({ proveedor_id: z.string().uuid() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const ficha = await elProveedor(contexto, entrada.proveedor_id);
    if (ficha.localId !== localId) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese proveedor no es de este local.' });
    }

    const precios = await loQuePuedeConLosPrecios(contexto, localId);
    const reloj = await elRelojDelLocal(contexto, localId);

    const resto = await contexto.sql<
      {
        notas: string | null;
        cif: string | null;
        web: string | null;
        forma_de_pago: string | null;
        puede: boolean;
      }[]
    >`
      select notas, cif, web, forma_de_pago::text as forma_de_pago,
             estook.puede_editar('app.inventario', ${localId}::uuid) as puede
        from estook.proveedor where id = ${ficha.id}
    `;

    const productos = (await productosDelProveedor(contexto, localId, ficha.id)).filter(
      (p) => !p.esEjemplo,
    );

    const pactados = precios.ver
      ? await contexto.sql<
          { id: string; producto_id: string; precio: string; hasta: string | null }[]
        >`
          select id, producto_id, precio_centimos::text as precio, to_char(hasta, 'YYYY-MM-DD') as hasta
            from estook.precio_pactado
           where proveedor_id = ${ficha.id} and anulado_en is null
        `
      : [];

    const pedidos = await contexto.sql<
      { id: string; numero: number; estado: string; llega_el: string | null }[]
    >`
      select id, numero, estado::text as estado, to_char(llega_el, 'YYYY-MM-DD') as llega_el
        from estook.pedido_de_compra
       where proveedor_id = ${ficha.id} and estado in ('borrador', 'enviado')
       order by case estado when 'enviado' then 0 else 1 end, llega_el nulls last, numero desc
       limit 10
    `;

    const albaranes = await contexto.sql<
      {
        id: string;
        tipo: 'entrega' | 'devolucion';
        fecha: string;
        numero: string | null;
        con_incidencias: boolean;
        total: string | null;
      }[]
    >`
      select a.id, a.tipo::text as tipo, to_char(a.fecha, 'YYYY-MM-DD') as fecha, a.numero,
             a.con_incidencias,
             (select sum(coalesce(l.importe_facturado_centimos, l.importe_centimos))::text
                from estook.linea_de_albaran l where l.albaran_id = a.id) as total
        from estook.albaran a
       where a.proveedor_id = ${ficha.id}
       order by a.fecha desc, a.recibido_en desc
       limit 10
    `;

    // El mes de la jornada de hoy: lo que se ha comprado, menos lo devuelto.
    const delMes = await contexto.sql<{ cuantos: number; gasto: string | null }[]>`
      select count(distinct a.id)::int as cuantos,
             sum(case when a.tipo = 'entrega' then 1 else -1 end
                 * coalesce(l.importe_facturado_centimos, l.importe_centimos, 0))::text as gasto
        from estook.albaran a
        left join estook.linea_de_albaran l on l.albaran_id = a.id
       where a.proveedor_id = ${ficha.id}
         and a.fecha >= date_trunc('month', ${reloj.jornada}::date)::date
    `;

    const incidencias = await contexto.sql<{ cuantas: number }[]>`
      select count(*)::int as cuantas
        from estook.linea_de_albaran l
        join estook.albaran a on a.id = l.albaran_id
       where a.proveedor_id = ${ficha.id} and cardinality(l.incidencias) > 0
         and a.fecha >= ${reloj.jornada}::date - 90
    `;

    const entregas = await contexto.sql<{ prevista: string; llego: string }[]>`
      select to_char(p.llega_el, 'YYYY-MM-DD') as prevista, to_char(min(a.fecha), 'YYYY-MM-DD') as llego
        from estook.pedido_de_compra p
        join estook.albaran a on a.pedido_id = p.id
       where p.proveedor_id = ${ficha.id} and p.llega_el is not null
         and a.fecha >= ${reloj.jornada}::date - 90
       group by p.id, p.llega_el
    `;

    // Las subidas se comparan **por unidad de uso**: si cambió el tamaño de la
    // caja, comparar el precio de la caja diría que ha bajado lo que ha subido.
    const subidas = precios.ver
      ? await contexto.sql<{ producto: string; ahora: string; antes: string; desde: string }[]>`
          select p.nombre as producto, x.coste_milesimas::text as ahora, x.antes::text as antes,
                 to_char(x.desde, 'YYYY-MM-DD') as desde
            from (
              select pr.producto_id, pr.coste_milesimas, pr.desde, pr.hasta,
                     lag(pr.coste_milesimas) over (
                       partition by pr.producto_id order by pr.desde, pr.creado_en
                     ) as antes
                from estook.precio_de_producto pr
               where pr.proveedor_id = ${ficha.id}
            ) x
            join estook.producto p on p.id = x.producto_id
           where x.hasta is null and x.antes is not null and x.coste_milesimas > x.antes
             and x.desde >= ${reloj.jornada}::date - 90
           order by x.desde desc
           limit 20
        `
      : [];

    const reparto = suProximoReparto(ficha, reloj);
    const f = resto[0];

    return {
      proveedor: {
        id: ficha.id,
        nombre: ficha.nombre,
        notas: f?.notas ?? null,
        activo: ficha.activo,
        cif: f?.cif ?? null,
        contacto: ficha.contacto,
        telefono: ficha.telefono,
        whatsapp: ficha.whatsapp,
        whatsappNumero: numeroParaWhatsApp(ficha.whatsapp ?? ficha.telefono),
        correo: ficha.correo,
        web: f?.web ?? null,
        comoSePide: ficha.comoSePide,
        diasDeReparto: ficha.dias,
        plazoDeEntrega: ficha.plazo,
        horaLimite: ficha.horaLimite,
        comoSeLePide: ficha.dias.length === 0 ? null : comoSeLePide(ficha.plazo, ficha.horaLimite),
        formaDePago: f?.forma_de_pago ?? null,
        diasDePago: ficha.diasDePago,
        ...(precios.ver
          ? { pedidoMinimoCentimos: ficha.minimoCentimos, portesCentimos: ficha.portesCentimos }
          : {}),
      },
      proximoReparto:
        reparto === null
          ? null
          : {
              llega: reparto.llega,
              llegaCuando: cuandoCae(reparto.llega, reloj.hoy),
              pedirEl: reparto.pedirEl,
              pedirCuando: cuandoCae(reparto.pedirEl, reloj.hoy),
              pedirAntesDe: reparto.pedirAntesDe,
              siguiente: reparto.siguiente,
            },
      productos: productos.map((p) => {
        const base: ProductoQueTeSirve = {
          id: p.id,
          nombre: p.nombre,
          formato: p.formato,
          unidadDeUso: p.unidadDeUso,
          hayAhora: p.cantidad,
          estado: p.estado,
          sugerencia: p.sugerencia,
        };
        if (!precios.ver) return base;
        const pactado = pactados.find((x) => x.producto_id === p.id);
        return {
          ...base,
          precioCentimos: p.precioCentimos ?? null,
          costePorUnidad: p.costePorUnidad ?? null,
          pactado:
            pactado === undefined
              ? null
              : { id: pactado.id, precioCentimos: Number(pactado.precio), hasta: pactado.hasta },
        };
      }),
      pedidosAbiertos: pedidos.map((p) => ({
        id: p.id,
        numero: p.numero,
        estado: p.estado,
        llegaCuando: p.llega_el === null ? null : cuandoCae(fechaOperativa(p.llega_el), reloj.hoy),
      })),
      albaranes: albaranes.map((a) => {
        const base = {
          id: a.id,
          tipo: a.tipo,
          fecha: a.fecha,
          numero: a.numero,
          conIncidencias: a.con_incidencias,
        };
        return precios.ver
          ? { ...base, totalCentimos: a.total === null ? 0 : Number(a.total) }
          : base;
      }),
      resumen: {
        albaranesDelMes: delMes[0]?.cuantos ?? 0,
        incidencias: incidencias[0]?.cuantas ?? 0,
        puntualidad: puntualidad(
          entregas.map((e) => ({
            prevista: fechaOperativa(e.prevista),
            llego: fechaOperativa(e.llego),
          })),
        ),
        ...(precios.ver
          ? {
              gastoDelMesCentimos: Number(delMes[0]?.gasto ?? 0),
              subidas: subidas.map((s) => ({
                producto: s.producto,
                frase: comoHaCambiado(Number(s.antes), Number(s.ahora)).frase,
                desde: s.desde,
              })),
            }
          : {}),
      },
      puedeVerPrecios: precios.ver,
      puedeTocar: f?.puede === true,
    };
  },
});

// ── Quién te lo deja mejor ───────────────────────────────────────────────────

export interface PrecioComparado {
  readonly proveedorId: string;
  readonly proveedor: string;
  readonly costeMilesimas: number;
  readonly costePorUnidad: string;
  readonly precioCentimos: number;
  readonly formato: string | null;
  readonly desde: string;
}

export interface SalidaCompararPrecios {
  readonly comparaciones: readonly {
    readonly productoId: string;
    readonly producto: string;
    readonly unidadDeUso: string;
    readonly precios: readonly PrecioComparado[];
    readonly comparacion: Comparacion;
  }[];
  readonly subidas: readonly {
    readonly productoId: string;
    readonly producto: string;
    readonly proveedor: string;
    readonly frase: string;
    readonly desde: string;
  }[];
  readonly pactados: readonly {
    readonly id: string;
    readonly productoId: string;
    readonly producto: string;
    readonly proveedorId: string;
    readonly proveedor: string;
    readonly precioCentimos: number;
    readonly hasta: string | null;
    readonly cobradoCentimos: number | null;
    /** Te cobran más de lo pactado. Es lo que hay que reclamar. */
    readonly porEncima: boolean;
  }[];
}

/**
 * «La comparación entre proveedores para lo mismo, **que es donde aparece el
 *  dinero fácil**» (Manifiesto 12), las subidas de los últimos dos meses y lo
 * pactado que no se está cumpliendo. Tres listas cortas que se miran una vez a la
 * semana y pagan la suscripción.
 */
export const compararPrecios = consulta<Record<string, never>, SalidaCompararPrecios>({
  nombre: 'comparar_precios',
  entrada: z.object({}).strict(),
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto) {
    const localId = elLocal(contexto);
    const reloj = await elRelojDelLocal(contexto, localId);
    const productos = await productosActivos(contexto, localId);
    const porId = new Map(productos.map((p) => [p.id, p] as const));

    const vigentes = await contexto.sql<
      {
        producto_id: string;
        proveedor_id: string;
        proveedor: string;
        coste: string;
        precio: string;
        formato: string | null;
        desde: string;
      }[]
    >`
      select pr.producto_id, pr.proveedor_id, pv.nombre as proveedor,
             pr.coste_milesimas::text as coste, pr.precio_centimos::text as precio,
             pr.formato, to_char(pr.desde, 'YYYY-MM-DD') as desde
        from estook.precio_de_producto pr
        join estook.proveedor pv on pv.id = pr.proveedor_id
        join estook.producto p on p.id = pr.producto_id
       where p.local_id = ${localId} and p.activo and not p.es_ejemplo
         and pr.hasta is null and pr.proveedor_id is not null
    `;

    const agrupados = new Map<string, PrecioComparado[]>();
    for (const v of vigentes) {
      const producto = porId.get(v.producto_id);
      if (producto === undefined) continue;
      const lista = agrupados.get(v.producto_id) ?? [];
      lista.push({
        proveedorId: v.proveedor_id,
        proveedor: v.proveedor,
        costeMilesimas: Number(v.coste),
        costePorUnidad: comoPrecioPorUnidad(Number(v.coste) as never, producto.unidadDeUso),
        precioCentimos: Number(v.precio),
        formato: v.formato,
        desde: v.desde,
      });
      agrupados.set(v.producto_id, lista);
    }

    const comparaciones: SalidaCompararPrecios['comparaciones'][number][] = [];
    for (const [productoId, precios] of agrupados) {
      const producto = porId.get(productoId);
      if (producto === undefined || precios.length < 2) continue;
      const comparacion = quienLoDejaMejor(
        precios,
        producto.proveedorId,
        producto.consumo.porDia,
        producto.unidadDeUso,
      );
      if (comparacion === null) continue;
      comparaciones.push({
        productoId,
        producto: producto.nombre,
        unidadDeUso: producto.unidadDeUso,
        precios: [...precios].sort((a, b) => a.costeMilesimas - b.costeMilesimas),
        comparacion,
      });
    }
    comparaciones.sort(
      (a, b) => (b.comparacion.ahorroAlMesCentimos ?? 0) - (a.comparacion.ahorroAlMesCentimos ?? 0),
    );

    const subidas = await contexto.sql<
      {
        producto_id: string;
        producto: string;
        proveedor: string;
        ahora: string;
        antes: string;
        desde: string;
      }[]
    >`
      select x.producto_id, p.nombre as producto, pv.nombre as proveedor,
             x.coste_milesimas::text as ahora, x.antes::text as antes,
             to_char(x.desde, 'YYYY-MM-DD') as desde
        from (
          select pr.producto_id, pr.proveedor_id, pr.coste_milesimas, pr.desde, pr.hasta,
                 lag(pr.coste_milesimas) over (
                   partition by pr.producto_id, pr.proveedor_id order by pr.desde, pr.creado_en
                 ) as antes
            from estook.precio_de_producto pr
        ) x
        join estook.producto p on p.id = x.producto_id
        join estook.proveedor pv on pv.id = x.proveedor_id
       where p.local_id = ${localId} and p.activo and not p.es_ejemplo
         and x.hasta is null and x.antes is not null and x.coste_milesimas > x.antes
         and x.desde >= ${reloj.jornada}::date - 60
       order by x.desde desc
       limit 30
    `;

    const pactados = await contexto.sql<
      {
        id: string;
        producto_id: string;
        producto: string;
        proveedor_id: string;
        proveedor: string;
        precio: string;
        hasta: string | null;
        cobrado: string | null;
      }[]
    >`
      select pp.id, pp.producto_id, p.nombre as producto, pp.proveedor_id, pv.nombre as proveedor,
             pp.precio_centimos::text as precio, to_char(pp.hasta, 'YYYY-MM-DD') as hasta,
             (select pr.precio_centimos from estook.precio_de_producto pr
               where pr.producto_id = pp.producto_id and pr.proveedor_id = pp.proveedor_id
                 and pr.hasta is null limit 1)::text as cobrado
        from estook.precio_pactado pp
        join estook.producto p on p.id = pp.producto_id
        join estook.proveedor pv on pv.id = pp.proveedor_id
       where p.local_id = ${localId} and pp.anulado_en is null
       order by p.nombre
    `;

    return {
      comparaciones,
      subidas: subidas.map((s) => ({
        productoId: s.producto_id,
        producto: s.producto,
        proveedor: s.proveedor,
        frase: comoHaCambiado(Number(s.antes), Number(s.ahora)).frase,
        desde: s.desde,
      })),
      pactados: pactados.map((p) => {
        const cobrado = p.cobrado === null ? null : Number(p.cobrado);
        const precio = Number(p.precio);
        return {
          id: p.id,
          productoId: p.producto_id,
          producto: p.producto,
          proveedorId: p.proveedor_id,
          proveedor: p.proveedor,
          precioCentimos: precio,
          hasta: p.hasta,
          cobradoCentimos: cobrado,
          porEncima: cobrado !== null && cobrado > precio,
        };
      }),
    };
  },
});
