/**
 * Lo que contesta la API de Fogón (Fogón 1 · 1, decisión 0097). Copia de los tipos del
 * servidor: el cliente no importa el servidor (A4).
 */

export interface LoQueQueda {
  readonly hoy: number;
  readonly mes: number;
  readonly delMes: number;
}

export type FogonYYo =
  | {
      readonly habla: true;
      readonly queda: LoQueQueda;
      readonly casiSinCreditos: boolean;
      readonly puedeRellenar: boolean;
      readonly puedeRevisar: boolean;
    }
  | { readonly habla: false; readonly porque: string };

export interface RespuestaDeFogon {
  readonly respuesta: string;
  readonly queda: LoQueQueda;
}

export interface BorradorDelEscandallo {
  readonly raciones: number;
  readonly lineas: readonly {
    readonly ingrediente: string;
    readonly cantidad: number;
    readonly unidad: 'g' | 'ml' | 'ud' | 'kg' | 'l';
  }[];
  readonly queda: LoQueQueda;
}

export interface BorradorDeLosPasos {
  readonly pasos: readonly string[];
  readonly minutos: number | null;
  readonly queda: LoQueQueda;
}

/** «2 créditos» / «1 crédito». */
export function creditos(n: number): string {
  return `${String(n)} ${n === 1 ? 'crédito' : 'créditos'}`;
}

/** Dónde estás, como lo entiende la API: «almacen/compras». */
export function dondeEstas(pathname: string): string {
  return pathname
    .replace(/^\/+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9/-]/g, '-')
    .slice(0, 80);
}

// ── Fogón 1 · 2 · Lo que lee (0098) ──────────────────────────────────────────

export interface ProductoLeido {
  readonly id: string;
  readonly nombre: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly pesoVariable: boolean;
}

export interface LineaLeidaDelAlbaran {
  readonly texto: string;
  readonly producto: ProductoLeido | null;
  readonly formatos: number | null;
  readonly cantidad: number | null;
  readonly precioCentimos?: number | null;
  readonly importeCentimos?: number | null;
  readonly lote: string | null;
  readonly caducaEl: string | null;
}

export interface AlbaranLeido {
  readonly numero: string | null;
  readonly fecha: string | null;
  readonly otroProveedor: string | null;
  readonly lineas: readonly LineaLeidaDelAlbaran[];
  readonly queda: LoQueQueda;
}

export interface CierreLeido {
  readonly fecha: string | null;
  readonly totalCentimos: number | null;
  readonly efectivoCentimos: number | null;
  readonly tarjetaCentimos: number | null;
  readonly otrosCentimos: number | null;
  readonly tickets: number | null;
  readonly comensales: number | null;
  readonly lineas: readonly {
    readonly concepto: string;
    readonly unidades: number;
    readonly importeCentimos: number | null;
  }[];
  readonly queda: LoQueQueda;
}

export interface MermaLeida {
  readonly texto: string;
  readonly producto: {
    readonly id: string;
    readonly nombre: string;
    readonly unidadDeUso: string;
  } | null;
  readonly cuanto: number | null;
  readonly motivo:
    | 'caducado'
    | 'mal_estado'
    | 'roto'
    | 'fallo_de_elaboracion'
    | 'comida_de_personal'
    | 'invitacion'
    | 'prueba_de_carta'
    | 'otro';
  readonly detalle: string | null;
}

export interface MermasLeidas {
  readonly mermas: readonly MermaLeida[];
  readonly queda: LoQueQueda;
}

// ── Fogón 1 · 3 · Lo que revisa y prepara (0098) ─────────────────────────────

export interface CambioDelPedido {
  readonly productoId: string;
  readonly producto: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly hayAhora: number;
  readonly antes: number;
  readonly ahora: number;
  readonly porque: string;
}

export interface PedidoAjustado {
  readonly cambios: readonly CambioDelPedido[];
  readonly resumen: string;
  readonly queda: LoQueQueda;
}

export interface LoQueSabeDelCuadrante {
  readonly lunes: string;
  readonly semanaVacia: boolean;
  readonly personas: readonly {
    readonly personaId: string;
    readonly nombre: string;
    readonly zona: 'sala' | 'cocina' | 'otros';
    readonly horasDeContrato: number | null;
  }[];
  readonly diasFuertes: readonly string[];
  readonly segunTusVentas: boolean;
  readonly turnos: string;
}

export interface TramoPropuesto {
  readonly personaId: string;
  readonly nombre: string;
  readonly dia: string;
  readonly entra: string;
  readonly sale: string;
  readonly descansoMinutos: number;
}

export interface CuadranteDeFogon {
  readonly tramos: readonly TramoPropuesto[];
  readonly horas: readonly {
    readonly personaId: string;
    readonly nombre: string;
    readonly minutos: number;
    readonly horasDeContrato: number | null;
  }[];
  readonly explicacion: string;
  readonly queda: LoQueQueda;
}

export interface Hallazgo {
  readonly que: 'repetido' | 'paso_raro' | 'sin_escandallo' | 'plato_sin_precio' | 'sin_precio';
  readonly texto: string;
  readonly ir: string;
}

export interface RevisionDeFogon {
  readonly hechaEn: string;
  readonly deNoche: boolean;
  readonly hallazgos: readonly Hallazgo[];
  readonly soloReglas: boolean;
}

export interface RespuestaALaResena {
  readonly respuesta: string;
  readonly queda: LoQueQueda;
}
