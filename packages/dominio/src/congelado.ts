import { plural } from './textos.ts';

/**
 * Lo congelado va aparte (repaso del 25-sep · decisión 0049).
 *
 * «Si congelas una parte, esa parte se separa del producto normal por el tema de
 * la caducidad: no te puede avisar de que está caducado, sino que ese producto
 * congelado te avisa cuando lleva mucho tiempo.» (Richi)
 *
 * Así que lo congelado **no avisa por su fecha de caducidad**, que era la de cuando
 * estaba fresco: avisa por lo que lleva en el congelador contra lo que aguanta
 * congelado ese producto —tres meses si nadie lo cambia, que es lo habitual en el
 * APPCC de hostelería para lo que congela el propio local—.
 *
 * El día que se cumple lo cuenta la base (`congelado_el + meses`, como Postgres
 * suma meses: del 30 de noviembre, tres meses después es el 28 de febrero), y aquí
 * se decide **qué se dice** y **cuándo empieza a avisar**, para que el Calendario,
 * «Hoy» y el Almacén digan lo mismo.
 */

/** Lo que aguanta congelado un producto si nadie lo ha cambiado. */
export const MESES_CONGELADO_DE_FABRICA = 3;

/** Lo que se puede poner: de un mes a dos años. */
export const MESES_CONGELADO_MINIMO = 1;
export const MESES_CONGELADO_MAXIMO = 24;

/** Cuántos días antes de cumplirse empieza a avisar: una semana, para gastarlo. */
export const AVISO_DE_LO_CONGELADO_EN_DIAS = 7;

/** «El bacon cumple 3 meses congelado»: el aviso del Calendario. */
export function tituloDeLoCongelado(producto: string, meses: number): string {
  return `${producto} cumple ${plural(meses, 'mes', 'meses')} congelado`;
}

/**
 * Cómo está un lote congelado según los días que le faltan para cumplir lo que
 * aguanta: `null` si todavía no hay que decir nada.
 */
export function comoEstaLoCongelado(diasQueFaltan: number): 'se_ha_pasado' | 'pronto' | null {
  if (diasQueFaltan <= 0) return 'se_ha_pasado';
  if (diasQueFaltan <= AVISO_DE_LO_CONGELADO_EN_DIAS) return 'pronto';
  return null;
}

// ── Sacarlo del congelador (repaso del 10-oct) ───────────────────────────────
//
// «Al sacar algo del congelador, solo dos opciones: "Descongelar" (vuelve a fresco con
// una caducidad corta propuesta, uno o dos días, que se puede cambiar) o "Tirar" (se
// apunta como merma).» (Richi) Lo descongelado se gasta pronto y no se vuelve a
// congelar: de ahí que la fecha que se propone sea mañana, y que no pase de una semana.

/** Lo que se propone al descongelar: gastarlo mañana como tarde. */
export const DIAS_PARA_GASTAR_LO_DESCONGELADO = 1;

/** Lo más lejos que se deja poner: una semana. */
export const DIAS_COMO_MUCHO_DESCONGELADO = 7;

/** Si la caducidad que se pone al descongelar vale: de hoy a una semana. */
export function sePuedeDescongelarHasta(hoy: string, caducaEl: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(caducaEl)) return false;
  // Días enteros entre dos fechas en UTC: la resta es exacta, no hay nada que redondear.
  const dias = Math.trunc(
    (Date.parse(`${caducaEl}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86_400_000,
  );
  return dias >= 0 && dias <= DIAS_COMO_MUCHO_DESCONGELADO;
}
