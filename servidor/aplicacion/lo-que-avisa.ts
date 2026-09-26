import {
  NOMBRE_DEL_MOTIVO_DE_MERMA,
  avisoDeCarta,
  avisoDeIncidencias,
  avisoDeMerma,
  avisoDeNota,
  avisoDePedidoEmpezado,
  avisoDePedidoMandado,
  avisoDeSubida,
  centimos,
  conUnidad,
  esMotivoDeMerma,
  fechaOperativa,
  laMermaAvisa,
  laSubidaAvisa,
  type Cantidad,
  type FechaOperativa,
} from '@estook/dominio';
import { avisar, losDeArriba, quienesPuedenRecibir, type QuienRecibe } from './avisos.ts';
import { laNotaLeToca } from './consultas/tablon.ts';
import type { Contexto } from './contrato.ts';
import { enNombreDelSistema } from './pago.ts';

/**
 * Lo que avisa · de cada evento, su aviso (entrega R · decisión 0052).
 *
 * Son reacciones como las del Calendario (`reacciones.ts`): van en la misma
 * transacción que lo que las provoca, así que un pedido que no se guarda no deja
 * aviso, y un aviso nunca dice algo que no ha pasado.
 *
 * Cada una responde tres preguntas, siempre en este orden:
 *
 *   1 · ¿Hay que avisar? Una merma de 3 € no; una subida del 2 %, tampoco.
 *   2 · ¿A quién? A quien está por encima de quien lo hizo, o a quien lo tiene que
 *       resolver, o a todo el equipo que lo ve —el Tablón, la carta—.
 *   3 · ¿Qué dice, y a dónde lleva? El texto lo escribe el dominio.
 */

/**
 * Lo que estas reacciones leen de un evento. Es la forma de `EventoOcurrido` de
 * `reacciones.ts`, escrita aquí para no importarla: `reacciones.ts` importa este
 * fichero, y la vuelta sería un ciclo.
 */
export interface EventoOcurrido {
  readonly organizacionId: string;
  readonly localId: string | null;
  readonly datos: Record<string, unknown>;
}

/** El identificador que un evento lleva en sus datos, como texto. */
function texto(evento: EventoOcurrido, clave: string): string {
  const valor = evento.datos[clave];
  return typeof valor === 'string' ? valor : '';
}

function numero(evento: EventoOcurrido, clave: string): number | null {
  const valor = evento.datos[clave];
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** El nombre de quien lo ha hecho: el suyo lo puede leer siempre. */
async function suNombre(contexto: Contexto): Promise<string> {
  if (contexto.personaId === null) return 'Alguien';
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.persona where id = ${contexto.personaId}
  `;
  return filas[0]?.nombre ?? 'Alguien';
}

interface ElPedido {
  readonly id: string;
  readonly numero: number;
  readonly estado: string;
  readonly proveedor: string;
  readonly llegaEl: FechaOperativa | null;
  readonly creadoPor: string | null;
}

async function elPedido(contexto: Contexto, pedidoId: string): Promise<ElPedido | null> {
  const filas = await contexto.sql<
    {
      id: string;
      numero: number;
      estado: string;
      proveedor: string;
      llega_el: string | null;
      creado_por: string | null;
    }[]
  >`
    select p.id, p.numero, p.estado::text as estado, pr.nombre as proveedor,
           to_char(p.llega_el, 'YYYY-MM-DD') as llega_el, p.creado_por
      from estook.pedido_de_compra p
      join estook.proveedor pr on pr.id = p.proveedor_id
     where p.id = ${pedidoId}
  `;
  const fila = filas[0];
  if (fila === undefined) return null;
  return {
    id: fila.id,
    numero: fila.numero,
    estado: fila.estado,
    proveedor: fila.proveedor,
    llegaEl: fila.llega_el === null ? null : fechaOperativa(fila.llega_el),
    creadoPor: fila.creado_por,
  };
}

export function irAlPedido(pedidoId: string): string {
  return `/almacen/compras/pedidos?pedido=${pedidoId}`;
}

// ── Compras ──────────────────────────────────────────────────────────────────

/** Alguien empieza un borrador, o rellena uno que empezó otro. */
export async function avisarDelPedidoEmpezado(
  contexto: Contexto,
  evento: EventoOcurrido,
): Promise<void> {
  const { localId } = evento;
  if (localId === null) return;
  const pedido = await elPedido(contexto, texto(evento, 'pedidoId'));
  if (pedido === null || pedido.estado !== 'borrador') return;

  const quien = await suNombre(contexto);
  await avisar(
    contexto,
    {
      tipo: 'pedido.empezado',
      organizacionId: evento.organizacionId,
      localId,
      clave: pedido.id,
      texto: (quienes) => avisoDePedidoEmpezado(quienes, pedido.proveedor),
      ir: irAlPedido(pedido.id),
      quien,
      como: 'juntar',
    },
    await losDeArriba(contexto, evento.organizacionId, localId, 'pedido.empezado'),
  );
}

/**
 * Un pedido mandado: a quien está por encima de quien lo manda, y **a quien ayudó a
 * rellenarlo** —quien lo empezó y a quien se invitó—, que así sabe que su trabajo
 * ha salido. Y lo que avisaba de ese borrador ya está resuelto: se da por leído.
 */
export async function avisarDelPedidoMandado(
  contexto: Contexto,
  evento: EventoOcurrido,
): Promise<void> {
  const { localId } = evento;
  if (localId === null) return;
  const pedido = await elPedido(contexto, texto(evento, 'pedidoId'));
  if (pedido === null) return;

  await darPorResueltoElBorrador(contexto, pedido.id);

  const deArriba = await losDeArriba(contexto, evento.organizacionId, localId, 'pedido.mandado');
  const invitados = await contexto.sql<{ persona_id: string }[]>`
    select persona_id from estook.invitacion_a_pedido where pedido_id = ${pedido.id}
  `;
  const ayudaron = new Set([
    ...(pedido.creadoPor === null ? [] : [pedido.creadoPor]),
    ...invitados.map((i) => i.persona_id),
  ]);
  const delEquipo = (await quienesPuedenRecibir(contexto, localId, 'pedido.mandado')).filter((q) =>
    ayudaron.has(q.personaId),
  );

  const quien = await suNombre(contexto);
  await avisar(
    contexto,
    {
      tipo: 'pedido.mandado',
      organizacionId: evento.organizacionId,
      localId,
      clave: pedido.id,
      texto: () => avisoDePedidoMandado(quien, pedido.proveedor, pedido.numero, pedido.llegaEl),
      ir: irAlPedido(pedido.id),
      quien,
      como: 'juntar',
    },
    sinRepetir([...deArriba, ...delEquipo]),
  );
}

/** Mandado o cancelado, lo que avisaba de su borrador ya no pide nada. */
export async function darPorResueltoElBorrador(
  contexto: Contexto,
  pedidoId: string,
): Promise<void> {
  await enNombreDelSistema(contexto, async () => {
    await contexto.sql`
      update estook.aviso set leido_en = now()
       where clave = ${pedidoId} and leido_en is null
         and tipo in ('pedido.empezado', 'pedido.invitacion', 'pedido.listo')
    `;
  });
}

export async function alCancelarElPedido(
  contexto: Contexto,
  evento: EventoOcurrido,
): Promise<void> {
  await darPorResueltoElBorrador(contexto, texto(evento, 'pedidoId'));
}

/** Un albarán con incidencias, a quien reclama: quien manda los pedidos. */
export async function avisarDeLasIncidencias(
  contexto: Contexto,
  evento: EventoOcurrido,
): Promise<void> {
  const { localId } = evento;
  if (localId === null || evento.datos['conIncidencias'] !== true) return;
  if (evento.datos['tipo'] !== 'entrega') return;
  const albaranId = texto(evento, 'albaranId');

  const filas = await contexto.sql<{ proveedor: string; incidencias: number }[]>`
    select pr.nombre as proveedor,
           (select count(*)::int from estook.linea_de_albaran la
             where la.albaran_id = a.id and cardinality(la.incidencias) > 0) as incidencias
      from estook.albaran a
      join estook.proveedor pr on pr.id = a.proveedor_id
     where a.id = ${albaranId}
  `;
  const albaran = filas[0];
  if (albaran === undefined || albaran.incidencias === 0) return;

  const quien = await suNombre(contexto);
  await avisar(
    contexto,
    {
      tipo: 'albaran.incidencias',
      organizacionId: evento.organizacionId,
      localId,
      clave: albaranId,
      texto: () => avisoDeIncidencias(albaran.proveedor, albaran.incidencias, quien),
      ir: `/almacen/compras/albaranes?albaran=${albaranId}`,
      quien,
    },
    await quienesPuedenRecibir(contexto, localId, 'albaran.incidencias'),
  );
}

/**
 * Un proveedor sube un precio desde el umbral del local (5 % de fábrica), **sin IVA
 * y por unidad de uso** (0021, 0033). Se mira en el momento en que entra el precio
 * —al recibir, al conciliar o a mano— y no con un repaso de noche, que avisaría
 * tarde. Y si otro proveedor tuyo tiene ese producto más barato, se dice.
 */
export async function avisarDeLaSubida(contexto: Contexto, evento: EventoOcurrido): Promise<void> {
  const { localId } = evento;
  const proveedorId = texto(evento, 'proveedorId');
  const antes = numero(evento, 'costeAnteriorMilesimas');
  const ahora = numero(evento, 'costeMilesimas');
  if (localId === null || proveedorId === '' || antes === null || ahora === null) return;

  const umbrales = await contexto.sql<{ umbral: number }[]>`
    select subida_que_avisa::int as umbral from estook.local where id = ${localId}
  `;
  const umbral = umbrales[0]?.umbral ?? 5;
  if (!laSubidaAvisa(antes, ahora, umbral)) return;

  const productoId = texto(evento, 'productoId');
  const datos = await contexto.sql<{ proveedor: string; unidad: string }[]>`
    select pr.nombre as proveedor, p.unidad_de_uso::text as unidad
      from estook.proveedor pr, estook.producto p
     where pr.id = ${proveedorId} and p.id = ${productoId}
  `;
  const otros = await contexto.sql<{ proveedor: string; coste: string; desde: string }[]>`
    select pr.nombre as proveedor, pp.coste_milesimas::text as coste,
           to_char(pp.desde, 'YYYY-MM-DD') as desde
      from estook.precio_de_producto pp
      join estook.proveedor pr on pr.id = pp.proveedor_id
     where pp.producto_id = ${productoId} and pp.hasta is null
       and pp.proveedor_id is not null and pp.proveedor_id <> ${proveedorId}
       and pr.activo
     order by pp.coste_milesimas asc
     limit 1
  `;
  const suyo = datos[0];
  if (suyo === undefined) return;
  const otro = otros[0];

  await avisar(
    contexto,
    {
      tipo: 'precio.subida',
      organizacionId: evento.organizacionId,
      localId,
      clave: texto(evento, 'precioId') || `${productoId}:${proveedorId}`,
      texto: () =>
        avisoDeSubida(
          suyo.proveedor,
          texto(evento, 'nombre'),
          suyo.unidad,
          antes,
          ahora,
          otro === undefined
            ? null
            : {
                proveedor: otro.proveedor,
                costeMilesimas: Number(otro.coste),
                desde: fechaOperativa(otro.desde),
              },
        ),
      ir: `/almacen/compras/precios?producto=${productoId}`,
      quien: null,
    },
    await quienesPuedenRecibir(contexto, localId, 'precio.subida'),
  );
}

// ── Almacén ──────────────────────────────────────────────────────────────────

/** Se tira algo caro (20 € o más): a quien está por encima de quien lo apunta. */
export async function avisarDeLaMerma(contexto: Contexto, evento: EventoOcurrido): Promise<void> {
  const { localId } = evento;
  const valor = numero(evento, 'valorCentimos');
  if (localId === null || !laMermaAvisa(valor) || valor === null) return;

  const motivo = texto(evento, 'motivo');
  const cuanto = numero(evento, 'cuanto') ?? 0;
  const quien = await suNombre(contexto);
  await avisar(
    contexto,
    {
      tipo: 'merma.grande',
      organizacionId: evento.organizacionId,
      localId,
      // Cada merma es la suya: el mismo producto tirado dos veces son dos avisos.
      clave: texto(evento, 'movimientoId') || contexto.correlacionId,
      texto: () =>
        avisoDeMerma(
          quien,
          conUnidad(cuanto as Cantidad, texto(evento, 'unidadDeUso')),
          texto(evento, 'nombre'),
          centimos(valor),
          esMotivoDeMerma(motivo) ? NOMBRE_DEL_MOTIVO_DE_MERMA[motivo] : motivo,
        ),
      ir: '/almacen/mermas',
      quien,
    },
    await losDeArriba(contexto, evento.organizacionId, localId, 'merma.grande'),
  );
}

// ── Para todo el equipo ──────────────────────────────────────────────────────

/** Carta nueva: a todos los que ven la Carta. Una sola en la campana, la última. */
export async function avisarDeLaCarta(contexto: Contexto, evento: EventoOcurrido): Promise<void> {
  const { localId } = evento;
  if (localId === null) return;
  const quien = await suNombre(contexto);
  const paginas = numero(evento, 'paginas') ?? 1;
  await avisar(
    contexto,
    {
      tipo: 'carta.publicada',
      organizacionId: evento.organizacionId,
      localId,
      clave: localId,
      texto: () => avisoDeCarta(quien, paginas),
      ir: '/carta',
      quien,
      como: 'de_nuevo',
    },
    await quienesPuedenRecibir(contexto, localId, 'carta.publicada'),
  );
}

/** Una nota del Tablón, a quien le toca: la de cocina a la cocina, la de sala a la sala. */
export async function avisarDeLaNota(contexto: Contexto, evento: EventoOcurrido): Promise<void> {
  const { localId } = evento;
  if (localId === null) return;
  const zona = evento.datos['zona'];
  const laZona = zona === 'cocina' || zona === 'sala' ? zona : null;
  const notaId = texto(evento, 'notaId');
  const filas = await contexto.sql<{ texto: string }[]>`
    select texto from estook.nota_del_tablon where id = ${notaId}
  `;
  const nota = filas[0];
  if (nota === undefined) return;

  const quien = await suNombre(contexto);
  const hora = texto(evento, 'hora');
  const aQuien = (await quienesPuedenRecibir(contexto, localId, 'tablon.nota')).filter((q) =>
    laNotaLeToca(laZona, q.rol),
  );
  await avisar(
    contexto,
    {
      tipo: 'tablon.nota',
      organizacionId: evento.organizacionId,
      localId,
      clave: notaId,
      texto: () =>
        avisoDeNota(
          quien,
          nota.texto,
          fechaOperativa(texto(evento, 'dia')),
          fechaOperativa(texto(evento, 'hoy')),
          hora === '' ? null : hora,
        ),
      ir: '/',
      quien,
    },
    aQuien,
  );
}

function sinRepetir(personas: readonly QuienRecibe[]): readonly QuienRecibe[] {
  const vistas = new Set<string>();
  return personas.filter((p) => {
    if (vistas.has(p.personaId)) return false;
    vistas.add(p.personaId);
    return true;
  });
}
