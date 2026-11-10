import { centimos, enEuros } from '@estook/dominio';
import { aCentimos } from '@estook/ui';

/**
 * **Lo que se escribe en euros, en céntimos** (0144): «1.284,60», «1284.60», «50» o «50,5», con el
 * convertidor de siempre (`aCentimos`, sin coma flotante). Nulo si no es un importe o es negativo.
 */
export function deEurosACentimos(texto: string): number | null {
  const c = aCentimos(texto);
  return c === null || c < 0 ? null : c;
}

/** «1.284,60», como se escribe en una casilla para cambiarlo: se vuelve a leer igual. */
export function enLaCasilla(cantidad: number): string {
  return enEuros(centimos(cantidad));
}
