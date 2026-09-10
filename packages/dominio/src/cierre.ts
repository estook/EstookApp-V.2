import { centimos, type Centimos } from './dinero.ts';

/**
 * El cierre de caja (M6½) · con TPV o sin él.
 *
 * ── Los dos caminos, y por qué acaban en el mismo sitio ─────────────────────
 *
 * Estook sabe lo que **cuesta** el género y no sabía lo que **entra**. La
 * respuesta escrita hasta hoy era «conecta tu TPV», y eso deja fuera a media
 * hostelería: un bar con una caja de veinte años y un papel de Z al final del día
 * no tiene nada que conectar, y no por eso deja de necesitar su margen.
 *
 * Así que son dos: **a mano** —tecleado, de un CSV o de una foto del Z— o
 * **conectando el TPV**. Se elige una vez, se cambia en Ajustes, y por debajo las
 * dos escriben la misma fila. Cuando M20 traiga la conexión, lo que llegue del TPV
 * se guarda igual con `origen = 'tpv'` y ni una gráfica se entera.
 */

export const COMO_SE_CIERRA = ['sin_decidir', 'a_mano', 'tpv'] as const;

export type ComoSeCierra = (typeof COMO_SE_CIERRA)[number];

export const NOMBRE_DE_COMO_SE_CIERRA: Readonly<Record<ComoSeCierra, string>> = {
  sin_decidir: 'Todavía sin elegir',
  a_mano: 'Lo apunto yo',
  tpv: 'Lo trae mi TPV',
};

export const QUE_ES_CADA_FORMA_DE_CERRAR: Readonly<Record<ComoSeCierra, string>> = {
  sin_decidir: 'Elige cómo quieres que entren tus ventas. Se puede cambiar cuando quieras.',
  a_mano:
    'Al cerrar escribes lo que has hecho y qué ha salido. También vale subir el CSV del TPV o una foto del Z.',
  tpv: 'Estook se conecta a tu programa de caja y las ventas entran solas cada noche.',
};

export const ORIGENES_DEL_CIERRE = ['a_mano', 'csv', 'foto', 'tpv'] as const;

export type OrigenDelCierre = (typeof ORIGENES_DEL_CIERRE)[number];

export const NOMBRE_DEL_ORIGEN_DEL_CIERRE: Readonly<Record<OrigenDelCierre, string>> = {
  a_mano: 'Escrito a mano',
  csv: 'De un fichero',
  foto: 'De una foto del Z',
  tpv: 'Del TPV',
};

export interface LineaDeCierre {
  readonly concepto: string;
  readonly unidades: number;
  readonly importeCentimos: number | null;
}

/**
 * Lo que se ha gastado cada mesa, de media.
 *
 * Nulo sin comensales o sin tickets, y **eso no es cero**: un ticket medio de cero
 * euros es una cifra falsa en la tipografía más grande de la pantalla, que es
 * justo lo que el Manifiesto prohíbe.
 */
export function ticketMedio(totalCentimos: number, cuantos: number | null): Centimos | null {
  if (cuantos === null || cuantos <= 0) return null;
  return centimos(Math.round(totalCentimos / cuantos));
}

/**
 * Lo que le falta o le sobra al desglose para llegar al total.
 *
 * ── Y por qué esto no bloquea nada ──────────────────────────────────────────
 *
 * Porque en un bar de verdad no cuadra al céntimo casi nunca: propinas, un cambio
 * mal dado, un vale. Bloquear el cierre por eso es dejar a alguien sin poder
 * cerrar la caja a las dos de la mañana, y eso es exactamente lo que «nunca se
 * bloquea a nadie por cuadrar» viene a impedir.
 *
 * Se calcula, se enseña, y decide una persona. Nulo cuando no se ha desglosado
 * nada, que es distinto de que cuadre.
 */
export function loQueNoCuadra(
  totalCentimos: number,
  desglose: {
    readonly efectivoCentimos: number | null;
    readonly tarjetaCentimos: number | null;
    readonly otrosCentimos: number | null;
  },
): Centimos | null {
  const partes = [desglose.efectivoCentimos, desglose.tarjetaCentimos, desglose.otrosCentimos];
  if (partes.every((parte) => parte === null)) return null;
  const suma = partes.reduce((total: number, parte) => total + (parte ?? 0), 0);
  return centimos(suma - totalCentimos);
}

// ── El CSV que escupe un TPV ─────────────────────────────────────────────────

export interface LoQueTraeElCsv {
  readonly lineas: readonly LineaDeCierre[];
  /** Lo que suman las líneas. Sirve para proponer el total sin obligar a nada. */
  readonly sumaCentimos: number;
  /** Las filas que no se han entendido, con su número, para poder decirlo. */
  readonly noEntendidas: readonly { readonly fila: number; readonly texto: string }[];
}

/**
 * Leer el CSV de ventas de un TPV.
 *
 * ── Por qué esto se lee aquí y no con una librería ──────────────────────────
 *
 * «Ninguna dependencia nueva sin justificarla» (B4), y lo que hay que leer es
 * **tres columnas**: concepto, unidades e importe. Un lector de CSV completo
 * —comillas, saltos de línea dentro de una celda, codificaciones— resolvería
 * casos que un listado de ventas de un TPV no tiene.
 *
 * Lo que sí tiene, y por eso se resuelve aquí:
 *
 *   · **El separador cambia.** En España media exportación va con `;` porque la
 *     coma es el decimal. Se detecta mirando la primera línea, no se pregunta.
 *   · **Los decimales van con coma.** `168,00` es ciento sesenta y ocho.
 *   · **El euro viene pegado al número**, o el punto de los miles.
 *   · Y **la primera fila puede ser la cabecera**, o no.
 *
 * Lo que no se entiende **no se tira en silencio**: se devuelve con su número de
 * fila, para que la pantalla pueda decir «la fila 14 no la he entendido» en vez de
 * importar diecinueve de veinte líneas y quedarse tan ancha.
 */
export function leerUnCsvDeCierre(texto: string): LoQueTraeElCsv {
  const lineas: LineaDeCierre[] = [];
  const noEntendidas: { fila: number; texto: string }[] = [];

  const filas = texto
    .split(/\r?\n/)
    .map((fila) => fila.trim())
    .filter((fila) => fila !== '');

  if (filas.length === 0) return { lineas: [], sumaCentimos: 0, noEntendidas: [] };

  // El separador: el que más aparece en la primera fila, entre `;`, `\t` y `,`.
  // La coma va la última a propósito: es el decimal español, así que una fila con
  // dos importes tiene comas sin ser el separador.
  const primera = filas[0] ?? '';
  const cuantos = (cual: string) => primera.split(cual).length - 1;
  const separador = cuantos(';') > 0 ? ';' : cuantos('\t') > 0 ? '\t' : ',';

  filas.forEach((fila, indice) => {
    const celdas = fila.split(separador).map((celda) => celda.trim().replace(/^"|"$/g, ''));
    const concepto = celdas[0] ?? '';
    const unidades = comoNumero(celdas[1] ?? '');
    const importe = comoNumero(celdas[2] ?? '');

    // La cabecera: primera fila con un concepto que no lleva número al lado. No se
    // cuenta como no entendida, porque no es un error.
    if (indice === 0 && unidades === null) return;

    if (concepto === '' || unidades === null || unidades <= 0) {
      noEntendidas.push({ fila: indice + 1, texto: fila.slice(0, 120) });
      return;
    }

    lineas.push({
      concepto,
      unidades,
      importeCentimos: importe === null ? null : Math.round(importe * 100),
    });
  });

  const sumaCentimos = lineas.reduce((total, linea) => total + (linea.importeCentimos ?? 0), 0);
  return { lineas, sumaCentimos, noEntendidas };
}

/**
 * Un número de un CSV español: `1.234,50 €` es 1234,5.
 *
 * Se quita todo lo que no sea cifra, coma, punto o signo; si hay coma, **la coma
 * es el decimal** y los puntos son miles. Si no hay coma, el punto es el decimal,
 * que es como lo escribe un TPV configurado en inglés.
 */
function comoNumero(celda: string): number | null {
  const limpio = celda.replace(/[^\d,.-]/g, '');
  if (limpio === '') return null;

  const conComa = limpio.includes(',');
  const normal = conComa ? limpio.replace(/\./g, '').replace(',', '.') : limpio;

  const valor = Number(normal);
  return Number.isFinite(valor) ? valor : null;
}
