import type { Causa } from '@estook/dominio';

/**
 * Lo que devuelven `la_desviacion` y `el_food_cost_real` (M8 · decisión 0079), tal
 * cual. Los importes solo llegan a quien ve precios de compra, y lo vendido, a quien
 * ve las ventas: por eso van opcionales.
 */

export interface ProductoGastado {
  readonly id: string;
  readonly nombre: string;
  readonly zona: string;
  readonly unidadDeUso: string;
  readonly desde: string;
  readonly hasta: string;
  readonly habia: number;
  readonly entro: number;
  readonly queda: number;
  readonly gastado: number;
  readonly apuntado: number;
  readonly gastadoCentimos?: number | null;
  readonly talCual: {
    readonly conceptos: readonly string[];
    readonly ventasDesde: string;
    readonly ventasHasta: string;
    readonly vendido: number;
    readonly diasSinCaja: number;
    readonly desviacion: number;
    readonly desviacionCentimos?: number | null;
    readonly causa: { readonly causa: Causa; readonly porque: string } | null;
  } | null;
  readonly seLeParecen: readonly string[];
}

export interface LineaPorEmparejar {
  readonly concepto: string;
  readonly unidades: number;
  readonly dias: number;
  readonly propuesto: { readonly id: string; readonly nombre: string } | null;
}

export interface Emparejado {
  readonly concepto: string;
  readonly productoId: string | null;
  readonly producto: string | null;
  readonly porVenta: number;
  readonly unidadDeUso: string | null;
}

export interface LaDesviacion {
  readonly hoy: string;
  readonly puedeVerPrecios: boolean;
  readonly puedeVerVentas: boolean;
  readonly productos: readonly ProductoGastado[];
  readonly contadosUnaVez: number;
  readonly porEmparejar: readonly LineaPorEmparejar[];
  readonly emparejados: readonly Emparejado[];
}

export interface ElFoodCostReal {
  readonly periodo: 'inventarios' | 'mes';
  readonly desde: string;
  readonly hasta: string;
  readonly hoy: string;
  readonly inventarios: { readonly desde: string; readonly hasta: string } | null;
  readonly habiaCentimos: number;
  readonly comprasCentimos: number;
  readonly quedaCentimos: number;
  readonly traspasosCentimos: number;
  readonly aparteCentimos: number;
  readonly consumoRealCentimos: number;
  readonly ventasConImpuestoCentimos: number;
  readonly ventasSinImpuestoCentimos: number | null;
  readonly tipoDeImpuesto: number | null;
  readonly real: number | null;
  readonly objetivo: number | null;
  readonly semaforo: 'verde' | 'ambar' | 'rojo' | 'sin_dato';
  readonly diasDelPeriodo: number;
  readonly faltanDiasDeCaja: number;
  readonly exacto: boolean;
  readonly contados: number;
  readonly productos: number;
  readonly parteContada: number | null;
  readonly soloSusZonas: boolean;
}

/** Dónde se comprueba cada causa: «con el enlace a comprobarlo» (hallazgo 4). */
export const DONDE_SE_MIRA: Readonly<Record<Causa, string>> = {
  unidad_de_conteo: '/almacen/movimientos/inventario',
  faltan_dias_de_caja: '/servicio/jornada/cierre',
  otro_nombre_en_la_caja: '#por-emparejar',
  recepcion: '/almacen/compras/albaranes',
  entrada_sin_apuntar: '/almacen/compras/albaranes',
  sin_apuntar: '/almacen/mermas',
};

/** «1 oct», de un instante o de una fecha operativa. */
export function diaCorto(cuando: string): string {
  const fecha = cuando.length === 10 ? new Date(`${cuando}T12:00:00Z`) : new Date(cuando);
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
}
