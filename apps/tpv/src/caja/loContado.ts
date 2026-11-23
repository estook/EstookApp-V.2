import { elTotalContado } from '@estook/dominio';
import { deEurosACentimos } from './dinero.ts';
import type { ElRecuento } from './tipos.ts';

/**
 * **Lo contado**: billete a billete, o escribiendo el total (E6, decisión 0152) si el local lo deja.
 * Sigue a ciegas: escribir el total no enseña lo que debería haber.
 */
export type LoContado =
  | { readonly modo: 'billetes'; readonly recuento: ElRecuento }
  | { readonly modo: 'total'; readonly texto: string };

export const SIN_CONTAR: LoContado = { modo: 'billetes', recuento: {} };

/** Lo que suma, o nulo si lo escrito no es un importe. */
export function elTotalDe(contado: LoContado): number | null {
  return contado.modo === 'billetes'
    ? elTotalContado(contado.recuento)
    : deEurosACentimos(contado.texto);
}

/** Lo que se manda a la API: `contado` billete a billete, o `contado_total`. */
export function loContadoParaLaApi(
  contado: LoContado,
): { readonly contado: ElRecuento } | { readonly contado_total: number } {
  return contado.modo === 'billetes'
    ? { contado: contado.recuento }
    : { contado_total: elTotalDe(contado) ?? 0 };
}
