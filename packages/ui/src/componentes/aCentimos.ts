import { centimos, type Centimos } from '@estook/dominio';

/**
 * De lo que se teclea a centimos.
 *
 * Se hace con cadenas hasta el ultimo paso para no pasar por coma flotante: se
 * parte por la coma, se rellenan los decimales a dos y se junta. `'12,3'` da
 * 1230, no 1229,9999.
 *
 * ── El punto es ambiguo, y hay que resolverlo ────────────────────────────────
 *
 * En Espana el punto separa los miles y la coma los decimales: `10.000,50`. Pero
 * en un teclado numerico de movil muchas veces solo hay punto, y quien escribe
 * `12.30` quiere decir doce euros con treinta. Las dos cosas tienen que
 * funcionar, asi que se decide mirando el numero entero:
 *
 *   · Si hay coma, **la coma manda**: los puntos son miles y se tiran.
 *   · Si no hay coma, un punto con uno o dos digitos detras es decimal
 *     (`12.3`, `12.30`); con tres, es de miles (`10.000`).
 *
 * Sin esto, un campo que ensena `10.000,00` no se podria volver a leer, y editar
 * un precio de mas de mil euros lo dejaria vacio. Lo caza la prueba de ida y
 * vuelta.
 */
export function aCentimos(escrito: string): Centimos | null {
  let limpio = escrito.replace(/[\s€]/g, '');
  if (limpio === '' || limpio === '-') return null;

  if (limpio.includes(',')) {
    // La coma manda: fuera los puntos de miles.
    limpio = limpio.replace(/\./g, '');
  } else {
    // Sin coma: un punto seguido de tres digitos es separador de miles.
    limpio = limpio.replace(/\.(?=\d{3}(\D|$))/g, '');
    limpio = limpio.replace('.', ',');
  }

  if (!/^-?\d*,?\d{0,2}$/.test(limpio)) return null;

  const negativo = limpio.startsWith('-');
  const [entera = '0', decimal = ''] = limpio.replace('-', '').split(',');
  const juntos = `${entera === '' ? '0' : entera}${decimal.padEnd(2, '0')}`;

  const valor = Number.parseInt(juntos, 10);
  if (Number.isNaN(valor)) return null;
  return centimos(negativo ? -valor : valor);
}
