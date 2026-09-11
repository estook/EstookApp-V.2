import { z } from 'zod';
import {
  conSimbolo,
  centimos,
  incidenciasDe,
  lineaRecibida,
  type Incidencia,
  type LineaRecibida,
} from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import {
  elPedidoBloqueado,
  elProveedor,
  elRelojDelLocal,
  estaAbierto,
  loQuePuedeConLosPrecios,
  precioEsperado,
  yaEstaCerrado,
  type PedidoBloqueado,
} from '../compras.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { apuntar, elProductoBloqueado, ponerUnPrecio, type FichaBasica } from '../inventario.ts';

/**
 * Recibir lo que llega, y devolver lo que no vale (M7).
 *
 * «Al recibir, lo primero que pregunta es **"¿entero o con cambios?"**: entero
 *  son dos toques» (Manifiesto 12). Y la regla crítica de la ficha de M7: **el
 * albarán mueve stock; la factura confirma el precio.**
 *
 * ── Lo que pasa al recibir, en orden ─────────────────────────────────────────
 *
 *   1. Se cierra el pedido con su candado: dos personas recibiendo el mismo
 *      pedido a la vez no dejan dos albaranes. La segunda se entera de que ya
 *      está recibido.
 *   2. Se decide cada línea: lo que ha llegado, a cuánto y qué no ha cuadrado.
 *      Lo que el pedido tenía y no ha venido, se apunta como falta: una línea sin
 *      mover nada que está ahí para decirlo.
 *   3. Se apunta el albarán, y **cada línea entra en el libro por `apuntar`**,
 *      con el mismo candado por producto que una entrada a mano.
 *   4. Si quien recibe ve precios y el precio ha cambiado, se abre el precio
 *      nuevo desde el albarán, que es lo que M6 dejó esperando.
 *   5. El pedido queda recibido, o recibido con incidencias.
 *
 * ── Quien no ve precios también recibe ───────────────────────────────────────
 *
 * Un cocinero recibe el camión, y no ve lo que cuesta. Si dice «entero», cada
 * línea se apunta **al precio que se esperaba** —el del pedido—, y no se abre
 * ningún precio nuevo: eso lo confirmará la factura, que la verá alguien que sí
 * ve precios. Si intenta escribir un precio, se le dice que no, en vez de
 * guardarlo sin decirle nada.
 */

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-30.');

const lineaQueLlega = z
  .object({
    /** Contra qué línea del pedido llega, si llega contra alguna. */
    linea_de_pedido_id: z.string().regex(/^\d+$/).optional(),
    producto_id: z.string().uuid(),
    /** Cuántos formatos. Para lo que no es peso variable. */
    formatos: z.number().min(0).max(100_000).nullable().optional(),
    /** Cuánto de verdad, en unidad de uso. Para el peso variable: los kilos. */
    cantidad: z.number().min(0).max(10_000_000).nullable().optional(),
    /** Por formato, sin impuestos. */
    precio_centimos: z.number().int().min(0).max(100_000_000).nullable().optional(),
    /** Lo que cobra la línea entera, sin impuestos. Para el peso variable. */
    importe_centimos: z.number().int().min(0).max(100_000_000).nullable().optional(),
    /** Ha llegado y no se acepta: en mal estado, roto, caducado. */
    rechazada: z.boolean().optional(),
    nota: z.string().trim().max(200).nullable().optional(),
    lote: z.string().trim().max(64).nullable().optional(),
    caduca_el: fecha.nullable().optional(),
  })
  .strict();

type LineaQueLlega = z.infer<typeof lineaQueLlega>;

export const entradaRecibirAlbaran = z
  .object({
    pedido_id: z.string().uuid().optional(),
    /** Sin pedido: el de la fruta, que llega todas las mañanas sin que nadie pida. */
    proveedor_id: z.string().uuid().optional(),
    /** «Ha llegado entero»: lo del pedido, tal cual. Dos toques. */
    entero: z.boolean().optional(),
    numero: z.string().trim().max(60).nullable().optional(),
    notas: z.string().trim().max(1000).nullable().optional(),
    lineas: z.array(lineaQueLlega).max(300).optional(),
  })
  .strict()
  .refine((e) => e.pedido_id !== undefined || e.proveedor_id !== undefined, {
    message: 'Hace falta el pedido, o el proveedor si llega sin pedido.',
  });

export type EntradaRecibirAlbaran = z.infer<typeof entradaRecibirAlbaran>;

export interface IncidenciaDeUnaLinea {
  readonly producto: string;
  readonly incidencias: readonly Incidencia[];
}

export interface SalidaRecibirAlbaran {
  readonly albaranId: string;
  /** El estado en que queda el pedido, si había pedido. */
  readonly estadoDelPedido: 'recibido' | 'recibido_con_incidencias' | null;
  readonly lineas: number;
  readonly incidencias: readonly IncidenciaDeUnaLinea[];
  /** «El aceite ha subido un 12 %.» Solo a quien ve precios. */
  readonly precios?: readonly { readonly producto: string; readonly frase: string }[];
  /** «Te han cobrado el aceite por encima de lo pactado.» Solo a quien ve precios. */
  readonly avisos?: readonly string[];
  readonly totalCentimos?: number;
}

interface LineaDelPedido {
  id: string;
  producto_id: string;
  cantidad: string;
  precio: string | null;
}

/** Lo que va a pasar con cada línea, antes de escribir nada. */
interface Planeada {
  readonly producto: FichaBasica;
  readonly lineaDePedidoId: string | null;
  readonly pedida: number | null;
  readonly precioEsperado: number | null;
  readonly entrada: LineaQueLlega | null;
  readonly rechazada: boolean;
  readonly recibida: LineaRecibida;
  readonly incidencias: readonly Incidencia[];
}

/** El coste de hoy, para lo que entra sin valorar: «un producto sin precio se usa igual». */
async function costeDeHoy(contexto: Contexto, productoId: string): Promise<number | null> {
  const filas = await contexto.sql<{ coste: string }[]>`
    select coste_milesimas::text as coste
      from estook.precio_vigente(${productoId}::uuid)
     where id is not null
  `;
  const fila = filas[0];
  return fila === undefined ? null : Number(fila.coste);
}

async function loPactado(
  contexto: Contexto,
  productoId: string,
  proveedorId: string,
): Promise<number | null> {
  const filas = await contexto.sql<{ precio: string }[]>`
    select precio_centimos::text as precio from estook.precio_pactado
     where producto_id = ${productoId} and proveedor_id = ${proveedorId}
       and anulado_en is null and (hasta is null or hasta >= current_date)
  `;
  const fila = filas[0];
  return fila === undefined ? null : Number(fila.precio);
}

export const recibirAlbaran = comando<EntradaRecibirAlbaran, SalidaRecibirAlbaran>({
  nombre: 'recibir_albaran',
  entrada: entradaRecibirAlbaran,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    // ── 1 · El pedido, con su candado ─────────────────────────────────────────
    let pedido: PedidoBloqueado | null = null;
    if (entrada.pedido_id !== undefined) {
      pedido = await elPedidoBloqueado(contexto, entrada.pedido_id);
      if (!estaAbierto(pedido.estado)) throw yaEstaCerrado(pedido);
    }

    const proveedorId = pedido?.proveedorId ?? entrada.proveedor_id ?? '';
    const proveedor = await elProveedor(contexto, proveedorId);
    if (proveedor.localId !== localId) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese proveedor no es de este local.' });
    }

    const precios = await loQuePuedeConLosPrecios(contexto, localId);
    const conPrecios = precios.editar;

    for (const linea of entrada.lineas ?? []) {
      const traePrecio =
        (linea.precio_centimos !== undefined && linea.precio_centimos !== null) ||
        (linea.importe_centimos !== undefined && linea.importe_centimos !== null);
      if (traePrecio && !conPrecios) {
        throw new FalloDeAplicacion('sin_permiso', {
          porque:
            'Tu acceso no ve precios de compra: apunta lo que ha llegado y el precio lo pondrá la factura.',
        });
      }
    }

    // ── 2 · Qué va a pasar con cada línea ─────────────────────────────────────
    const dichas = [...(entrada.lineas ?? [])];
    const cogerLaDicha = (lineaId: string, productoId: string): LineaQueLlega | null => {
      const i = dichas.findIndex(
        (d) =>
          d.linea_de_pedido_id === lineaId ||
          (d.linea_de_pedido_id === undefined && d.producto_id === productoId),
      );
      if (i < 0) return null;
      const [dicha] = dichas.splice(i, 1);
      return dicha ?? null;
    };

    const bosquejo: {
      productoId: string;
      lineaDePedidoId: string | null;
      pedida: number | null;
      precioEsperado: number | null;
      entrada: LineaQueLlega | null;
    }[] = [];

    if (pedido !== null) {
      const delPedido = await contexto.sql<LineaDelPedido[]>`
        select id::text as id, producto_id, cantidad::text as cantidad,
               precio_centimos::text as precio
          from estook.linea_de_pedido where pedido_id = ${pedido.id}
         order by orden, id
      `;
      for (const linea of delPedido) {
        bosquejo.push({
          productoId: linea.producto_id,
          lineaDePedidoId: linea.id,
          pedida: Number(linea.cantidad),
          // Un borrador que hizo quien no ve precios se guardó sin ellos. Si quien
          // recibe sí los ve, se espera lo de siempre: lo pactado o lo último.
          precioEsperado:
            linea.precio !== null
              ? Number(linea.precio)
              : conPrecios
                ? await precioEsperado(contexto, linea.producto_id, proveedor.id)
                : null,
          entrada: cogerLaDicha(linea.id, linea.producto_id),
        });
      }
    }

    // Lo que no estaba en el pedido, o todo si no hay pedido.
    for (const dicha of dichas) {
      bosquejo.push({
        productoId: dicha.producto_id,
        lineaDePedidoId: null,
        pedida: null,
        precioEsperado: null,
        entrada: dicha,
      });
    }

    if (bosquejo.length === 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['lineas'],
        porque: 'Dime qué ha llegado: no hay ninguna línea que apuntar.',
      });
    }

    // Siempre en el mismo orden, para que dos recepciones con los mismos
    // productos pidan los candados igual y no se esperen la una a la otra.
    bosquejo.sort((a, b) =>
      a.productoId < b.productoId ? -1 : a.productoId > b.productoId ? 1 : 0,
    );

    const entero = entrada.entero === true;
    const sinKilos: string[] = [];
    const planeadas: Planeada[] = [];

    for (const b of bosquejo) {
      const producto = await elProductoBloqueado(contexto, b.productoId);
      if (producto.localId !== localId) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Uno de los productos no está, o no es de este local.',
        });
      }

      const rechazada = b.entrada?.rechazada === true;
      let recibida: LineaRecibida;

      if (producto.pesoVariable) {
        // «Se pide en piezas y entra en kilos reales» (Manifiesto 29). Los kilos
        // no se pueden suponer, ni siquiera si ha llegado entero.
        const kilos = b.entrada?.cantidad ?? null;
        if (kilos === null && !rechazada && b.pedida !== null && (entero || b.entrada !== null)) {
          sinKilos.push(producto.nombre);
        }
        recibida = lineaRecibida({
          pesoVariable: true,
          factor: producto.factor,
          rendimiento: producto.rendimiento,
          formatos: b.entrada?.formatos ?? null,
          cantidadDeUso: rechazada ? 0 : (kilos ?? 0),
          importeCentimos: conPrecios ? (b.entrada?.importe_centimos ?? null) : null,
        });
      } else {
        const formatos =
          b.entrada?.formatos ?? (entero && b.pedida !== null && b.entrada === null ? b.pedida : 0);
        const precio =
          conPrecios && b.entrada?.precio_centimos !== undefined
            ? b.entrada.precio_centimos
            : b.precioEsperado;
        recibida = lineaRecibida({
          pesoVariable: false,
          factor: producto.factor,
          rendimiento: producto.rendimiento,
          formatos,
          precioFormatoCentimos: precio,
        });
        if (rechazada) {
          recibida = {
            ...recibida,
            cantidadDeUso: 0,
            importeCentimos: null,
            costeMilesimas: null,
          };
        }
      }

      const incidencias: readonly Incidencia[] =
        pedido === null
          ? rechazada
            ? ['rechazado']
            : []
          : incidenciasDe({
              pedida: b.pedida,
              recibida: producto.pesoVariable ? recibida.cantidadDeUso : (recibida.formatos ?? 0),
              rechazada,
              pesoVariable: producto.pesoVariable,
              precioEsperado: producto.pesoVariable ? null : b.precioEsperado,
              precioCobrado: producto.pesoVariable ? null : recibida.precioFormatoCentimos,
            });

      // Una línea que no mueve nada y no tiene nada que contar no se apunta.
      if (recibida.cantidadDeUso <= 0 && incidencias.length === 0) continue;

      planeadas.push({
        producto,
        lineaDePedidoId: b.lineaDePedidoId,
        pedida: b.pedida,
        precioEsperado: b.precioEsperado,
        entrada: b.entrada,
        rechazada,
        recibida,
        incidencias,
      });
    }

    if (sinKilos.length > 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['cantidad'],
        porque: `Dime cuántos kilos han llegado de verdad de ${sinKilos.join(', ')}: va a peso variable.`,
      });
    }

    if (planeadas.length === 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['lineas'],
        porque: 'No ha llegado nada que apuntar.',
      });
    }

    // ── 3 · El albarán, y cada línea al libro ─────────────────────────────────
    const reloj = await elRelojDelLocal(contexto, localId);
    const conIncidencias = planeadas.some((p) => p.incidencias.length > 0);
    const numero = entrada.numero === undefined || entrada.numero === '' ? null : entrada.numero;

    const albaranes = await contexto.sql<{ id: string }[]>`
      insert into estook.albaran (
        local_id, proveedor_id, pedido_id, tipo, numero, fecha, con_incidencias, notas,
        recibido_por, es_ejemplo
      )
      values (
        ${localId}, ${proveedor.id}, ${pedido?.id ?? null}, 'entrega', ${numero},
        ${reloj.jornada}::date, ${conIncidencias}, ${entrada.notas ?? null},
        ${contexto.personaId}, ${proveedor.esEjemplo}
      )
      returning id
    `;
    const albaranId = albaranes[0]?.id;
    if (albaranId === undefined) throw new FalloDeAplicacion('sin_permiso');

    const referencia = { albaranId, pedidoId: pedido?.id ?? null, numero };
    const frases: { producto: string; frase: string }[] = [];
    const avisos: string[] = [];
    let total = 0;

    for (const p of planeadas) {
      let loteId: string | null = null;
      const lote = p.entrada?.lote ?? null;
      const caduca = p.entrada?.caduca_el ?? null;

      if (p.recibida.cantidadDeUso > 0 && ((lote !== null && lote !== '') || caduca !== null)) {
        const lotes = await contexto.sql<{ id: string }[]>`
          insert into estook.lote (local_id, producto_id, codigo, caduca_el, recibido_el, es_ejemplo)
          values (${localId}, ${p.producto.id}, ${lote === '' ? null : lote}, ${caduca}::date,
                  current_date, ${p.producto.esEjemplo})
          returning id
        `;
        loteId = lotes[0]?.id ?? null;
        if (loteId !== null && caduca !== null) {
          await publicar(contexto.sql, {
            tipo: 'lote.creado',
            organizacionId,
            localId,
            datos: { loteId, productoId: p.producto.id, caducaEl: caduca },
            correlacionId: contexto.correlacionId,
          });
        }
      }

      let movimientoId: string | null = null;
      if (p.recibida.cantidadDeUso > 0) {
        const coste = p.recibida.costeMilesimas ?? (await costeDeHoy(contexto, p.producto.id));
        const apuntado = await apuntar(contexto, p.producto, {
          tipo: 'entrada',
          cantidad: p.recibida.cantidadDeUso,
          costeMilesimas: coste,
          loteId,
          motivo:
            numero === null
              ? `Albarán de ${proveedor.nombre}`
              : `Albarán ${numero} de ${proveedor.nombre}`,
          origen: 'albaran',
          referencia,
          esEjemplo: p.producto.esEjemplo,
        });
        movimientoId = apuntado.movimientoId;
      }

      await contexto.sql`
        insert into estook.linea_de_albaran (
          albaran_id, producto_id, linea_de_pedido_id, formatos, cantidad, importe_centimos,
          coste_milesimas, incidencias, nota, lote_id, movimiento_id
        )
        values (
          ${albaranId}, ${p.producto.id}, ${p.lineaDePedidoId}::bigint, ${p.recibida.formatos},
          ${p.recibida.cantidadDeUso}, ${p.recibida.importeCentimos}, ${p.recibida.costeMilesimas},
          ${comoLista(p.incidencias)}::text::estook.incidencia_de_recepcion[],
          ${p.entrada?.nota ?? null},
          ${loteId}, ${movimientoId}::bigint
        )
      `;

      total += p.recibida.importeCentimos ?? 0;

      // ── 4 · El precio nuevo, desde el albarán ───────────────────────────────
      const precioFormato = p.recibida.precioFormatoCentimos;
      if (conPrecios && !p.rechazada && p.recibida.cantidadDeUso > 0 && precioFormato !== null) {
        const puesto = await ponerUnPrecio(contexto, {
          productoId: p.producto.id,
          localId,
          nombre: p.producto.nombre,
          unidadDeUso: p.producto.unidadDeUso,
          proveedorId: proveedor.id,
          precioCentimos: precioFormato,
          formato: p.producto.formato,
          factor: p.producto.factor,
          rendimiento: p.producto.rendimiento,
          origen: 'albaran',
          referencia,
          soloSiCambia: true,
        });
        if (puesto !== null && puesto.cambio.subeBaja !== 'primero') {
          frases.push({ producto: p.producto.nombre, frase: puesto.cambio.frase });
        }

        // «Contratos marco con precio de referencia, para comparar lo pactado con
        // lo que de verdad te cobran» (Manifiesto 12): se dice aquí, en la puerta.
        const pactado = await loPactado(contexto, p.producto.id, proveedor.id);
        if (pactado !== null && precioFormato > pactado) {
          avisos.push(
            `${proveedor.nombre} te ha cobrado ${p.producto.nombre} a ${conSimbolo(centimos(precioFormato))} y teníais pactado ${conSimbolo(centimos(pactado))}.`,
          );
        }
      }
    }

    // ── 5 · El pedido, recibido ───────────────────────────────────────────────
    let estadoDelPedido: SalidaRecibirAlbaran['estadoDelPedido'] = null;
    if (pedido !== null) {
      estadoDelPedido = conIncidencias ? 'recibido_con_incidencias' : 'recibido';
      await contexto.sql`
        update estook.pedido_de_compra
           set estado = ${estadoDelPedido}::estook.estado_de_pedido,
               recibido_en = now(),
               recibido_por = ${contexto.personaId},
               actualizado_en = now()
         where id = ${pedido.id}
      `;
      await publicar(contexto.sql, {
        tipo: 'pedido.recibido',
        organizacionId,
        localId,
        datos: { pedidoId: pedido.id, numero: pedido.numero, albaranId, conIncidencias },
        correlacionId: contexto.correlacionId,
      });
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'albaran', ${albaranId}, ${localId}::uuid, null,
        ${JSON.stringify({ proveedor: proveedor.nombre, pedido: pedido?.numero ?? null, lineas: planeadas.length, con_incidencias: conIncidencias })}::text::jsonb,
        null
      )
    `;

    // Las compras, para quien las tenga que sumar: el food cost real de M8 es
    // «(inicial + compras − final) ÷ ventas», y las compras son esto.
    await publicar(contexto.sql, {
      tipo: 'albaran.apuntado',
      organizacionId,
      localId,
      datos: {
        albaranId,
        tipo: 'entrega',
        proveedorId: proveedor.id,
        pedidoId: pedido?.id ?? null,
        importeCentimos: total,
        lineas: planeadas.length,
        conIncidencias,
      },
      correlacionId: contexto.correlacionId,
    });

    const incidencias = planeadas
      .filter((p) => p.incidencias.length > 0)
      .map((p) => ({ producto: p.producto.nombre, incidencias: p.incidencias }));

    return {
      albaranId,
      estadoDelPedido,
      lineas: planeadas.length,
      incidencias,
      ...(precios.ver ? { precios: frases, avisos, totalCentimos: total } : {}),
    };
  },
});

// ── Devolver ─────────────────────────────────────────────────────────────────

const lineaQueSeDevuelve = z
  .object({
    producto_id: z.string().uuid(),
    /** Cuántos formatos, o… */
    formatos: z.number().positive().max(100_000).optional(),
    /** …cuánto en unidad de uso. Uno de los dos. */
    cantidad: z.number().positive().max(10_000_000).optional(),
    /** Lo que se espera que abonen por esto, sin impuestos. */
    importe_centimos: z.number().int().min(0).max(100_000_000).nullable().optional(),
  })
  .strict()
  .refine((l) => (l.formatos === undefined) !== (l.cantidad === undefined), {
    message: 'Di cuántas cajas o cuánta cantidad, una de las dos.',
  });

export const entradaDevolverAlProveedor = z
  .object({
    proveedor_id: z.string().uuid(),
    motivo: z.string().trim().min(1).max(400),
    numero: z.string().trim().max(60).nullable().optional(),
    lineas: z.array(lineaQueSeDevuelve).min(1).max(100),
  })
  .strict();

export type EntradaDevolverAlProveedor = z.infer<typeof entradaDevolverAlProveedor>;

/**
 * Devolver género al proveedor: el yogur que llegó caducado y se vio al día
 * siguiente, la caja de tomate podrido del fondo.
 *
 * Es **un albarán al revés**: sale del libro con su motivo, queda con su papel, y
 * el abono del proveedor lo concilia igual que una factura concilia entregas.
 * Lo que se rechaza en la puerta no se devuelve: no llegó a entrar.
 */
export const devolverAlProveedor = comando<EntradaDevolverAlProveedor, { albaranId: string }>({
  nombre: 'devolver_al_proveedor',
  entrada: entradaDevolverAlProveedor,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const proveedor = await elProveedor(contexto, entrada.proveedor_id);
    if (proveedor.localId !== localId) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese proveedor no es de este local.' });
    }

    const precios = await loQuePuedeConLosPrecios(contexto, localId);
    if (
      !precios.editar &&
      entrada.lineas.some((l) => l.importe_centimos !== undefined && l.importe_centimos !== null)
    ) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque:
          'Tu acceso no ve precios de compra: apunta lo que se devuelve y el importe lo pondrá el abono.',
      });
    }

    const reloj = await elRelojDelLocal(contexto, localId);
    const numero = entrada.numero === undefined || entrada.numero === '' ? null : entrada.numero;

    const albaranes = await contexto.sql<{ id: string }[]>`
      insert into estook.albaran (
        local_id, proveedor_id, tipo, numero, fecha, notas, recibido_por, es_ejemplo
      )
      values (
        ${localId}, ${proveedor.id}, 'devolucion', ${numero}, ${reloj.jornada}::date,
        ${entrada.motivo}, ${contexto.personaId}, ${proveedor.esEjemplo}
      )
      returning id
    `;
    const albaranId = albaranes[0]?.id;
    if (albaranId === undefined) throw new FalloDeAplicacion('sin_permiso');

    const ordenadas = [...entrada.lineas].sort((a, b) =>
      a.producto_id < b.producto_id ? -1 : a.producto_id > b.producto_id ? 1 : 0,
    );

    let total = 0;
    for (const linea of ordenadas) {
      const producto = await elProductoBloqueado(contexto, linea.producto_id);
      if (producto.localId !== localId) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Uno de los productos no está, o no es de este local.',
        });
      }
      const cuanto = linea.cantidad ?? (linea.formatos ?? 0) * producto.factor;

      const apuntado = await apuntar(contexto, producto, {
        tipo: 'salida',
        cantidad: -cuanto,
        motivo: `Devuelto a ${proveedor.nombre}: ${entrada.motivo}`,
        origen: 'devolucion',
        referencia: { albaranId, numero },
        esEjemplo: producto.esEjemplo,
      });

      await contexto.sql`
        insert into estook.linea_de_albaran (
          albaran_id, producto_id, formatos, cantidad, importe_centimos, movimiento_id
        )
        values (
          ${albaranId}, ${producto.id}, ${linea.formatos ?? null}, ${cuanto},
          ${linea.importe_centimos ?? null}, ${apuntado.movimientoId}::bigint
        )
      `;
      total += linea.importe_centimos ?? 0;
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'albaran', ${albaranId}, ${localId}::uuid, null,
        ${JSON.stringify({ tipo: 'devolucion', proveedor: proveedor.nombre, lineas: ordenadas.length })}::text::jsonb,
        ${entrada.motivo}
      )
    `;

    await publicar(contexto.sql, {
      tipo: 'albaran.apuntado',
      organizacionId,
      localId,
      datos: {
        albaranId,
        tipo: 'devolucion',
        proveedorId: proveedor.id,
        importeCentimos: total,
        lineas: ordenadas.length,
      },
      correlacionId: contexto.correlacionId,
    });

    return { albaranId };
  },
});
