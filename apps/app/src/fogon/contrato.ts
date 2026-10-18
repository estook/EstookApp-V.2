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
