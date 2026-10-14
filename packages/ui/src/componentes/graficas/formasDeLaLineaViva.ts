/**
 * Las formas de la línea viva, sin pintar nada (las bases firmes, 0084). Aparte de
 * `LineaViva.tsx` para probarlas sin navegador (`formasDeLaLineaViva.prueba.ts`).
 *
 * El dibujo mide `ANCHO` × `alto` y se estira a lo ancho de la tarjeta
 * (`preserveAspectRatio="none"`), así que **lo redondo no va en el SVG** (un círculo
 * estirado sale ovalado): los puntos y la raya del día señalado se ponen fuera, en
 * tanto por ciento. Por eso cada punto lleva su `x` y su `y` en las dos medidas.
 */
export const ANCHO = 100;
/** Lo que se deja arriba y abajo para que la línea de 2 px no se corte. */
const MARGEN = 3;

export interface PuntoDeLaLinea {
  readonly i: number;
  readonly valor: number;
  /** En unidades del dibujo (0–100) y en tanto por ciento del alto. */
  readonly x: number;
  readonly y: number;
  readonly yEnPorcentaje: number;
}

export interface Barra {
  readonly i: number;
  readonly d: string;
}

export interface FormasDeLaLineaViva {
  /** La línea de ahora, suave y sin pasar por debajo del suelo. Nula sin dos puntos. */
  readonly linea: string | null;
  /** El velo de debajo de la línea. */
  readonly area: string | null;
  /** La línea gris del periodo anterior. */
  readonly anterior: string | null;
  /** Las barras, si es de barras. */
  readonly barras: readonly Barra[];
  /** Cada punto con dato de ahora, para señalarlo. */
  readonly puntos: readonly (PuntoDeLaLinea | null)[];
  /** Dónde cae cada día a lo ancho, en tanto por ciento: es lo que se toca. */
  readonly xDeCadaDia: readonly number[];
}

const c = (n: number) => n.toFixed(2);

/**
 * Una curva monótona por unos puntos (Fritsch–Carlson): suave como la de cualquier
 * gráfica de ahora y **sin pasarse**: entre dos días no sube por encima del más alto
 * ni baja por debajo del más bajo, que una curva cualquiera inventaría un pico que no
 * existe (o una venta negativa).
 */
export function curvaMonotona(puntos: readonly { x: number; y: number }[]): string {
  const n = puntos.length;
  const primero = puntos[0];
  if (primero === undefined) return '';
  if (n === 1) return `M${c(primero.x)},${c(primero.y)}`;

  const dx: number[] = [];
  const pendiente: number[] = [];
  for (let k = 0; k < n - 1; k += 1) {
    const a = puntos[k];
    const b = puntos[k + 1];
    if (a === undefined || b === undefined) continue;
    dx.push(b.x - a.x);
    pendiente.push((b.y - a.y) / (b.x - a.x || 1));
  }

  const tangente: number[] = new Array<number>(n).fill(0);
  tangente[0] = pendiente[0] ?? 0;
  tangente[n - 1] = pendiente[n - 2] ?? 0;
  for (let k = 1; k < n - 1; k += 1) {
    const antes = pendiente[k - 1] ?? 0;
    const despues = pendiente[k] ?? 0;
    tangente[k] = antes * despues <= 0 ? 0 : (antes + despues) / 2;
  }
  for (let k = 0; k < n - 1; k += 1) {
    const m = pendiente[k] ?? 0;
    if (m === 0) {
      tangente[k] = 0;
      tangente[k + 1] = 0;
      continue;
    }
    const a = (tangente[k] ?? 0) / m;
    const b = (tangente[k + 1] ?? 0) / m;
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangente[k] = t * a * m;
      tangente[k + 1] = t * b * m;
    }
  }

  let d = `M${c(primero.x)},${c(primero.y)}`;
  for (let k = 0; k < n - 1; k += 1) {
    const a = puntos[k];
    const b = puntos[k + 1];
    if (a === undefined || b === undefined) continue;
    const tercio = (dx[k] ?? 0) / 3;
    d += ` C${c(a.x + tercio)},${c(a.y + (tangente[k] ?? 0) * tercio)} ${c(b.x - tercio)},${c(b.y - (tangente[k + 1] ?? 0) * tercio)} ${c(b.x)},${c(b.y)}`;
  }
  return d;
}

export function formasDeLaLineaViva(
  valores: readonly (number | null)[],
  anteriores: readonly (number | null)[] | undefined,
  alto: number,
  forma: 'area' | 'barras',
): FormasDeLaLineaViva {
  const n = valores.length;
  const deAntes = (anteriores ?? []).slice(0, n);
  const todos = [...valores, ...deAntes].filter((v): v is number => v !== null);
  const menor = Math.min(0, ...todos);
  const mayor = Math.max(...todos, menor + 1);
  const rango = mayor - menor || 1;
  const yDe = (v: number) => alto - MARGEN - ((v - menor) / rango) * (alto - MARGEN * 2);

  // Las barras van en el centro de su hueco; la línea, de borde a borde.
  const xDe =
    forma === 'barras'
      ? (i: number) => ((i + 0.5) / Math.max(n, 1)) * ANCHO
      : (i: number) => (n <= 1 ? ANCHO / 2 : (i / (n - 1)) * ANCHO);

  const puntos = valores.map((valor, i) =>
    valor === null
      ? null
      : {
          i,
          valor,
          x: xDe(i),
          y: yDe(valor),
          yEnPorcentaje: (yDe(valor) / alto) * 100,
        },
  );
  const conDato = puntos.filter((p): p is PuntoDeLaLinea => p !== null);

  const linea = forma === 'area' && conDato.length >= 2 ? curvaMonotona(conDato) : null;
  const primero = conDato[0];
  const ultimo = conDato.at(-1);
  const area =
    linea === null || primero === undefined || ultimo === undefined
      ? null
      : `${linea} L${c(ultimo.x)},${c(alto)} L${c(primero.x)},${c(alto)} Z`;

  const antesConDato = deAntes.flatMap((v, i) => (v === null ? [] : [{ x: xDe(i), y: yDe(v) }]));
  const anterior = antesConDato.length >= 2 ? curvaMonotona(antesConDato) : null;

  const barras: Barra[] = [];
  if (forma === 'barras') {
    const hueco = ANCHO / Math.max(n, 1);
    const ancho = Math.min(hueco * 0.62, 9);
    const suelo = yDe(Math.max(menor, 0));
    for (const p of conDato) {
      const arriba = Math.min(p.y, suelo - 0.5);
      const izquierda = p.x - ancho / 2;
      const r = Math.min(ancho / 2, 1.6, Math.max(suelo - arriba, 0));
      barras.push({
        i: p.i,
        d: `M${c(izquierda)},${c(suelo)} L${c(izquierda)},${c(arriba + r)} Q${c(izquierda)},${c(arriba)} ${c(izquierda + r)},${c(arriba)} L${c(izquierda + ancho - r)},${c(arriba)} Q${c(izquierda + ancho)},${c(arriba)} ${c(izquierda + ancho)},${c(arriba + r)} L${c(izquierda + ancho)},${c(suelo)} Z`,
      });
    }
  }

  return {
    linea,
    area,
    anterior,
    barras,
    puntos,
    xDeCadaDia: valores.map((_, i) => xDe(i)),
  };
}

/** El día más cerca de donde está el dedo, de 0 a 1 a lo ancho. */
export function elDiaMasCerca(xDeCadaDia: readonly number[], fraccion: number): number | null {
  if (xDeCadaDia.length === 0) return null;
  const x = Math.min(Math.max(fraccion, 0), 1) * ANCHO;
  let mejor = 0;
  let distancia = Number.POSITIVE_INFINITY;
  xDeCadaDia.forEach((xi, i) => {
    const d = Math.abs(xi - x);
    if (d < distancia) {
      distancia = d;
      mejor = i;
    }
  });
  return mejor;
}
