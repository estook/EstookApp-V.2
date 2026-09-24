import { centimos, conSimbolo } from './dinero.ts';
import { plural } from './textos.ts';

/**
 * Lo de hoy · un solo sitio con todo lo que hay que atender, por urgencia
 * (entrega O, mejora 8 · decisión 0047).
 *
 * «Un Hoy que junte caducidades, pedidos, turnos y caja.» No es un noveno sitio:
 * es **la zona de atención del Panel** que ya describe Roles 1.2, arriba y fija. Y
 * se ordena como lo ordenaría alguien que lleva bien un local, en cinco escalones:
 *
 *   1  lo que ya ha pasado y no se hizo     «el pedido debía llegar ayer»
 *   2  lo que cuesta dinero hoy              «tres lotes caducan hoy»
 *   3  lo que tiene hora hoy                 «entras a las 16:00», «llega Makro»
 *   4  lo que hay que hacer hoy              «hoy toca pedir a Frutas Pepe»
 *   5  mañana, solo si hay que prepararlo    «mañana caducan dos lotes: gástalos»
 *
 * Dentro de un escalón **manda el dinero en juego**, y lo que no tiene importe va
 * detrás de lo que sí. Esta función no lee nada: recibe lo que el servidor ya ha
 * contado con las consultas de siempre (`inventario_hoy`, `compras_de_hoy`,
 * `mi_fichaje`), y así lo de hoy no puede decir un número distinto que Inventario.
 *
 * Nunca el color solo: cada cosa dice qué pasa y lleva **su botón**, que resuelve
 * desde ahí o lleva a donde se resuelve.
 */

export type Escalon = 1 | 2 | 3 | 4 | 5;

export const NOMBRE_DEL_ESCALON: Readonly<Record<Escalon, string>> = {
  1: 'Se ha pasado',
  2: 'Cuesta dinero hoy',
  3: 'Tiene hora hoy',
  4: 'Para hoy',
  5: 'Para mañana',
};

export type AppDeLoDeHoy = 'inventario' | 'equipo' | 'servicio';

export interface CosaDeHoy {
  /** Estable de un día a otro: es con lo que se aplaza. */
  readonly id: string;
  readonly escalon: Escalon;
  readonly titulo: string;
  readonly detalle: string | null;
  /** El dinero en juego, si se sabe. Ordena dentro del escalón. */
  readonly centimos: number | null;
  readonly app: AppDeLoDeHoy | null;
  readonly tono: 'mal' | 'atencion' | 'info';
  readonly accion: { readonly texto: string; readonly ir: string } | null;
}

/** Lo que el servidor ha contado, cada trozo solo si quien pregunta puede verlo. */
export interface LoQueHayHoy {
  readonly pedidosQueNoHanLlegado?: readonly {
    readonly pedidoId: string;
    readonly proveedor: string;
    readonly llegaCuando: string;
    readonly centimos: number | null;
  }[];
  readonly lotes?: {
    /** Caducados y todavía en cámara. */
    readonly pasados: readonly string[];
    readonly hoy: readonly string[];
    readonly manana: readonly string[];
  };
  readonly agotados?: readonly string[];
  readonly bajoMinimo?: number;
  readonly llegaHoy?: readonly { readonly pedidoId: string; readonly proveedor: string }[];
  readonly tocaPedir?: readonly {
    readonly proveedorId: string;
    readonly proveedor: string;
    readonly llegaCuando: string;
    readonly productos: number;
  }[];
  readonly borradores?: readonly {
    readonly pedidoId: string;
    readonly proveedor: string;
    readonly lineas: number;
  }[];
  /** La caja de la última jornada, si el local cierra caja y esa no está. */
  readonly cajaSinCerrar?: { readonly cuando: string } | null;
  readonly miTurno?: MiTurnoDeHoy | null;
}

export type MiTurnoDeHoy =
  | { readonly que: 'entra'; readonly aLas: string; readonly enMinutos: number }
  | { readonly que: 'olvidada'; readonly horas: number };

/** «pulpo, merluza y 3 más». */
function algunos(nombres: readonly string[]): string {
  if (nombres.length <= 2) return nombres.join(' y ');
  return `${nombres.slice(0, 2).join(', ')} y ${plural(nombres.length - 2, 'más', 'más')}`;
}

function conImporte(texto: string, centimosEnJuego: number | null): string {
  return centimosEnJuego === null || centimosEnJuego <= 0
    ? texto
    : `${texto} · ${conSimbolo(centimos(centimosEnJuego))}`;
}

const VER_LO_QUE_CADUCA = { texto: 'Verlos', ir: '/inventario/resumen' } as const;

/** Todo lo de hoy, en el orden en que hay que atenderlo. */
export function loDeHoy(hay: LoQueHayHoy): readonly CosaDeHoy[] {
  const cosas: CosaDeHoy[] = [];

  // ── 1 · Lo que ya ha pasado y no se hizo ──
  for (const pedido of hay.pedidosQueNoHanLlegado ?? []) {
    cosas.push({
      id: `pedido-sin-llegar:${pedido.pedidoId}`,
      escalon: 1,
      titulo: `El pedido de ${pedido.proveedor} debía llegar ${pedido.llegaCuando}`,
      detalle: conImporte('Si ha llegado, recíbelo; si no, llama', pedido.centimos),
      centimos: pedido.centimos,
      app: 'inventario',
      tono: 'mal',
      accion: { texto: 'Recibirlo', ir: '/inventario/compras/pedidos?hacer=recibir' },
    });
  }
  if (hay.lotes !== undefined && hay.lotes.pasados.length > 0) {
    const n = hay.lotes.pasados.length;
    cosas.push({
      id: 'lotes-caducados',
      escalon: 1,
      titulo: `${plural(n, 'lote caducado sigue', 'lotes caducados siguen')} en cámara`,
      detalle: `${algunos(hay.lotes.pasados)}. Tíralo${n === 1 ? '' : 's'} y queda${n === 1 ? '' : 'n'} como merma`,
      centimos: null,
      app: 'inventario',
      tono: 'mal',
      accion: VER_LO_QUE_CADUCA,
    });
  }
  if (hay.cajaSinCerrar) {
    cosas.push({
      id: 'caja-sin-cerrar',
      escalon: 1,
      titulo: `La caja de ${hay.cajaSinCerrar.cuando} está sin cerrar`,
      detalle: 'Sin ella no hay ventas ni food cost de ese día',
      centimos: null,
      app: 'servicio',
      tono: 'mal',
      accion: { texto: 'Cerrarla', ir: '/servicio/jornada/cierre' },
    });
  }
  if (hay.miTurno?.que === 'olvidada') {
    cosas.push({
      id: 'salida-olvidada',
      escalon: 1,
      titulo: `Llevas ${plural(hay.miTurno.horas, 'hora', 'horas')} dentro`,
      detalle: '¿Se te olvidó fichar la salida? Ficha ahora y pide que te la corrijan',
      centimos: null,
      app: 'equipo',
      tono: 'mal',
      accion: { texto: 'Fichar la salida', ir: '/?hacer=fichar' },
    });
  }

  // ── 2 · Lo que cuesta dinero hoy ──
  if (hay.lotes !== undefined && hay.lotes.hoy.length > 0) {
    const n = hay.lotes.hoy.length;
    cosas.push({
      id: 'lotes-caducan-hoy',
      escalon: 2,
      titulo: `${plural(n, 'lote caduca', 'lotes caducan')} hoy`,
      detalle: `${algunos(hay.lotes.hoy)}. Gástalo${n === 1 ? '' : 's'} en el servicio de hoy`,
      centimos: null,
      app: 'inventario',
      tono: 'atencion',
      accion: VER_LO_QUE_CADUCA,
    });
  }
  if (hay.agotados !== undefined && hay.agotados.length > 0) {
    const n = hay.agotados.length;
    cosas.push({
      id: 'agotados',
      escalon: 2,
      titulo:
        n === 1
          ? `Te has quedado sin ${hay.agotados[0] ?? ''}`
          : `Te has quedado sin ${plural(n, 'producto', 'productos')}`,
      detalle: n === 1 ? null : algunos(hay.agotados),
      centimos: null,
      app: 'inventario',
      tono: 'atencion',
      accion: { texto: 'Pedirlo', ir: '/inventario/productos/bajo-minimo' },
    });
  }

  // ── 3 · Lo que tiene hora hoy ──
  if (hay.miTurno?.que === 'entra') {
    const { aLas, enMinutos } = hay.miTurno;
    cosas.push({
      id: 'mi-turno',
      escalon: 3,
      titulo: enMinutos < 0 ? `Entrabas a las ${aLas}` : `Entras a las ${aLas}`,
      detalle:
        enMinutos < 0
          ? 'Todavía no has fichado'
          : enMinutos <= 30
            ? `Dentro de ${plural(enMinutos, 'minuto', 'minutos')}`
            : null,
      centimos: null,
      app: 'equipo',
      tono: enMinutos < 0 ? 'mal' : 'info',
      accion: enMinutos <= 30 ? { texto: 'Fichar', ir: '/?hacer=fichar' } : null,
    });
  }
  for (const pedido of hay.llegaHoy ?? []) {
    cosas.push({
      id: `llega-hoy:${pedido.pedidoId}`,
      escalon: 3,
      titulo: `Hoy llega el pedido de ${pedido.proveedor}`,
      detalle: 'Entero son dos toques',
      centimos: null,
      app: 'inventario',
      tono: 'info',
      accion: { texto: 'Recibirlo', ir: '/inventario/compras/pedidos?hacer=recibir' },
    });
  }

  // ── 4 · Lo que hay que hacer hoy ──
  for (const toca of hay.tocaPedir ?? []) {
    cosas.push({
      id: `toca-pedir:${toca.proveedorId}`,
      escalon: 4,
      titulo: `Hoy toca pedir a ${toca.proveedor}`,
      detalle: `Para que llegue ${toca.llegaCuando}${toca.productos > 0 ? ` · ${plural(toca.productos, 'producto', 'productos')} que pedirle` : ''}`,
      centimos: null,
      app: 'inventario',
      tono: 'atencion',
      accion: { texto: 'Hacer el pedido', ir: '/inventario/compras/pedidos?hacer=nuevo' },
    });
  }
  for (const borrador of hay.borradores ?? []) {
    cosas.push({
      id: `borrador:${borrador.pedidoId}`,
      escalon: 4,
      titulo: `El pedido a ${borrador.proveedor} está sin mandar`,
      detalle: plural(borrador.lineas, 'línea', 'líneas'),
      centimos: null,
      app: 'inventario',
      tono: 'info',
      accion: { texto: 'Mandarlo', ir: '/inventario/compras/pedidos' },
    });
  }
  if (hay.bajoMinimo !== undefined && hay.bajoMinimo > 0) {
    cosas.push({
      id: 'bajo-minimo',
      escalon: 4,
      titulo: `${plural(hay.bajoMinimo, 'producto está', 'productos están')} por debajo del mínimo`,
      detalle: null,
      centimos: null,
      app: 'inventario',
      tono: 'info',
      accion: { texto: 'Verlos', ir: '/inventario/productos/bajo-minimo' },
    });
  }

  // ── 5 · Mañana, si hay que prepararlo hoy ──
  if (hay.lotes !== undefined && hay.lotes.manana.length > 0) {
    const n = hay.lotes.manana.length;
    cosas.push({
      id: 'lotes-caducan-manana',
      escalon: 5,
      titulo: `Mañana ${n === 1 ? 'caduca un lote' : `caducan ${String(n)} lotes`}`,
      detalle: `${algunos(hay.lotes.manana)}. Mejor gastarlo${n === 1 ? '' : 's'} hoy`,
      centimos: null,
      app: 'inventario',
      tono: 'info',
      accion: VER_LO_QUE_CADUCA,
    });
  }

  return ordenarLoDeHoy(cosas);
}

/**
 * El orden: por escalón y, dentro, por el dinero en juego —lo que no lo tiene,
 * detrás—. Estable: dos cosas iguales se quedan como llegaron.
 */
export function ordenarLoDeHoy(cosas: readonly CosaDeHoy[]): readonly CosaDeHoy[] {
  return cosas
    .map((cosa, i) => ({ cosa, i }))
    .sort((a, b) => {
      if (a.cosa.escalon !== b.cosa.escalon) return a.cosa.escalon - b.cosa.escalon;
      const dineroA = a.cosa.centimos ?? -1;
      const dineroB = b.cosa.centimos ?? -1;
      if (dineroA !== dineroB) return dineroB - dineroA;
      return a.i - b.i;
    })
    .map(({ cosa }) => cosa);
}
