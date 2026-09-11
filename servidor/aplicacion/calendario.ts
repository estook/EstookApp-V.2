import { comoSeLePide, fechaEnElLocal, plural } from '@estook/dominio';
import type { Contexto } from './contrato.ts';
import { comoLista } from './listas.ts';

/**
 * Publicar en el Calendario (M7, decisión 0031).
 *
 * «Los módulos publican; el Calendario pinta.» Aquí están las tres cosas que M6 y
 * M7 publican, y las llaman **las reacciones**, nunca los comandos: quien manda un
 * pedido no tiene por qué saber que existe un calendario (0014).
 *
 * ── Cada función deja el evento como tiene que estar, sea cual sea el cambio ──
 *
 * No hay una función para «se ha enviado» y otra para «se ha cancelado». Hay una
 * que **lee cómo está el pedido ahora** y deja su entrega igual: la pone, la mueve,
 * la tacha o la quita. Así da igual qué evento la llame o cuántas veces: el
 * resultado es siempre el mismo, que es lo que hace que reaccionar dos veces no
 * duplique nada (0014: «sembrar es idempotente»).
 *
 * Y lo que se escribe aquí **no lleva un solo importe**: una entrega la ve un
 * cocinero, que no ve precios.
 */

async function hoyEnElLocal(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string }[]>`
    select zona_horaria from estook.local where id = ${localId}
  `;
  return fechaEnElLocal(contexto.ahora, filas[0]?.zona_horaria ?? 'Europe/Madrid');
}

/**
 * Lo que sale de un ejemplo se apunta como ejemplo, para que «Quitar los
 * ejemplos» se lo lleve y no deje un evento huérfano apuntando a nada.
 */
async function apuntarComoEjemplo(contexto: Contexto, localId: string, eventoId: string) {
  await contexto.sql`
    insert into estook.dato_de_ejemplo (organizacion_id, local_id, tabla, fila_id)
    select l.organizacion_id, ${localId}, 'evento_de_calendario', ${eventoId}
      from estook.local l where l.id = ${localId}
    on conflict (tabla, fila_id) do nothing
  `;
}

async function quitar(contexto: Contexto, origen: string, origenId: string) {
  await contexto.sql`
    delete from estook.evento_de_calendario
     where capa = ${origen === 'lote' ? 'caducidad' : 'entrega'}::estook.capa_de_calendario
       and origen = ${origen}
       and origen_id = ${origenId}
  `;
}

/**
 * Los repartos de un proveedor: una fila que se repite los días que reparte.
 *
 * Si se desactiva, o se le quitan los días, se va: un proveedor al que ya no se
 * le compra no pinta nada en el calendario de nadie.
 */
export async function publicarLosRepartos(contexto: Contexto, proveedorId: string): Promise<void> {
  const filas = await contexto.sql<
    {
      local_id: string;
      nombre: string;
      activo: boolean;
      dias: number[];
      plazo: number;
      hora_limite: string | null;
      es_ejemplo: boolean;
    }[]
  >`
    select local_id, nombre, activo, dias_de_reparto::int[] as dias,
           plazo_de_entrega::int as plazo, to_char(hora_limite, 'HH24:MI') as hora_limite,
           es_ejemplo
      from estook.proveedor
     where id = ${proveedorId}
  `;

  const proveedor = filas[0];
  if (!proveedor) return;

  if (!proveedor.activo || proveedor.dias.length === 0) {
    await quitar(contexto, 'reparto', proveedorId);
    return;
  }

  const hoy = await hoyEnElLocal(contexto, proveedor.local_id);

  // El primer día se queda el de la primera vez: cambiar los días de reparto no
  // mueve cuándo empezó a repartir.
  const puestos = await contexto.sql<{ id: string }[]>`
    insert into estook.evento_de_calendario (
      local_id, capa, origen, origen_id, dia, se_repite, titulo, detalle, ir, grupo, es_ejemplo
    )
    values (
      ${proveedor.local_id}, 'entrega', 'reparto', ${proveedorId}, ${hoy}::date,
      ${comoLista(proveedor.dias)}::text::smallint[], ${`Reparte ${proveedor.nombre}`},
      ${comoSeLePide(proveedor.plazo, proveedor.hora_limite)},
      ${`/inventario/compras/proveedores?proveedor=${proveedorId}`},
      ${`proveedor:${proveedorId}`}, ${proveedor.es_ejemplo}
    )
    on conflict (capa, origen, origen_id) do update
       set se_repite = excluded.se_repite,
           titulo = excluded.titulo,
           detalle = excluded.detalle,
           ir = excluded.ir,
           grupo = excluded.grupo
    returning id
  `;

  const eventoId = puestos[0]?.id;
  if (proveedor.es_ejemplo && eventoId !== undefined) {
    await apuntarComoEjemplo(contexto, proveedor.local_id, eventoId);
  }
}

/**
 * La entrega de un pedido, como está el pedido ahora:
 *
 *   borrador o cancelado   no hay entrega
 *   enviado                «Llega el pedido 23 de Makro», el día que tiene que llegar
 *   recibido               «Ha llegado…», tachada, el día que llegó de verdad
 */
export async function publicarLaEntrega(contexto: Contexto, pedidoId: string): Promise<void> {
  const filas = await contexto.sql<
    {
      local_id: string;
      numero: number;
      estado: string;
      llega_el: string | null;
      proveedor_id: string;
      proveedor: string;
      lineas: number;
      es_ejemplo: boolean;
      llego_el: string | null;
    }[]
  >`
    select p.local_id, p.numero, p.estado::text as estado,
           to_char(p.llega_el, 'YYYY-MM-DD') as llega_el,
           p.proveedor_id, pv.nombre as proveedor,
           (select count(*)::int from estook.linea_de_pedido l where l.pedido_id = p.id) as lineas,
           p.es_ejemplo,
           (select to_char(max(a.fecha), 'YYYY-MM-DD') from estook.albaran a
             where a.pedido_id = p.id) as llego_el
      from estook.pedido_de_compra p
      join estook.proveedor pv on pv.id = p.proveedor_id
     where p.id = ${pedidoId}
  `;

  const pedido = filas[0];
  if (!pedido) return;

  const recibido = pedido.estado === 'recibido' || pedido.estado === 'recibido_con_incidencias';
  const dia = recibido ? (pedido.llego_el ?? pedido.llega_el) : pedido.llega_el;

  if (pedido.estado === 'borrador' || pedido.estado === 'cancelado' || dia === null) {
    await quitar(contexto, 'pedido', pedidoId);
    return;
  }

  const titulo = recibido
    ? `Ha llegado el pedido ${pedido.numero} de ${pedido.proveedor}`
    : `Llega el pedido ${pedido.numero} de ${pedido.proveedor}`;
  const detalle =
    pedido.estado === 'recibido_con_incidencias'
      ? 'Con incidencias: mira qué no ha cuadrado.'
      : plural(pedido.lineas, 'producto', 'productos');

  const puestos = await contexto.sql<{ id: string }[]>`
    insert into estook.evento_de_calendario (
      local_id, capa, origen, origen_id, dia, titulo, detalle, ir, grupo, hecho, es_ejemplo
    )
    values (
      ${pedido.local_id}, 'entrega', 'pedido', ${pedidoId}, ${dia}::date, ${titulo}, ${detalle},
      ${`/inventario/compras/pedidos?pedido=${pedidoId}`}, ${`proveedor:${pedido.proveedor_id}`},
      ${recibido}, ${pedido.es_ejemplo}
    )
    on conflict (capa, origen, origen_id) do update
       set dia = excluded.dia,
           titulo = excluded.titulo,
           detalle = excluded.detalle,
           hecho = excluded.hecho
    returning id
  `;

  const eventoId = puestos[0]?.id;
  if (pedido.es_ejemplo && eventoId !== undefined) {
    await apuntarComoEjemplo(contexto, pedido.local_id, eventoId);
  }
}

/**
 * La caducidad de un lote: «Caduca la burrata», el día que caduca, llevando a su
 * producto. Es de M6, y hasta M7 no la publicaba nadie porque no había dónde.
 */
export async function publicarLaCaducidad(contexto: Contexto, loteId: string): Promise<void> {
  const filas = await contexto.sql<
    {
      local_id: string;
      caduca_el: string | null;
      codigo: string | null;
      es_ejemplo: boolean;
      producto_id: string;
      producto: string;
    }[]
  >`
    select l.local_id, to_char(l.caduca_el, 'YYYY-MM-DD') as caduca_el, l.codigo,
           l.es_ejemplo, p.id as producto_id, p.nombre as producto
      from estook.lote l
      join estook.producto p on p.id = l.producto_id
     where l.id = ${loteId}
  `;

  const lote = filas[0];
  if (!lote) return;

  if (lote.caduca_el === null) {
    await quitar(contexto, 'lote', loteId);
    return;
  }

  // El mismo título y el mismo destino que pone la migración 0032 a las que ya
  // había: si uno cambia y el otro no, la prueba de las caducidades lo caza.
  const puestos = await contexto.sql<{ id: string }[]>`
    insert into estook.evento_de_calendario (
      local_id, capa, origen, origen_id, dia, titulo, detalle, ir, es_ejemplo
    )
    values (
      ${lote.local_id}, 'caducidad', 'lote', ${loteId}, ${lote.caduca_el}::date,
      ${`Caduca ${lote.producto}`},
      ${lote.codigo === null ? null : `Lote ${lote.codigo}`},
      ${`/inventario/productos/todo?producto=${lote.producto_id}`},
      ${lote.es_ejemplo}
    )
    on conflict (capa, origen, origen_id) do update
       set dia = excluded.dia, titulo = excluded.titulo, detalle = excluded.detalle
    returning id
  `;

  const eventoId = puestos[0]?.id;
  if (lote.es_ejemplo && eventoId !== undefined) {
    await apuntarComoEjemplo(contexto, lote.local_id, eventoId);
  }
}
