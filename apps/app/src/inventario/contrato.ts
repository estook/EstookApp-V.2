import {
  cantidad,
  centimos,
  conSimbolo,
  conUnidad,
  type Alergeno,
  type Consumo,
  type EstadoDeExistencias,
} from '@estook/dominio';

/**
 * Lo que Inventario recibe del servidor, y cómo se enseña (M6).
 *
 * Los tipos son la copia de lo que devuelven `mis_productos`, `un_producto`,
 * `inventario_hoy` y `mis_proveedores`. Están aquí y no en un paquete compartido
 * por la regla de dependencias: **la aplicación no importa del servidor**, habla
 * con él por `@estook/cliente-api`.
 *
 * Ojo con los campos de dinero: llegan **opcionales a propósito**. Un cocinero
 * no recibe ni uno, porque el servidor no se los envía (Auditoría, parte 8), así
 * que aquí `precioCentimos` no es `number | null`, es `number | undefined`. Que
 * el tipo lo diga es lo que evita pintar un «0,00 €» donde lo correcto es no
 * pintar nada.
 */

export interface ProductoEnLista {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: string | null;
  readonly formato: string | null;
  readonly unidadDeUso: string;
  readonly factor: number;
  readonly rendimiento: number;
  readonly sinVerificar: boolean;
  readonly pesoVariable: boolean;
  readonly esEjemplo: boolean;
  readonly activo: boolean;
  readonly proveedor: string | null;
  readonly codigoDeBarras: string | null;

  readonly cantidad: number;
  readonly minimo: number | null;
  readonly estado: EstadoDeExistencias;

  readonly precioCentimos?: number | null;
  readonly costeMilesimas?: number | null;
  readonly costePorUnidad?: string | null;
  readonly valorCentimos?: number | null;

  readonly consumo: Consumo;
  readonly diasDeCobertura: number | null;
  readonly seAgotaEn: string | null;
  readonly sugerencia: { readonly cuanto: number; readonly motivo: string } | null;
}

export interface CategoriaDelLocal {
  readonly id: string;
  readonly nombre: string;
  readonly cuantos: number;
}

export interface ProveedorDelLocal {
  readonly id: string;
  readonly nombre: string;
}

export interface MisProductos {
  readonly productos: readonly ProductoEnLista[];
  readonly categorias: readonly CategoriaDelLocal[];
  readonly proveedores: readonly ProveedorDelLocal[];
  readonly cuantosHay: number;
  readonly hayMas: boolean;
  readonly puedeVerPrecios: boolean;
  readonly ejemplos: number;
  readonly valorTotalCentimos?: number | null;
}

export interface PrecioEnFicha {
  readonly id: string;
  readonly proveedor: string | null;
  readonly proveedorId: string | null;
  readonly precioCentimos: number;
  readonly costeMilesimas: number;
  readonly costePorUnidad: string;
  readonly formato: string | null;
  readonly desde: string;
  readonly hasta: string | null;
  readonly vigente: boolean;
  readonly origen: string;
}

export interface MovimientoEnFicha {
  readonly id: string;
  readonly tipo: string;
  readonly cantidad: number;
  readonly cantidadDespues: number;
  readonly motivo: string | null;
  readonly fechaOperativa: string;
  readonly ocurrioEn: string;
  readonly quien: string | null;
  readonly lote: string | null;
  readonly costeMilesimas?: number | null;
}

export interface LoteEnFicha {
  readonly id: string;
  readonly codigo: string | null;
  readonly caducaEl: string | null;
  readonly recibidoEl: string;
  readonly diasParaCaducar: number | null;
}

export interface UnProducto {
  readonly producto: ProductoEnLista;
  readonly precios: readonly PrecioEnFicha[];
  readonly movimientos: readonly MovimientoEnFicha[];
  readonly lotes: readonly LoteEnFicha[];
  readonly alergenos: readonly Alergeno[];
  readonly enCuantasFichas: number;
  readonly puedeVerPrecios: boolean;
}

export interface InventarioHoy {
  readonly atencion: readonly ProductoEnLista[];
  readonly caducan: readonly {
    readonly productoId: string;
    readonly producto: string;
    readonly lote: string | null;
    readonly caducaEl: string;
    readonly dias: number;
  }[];
  readonly sinPrecio: readonly { readonly id: string; readonly nombre: string }[];
  readonly cuantosProductos: number;
  readonly ejemplos: number;
  readonly puedeVerPrecios: boolean;
  readonly valorTotalCentimos?: number | null;
}

export interface ProveedorEnLista {
  readonly id: string;
  readonly nombre: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly cuantosProductos: number;
}

export interface MisProveedores {
  readonly proveedores: readonly ProveedorEnLista[];
  readonly puedeVerPrecios: boolean;
}

/** Lo que devuelve el catálogo de referencia de M5, que M6 es el primero en usar. */
export interface ReferenciaDelCatalogo {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly categoria: string;
  readonly formato: string;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly rendimiento: number;
  readonly categoriaFiscal: string;
  readonly alergenos: readonly Alergeno[];
  readonly comoSale: string;
}

export interface CatalogoDeReferencia {
  readonly productos: readonly ReferenciaDelCatalogo[];
  readonly categorias: readonly { readonly nombre: string; readonly cuantos: number }[];
}

// ── Cómo se enseña cada cosa ─────────────────────────────────────────────────

/**
 * Una cantidad con su unidad: «4,2 kg», «800 g».
 *
 * Lo compone `conUnidad` de `@estook/dominio`, que es su dueño desde M2: quita
 * los ceros que sobran y pone la coma decimal española. Aquí solo se le da forma
 * a la cantidad, que llega del servidor con cuatro decimales.
 */
export function conUnidadDeUso(cuanto: number, unidad: string): string {
  return conUnidad(cantidad(cuanto), unidad);
}

/** Un importe en céntimos, o una raya cuando no se puede ver. */
export function comoDinero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return conSimbolo(centimos(Math.trunc(valor)));
}

/**
 * «Se agota el viernes a las 20:30», que es la frase del Manifiesto.
 *
 * ── Por qué recibe los días y no los cuenta ──────────────────────────────────
 *
 * Porque contarlos aquí obligaría a mirar el reloj del navegador, y **la fecha
 * la decide el servidor** (regla 10). No es una formalidad: el navegador de una
 * tablet puede estar en otra zona horaria, y a las dos de la mañana de un sábado
 * «hoy» no significa lo mismo para el reloj que para la jornada de un bar que
 * cierra a las cinco.
 *
 * Así que el servidor manda el instante y los días de cobertura, y aquí solo se
 * escribe la frase. Lo cazó la regla de lint de M0, que prohíbe `new Date()` en
 * el navegador, y tenía razón.
 */
export function cuandoSeAgota(iso: string | null, diasDeCobertura: number | null): string | null {
  if (iso === null) return null;

  const cuando = new Date(iso);
  const hora = cuando.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dias = diasDeCobertura === null ? 0 : Math.floor(diasDeCobertura);

  if (dias <= 0) return `hoy a las ${hora}`;
  if (dias === 1) return `mañana a las ${hora}`;
  if (dias < 7) {
    const dia = cuando.toLocaleDateString('es-ES', { weekday: 'long' });
    return `el ${dia} a las ${hora}`;
  }

  return `el ${cuando.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;
}

/** El tono de la etiqueta de estado. Color **y** palabra, nunca solo color (B8). */
export const TONO_DEL_ESTADO: Readonly<
  Record<EstadoDeExistencias, 'bien' | 'atencion' | 'mal' | 'neutro'>
> = {
  negativo: 'mal',
  agotado: 'mal',
  bajo_minimo: 'atencion',
  bien: 'bien',
  sin_minimo: 'neutro',
};

/** Cómo se llama cada tipo de movimiento en pantalla. Sin jerga (principio 14). */
export const COMO_SE_LLAMA_EL_MOVIMIENTO: Readonly<Record<string, string>> = {
  entrada: 'Ha entrado',
  salida: 'Ha salido',
  ajuste: 'Ajuste de cámara',
  merma: 'Merma',
  consumo: 'Consumido al vender',
  recuento: 'Recuento',
};
