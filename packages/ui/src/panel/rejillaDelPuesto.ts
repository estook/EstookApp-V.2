import type { Fijo, FormaDelFijo } from './catalogo.ts';

/**
 * **Cómo se colocan los fijos de cada puesto** (el rediseño, entrega 3 · 0148).
 *
 * La maqueta está dibujada para el PC, en doce columnas. Richi, 21-nov: «en móvil y tablet la
 * experiencia tiene que ser excelente, no una simple adaptación del escritorio», en vertical y en
 * horizontal. Así que cada forma tiene su ancho en cada modo, y **la rejilla nunca deja huecos**:
 * si una fila no se llena (tres listas en una tablet en vertical, de dos en dos), lo que queda se
 * reparte entre las de esa fila. El orden no cambia nunca: lo primero de un puesto es lo primero
 * en todas las pantallas.
 *
 * El modo sale del ancho del Panel, no de la pantalla: con el menú lateral abierto, el Panel de un
 * portátil es más estrecho que la pantalla.
 */
export type ModoDelPanel = 'pc' | 'tablet' | 'tablet-vertical' | 'movil';

/** El modo para un ancho del Panel, en rem (16 px). */
export function elModoDelAncho(anchoEnRem: number): ModoDelPanel {
  if (anchoEnRem >= 68) return 'pc';
  if (anchoEnRem >= 50) return 'tablet';
  if (anchoEnRem >= 34) return 'tablet-vertical';
  return 'movil';
}

/** Las columnas de doce que ocupa cada forma en cada modo. */
const ANCHO: Readonly<Record<FormaDelFijo, Readonly<Record<ModoDelPanel, number>>>> = {
  // Las cifras, de cuatro en cuatro en el PC y la tablet; de dos en dos en vertical y en el móvil.
  cifra: { pc: 3, tablet: 3, 'tablet-vertical': 6, movil: 6 },
  // La gráfica y lo de su lado, juntas hasta la tablet; a lo ancho en vertical.
  grafica: { pc: 7, tablet: 7, 'tablet-vertical': 12, movil: 12 },
  lado: { pc: 5, tablet: 5, 'tablet-vertical': 12, movil: 12 },
  // Las listas, de tres en tres; de dos en dos en vertical; una en el móvil.
  tercio: { pc: 4, tablet: 4, 'tablet-vertical': 6, movil: 12 },
  'dos-tercios': { pc: 8, tablet: 8, 'tablet-vertical': 12, movil: 12 },
  // Los cuartos, de cuatro en cuatro solo en el PC: en la tablet, un medidor en un cuarto no se lee.
  cuarto: { pc: 3, tablet: 6, 'tablet-vertical': 6, movil: 12 },
  fila: { pc: 12, tablet: 12, 'tablet-vertical': 12, movil: 12 },
};

export function anchoDeLaForma(forma: FormaDelFijo, modo: ModoDelPanel): number {
  return ANCHO[forma][modo];
}

export interface FijoColocado {
  readonly fijo: Fijo;
  /** De doce. */
  readonly columnas: number;
}

/**
 * Los fijos en filas de doce, en su orden. Lo que sobra de una fila se reparte entre los suyos,
 * de izquierda a derecha, para que ninguna fila quede con un hueco.
 */
export function colocarLosFijos(
  fijos: readonly Fijo[],
  modo: ModoDelPanel,
): readonly FijoColocado[] {
  const colocados: FijoColocado[] = [];
  let fila: { fijo: Fijo; columnas: number }[] = [];
  let libre = 12;
  const cerrarLaFila = () => {
    if (fila.length === 0) return;
    const reparto = Math.floor(libre / fila.length);
    let resto = libre - reparto * fila.length;
    for (const f of fila) {
      f.columnas += reparto + (resto > 0 ? 1 : 0);
      if (resto > 0) resto -= 1;
    }
    colocados.push(...fila);
    fila = [];
    libre = 12;
  };
  for (const fijo of fijos) {
    const ancho = anchoDeLaForma(fijo.forma, modo);
    if (ancho > libre) cerrarLaFila();
    fila.push({ fijo, columnas: ancho });
    libre -= ancho;
  }
  cerrarLaFila();
  return colocados;
}
