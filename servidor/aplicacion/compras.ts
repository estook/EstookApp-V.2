import {
  fechaEnElLocal,
  horaDeCorte,
  horaEnElLocal,
  jornadaDe,
  proximoReparto,
  type FechaOperativa,
  type ProximoReparto,
} from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Lo que comparten las operaciones de compras (M7).
 *
 * Vive aparte por la misma razón que `inventario.ts` en M6: pedir, recibir y
 * conciliar son comandos distintos con pantallas distintas, pero **leen al
 * proveedor igual, esperan el mismo precio y cierran el pedido con el mismo
 * candado**. Si cada uno lo hiciera a su manera, el pedido diría que el aceite
 * cuesta 42 € y el albarán que se esperaban 45.
 */

// ── El proveedor ─────────────────────────────────────────────────────────────

export const CANALES_DE_PEDIDO = [
  'whatsapp',
  'correo',
  'telefono',
  'web',
  'comercial',
  'impreso',
] as const;

export type CanalDePedido = (typeof CANALES_DE_PEDIDO)[number];

export const FORMAS_DE_PAGO = [
  'contado',
  'transferencia',
  'domiciliacion',
  'tarjeta',
  'pagare',
  'confirming',
  'otra',
] as const;

export interface FichaDelProveedor {
  readonly id: string;
  readonly localId: string;
  readonly nombre: string;
  readonly activo: boolean;
  readonly esEjemplo: boolean;
  readonly contacto: string | null;
  readonly telefono: string | null;
  readonly whatsapp: string | null;
  readonly correo: string | null;
  readonly comoSePide: CanalDePedido | null;
  readonly dias: readonly number[];
  readonly plazo: number;
  readonly horaLimite: string | null;
  readonly minimoCentimos: number | null;
  readonly portesCentimos: number | null;
  readonly diasDePago: number | null;
}

/** El proveedor, visto con las políticas puestas: de uno ajeno no vuelve nada. */
export async function elProveedor(
  contexto: Contexto,
  proveedorId: string,
): Promise<FichaDelProveedor> {
  const filas = await contexto.sql<
    {
      id: string;
      local_id: string;
      nombre: string;
      activo: boolean;
      es_ejemplo: boolean;
      contacto: string | null;
      telefono: string | null;
      whatsapp: string | null;
      correo: string | null;
      como_se_pide: CanalDePedido | null;
      dias: number[];
      plazo: number;
      hora_limite: string | null;
      minimo: string | null;
      portes: string | null;
      dias_de_pago: number | null;
    }[]
  >`
    select id, local_id, nombre, activo, es_ejemplo, contacto, telefono, whatsapp, correo,
           como_se_pide::text as como_se_pide,
           dias_de_reparto::int[] as dias, plazo_de_entrega::int as plazo,
           to_char(hora_limite, 'HH24:MI') as hora_limite,
           pedido_minimo_centimos::text as minimo, portes_centimos::text as portes,
           dias_de_pago::int as dias_de_pago
      from estook.proveedor
     where id = ${proveedorId}
  `;

  const fila = filas[0];
  if (!fila) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese proveedor no está, o no es de un local que puedas ver.',
    });
  }

  return {
    id: fila.id,
    localId: fila.local_id,
    nombre: fila.nombre,
    activo: fila.activo,
    esEjemplo: fila.es_ejemplo,
    contacto: fila.contacto,
    telefono: fila.telefono,
    whatsapp: fila.whatsapp,
    correo: fila.correo,
    comoSePide: fila.como_se_pide,
    dias: fila.dias,
    plazo: fila.plazo,
    horaLimite: fila.hora_limite,
    minimoCentimos: fila.minimo === null ? null : Number(fila.minimo),
    portesCentimos: fila.portes === null ? null : Number(fila.portes),
    diasDePago: fila.dias_de_pago,
  };
}

// ── Los precios, y quién puede verlos ────────────────────────────────────────

export interface LoQuePuedeConLosPrecios {
  readonly ver: boolean;
  readonly editar: boolean;
}

/**
 * Lo que la persona puede hacer con el dinero en este local.
 *
 * «Un rol sin costes no recibe ni un campo de coste en ninguna respuesta»
 * (Auditoría, parte 8). En compras eso es casi todo: el precio esperado de un
 * pedido, el importe de un albarán, la factura entera. **Un cocinero recibe
 * pedidos y no ve lo que cuestan.**
 */
export async function loQuePuedeConLosPrecios(
  contexto: Contexto,
  localId: string,
): Promise<LoQuePuedeConLosPrecios> {
  const filas = await contexto.sql<{ ver: boolean; editar: boolean }[]>`
    select estook.puede_ver('dato.precio_de_compra', ${localId}::uuid) as ver,
           estook.puede_editar('dato.precio_de_compra', ${localId}::uuid) as editar
  `;
  return { ver: filas[0]?.ver === true, editar: filas[0]?.editar === true };
}

/**
 * Lo que se espera pagar por un formato a ese proveedor.
 *
 * **Lo pactado manda**, si hay algo pactado y vivo: es lo que el proveedor se
 * comprometió a cobrar. Si no, el último precio de **ese** proveedor. Nunca el de
 * otro: esperar pagarle a Makro lo que te cobraba Paco es la forma de que todas
 * las entregas salgan con incidencia de precio.
 */
export async function precioEsperado(
  contexto: Contexto,
  productoId: string,
  proveedorId: string,
): Promise<number | null> {
  const filas = await contexto.sql<{ precio: string | null }[]>`
    select coalesce(
      (select pp.precio_centimos from estook.precio_pactado pp
        where pp.producto_id = ${productoId} and pp.proveedor_id = ${proveedorId}
          and pp.anulado_en is null and (pp.hasta is null or pp.hasta >= current_date)
        limit 1),
      (select pr.precio_centimos from estook.precio_de_producto pr
        where pr.producto_id = ${productoId} and pr.proveedor_id = ${proveedorId}
          and pr.hasta is null
        limit 1)
    )::text as precio
  `;
  const precio = filas[0]?.precio ?? null;
  return precio === null ? null : Number(precio);
}

// ── El reloj del local ───────────────────────────────────────────────────────

export interface RelojDelLocal {
  /** El día del calendario en el local: con el que cuenta el proveedor. */
  readonly hoy: FechaOperativa;
  /** La hora de pared, «HH:MM». */
  readonly hora: string;
  /** La jornada operativa, que decide a qué día pertenece un albarán (regla 10). */
  readonly jornada: FechaOperativa;
}

export async function elRelojDelLocal(contexto: Contexto, localId: string): Promise<RelojDelLocal> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}
  `;
  const zona = filas[0]?.zona_horaria ?? 'Europe/Madrid';
  const corte = filas[0]?.hora_de_corte ?? '05:00';
  return {
    hoy: fechaEnElLocal(contexto.ahora, zona),
    hora: horaEnElLocal(contexto.ahora, zona),
    jornada: jornadaDe(contexto.ahora, zona, horaDeCorte(corte)),
  };
}

export function suProximoReparto(
  proveedor: Pick<FichaDelProveedor, 'dias' | 'plazo' | 'horaLimite'>,
  reloj: RelojDelLocal,
): ProximoReparto | null {
  return proximoReparto(
    { dias: proveedor.dias, plazo: proveedor.plazo, horaLimite: proveedor.horaLimite },
    reloj.hoy,
    reloj.hora,
  );
}

// ── El pedido ────────────────────────────────────────────────────────────────

export type EstadoDePedido =
  'borrador' | 'enviado' | 'recibido' | 'recibido_con_incidencias' | 'cancelado';

export interface PedidoBloqueado {
  readonly id: string;
  readonly localId: string;
  readonly proveedorId: string;
  readonly numero: number;
  readonly estado: EstadoDePedido;
  readonly llegaEl: string | null;
  readonly notas: string | null;
  readonly esEjemplo: boolean;
}

/**
 * El pedido, con su candado puesto.
 *
 * Por el mismo motivo que el producto en M6: dos personas recibiendo el mismo
 * pedido a la vez —la del turno de mañana en el móvil y el jefe en el TPV— no
 * pueden dejar dos albaranes y el doble de género en el libro. La segunda espera
 * a la primera, lee el pedido ya recibido y se le dice.
 *
 * Es un candado de transacción y no `for update` por la lección de la merma
 * (0026): `for update` pasa por la política de editar, y no hace falta mirar
 * permisos para esperar turno.
 */
export async function elPedidoBloqueado(
  contexto: Contexto,
  pedidoId: string,
): Promise<PedidoBloqueado> {
  await contexto.sql`select pg_advisory_xact_lock(hashtextextended(${`pedido:${pedidoId}`}, 0))`;

  const filas = await contexto.sql<
    {
      id: string;
      local_id: string;
      proveedor_id: string;
      numero: number;
      estado: EstadoDePedido;
      llega_el: string | null;
      notas: string | null;
      es_ejemplo: boolean;
    }[]
  >`
    select id, local_id, proveedor_id, numero, estado::text as estado,
           to_char(llega_el, 'YYYY-MM-DD') as llega_el, notas, es_ejemplo
      from estook.pedido_de_compra
     where id = ${pedidoId}
  `;

  const fila = filas[0];
  if (!fila) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese pedido no está, o no es de un local que puedas ver.',
    });
  }

  return {
    id: fila.id,
    localId: fila.local_id,
    proveedorId: fila.proveedor_id,
    numero: fila.numero,
    estado: fila.estado,
    llegaEl: fila.llega_el,
    notas: fila.notas,
    esEjemplo: fila.es_ejemplo,
  };
}

/** Un pedido abierto todavía se puede tocar; uno cerrado se corrige con otra cosa. */
export function estaAbierto(estado: EstadoDePedido): boolean {
  return estado === 'borrador' || estado === 'enviado';
}

export function yaEstaCerrado(pedido: PedidoBloqueado): FalloDeAplicacion {
  return new FalloDeAplicacion('ya_hecho', {
    porque:
      pedido.estado === 'cancelado'
        ? `El pedido ${pedido.numero} está cancelado.`
        : `El pedido ${pedido.numero} ya se recibió. Si llegó algo mal, se devuelve o se abona.`,
  });
}

/**
 * El número siguiente de este local.
 *
 * Con candado **por local**, para que dos pedidos creados a la vez no se lleven el
 * mismo número. La restricción única de la base lo impediría igualmente, pero con
 * un error en vez de con el número siguiente.
 */
export async function siguienteNumeroDePedido(
  contexto: Contexto,
  localId: string,
): Promise<number> {
  await contexto.sql`select pg_advisory_xact_lock(hashtextextended(${`numero-de-pedido:${localId}`}, 0))`;
  const filas = await contexto.sql<{ siguiente: number }[]>`
    select (coalesce(max(numero), 0) + 1)::int as siguiente
      from estook.pedido_de_compra where local_id = ${localId}
  `;
  return filas[0]?.siguiente ?? 1;
}
