/**
 * El local en Google · los topes (M7, entrega 5 · decisiones 0030 y 0040).
 *
 * «La API que cuesta dinero, la de Places, hay que acotarla bien.» Richi puso la
 * cifra: **cuarenta al mes por local**. Aquí vive, con lo que cuenta cada cosa,
 * porque la usan el servidor —que corta— y Ajustes —que dice cuántas quedan—.
 *
 * ── Qué se cuenta, y por qué dos contadores ──────────────────────────────────
 *
 * Buscar el local es escribir su nombre y ver sugerencias: **cada letra es una
 * petición**. Google las agrupa en una sesión que se cobra al elegir un resultado
 * y pedir su ficha, así que lo que cuesta dinero de verdad son **las fichas**. Las
 * búsquedas llevan su propio tope, más alto, para que un error —una pantalla que
 * buscara sin parar— no se convierta en una factura.
 */

export const TOPES_DE_GOOGLE = {
  /** Fichas pedidas a Google al mes por local: elegir el local o actualizarlo. */
  fichasAlMes: 40,
  /** Peticiones de búsqueda al mes por local. Diez búsquedas por ficha. */
  busquedasAlMes: 400,
} as const;

export type UsoDeGoogle = 'busqueda' | 'ficha';

/** El tope de cada cosa. */
export function topeDeGoogle(que: UsoDeGoogle): number {
  return que === 'ficha' ? TOPES_DE_GOOGLE.fichasAlMes : TOPES_DE_GOOGLE.busquedasAlMes;
}

/** Cuántas quedan este mes, nunca menos de cero. */
export function quedanDeGoogle(que: UsoDeGoogle, usadas: number): number {
  return Math.max(0, topeDeGoogle(que) - usadas);
}

/**
 * El mes de una fecha operativa, como su día uno: `2026-09-16` → `2026-09-01`.
 *
 * El contador es mensual como la factura de Google, y se guarda por el día uno
 * para que una fila sea un mes sin tener que partir fechas en la consulta.
 */
export function mesDe(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}

/** Lo mínimo que hay que escribir para buscar: con menos, salen mil sitios. */
export const LETRAS_PARA_BUSCAR = 3;
