import type { ComoVaElMinimo, Comparacion, Incidencia, Puntualidad } from '@estook/dominio';
import type { EstadoDeExistencias } from '@estook/dominio';
import { conUnidadDeUso } from '../inventario/contrato.ts';

/**
 * Lo que Compras recibe del servidor, y cómo se dice cada cosa (M7).
 *
 * Los tipos son la copia de lo que devuelven las consultas de compras. Viven aquí
 * y no en un paquete compartido por la regla de dependencias: **la aplicación no
 * importa del servidor**, habla con él por `@estook/cliente-api`.
 *
 * Y los campos de dinero llegan **opcionales a propósito**, como en Inventario: un
 * cocinero recibe pedidos y albaranes y no recibe ni un importe, porque el
 * servidor no se los manda. Que el tipo lo diga es lo que evita pintar «0,00 €»
 * donde lo correcto es no pintar nada.
 */

// ── Cómo se dice cada cosa ───────────────────────────────────────────────────

export type EstadoDePedido =
  'borrador' | 'enviado' | 'recibido' | 'recibido_con_incidencias' | 'cancelado';

export const NOMBRE_DEL_ESTADO_DEL_PEDIDO: Readonly<Record<EstadoDePedido, string>> = {
  borrador: 'Borrador',
  enviado: 'Mandado',
  recibido: 'Recibido',
  recibido_con_incidencias: 'Recibido con incidencias',
  cancelado: 'Cancelado',
};

/** Color **y** palabra, nunca solo color (B8). */
export const TONO_DEL_ESTADO_DEL_PEDIDO: Readonly<
  Record<EstadoDePedido, 'neutro' | 'info' | 'bien' | 'atencion' | 'mal'>
> = {
  borrador: 'neutro',
  enviado: 'info',
  recibido: 'bien',
  recibido_con_incidencias: 'atencion',
  cancelado: 'neutro',
};

export const CANALES = ['whatsapp', 'correo', 'telefono', 'web', 'comercial', 'impreso'] as const;
export type Canal = (typeof CANALES)[number];

export const NOMBRE_DEL_CANAL: Readonly<Record<Canal, string>> = {
  whatsapp: 'WhatsApp',
  correo: 'Correo',
  telefono: 'Por teléfono',
  web: 'En su web',
  comercial: 'Al comercial',
  impreso: 'En papel',
};

export const FORMAS_DE_PAGO = [
  'contado',
  'transferencia',
  'domiciliacion',
  'tarjeta',
  'pagare',
  'confirming',
  'otra',
] as const;
export type FormaDePago = (typeof FORMAS_DE_PAGO)[number];

export const NOMBRE_DE_LA_FORMA_DE_PAGO: Readonly<Record<FormaDePago, string>> = {
  contado: 'Al contado',
  transferencia: 'Transferencia',
  domiciliacion: 'Domiciliación',
  tarjeta: 'Tarjeta',
  pagare: 'Pagaré',
  confirming: 'Confirming',
  otra: 'Otra',
};

export type EstadoDeFactura = 'sin_conciliar' | 'conciliada' | 'con_diferencia';

export const NOMBRE_DEL_ESTADO_DE_LA_FACTURA: Readonly<Record<EstadoDeFactura, string>> = {
  sin_conciliar: 'Sin comprobar',
  conciliada: 'Cuadra',
  con_diferencia: 'Con diferencia',
};

export const TONO_DEL_ESTADO_DE_LA_FACTURA: Readonly<
  Record<EstadoDeFactura, 'neutro' | 'bien' | 'atencion'>
> = {
  sin_conciliar: 'neutro',
  conciliada: 'bien',
  con_diferencia: 'atencion',
};

/** Las iniciales de los días, del lunes al domingo. Es como se marcan en un calendario. */
export const INICIALES_DE_LOS_DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

const NOMBRES_DE_LOS_DIAS = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const;

/**
 * «Martes y viernes», «de lunes a sábado», «todos los días».
 *
 * Es como lo dice un hostelero: nadie dice «L, X, V». Un tramo seguido de cuatro
 * o más días se dice como tramo, que es como se lee en la puerta de un almacén.
 */
export function comoSeLeenLosDias(dias: readonly number[]): string {
  const ordenados = [...new Set(dias)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (ordenados.length === 0) return 'Sin días de reparto';
  if (ordenados.length === 7) return 'Todos los días';

  const seguidos = ordenados.every((d, i) => i === 0 || d === (ordenados[i - 1] ?? 0) + 1);
  const primero = ordenados[0] ?? 1;
  const ultimo = ordenados[ordenados.length - 1] ?? 1;
  if (seguidos && ordenados.length >= 4) {
    return `De ${NOMBRES_DE_LOS_DIAS[primero - 1]} a ${NOMBRES_DE_LOS_DIAS[ultimo - 1]}`;
  }

  const nombres = ordenados.map((d) => NOMBRES_DE_LOS_DIAS[d - 1] ?? '');
  const frase =
    nombres.length === 1
      ? (nombres[0] ?? '')
      : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1] ?? ''}`;
  return frase.charAt(0).toUpperCase() + frase.slice(1);
}

// ── Los pedidos ──────────────────────────────────────────────────────────────

export interface ProximoRepartoDicho {
  readonly llega: string;
  readonly llegaCuando: string;
  readonly pedirEl: string;
  readonly pedirCuando: string;
  readonly pedirAntesDe: string | null;
  readonly siguiente: string;
}

export interface PedidoEnLista {
  readonly id: string;
  readonly numero: number;
  readonly proveedorId: string;
  readonly proveedor: string;
  readonly estado: EstadoDePedido;
  readonly llegaEl: string | null;
  readonly llegaCuando: string | null;
  readonly atrasado: boolean;
  readonly enviadoEn: string | null;
  readonly enviadoPorCanal: Canal | null;
  readonly creadoEn: string;
  readonly quienLoHizo: string | null;
  readonly origen: string;
  readonly lineas: number;
  readonly totalCentimos?: number;
  readonly sinPrecio?: number;
}

export interface MisPedidos {
  readonly pedidos: readonly PedidoEnLista[];
  readonly hayMas: boolean;
  readonly cuantos: Readonly<
    Record<'borradores' | 'enviados' | 'recibidos' | 'cancelados', number>
  >;
  readonly hoy: string;
  readonly puedeVerPrecios: boolean;
  readonly puedeEnviar: boolean;
}

export interface LineaDelPedido {
  readonly id: string;
  readonly productoId: string;
  readonly producto: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly pesoVariable: boolean;
  readonly cantidad: number;
  readonly comoSePide: string;
  readonly nota: string | null;
  readonly hayAhora: number;
  readonly precioCentimos?: number | null;
  readonly importeCentimos?: number | null;
}

export interface UnPedido {
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
    readonly enviadoPorCanal: Canal | null;
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
    readonly whatsapp: string | null;
    readonly correo: string | null;
    readonly comoSePide: Canal | null;
    readonly comoSeLePide: string | null;
  };
  readonly lineas: readonly LineaDelPedido[];
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

export interface LineaSugerida {
  readonly productoId: string;
  readonly producto: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly hayAhora: number;
  readonly sugerencia: {
    readonly formatos: number;
    readonly cuanto: number;
    readonly motivo: string;
  };
  readonly comoSePide: string;
  readonly precioCentimos?: number | null;
  readonly importeCentimos?: number | null;
}

export interface SugerenciaDePedido {
  readonly proveedor: { readonly id: string; readonly nombre: string };
  readonly proximoReparto: ProximoRepartoDicho | null;
  readonly lineas: readonly LineaSugerida[];
  readonly sinNecesidad: number;
  readonly borradorId: string | null;
  readonly totalCentimos?: number;
  readonly minimo?: ComoVaElMinimo | null;
}

export interface ComprasDeHoy {
  readonly hoy: string;
  readonly llegan: readonly {
    readonly pedidoId: string;
    readonly numero: number;
    readonly proveedor: string;
    readonly llegaEl: string;
    readonly llegaCuando: string;
    readonly atrasado: boolean;
    readonly lineas: number;
  }[];
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

/** Lo que devuelve `recibir_albaran`, para contarlo al acabar. */
export interface LoRecibido {
  readonly albaranId: string;
  readonly estadoDelPedido: 'recibido' | 'recibido_con_incidencias' | null;
  readonly lineas: number;
  readonly incidencias: readonly {
    readonly producto: string;
    readonly incidencias: readonly Incidencia[];
  }[];
  readonly precios?: readonly { readonly producto: string; readonly frase: string }[];
  readonly avisos?: readonly string[];
  readonly totalCentimos?: number;
}

// ── Los albaranes y las facturas ─────────────────────────────────────────────

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
  readonly sinValorar?: number;
  readonly facturaNumero?: string | null;
}

export interface MisAlbaranes {
  readonly albaranes: readonly AlbaranEnLista[];
  readonly hayMas: boolean;
  readonly cuantos: Readonly<Record<'sinFactura' | 'conIncidencias' | 'devoluciones', number>>;
  readonly puedeVerPrecios: boolean;
}

export interface LineaDelAlbaran {
  readonly id: string;
  readonly productoId: string;
  readonly producto: string;
  readonly unidadDeUso: string;
  readonly formato: string | null;
  readonly pesoVariable: boolean;
  readonly formatos: number | null;
  readonly cantidad: number;
  readonly pedida: number | null;
  readonly incidencias: readonly Incidencia[];
  readonly nota: string | null;
  readonly lote: string | null;
  readonly caducaEl: string | null;
  readonly importeCentimos?: number | null;
  readonly importeFacturadoCentimos?: number | null;
  readonly costeMilesimas?: number | null;
}

export interface UnAlbaran {
  readonly albaran: AlbaranEnLista & { readonly notas: string | null; readonly recibidoEn: string };
  readonly lineas: readonly LineaDelAlbaran[];
  readonly puedeVerPrecios: boolean;
  readonly puedeDevolver: boolean;
}

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
  readonly estado: EstadoDeFactura;
  readonly diferenciaCentimos: number | null;
  readonly notas: string | null;
  readonly albaranes: number;
  readonly quienLaApunto: string | null;
}

export interface MisFacturas {
  readonly facturas: readonly FacturaEnLista[];
  readonly hayMas: boolean;
  readonly cuantos: Readonly<Record<'sinConciliar' | 'conDiferencia', number>>;
}

export interface AlbaranParaLaFactura {
  readonly id: string;
  readonly tipo: 'entrega' | 'devolucion';
  readonly numero: string | null;
  readonly fecha: string;
  readonly conIncidencias: boolean;
  readonly lineas: readonly LineaDelAlbaran[];
}

export interface UnaFactura {
  readonly factura: FacturaEnLista;
  readonly albaranes: readonly AlbaranParaLaFactura[];
  readonly frase: string | null;
}

export interface ParaConciliar {
  readonly proveedor: {
    readonly id: string;
    readonly nombre: string;
    readonly diasDePago: number | null;
  };
  readonly albaranes: readonly AlbaranParaLaFactura[];
}

export interface LoConciliado {
  readonly facturaId: string;
  readonly estado: EstadoDeFactura;
  readonly diferenciaCentimos: number | null;
  readonly frase: string | null;
  readonly precios: readonly { readonly producto: string; readonly frase: string }[];
}

// ── Los proveedores ──────────────────────────────────────────────────────────

export interface ProveedorEnLista {
  readonly id: string;
  readonly nombre: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly cuantosProductos: number;
  readonly contacto: string | null;
  readonly telefono: string | null;
  readonly diasDeReparto: readonly number[];
  readonly llegaCuando: string | null;
  readonly tocaPedirHoy: boolean;
  readonly pedirAntesDe: string | null;
  readonly pedidosAbiertos: number;
}

export interface MisProveedores {
  readonly proveedores: readonly ProveedorEnLista[];
  readonly puedeVerPrecios: boolean;
}

export interface ProductoQueTeSirve {
  readonly id: string;
  readonly nombre: string;
  readonly formato: string | null;
  readonly unidadDeUso: string;
  readonly hayAhora: number;
  readonly estado: EstadoDeExistencias;
  readonly sugerencia: {
    readonly formatos: number;
    readonly cuanto: number;
    readonly motivo: string;
  } | null;
  readonly precioCentimos?: number | null;
  readonly costePorUnidad?: string | null;
  readonly pactado?: {
    readonly id: string;
    readonly precioCentimos: number;
    readonly hasta: string | null;
  } | null;
}

export interface FichaDelProveedor {
  readonly id: string;
  readonly nombre: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly cif: string | null;
  readonly contacto: string | null;
  readonly telefono: string | null;
  readonly whatsapp: string | null;
  readonly whatsappNumero: string | null;
  readonly correo: string | null;
  readonly web: string | null;
  readonly comoSePide: Canal | null;
  readonly diasDeReparto: readonly number[];
  readonly plazoDeEntrega: number;
  readonly horaLimite: string | null;
  readonly comoSeLePide: string | null;
  readonly formaDePago: FormaDePago | null;
  readonly diasDePago: number | null;
  readonly pedidoMinimoCentimos?: number | null;
  readonly portesCentimos?: number | null;
}

export interface UnProveedor {
  readonly proveedor: FichaDelProveedor;
  readonly proximoReparto: ProximoRepartoDicho | null;
  readonly productos: readonly ProductoQueTeSirve[];
  readonly pedidosAbiertos: readonly {
    readonly id: string;
    readonly numero: number;
    readonly estado: EstadoDePedido;
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

// ── Los precios ──────────────────────────────────────────────────────────────

export interface CompararPrecios {
  readonly comparaciones: readonly {
    readonly productoId: string;
    readonly producto: string;
    readonly unidadDeUso: string;
    readonly precios: readonly {
      readonly proveedorId: string;
      readonly proveedor: string;
      readonly costeMilesimas: number;
      readonly costePorUnidad: string;
      readonly precioCentimos: number;
      readonly formato: string | null;
      readonly desde: string;
    }[];
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
    readonly porEncima: boolean;
  }[];
}

// ── El Calendario ────────────────────────────────────────────────────────────

export interface LoQueViene {
  readonly hoy: string;
  readonly dias: readonly {
    readonly fecha: string;
    readonly cuando: string;
    readonly ocurrencias: readonly {
      readonly id: string;
      readonly capa: 'entrega' | 'caducidad' | 'turno' | 'appcc' | 'mantenimiento' | 'aviso';
      readonly titulo: string;
      readonly detalle: string | null;
      readonly ir: string | null;
      readonly desde: string | null;
      readonly hasta: string | null;
      readonly hecho: boolean;
      readonly repetido: boolean;
    }[];
  }[];
}

/**
 * «mar, 22 sept, 10:15»: cuándo pasó algo, para leerlo.
 *
 * Recibe el instante del servidor y solo le da forma: no mira el reloj del
 * navegador (regla 10), como `cuandoSeAgota`.
 */
export function comoSeLeeElInstante(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** «3 × Caja 10 kg», o «4,2 kg» si va a peso o se apuntó en unidad de uso. */
export function loQueLlego(l: LineaDelAlbaran): string {
  if (l.pesoVariable || l.formatos === null) return conUnidadDeUso(l.cantidad, l.unidadDeUso);
  return `${String(l.formatos).replace('.', ',')} × ${l.formato ?? l.unidadDeUso}`;
}

/** «3 productos», «1 producto». */
export function cuantosProductos(cuantos: number): string {
  return `${cuantos} ${cuantos === 1 ? 'producto' : 'productos'}`;
}

/** Las claves de caché que tocan las compras. Se invalidan juntas al cambiar algo. */
export const LO_QUE_TOCAN_LAS_COMPRAS = [
  ['mis_pedidos'],
  ['un_pedido'],
  ['compras_de_hoy'],
  ['sugerencia_de_pedido'],
  ['mis_albaranes'],
  ['un_albaran'],
  ['mis_facturas'],
  ['una_factura'],
  ['para_conciliar'],
  ['mis_proveedores'],
  ['un_proveedor'],
  ['comparar_precios'],
  ['lo_que_viene'],
  // Lo que cambia en Inventario cuando llega o se devuelve género.
  ['mis_productos'],
  ['un_producto'],
  ['inventario_hoy'],
  ['mis_movimientos'],
] as const;
