import type { CifrasDeUnVendedor } from '@estook/dominio';
import type { ClienteEnLista } from './clientes.ts';

/**
 * Lo que la API del admin dice de los vendedores (A3 · 0076). Las formas son las de
 * `servidor/aplicacion/consultas/vendedores.ts`.
 */

export interface CodigoDeUnVendedor {
  readonly id: string;
  readonly codigo: string;
  readonly campana: string | null;
  readonly descuento: number;
  readonly creadoEn: string;
  readonly cerradoEn: string | null;
  readonly enlace: string;
  readonly traidos: number;
  /** Cuántas veces se ha abierto su enlace o su QR (A4 · 0077). */
  readonly visitas: number;
}

export interface VendedorEnLista {
  readonly id: string;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly notas: string | null;
  readonly altaEn: string;
  readonly bajaEn: string | null;
  readonly codigos: readonly CodigoDeUnVendedor[];
  readonly cifras: CifrasDeUnVendedor;
}

export interface LosVendedores {
  readonly vendedores: readonly VendedorEnLista[];
  readonly sinVendedor: number;
}

export interface FichaDeVendedor {
  readonly vendedor: VendedorEnLista;
  readonly clientes: readonly ClienteEnLista[];
}

/** «1 cliente», «5 clientes». */
export function clientes(n: number): string {
  return n === 1 ? '1 cliente' : `${String(n)} clientes`;
}

/** «12 días», «3 meses», «1 año»: cuánto llevan de media. */
export function cuantoTiempo(dias: number | null): string {
  if (dias === null) return '—';
  if (dias < 60) return dias === 1 ? '1 día' : `${String(dias)} días`;
  // Meses y años cumplidos: «2 meses» hasta que se cumple el tercero.
  const meses = Math.trunc(dias / 30);
  if (meses < 24) return `${String(meses)} meses`;
  const anos = Math.trunc(dias / 365);
  return anos === 1 ? '1 año' : `${String(anos)} años`;
}
