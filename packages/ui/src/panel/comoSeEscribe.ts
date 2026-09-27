import { laCifraEscrita, type Indicador } from '@estook/dominio';

/**
 * Cómo se escribe una cifra de cada unidad. `dias` es el largo del periodo.
 *
 * La cuenta es del dominio (`laCifraEscrita`) desde R2: los informes escriben las
 * mismas cifras en sus frases y en el correo, y dos dueños acabarían escribiendo
 * «4.210 €» en un sitio y «4210,00 €» en otro (regla 6).
 */
export function comoSeEscribe(indicador: Indicador, valor: number, dias?: number): string {
  return laCifraEscrita(indicador, valor, dias);
}
