/**
 * **Lo que se escribe en euros, en céntimos** (0144): «1.284,60», «1284.60», «50» o «50,5». Nulo si no
 * es un importe. Se perdona el punto de los miles y la coma o el punto de los céntimos.
 */
export function deEurosACentimos(texto: string): number | null {
  const limpio = texto.trim().replace(/\s|€/g, '');
  if (limpio === '') return null;
  // «1.284,60»: el punto es de los miles. «1284.60»: el punto es de los céntimos.
  const conComa = limpio.includes(',');
  const sinMiles = conComa ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  if (!/^\d+(\.\d{1,2})?$/.test(sinMiles)) return null;
  return Math.round(Number(sinMiles) * 100);
}

/** «1284,60», como se escribe en una casilla para cambiarlo. */
export function enLaCasilla(centimos: number): string {
  return (centimos / 100).toFixed(2).replace('.', ',');
}
