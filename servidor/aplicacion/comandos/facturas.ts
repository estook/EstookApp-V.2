import { z } from 'zod';
import {
  conciliar,
  fechaOperativa,
  masDias,
  precioPorFormato,
  type Conciliacion,
} from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { elProveedor } from '../compras.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { ponerUnPrecio } from '../inventario.ts';
import { comoLista } from '../listas.ts';

/**
 * Las facturas de compra (M7) · lo que se cobra, contra lo que ha llegado.
 *
 * «Y algo que casi ningún programa hace: **la factura del proveedor se concilia
 *  con sus albaranes**, con las diferencias señaladas. El albarán mueve stock; la
 *  factura confirma el precio» (Manifiesto 12).
 *
 * ── Qué hace la factura, y qué no ────────────────────────────────────────────
 *
 *   · **No mueve género.** Lo movió el albarán el día que llegó.
 *   · **Confirma el precio.** Si una línea se cobra distinta de lo que decía el
 *     albarán —o el albarán vino sin valorar—, lo que dice la factura se apunta
 *     en esa línea y, si es un precio nuevo, se abre desde hoy.
 *   · **Concilia**: suma lo que dicen sus albaranes y lo compara con su base. Si
 *     no cuadra, **no se bloquea**: queda conciliada con la diferencia guardada y
 *     dicha, que es lo que alguien tiene que reclamar.
 *
 * ── Por qué el precio corregido vale desde hoy y no desde el albarán ─────────
 *
 * La Auditoría (hallazgo 8) dice «con efecto desde la fecha del albarán», y eso
 * importa **para recalcular lo que costaron los platos de esos días**, que es M9
 * con las fichas. El libro no se reescribe nunca: lo que entró, entró a lo que se
 * dijo en la puerta. Así que el precio nuevo vale desde hoy, y **la corrección se
 * queda en la línea del albarán, con su fecha**, para que M9 la lea cuando haya
 * platos que recalcular. Está escrito en la decisión 0032.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-30.');

const correccion = z
  .object({
    linea_de_albaran_id: z.string().regex(/^\d+$/),
    /** Lo que dice la factura de esa línea, sin impuestos. */
    importe_centimos: z.number().int().min(0).max(100_000_000),
  })
  .strict();

type Correccion = z.infer<typeof correccion>;

interface FacturaParaConciliar {
  readonly id: string;
  readonly localId: string;
  readonly proveedorId: string;
  readonly tipo: 'factura' | 'abono';
  readonly numero: string;
  readonly baseCentimos: number;
}

export interface SalidaDeConciliar {
  readonly facturaId: string;
  readonly estado: 'sin_conciliar' | 'conciliada' | 'con_diferencia';
  readonly diferenciaCentimos: number | null;
  readonly frase: string | null;
  readonly precios: readonly { readonly producto: string; readonly frase: string }[];
}

/**
 * Concilia una factura con sus albaranes. Lo usan registrarla y conciliarla
 * después, que son el mismo acto hecho en uno o en dos pasos.
 */
async function conciliarLaFactura(
  contexto: Contexto,
  factura: FacturaParaConciliar,
  albaranIds: readonly string[],
  correcciones: readonly Correccion[],
  notas: string | null | undefined,
): Promise<SalidaDeConciliar> {
  const ids = [...new Set(albaranIds)];

  const albaranes = await contexto.sql<
    {
      id: string;
      tipo: 'entrega' | 'devolucion';
      factura_id: string | null;
      numero: string | null;
      fecha: string;
    }[]
  >`
    select id, tipo::text as tipo, factura_id, numero, to_char(fecha, 'YYYY-MM-DD') as fecha
      from estook.albaran
     where id = any(${comoLista(ids)}::text::uuid[])
       and proveedor_id = ${factura.proveedorId}
       and local_id = ${factura.localId}
  `;

  if (albaranes.length !== ids.length) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['albaranes'],
      porque: 'Alguno de esos albaranes no está, o no es de este proveedor.',
    });
  }

  const deOtra = albaranes.find((a) => a.factura_id !== null && a.factura_id !== factura.id);
  if (deOtra !== undefined) {
    throw new FalloDeAplicacion('ya_hecho', {
      porque: `El albarán ${deOtra.numero ?? `del ${deOtra.fecha}`} ya está en otra factura.`,
    });
  }

  const lineas = await contexto.sql<
    {
      id: string;
      albaran_id: string;
      producto_id: string;
      producto: string;
      formatos: string | null;
      cantidad: string;
      importe: string | null;
      facturado: string | null;
      formato: string | null;
      factor: string;
      rendimiento: string;
      unidad_de_uso: string;
    }[]
  >`
    select l.id::text as id, l.albaran_id, l.producto_id, p.nombre as producto,
           l.formatos::text as formatos, l.cantidad::text as cantidad,
           l.importe_centimos::text as importe, l.importe_facturado_centimos::text as facturado,
           p.formato, p.factor::text as factor, p.rendimiento::text as rendimiento,
           p.unidad_de_uso::text as unidad_de_uso
      from estook.linea_de_albaran l
      join estook.producto p on p.id = l.producto_id
     where l.albaran_id = any(${comoLista(ids)}::text::uuid[])
     order by l.id
  `;

  const corregidas = new Map<string, number>();
  for (const c of correcciones) {
    const linea = lineas.find((l) => l.id === c.linea_de_albaran_id);
    if (linea === undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['correcciones'],
        porque: 'Una de las líneas corregidas no es de estos albaranes.',
      });
    }
    await contexto.sql`
      update estook.linea_de_albaran
         set importe_facturado_centimos = ${c.importe_centimos}
       where id = ${c.linea_de_albaran_id}::bigint
    `;
    linea.facturado = String(c.importe_centimos);
    corregidas.set(linea.id, c.importe_centimos);
  }

  const conciliacion: Conciliacion = conciliar(
    factura.tipo,
    factura.baseCentimos,
    albaranes.map((a) => ({
      tipo: a.tipo,
      lineas: lineas
        .filter((l) => l.albaran_id === a.id)
        .map((l) => ({
          importeCentimos: l.importe === null ? null : Number(l.importe),
          importeFacturadoCentimos: l.facturado === null ? null : Number(l.facturado),
        })),
    })),
  );

  await contexto.sql`
    update estook.albaran set factura_id = ${factura.id} where id = any(${comoLista(ids)}::text::uuid[])
  `;

  await contexto.sql`
    update estook.factura_de_compra
       set estado = ${conciliacion.estado}::estook.estado_de_factura,
           diferencia_centimos = ${conciliacion.diferenciaCentimos},
           conciliada_en = now(),
           conciliada_por = ${contexto.personaId},
           notas = coalesce(${notas ?? null}, notas)
     where id = ${factura.id}
  `;

  // ── La factura confirma el precio ─────────────────────────────────────────
  //
  // Solo de lo que ha **entrado**, y solo si es un precio nuevo: una factura
  // que dice lo mismo que el albarán no abre nada.
  const frases: { producto: string; frase: string }[] = [];
  const nombreDelProveedor = await elProveedor(contexto, factura.proveedorId);
  for (const linea of lineas) {
    const importe = corregidas.get(linea.id);
    if (importe === undefined) continue;
    const albaran = albaranes.find((a) => a.id === linea.albaran_id);
    if (albaran?.tipo !== 'entrega') continue;

    const precio = precioPorFormato(importe, {
      formatos: linea.formatos === null ? null : Number(linea.formatos),
      cantidadDeUso: Number(linea.cantidad),
      factor: Number(linea.factor),
    });
    if (precio === null) continue;

    const puesto = await ponerUnPrecio(contexto, {
      productoId: linea.producto_id,
      localId: factura.localId,
      nombre: linea.producto,
      unidadDeUso: linea.unidad_de_uso,
      proveedorId: factura.proveedorId,
      precioCentimos: precio,
      formato: linea.formato,
      factor: Number(linea.factor),
      rendimiento: Number(linea.rendimiento),
      origen: 'factura',
      referencia: { facturaId: factura.id, numero: factura.numero, albaranId: linea.albaran_id },
      soloSiCambia: true,
    });
    if (puesto !== null) frases.push({ producto: linea.producto, frase: puesto.cambio.frase });
  }

  const organizacionId = laOrganizacionDeLaSesion(contexto);
  await contexto.sql`
    select estook.anotar(
      ${organizacionId}::uuid, 'cambiar', 'factura_de_compra', ${factura.id}, ${factura.localId}::uuid,
      ${JSON.stringify({ estado: 'sin_conciliar' })}::text::jsonb,
      ${JSON.stringify({ estado: conciliacion.estado, diferencia_centimos: conciliacion.diferenciaCentimos, albaranes: ids.length })}::text::jsonb,
      null
    )
  `;

  await publicar(contexto.sql, {
    tipo: 'factura.conciliada',
    organizacionId,
    localId: factura.localId,
    datos: {
      facturaId: factura.id,
      proveedorId: factura.proveedorId,
      proveedor: nombreDelProveedor.nombre,
      tipo: factura.tipo,
      estado: conciliacion.estado,
      diferenciaCentimos: conciliacion.diferenciaCentimos,
    },
    correlacionId: contexto.correlacionId,
  });

  return {
    facturaId: factura.id,
    estado: conciliacion.estado,
    diferenciaCentimos: conciliacion.diferenciaCentimos,
    frase: conciliacion.frase,
    precios: frases,
  };
}

// ── Apuntar una factura ──────────────────────────────────────────────────────

export const entradaRegistrarFactura = z
  .object({
    proveedor_id: z.string().uuid(),
    tipo: z.enum(['factura', 'abono']).optional(),
    numero: z.string().trim().min(1).max(60),
    fecha,
    vence_el: fecha.nullable().optional(),
    /** Lo que suma sin impuestos. Es con lo que se concilia. */
    base_centimos: z.number().int().min(0).max(1_000_000_000),
    /** Lo que se paga, con impuestos. */
    total_centimos: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    notas: z.string().trim().max(1000).nullable().optional(),
    /** Los albaranes que cubre. Si vienen, se concilia ya. */
    albaranes: z.array(z.string().uuid()).max(100).optional(),
    correcciones: z.array(correccion).max(500).optional(),
  })
  .strict();

export type EntradaRegistrarFactura = z.infer<typeof entradaRegistrarFactura>;

export const registrarFactura = comando<EntradaRegistrarFactura, SalidaDeConciliar>({
  nombre: 'registrar_factura',
  entrada: entradaRegistrarFactura,
  // La factura es dinero entero: quien no ve precios no la ve ni la apunta.
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const proveedor = await elProveedor(contexto, entrada.proveedor_id);
    if (proveedor.localId !== localId) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese proveedor no es de este local.' });
    }

    const tipo = entrada.tipo ?? 'factura';
    const total = entrada.total_centimos ?? null;
    if (total !== null && total < entrada.base_centimos) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['total_centimos'],
        porque: 'El total, con impuestos, no puede ser menor que la base.',
      });
    }

    const repetida = await contexto.sql<{ id: string }[]>`
      select id from estook.factura_de_compra
       where proveedor_id = ${proveedor.id} and tipo = ${tipo}::estook.tipo_de_factura
         and numero = ${entrada.numero}
    `;
    if (repetida.length > 0) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: `${tipo === 'factura' ? 'La factura' : 'El abono'} ${entrada.numero} de ${proveedor.nombre} ya está apuntado.`,
      });
    }

    // El vencimiento, si no se dice, sale de la forma de pago del proveedor:
    // «a 30 días» son treinta días desde la fecha de la factura.
    const venceEl =
      entrada.vence_el === undefined
        ? proveedor.diasDePago === null
          ? null
          : masDias(fechaOperativa(entrada.fecha), proveedor.diasDePago)
        : entrada.vence_el;

    const creadas = await contexto.sql<{ id: string }[]>`
      insert into estook.factura_de_compra (
        local_id, proveedor_id, tipo, numero, fecha, vence_el, base_centimos, total_centimos,
        notas, registrada_por, es_ejemplo
      )
      values (
        ${localId}, ${proveedor.id}, ${tipo}::estook.tipo_de_factura, ${entrada.numero},
        ${entrada.fecha}::date, ${venceEl}::date, ${entrada.base_centimos}, ${total},
        ${entrada.notas ?? null}, ${contexto.personaId}, ${proveedor.esEjemplo}
      )
      returning id
    `;
    const facturaId = creadas[0]?.id;
    if (facturaId === undefined) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'factura_de_compra', ${facturaId}, ${localId}::uuid, null,
        ${JSON.stringify({ tipo, numero: entrada.numero, proveedor: proveedor.nombre, base_centimos: entrada.base_centimos })}::text::jsonb,
        null
      )
    `;

    if ((entrada.albaranes ?? []).length === 0) {
      return {
        facturaId,
        estado: 'sin_conciliar',
        diferenciaCentimos: null,
        frase: null,
        precios: [],
      };
    }

    return conciliarLaFactura(
      contexto,
      {
        id: facturaId,
        localId,
        proveedorId: proveedor.id,
        tipo,
        numero: entrada.numero,
        baseCentimos: entrada.base_centimos,
      },
      entrada.albaranes ?? [],
      entrada.correcciones ?? [],
      undefined,
    );
  },
});

// ── Conciliar una que ya estaba apuntada ─────────────────────────────────────

export const entradaConciliarFactura = z
  .object({
    factura_id: z.string().uuid(),
    albaranes: z.array(z.string().uuid()).min(1).max(100),
    correcciones: z.array(correccion).max(500).optional(),
    /** Lo que se ha visto al conciliar: «reclamado a Juan el lunes». */
    notas: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export type EntradaConciliarFactura = z.infer<typeof entradaConciliarFactura>;

export const conciliarFactura = comando<EntradaConciliarFactura, SalidaDeConciliar>({
  nombre: 'conciliar_factura',
  entrada: entradaConciliarFactura,
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    // Con candado, por lo mismo que el pedido: dos personas conciliando la misma
    // factura a la vez no pueden dejarla con los albaranes de las dos.
    await contexto.sql`select pg_advisory_xact_lock(hashtextextended(${`factura:${entrada.factura_id}`}, 0))`;

    const filas = await contexto.sql<
      {
        id: string;
        local_id: string;
        proveedor_id: string;
        tipo: 'factura' | 'abono';
        numero: string;
        base: string;
        estado: string;
      }[]
    >`
      select id, local_id, proveedor_id, tipo::text as tipo, numero,
             base_centimos::text as base, estado::text as estado
        from estook.factura_de_compra where id = ${entrada.factura_id}
    `;
    const factura = filas[0];
    if (!factura) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa factura no está, o no es de un local que puedas ver.',
      });
    }
    if (factura.estado !== 'sin_conciliar') {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: `La factura ${factura.numero} ya está conciliada. Si hay algo que corregir, es un abono.`,
      });
    }

    return conciliarLaFactura(
      contexto,
      {
        id: factura.id,
        localId: factura.local_id,
        proveedorId: factura.proveedor_id,
        tipo: factura.tipo,
        numero: factura.numero,
        baseCentimos: Number(factura.base),
      },
      entrada.albaranes,
      entrada.correcciones ?? [],
      entrada.notas,
    );
  },
});
