import { z } from 'zod';
import {
  comoSeLePide,
  comoSePide,
  comoVaElMinimo,
  cuandoCae,
  fechaOperativa,
  importeEstimado,
  masDias,
  numeroParaWhatsApp,
  textoDelPedido,
  totalDelPedido,
  type ComoVaElMinimo,
  type FechaOperativa,
  type SugerenciaDeCompra,
} from '@estook/dominio';
import {
  elProveedor,
  elRelojDelLocal,
  loQuePuedeConLosPrecios,
  precioEsperado,
  suProximoReparto,
  type CanalDePedido,
  type EstadoDePedido,
} from '../compras.ts';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { productosDelProveedor } from './inventario.ts';

/**
 * Lo que Compras enseña de los pedidos (M7).
 *
 * La regla de siempre, y aquí pesa más que en ningún sitio: **un rol sin costes no
 * recibe ni un campo de coste**. Un cocinero hace el borrador y recibe el camión;
 * no ve lo que se espera pagar, ni el total, ni si llega al mínimo. Esos campos no
 * se esconden en la pantalla: **no se mandan**.
 */

export function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver sus compras. Elige uno primero.',
    });
  }
  return localId;
}

async function puedeEnviar(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_editar('accion.enviar_pedidos', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

/** Cómo se dice cuándo llega, con el hoy del servidor. Nulo si no se sabe. */
function cuandoLlega(llegaEl: string | null, hoy: FechaOperativa): string | null {
  return llegaEl === null ? null : cuandoCae(fechaOperativa(llegaEl), hoy);
}

// ── La lista ─────────────────────────────────────────────────────────────────

export interface PedidoEnLista {
  readonly id: string;
  readonly numero: number;
  readonly proveedorId: string;
  readonly proveedor: string;
  readonly estado: EstadoDePedido;
  readonly llegaEl: string | null;
  readonly llegaCuando: string | null;
  /** Mandado y con la fecha pasada: el proveedor no ha venido. */
  readonly atrasado: boolean;
  readonly enviadoEn: string | null;
  readonly enviadoPorCanal: CanalDePedido | null;
  readonly creadoEn: string;
  readonly quienLoHizo: string | null;
  readonly origen: string;
  readonly lineas: number;
  readonly totalCentimos?: number;
  readonly sinPrecio?: number;
}

const VISTAS_DE_PEDIDOS = {
  abiertos: ['borrador', 'enviado'],
  recibidos: ['recibido', 'recibido_con_incidencias'],
  cancelados: ['cancelado'],
  todos: ['borrador', 'enviado', 'recibido', 'recibido_con_incidencias', 'cancelado'],
} as const;

export const entradaMisPedidos = z
  .object({
    vista: z.enum(['abiertos', 'recibidos', 'cancelados', 'todos']).optional(),
    proveedor_id: z.string().uuid().optional(),
    limite: z.coerce.number().int().min(1).max(200).optional(),
    salto: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export type EntradaMisPedidos = z.infer<typeof entradaMisPedidos>;

export interface SalidaMisPedidos {
  readonly pedidos: readonly PedidoEnLista[];
  readonly hayMas: boolean;
  readonly cuantos: Readonly<
    Record<'borradores' | 'enviados' | 'recibidos' | 'cancelados', number>
  >;
  readonly hoy: string;
  readonly puedeVerPrecios: boolean;
  readonly puedeEnviar: boolean;
}

export const misPedidos = consulta<EntradaMisPedidos, SalidaMisPedidos>({
  nombre: 'mis_pedidos',
  entrada: entradaMisPedidos,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const precios = await loQuePuedeConLosPrecios(contexto, localId);
    const reloj = await elRelojDelLocal(contexto, localId);
    const estados = [...VISTAS_DE_PEDIDOS[entrada.vista ?? 'abiertos']];
    const limite = entrada.limite ?? 50;
    const salto = entrada.salto ?? 0;

    const filas = await contexto.sql<
      {
        id: string;
        numero: number;
        proveedor_id: string;
        proveedor: string;
        estado: EstadoDePedido;
        llega_el: string | null;
        enviado_en: string | null;
        canal: CanalDePedido | null;
        creado_en: string;
        quien: string | null;
        origen: string;
        lineas: number;
      }[]
    >`
      select p.id, p.numero, p.proveedor_id, pv.nombre as proveedor, p.estado::text as estado,
             to_char(p.llega_el, 'YYYY-MM-DD') as llega_el,
             to_char(p.enviado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as enviado_en,
             p.enviado_por_canal::text as canal,
             to_char(p.creado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creado_en,
             pe.nombre as quien, p.origen,
             (select count(*)::int from estook.linea_de_pedido l where l.pedido_id = p.id) as lineas
        from estook.pedido_de_compra p
        join estook.proveedor pv on pv.id = p.proveedor_id
        left join estook.persona pe on pe.id = p.creado_por
       where p.local_id = ${localId}
         and p.estado::text = any(${comoLista(estados)}::text::text[])
         and (${entrada.proveedor_id ?? null}::uuid is null
              or p.proveedor_id = ${entrada.proveedor_id ?? null}::uuid)
       -- Lo que viene antes que lo que ya está: los mandados por el día que
       -- llegan, luego los borradores, y lo cerrado del más nuevo al más viejo.
       order by case p.estado when 'enviado' then 0 when 'borrador' then 1 else 2 end,
                case when p.estado = 'enviado' then p.llega_el end nulls last,
                p.numero desc
       limit ${limite + 1} offset ${salto}
    `;

    const pedidos = filas.slice(0, limite);
    const ids = pedidos.map((p) => p.id);

    const lineas = precios.ver
      ? await contexto.sql<{ pedido_id: string; cantidad: string; precio: string | null }[]>`
          select pedido_id, cantidad::text as cantidad, precio_centimos::text as precio
            from estook.linea_de_pedido where pedido_id = any(${comoLista(ids)}::text::uuid[])
        `
      : [];

    const cuantos = await contexto.sql<{ estado: string; cuantos: number }[]>`
      select estado::text as estado, count(*)::int as cuantos
        from estook.pedido_de_compra where local_id = ${localId} group by estado
    `;
    const de = (...que: string[]) =>
      cuantos.filter((c) => que.includes(c.estado)).reduce((s, c) => s + c.cuantos, 0);

    return {
      pedidos: pedidos.map((p) => {
        const base: PedidoEnLista = {
          id: p.id,
          numero: p.numero,
          proveedorId: p.proveedor_id,
          proveedor: p.proveedor,
          estado: p.estado,
          llegaEl: p.llega_el,
          llegaCuando: cuandoLlega(p.llega_el, reloj.hoy),
          atrasado: p.estado === 'enviado' && p.llega_el !== null && p.llega_el < reloj.hoy,
          enviadoEn: p.enviado_en,
          enviadoPorCanal: p.canal,
          creadoEn: p.creado_en,
          quienLoHizo: p.quien,
          origen: p.origen,
          lineas: p.lineas,
        };
        if (!precios.ver) return base;
        const total = totalDelPedido(
          lineas
            .filter((l) => l.pedido_id === p.id)
            .map((l) => ({
              cantidad: Number(l.cantidad),
              precioCentimos: l.precio === null ? null : Number(l.precio),
            })),
        );
        return { ...base, totalCentimos: total.total, sinPrecio: total.sinPrecio };
      }),
      hayMas: filas.length > limite,
      cuantos: {
        borradores: de('borrador'),
        enviados: de('enviado'),
        recibidos: de('recibido', 'recibido_con_incidencias'),
        cancelados: de('cancelado'),
      },
      hoy: reloj.hoy,
      puedeVerPrecios: precios.ver,
      puedeEnviar: await puedeEnviar(contexto, localId),
    };
  },
});

// ── Un pedido ────────────────────────────────────────────────────────────────

export interface LineaDelPedidoEnFicha {
  readonly id: string;
  readonly productoId: string;
  readonly producto: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly pesoVariable: boolean;
  /** En formatos. */
  readonly cantidad: number;
  /** «3 × Caja 10 kg». Ya compuesto. */
  readonly comoSePide: string;
  readonly nota: string | null;
  /** Lo que hay ahora en cámara, en unidad de uso. */
  readonly hayAhora: number;
  readonly precioCentimos?: number | null;
  readonly importeCentimos?: number | null;
}

export interface ProximoRepartoDicho {
  readonly llega: string;
  readonly llegaCuando: string;
  readonly pedirEl: string;
  readonly pedirCuando: string;
  readonly pedirAntesDe: string | null;
  readonly siguiente: string;
}

export interface SalidaUnPedido {
  readonly pedido: {
    readonly id: string;
    readonly numero: number;
    readonly estado: EstadoDePedido;
    readonly llegaEl: string | null;
    readonly llegaCuando: string | null;
    readonly notas: string | null;
    readonly origen: string;
    readonly creadoEn: string;
    readonly quienLoHizo: string | null;
    readonly enviadoEn: string | null;
    readonly enviadoPorCanal: CanalDePedido | null;
    readonly quienLoEnvio: string | null;
    readonly recibidoEn: string | null;
    readonly quienLoRecibio: string | null;
    readonly canceladoEn: string | null;
    readonly motivoDeCancelacion: string | null;
  };
  readonly proveedor: {
    readonly id: string;
    readonly nombre: string;
    readonly contacto: string | null;
    readonly telefono: string | null;
    /** El número tal cual lo quiere WhatsApp, o nulo si no hay a quién. */
    readonly whatsapp: string | null;
    readonly correo: string | null;
    readonly comoSePide: CanalDePedido | null;
    readonly comoSeLePide: string | null;
  };
  readonly lineas: readonly LineaDelPedidoEnFicha[];
  /** El pedido escrito, listo para WhatsApp o para el correo. Sin precios. */
  readonly texto: string;
  readonly asunto: string;
  readonly proximoReparto: ProximoRepartoDicho | null;
  readonly albaranes: readonly {
    readonly id: string;
    readonly fecha: string;
    readonly numero: string | null;
    readonly conIncidencias: boolean;
  }[];
  readonly totalCentimos?: number;
  readonly sinPrecio?: number;
  readonly minimo?: ComoVaElMinimo | null;
  readonly hoy: string;
  readonly puedeVerPrecios: boolean;
  readonly puedeEnviar: boolean;
  readonly puedeTocar: boolean;
}

export const unPedido = consulta<{ pedido_id: string }, SalidaUnPedido>({
  nombre: 'un_pedido',
  entrada: z.object({ pedido_id: z.string().uuid() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);

    const filas = await contexto.sql<
      {
        id: string;
        numero: number;
        proveedor_id: string;
        estado: EstadoDePedido;
        llega_el: string | null;
        notas: string | null;
        origen: string;
        creado_en: string;
        quien: string | null;
        enviado_en: string | null;
        canal: CanalDePedido | null;
        quien_envio: string | null;
        recibido_en: string | null;
        quien_recibio: string | null;
        cancelado_en: string | null;
        motivo: string | null;
        local: string;
      }[]
    >`
      select p.id, p.numero, p.proveedor_id, p.estado::text as estado,
             to_char(p.llega_el, 'YYYY-MM-DD') as llega_el, p.notas, p.origen,
             to_char(p.creado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creado_en,
             hizo.nombre as quien,
             to_char(p.enviado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as enviado_en,
             p.enviado_por_canal::text as canal, envio.nombre as quien_envio,
             to_char(p.recibido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as recibido_en,
             recibio.nombre as quien_recibio,
             to_char(p.cancelado_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cancelado_en,
             p.motivo_de_cancelacion as motivo, l.nombre as local
        from estook.pedido_de_compra p
        join estook.local l on l.id = p.local_id
        left join estook.persona hizo on hizo.id = p.creado_por
        left join estook.persona envio on envio.id = p.enviado_por
        left join estook.persona recibio on recibio.id = p.recibido_por
       where p.id = ${entrada.pedido_id} and p.local_id = ${localId}
    `;

    const pedido = filas[0];
    if (!pedido) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese pedido no está, o no es de este local.',
      });
    }

    const precios = await loQuePuedeConLosPrecios(contexto, localId);
    const reloj = await elRelojDelLocal(contexto, localId);
    const proveedor = await elProveedor(contexto, pedido.proveedor_id);

    const lineas = await contexto.sql<
      {
        id: string;
        producto_id: string;
        producto: string;
        formato: string | null;
        factor: string;
        unidad_de_uso: string;
        peso_variable: boolean;
        cantidad: string;
        precio: string | null;
        nota: string | null;
        hay: string | null;
      }[]
    >`
      select l.id::text as id, l.producto_id, p.nombre as producto, l.formato,
             l.factor::text as factor, p.unidad_de_uso::text as unidad_de_uso, p.peso_variable,
             l.cantidad::text as cantidad, l.precio_centimos::text as precio, l.nota,
             e.cantidad::text as hay
        from estook.linea_de_pedido l
        join estook.producto p on p.id = l.producto_id
        left join estook.existencias e on e.producto_id = l.producto_id
       where l.pedido_id = ${pedido.id}
       order by l.orden, l.id
    `;

    // Un borrador que hizo quien no ve precios se guardó sin ellos: a quien sí
    // los ve se le enseña lo que se espera pagar, lo pactado o lo último.
    const esperados = new Map<string, number | null>();
    if (precios.ver) {
      for (const l of lineas) {
        if (l.precio === null) {
          esperados.set(l.id, await precioEsperado(contexto, l.producto_id, proveedor.id));
        }
      }
    }

    const enFicha = lineas.map((l) => {
      const cantidad = Number(l.cantidad);
      const factor = Number(l.factor);
      const precio = l.precio === null ? (esperados.get(l.id) ?? null) : Number(l.precio);
      const linea: LineaDelPedidoEnFicha = {
        id: l.id,
        productoId: l.producto_id,
        producto: l.producto,
        formato: l.formato,
        factor,
        unidadDeUso: l.unidad_de_uso,
        pesoVariable: l.peso_variable,
        cantidad,
        comoSePide: comoSePide(cantidad, l.formato, factor, l.unidad_de_uso),
        nota: l.nota,
        hayAhora: l.hay === null ? 0 : Number(l.hay),
      };
      return precios.ver
        ? { ...linea, precioCentimos: precio, importeCentimos: importeEstimado(cantidad, precio) }
        : linea;
    });

    const albaranes = await contexto.sql<
      { id: string; fecha: string; numero: string | null; con_incidencias: boolean }[]
    >`
      select id, to_char(fecha, 'YYYY-MM-DD') as fecha, numero, con_incidencias
        from estook.albaran where pedido_id = ${pedido.id} order by recibido_en
    `;

    const reparto = suProximoReparto(proveedor, reloj);
    const llegaParaElTexto = pedido.llega_el === null ? null : fechaOperativa(pedido.llega_el);

    const texto = textoDelPedido({
      numero: pedido.numero,
      local: pedido.local,
      contacto: proveedor.contacto,
      llega: llegaParaElTexto,
      hoy: reloj.hoy,
      notas: pedido.notas,
      lineas: enFicha.map((l) => ({
        producto: l.producto,
        cantidad: l.cantidad,
        formato: l.formato,
        factor: l.factor,
        unidadDeUso: l.unidadDeUso,
        nota: l.nota,
      })),
    });

    const total = totalDelPedido(
      enFicha.map((l) => ({ cantidad: l.cantidad, precioCentimos: l.precioCentimos ?? null })),
    );

    return {
      pedido: {
        id: pedido.id,
        numero: pedido.numero,
        estado: pedido.estado,
        llegaEl: pedido.llega_el,
        llegaCuando: cuandoLlega(pedido.llega_el, reloj.hoy),
        notas: pedido.notas,
        origen: pedido.origen,
        creadoEn: pedido.creado_en,
        quienLoHizo: pedido.quien,
        enviadoEn: pedido.enviado_en,
        enviadoPorCanal: pedido.canal,
        quienLoEnvio: pedido.quien_envio,
        recibidoEn: pedido.recibido_en,
        quienLoRecibio: pedido.quien_recibio,
        canceladoEn: pedido.cancelado_en,
        motivoDeCancelacion: pedido.motivo,
      },
      proveedor: {
        id: proveedor.id,
        nombre: proveedor.nombre,
        contacto: proveedor.contacto,
        telefono: proveedor.telefono,
        whatsapp: numeroParaWhatsApp(proveedor.whatsapp ?? proveedor.telefono),
        correo: proveedor.correo,
        comoSePide: proveedor.comoSePide,
        comoSeLePide:
          proveedor.dias.length === 0 ? null : comoSeLePide(proveedor.plazo, proveedor.horaLimite),
      },
      lineas: enFicha,
      texto,
      asunto: `Pedido ${pedido.numero} · ${pedido.local}`,
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
      albaranes: albaranes.map((a) => ({
        id: a.id,
        fecha: a.fecha,
        numero: a.numero,
        conIncidencias: a.con_incidencias,
      })),
      ...(precios.ver
        ? {
            totalCentimos: total.total,
            sinPrecio: total.sinPrecio,
            minimo: comoVaElMinimo(total, proveedor.minimoCentimos, proveedor.portesCentimos),
          }
        : {}),
      hoy: reloj.hoy,
      puedeVerPrecios: precios.ver,
      puedeEnviar: await puedeEnviar(contexto, localId),
      puedeTocar: await puedeTocarInventario(contexto, localId),
    };
  },
});

async function puedeTocarInventario(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_editar('app.inventario', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

// ── Lo que le pediría hoy ────────────────────────────────────────────────────

export interface LineaSugerida {
  readonly productoId: string;
  readonly producto: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly hayAhora: number;
  readonly sugerencia: SugerenciaDeCompra;
  readonly comoSePide: string;
  readonly precioCentimos?: number | null;
  readonly importeCentimos?: number | null;
}

export interface SalidaSugerenciaDePedido {
  readonly proveedor: { readonly id: string; readonly nombre: string };
  readonly proximoReparto: ProximoRepartoDicho | null;
  readonly lineas: readonly LineaSugerida[];
  /** Los suyos que no necesitan nada, para decir «lo demás llega bien». */
  readonly sinNecesidad: number;
  /** Un borrador de este proveedor que ya exista, para no empezar otro. */
  readonly borradorId: string | null;
  readonly totalCentimos?: number;
  readonly minimo?: ComoVaElMinimo | null;
}

/**
 * Lo que Estook le pediría hoy a un proveedor, y por qué.
 *
 * Es la capa inteligente de M7 entera en una pantalla: lo de ese proveedor que no
 * llega al reparto de después, en cajas enteras, con el motivo escrito, lo que
 * costaría y si llega al mínimo. **La misma cuenta que la ficha de cada producto**,
 * porque sale de la misma lectura.
 */
export async function sugerirPedido(
  contexto: Contexto,
  localId: string,
  proveedorId: string,
): Promise<SalidaSugerenciaDePedido> {
  const proveedor = await elProveedor(contexto, proveedorId);
  if (proveedor.localId !== localId) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese proveedor no es de este local.' });
  }

  const precios = await loQuePuedeConLosPrecios(contexto, localId);
  const reloj = await elRelojDelLocal(contexto, localId);
  const productos = (await productosDelProveedor(contexto, localId, proveedorId)).filter(
    (p) => !p.esEjemplo,
  );

  const esperados = precios.ver
    ? await contexto.sql<{ producto_id: string; precio: string | null }[]>`
        select pr.id as producto_id,
               coalesce(
                 (select pp.precio_centimos from estook.precio_pactado pp
                   where pp.producto_id = pr.id and pp.proveedor_id = ${proveedorId}
                     and pp.anulado_en is null and (pp.hasta is null or pp.hasta >= current_date)
                   limit 1),
                 (select pd.precio_centimos from estook.precio_de_producto pd
                   where pd.producto_id = pr.id and pd.proveedor_id = ${proveedorId}
                     and pd.hasta is null limit 1)
               )::text as precio
          from estook.producto pr
         where pr.proveedor_id = ${proveedorId} and pr.activo
      `
    : [];

  const lineas: LineaSugerida[] = [];
  for (const p of productos) {
    if (p.sugerencia === null) continue;
    const base: LineaSugerida = {
      productoId: p.id,
      producto: p.nombre,
      formato: p.formato,
      factor: p.factor,
      unidadDeUso: p.unidadDeUso,
      hayAhora: p.cantidad,
      sugerencia: p.sugerencia,
      comoSePide: comoSePide(p.sugerencia.formatos, p.formato, p.factor, p.unidadDeUso),
    };
    if (!precios.ver) {
      lineas.push(base);
      continue;
    }
    const esperado = esperados.find((e) => e.producto_id === p.id)?.precio ?? null;
    const precio = esperado === null ? null : Number(esperado);
    lineas.push({
      ...base,
      precioCentimos: precio,
      importeCentimos: importeEstimado(p.sugerencia.formatos, precio),
    });
  }

  const borradores = await contexto.sql<{ id: string }[]>`
    select id from estook.pedido_de_compra
     where proveedor_id = ${proveedorId} and estado = 'borrador'
     order by creado_en desc limit 1
  `;

  const reparto = suProximoReparto(proveedor, reloj);
  const total = totalDelPedido(
    lineas.map((l) => ({
      cantidad: l.sugerencia.formatos,
      precioCentimos: l.precioCentimos ?? null,
    })),
  );

  return {
    proveedor: { id: proveedor.id, nombre: proveedor.nombre },
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
    lineas,
    sinNecesidad: productos.length - lineas.length,
    borradorId: borradores[0]?.id ?? null,
    ...(precios.ver
      ? {
          totalCentimos: total.total,
          minimo: comoVaElMinimo(total, proveedor.minimoCentimos, proveedor.portesCentimos),
        }
      : {}),
  };
}

export const sugerenciaDePedido = consulta<{ proveedor_id: string }, SalidaSugerenciaDePedido>({
  nombre: 'sugerencia_de_pedido',
  entrada: z.object({ proveedor_id: z.string().uuid() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    return sugerirPedido(contexto, elLocal(contexto), entrada.proveedor_id);
  },
});

// ── Lo de hoy ────────────────────────────────────────────────────────────────

export interface SalidaComprasDeHoy {
  readonly hoy: string;
  /** Lo que tiene que llegar hoy o mañana, y lo que ya tenía que haber llegado. */
  readonly llegan: readonly {
    readonly pedidoId: string;
    readonly numero: number;
    readonly proveedor: string;
    readonly llegaEl: string;
    readonly llegaCuando: string;
    readonly atrasado: boolean;
    readonly lineas: number;
  }[];
  /**
   * A quién hay que pedirle hoy para llegar a su próximo reparto.
   *
   * «El bajo mínimo sabe qué día reparte tu proveedor. Avisar el jueves de un
   *  pescado que llega los martes no sirve de nada» (Manifiesto 28). Esto es ese
   * aviso, el día que sirve.
   */
  readonly tocaPedir: readonly {
    readonly proveedorId: string;
    readonly proveedor: string;
    readonly pedirAntesDe: string | null;
    readonly llega: string;
    readonly llegaCuando: string;
    readonly productos: number;
    readonly borradorId: string | null;
    readonly yaPedido: boolean;
  }[];
  readonly borradores: readonly {
    readonly pedidoId: string;
    readonly numero: number;
    readonly proveedor: string;
    readonly lineas: number;
    readonly quienLoHizo: string | null;
  }[];
  readonly puedeEnviar: boolean;
}

export const comprasDeHoy = consulta<Record<string, never>, SalidaComprasDeHoy>({
  nombre: 'compras_de_hoy',
  entrada: z.object({}).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto) {
    const localId = elLocal(contexto);
    const reloj = await elRelojDelLocal(contexto, localId);
    const manana = masDias(reloj.hoy, 1);

    const llegan = await contexto.sql<
      { id: string; numero: number; proveedor: string; llega_el: string; lineas: number }[]
    >`
      select p.id, p.numero, pv.nombre as proveedor, to_char(p.llega_el, 'YYYY-MM-DD') as llega_el,
             (select count(*)::int from estook.linea_de_pedido l where l.pedido_id = p.id) as lineas
        from estook.pedido_de_compra p
        join estook.proveedor pv on pv.id = p.proveedor_id
       where p.local_id = ${localId} and p.estado = 'enviado'
         and p.llega_el is not null and p.llega_el <= ${manana}::date
         and not p.es_ejemplo
       order by p.llega_el, p.numero
       limit 30
    `;

    const borradores = await contexto.sql<
      {
        id: string;
        numero: number;
        proveedor: string;
        proveedor_id: string;
        lineas: number;
        quien: string | null;
      }[]
    >`
      select p.id, p.numero, pv.nombre as proveedor, p.proveedor_id,
             (select count(*)::int from estook.linea_de_pedido l where l.pedido_id = p.id) as lineas,
             pe.nombre as quien
        from estook.pedido_de_compra p
        join estook.proveedor pv on pv.id = p.proveedor_id
        left join estook.persona pe on pe.id = p.creado_por
       where p.local_id = ${localId} and p.estado = 'borrador' and not p.es_ejemplo
       order by p.creado_en desc
       limit 30
    `;

    const proveedores = await contexto.sql<{ id: string }[]>`
      select id from estook.proveedor
       where local_id = ${localId} and activo and not es_ejemplo
         and cardinality(dias_de_reparto) > 0
       order by nombre
    `;

    const tocaPedir: SalidaComprasDeHoy['tocaPedir'][number][] = [];
    for (const { id } of proveedores) {
      const proveedor = await elProveedor(contexto, id);
      const reparto = suProximoReparto(proveedor, reloj);
      if (reparto === null || reparto.pedirEl !== reloj.hoy) continue;

      // ¿Ya hay un pedido mandado que llega a ese reparto? Entonces no toca.
      const mandados = await contexto.sql<{ cuantos: number }[]>`
        select count(*)::int as cuantos from estook.pedido_de_compra
         where proveedor_id = ${id} and estado = 'enviado' and llega_el = ${reparto.llega}::date
      `;
      const productos = (await productosDelProveedor(contexto, localId, id)).filter(
        (p) => p.sugerencia !== null && !p.esEjemplo,
      ).length;

      tocaPedir.push({
        proveedorId: id,
        proveedor: proveedor.nombre,
        pedirAntesDe: reparto.pedirAntesDe,
        llega: reparto.llega,
        llegaCuando: cuandoCae(reparto.llega, reloj.hoy),
        productos,
        borradorId: borradores.find((b) => b.proveedor_id === id)?.id ?? null,
        yaPedido: (mandados[0]?.cuantos ?? 0) > 0,
      });
    }

    return {
      hoy: reloj.hoy,
      llegan: llegan.map((p) => ({
        pedidoId: p.id,
        numero: p.numero,
        proveedor: p.proveedor,
        llegaEl: p.llega_el,
        llegaCuando: cuandoCae(fechaOperativa(p.llega_el), reloj.hoy),
        atrasado: p.llega_el < reloj.hoy,
        lineas: p.lineas,
      })),
      tocaPedir,
      borradores: borradores.map((b) => ({
        pedidoId: b.id,
        numero: b.numero,
        proveedor: b.proveedor,
        lineas: b.lineas,
        quienLoHizo: b.quien,
      })),
      puedeEnviar: await puedeEnviar(contexto, localId),
    };
  },
});
