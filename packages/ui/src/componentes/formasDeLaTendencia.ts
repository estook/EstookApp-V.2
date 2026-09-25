/**
 * Las formas de una tendencia, sin pintar nada: qué tramos van enteros, cuáles se
 * cruzan por un hueco y dónde va cada punto. Aparte de `Tendencia.tsx` para poder
 * probarlo sin navegador (`formasDeLaTendencia.prueba.ts`).
 *
 * El dibujo mide `ANCHO` de ancho y `alto` de alto, y se estira a lo ancho de la
 * tarjeta (`preserveAspectRatio="none"`). Por eso **los puntos no van en el SVG**:
 * un círculo estirado sale como una raya. Van fuera, en tanto por ciento del ancho.
 */
export const ANCHO = 100;
const MARGEN = 3;

export interface PuntoDeLaTendencia {
  readonly i: number;
  readonly v: number;
  /** En unidades del dibujo: de 0 a `ANCHO`. */
  readonly x: number;
  readonly y: number;
}

export interface FormasDeLaTendencia {
  /** Los días seguidos con dato, cada uno su trazo entero. */
  readonly tramos: readonly string[];
  /** Los huecos: del último día con dato al siguiente, en trazo discontinuo. */
  readonly puentes: readonly string[];
  /** El área de debajo, de lado a lado de lo que tiene dato. */
  readonly area: string | null;
  /** Los que se marcan con un punto: los sueltos y el último. */
  readonly puntos: readonly PuntoDeLaTendencia[];
  readonly mayor: number;
}

const coordenada = (p: PuntoDeLaTendencia) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;

export function formasDeLaTendencia(
  valores: readonly (number | null)[],
  alto: number,
): FormasDeLaTendencia | null {
  const conDato = valores.filter((v): v is number => v !== null);
  if (valores.length < 2 || conDato.length === 0) return null;

  const menor = Math.min(...conDato, 0);
  const mayor = Math.max(...conDato);
  const rango = mayor - menor || 1;
  const x = (i: number) => (i / (valores.length - 1)) * ANCHO;
  const y = (v: number) => alto - MARGEN - ((v - menor) / rango) * (alto - MARGEN * 2);

  const puntos: PuntoDeLaTendencia[] = [];
  valores.forEach((v, i) => {
    if (v !== null) puntos.push({ i, v, x: x(i), y: y(v) });
  });

  // Tramos de días seguidos.
  const grupos: PuntoDeLaTendencia[][] = [];
  for (const p of puntos) {
    const ultimo = grupos.at(-1)?.at(-1);
    if (ultimo !== undefined && p.i === ultimo.i + 1) grupos.at(-1)?.push(p);
    else grupos.push([p]);
  }

  const tramos = grupos
    .filter((g) => g.length > 1)
    .map((g) => g.map((p, k) => `${k === 0 ? 'M' : 'L'}${coordenada(p)}`).join(' '));

  const puentes: string[] = [];
  for (let k = 1; k < grupos.length; k += 1) {
    const desde = grupos[k - 1]?.at(-1);
    const hasta = grupos[k]?.[0];
    if (desde !== undefined && hasta !== undefined) {
      puentes.push(`M${coordenada(desde)} L${coordenada(hasta)}`);
    }
  }

  const primero = puntos[0];
  const ultimo = puntos.at(-1);
  const area =
    primero === undefined || ultimo === undefined || puntos.length < 2
      ? null
      : `${puntos.map((p, k) => `${k === 0 ? 'M' : 'L'}${coordenada(p)}`).join(' ')} L${ultimo.x.toFixed(2)},${alto} L${primero.x.toFixed(2)},${alto} Z`;

  const sueltos = grupos.filter((g) => g.length === 1).flat();
  const marcados =
    ultimo === undefined || sueltos.includes(ultimo) ? sueltos : [...sueltos, ultimo];

  return { tramos, puentes, area, puntos: marcados, mayor };
}
