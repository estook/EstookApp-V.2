/**
 * Los indicadores del Panel · «añadir los nuestros» (M7, decisión 0039).
 *
 * ── Qué es un indicador, y qué no ────────────────────────────────────────────
 *
 * Una cifra del negocio **con su periodo, su comparación y su tendencia**: «Ventas
 * de los últimos 7 días, 4.210 €, un 12 % más que los 7 anteriores», con la línea
 * de los días debajo. Es la tarjeta que ponen Square, Shopify o Stripe en su
 * resumen, y la que Richi pedía con «gráficas y flechas de subida y bajada».
 *
 * No es un generador libre de gráficas. **Cada indicador sale de un dato que Estook
 * ya guarda y con un dueño**: las ventas del cierre de caja, la merma del libro, lo
 * que entra por los albaranes, las horas del fichaje. Un indicador que hubiera que
 * teclear, o que sumara cosas de dos sitios que no cuadran, sería una cifra
 * inventada con buena pinta.
 *
 * ── Por qué vive aquí ────────────────────────────────────────────────────────
 *
 * Lo usan tres sitios que tienen que decir lo mismo: el servidor, que valida cuál
 * se pide y hace las cuentas; el catálogo de widgets, que lo ofrece con su nombre;
 * y la tarjeta, que decide si subir es bueno. Tres copias serían tres respuestas
 * (regla 6).
 */

import { porcentajeDe } from './cierre.ts';

export const INDICADORES = [
  'ventas',
  'ticket-medio',
  'food-cost',
  'merma',
  'compras',
  'mis-horas',
] as const;

export type Indicador = (typeof INDICADORES)[number];

/** Los periodos que se ofrecen: la semana y el mes, que son los que se hablan. */
export const PERIODOS_DEL_INDICADOR = [7, 30] as const;

export type PeriodoDelIndicador = (typeof PERIODOS_DEL_INDICADOR)[number];

export type UnidadDelIndicador = 'dinero' | 'porcentaje' | 'minutos';

/** Si que suba es buena noticia. Es lo que pinta la flecha en verde o en rojo. */
export type SentidoDelIndicador = 'sube_es_bueno' | 'baja_es_bueno' | 'neutro';

export interface ComoEsElIndicador {
  readonly nombre: string;
  /** En una frase, para el catálogo. */
  readonly queEnsena: string;
  readonly unidad: UnidadDelIndicador;
  readonly sentido: SentidoDelIndicador;
  /** De dónde sale, para el pie de la tarjeta (E1: toda cifra lleva su origen). */
  readonly deDonde: string;
  /**
   * Cómo se junta el periodo.
   *
   * `suma` para lo que se acumula —lo vendido, lo tirado—. `cociente` para lo que
   * es una proporción: el food cost de la semana **no es la media de siete
   * porcentajes**, es lo gastado entre lo vendido de los siete días. Un martes de
   * 40 € no pesa lo mismo que un sábado de 3.000.
   */
  readonly periodo: 'suma' | 'cociente';
  /**
   * Si un día sin apuntes vale cero o «no se sabe».
   *
   * Un día sin caja cerrada **no vendió cero**: no se sabe, y la línea se corta.
   * Un día sin merma apuntada sí es cero, porque el libro está siempre. Lo usan el
   * servidor, para rellenar los días, y la tarjeta, para no decir «0 de 7 días
   * con dato» de una semana sin merma, que es una buena semana.
   */
  readonly sinDatoEsCero: boolean;
}

export const COMO_ES_EL_INDICADOR: Readonly<Record<Indicador, ComoEsElIndicador>> = {
  ventas: {
    nombre: 'Ventas',
    queEnsena: 'Lo facturado, día a día, y cómo va frente al periodo anterior',
    unidad: 'dinero',
    sentido: 'sube_es_bueno',
    deDonde: 'De tus cierres de caja, con IVA',
    periodo: 'suma',
    sinDatoEsCero: false,
  },
  'ticket-medio': {
    nombre: 'Ticket medio',
    queEnsena: 'Lo que deja cada ticket, en los días que se apuntaron',
    unidad: 'dinero',
    sentido: 'sube_es_bueno',
    deDonde: 'Cierres de caja con tickets apuntados',
    periodo: 'cociente',
    sinDatoEsCero: false,
  },
  'food-cost': {
    nombre: 'Food cost',
    queEnsena: 'Lo que se va en género de cada cien euros que entran',
    unidad: 'porcentaje',
    sentido: 'baja_es_bueno',
    deDonde: 'Género gastado entre lo vendido, en días con caja cerrada',
    periodo: 'cociente',
    sinDatoEsCero: false,
  },
  merma: {
    nombre: 'Merma',
    queEnsena: 'Lo que se ha tirado, a coste, y si va a más o a menos',
    unidad: 'dinero',
    sentido: 'baja_es_bueno',
    deDonde: 'Del libro de movimientos, a precio medio',
    periodo: 'suma',
    sinDatoEsCero: true,
  },
  compras: {
    nombre: 'Compras',
    queEnsena: 'Lo que ha entrado de género, a lo que costó y sin IVA',
    unidad: 'dinero',
    sentido: 'neutro',
    deDonde: 'Entradas del libro, a precio de compra sin IVA',
    periodo: 'suma',
    sinDatoEsCero: true,
  },
  'mis-horas': {
    nombre: 'Mis horas',
    queEnsena: 'Lo que has trabajado cada día, contado por tus fichajes',
    unidad: 'minutos',
    sentido: 'neutro',
    deDonde: 'De tus fichajes',
    periodo: 'suma',
    sinDatoEsCero: true,
  },
};

export function esIndicador(valor: unknown): valor is Indicador {
  return typeof valor === 'string' && (INDICADORES as readonly string[]).includes(valor);
}

export function esPeriodoDelIndicador(valor: unknown): valor is PeriodoDelIndicador {
  return valor === 7 || valor === 30;
}

// ── El identificador del widget ─────────────────────────────────────────────

/**
 * El identificador de un indicador puesto en el Panel: `indicador-ventas-7`.
 *
 * ── Por qué lo que se ha elegido va en el identificador ─────────────────────
 *
 * Porque así **no hace falta tocar cómo se guarda el Panel**. La lista guardada
 * es de identificadores y tamaños desde la 0025, el servidor no los valida —el
 * catálogo es navegación— y el formato ya admite minúsculas, cifras y guiones.
 * Un indicador con sus opciones es un identificador más.
 *
 * Y de paso se consigue lo correcto sin escribirlo: **no se puede poner dos veces
 * el mismo indicador con el mismo periodo**, porque el Panel no repite
 * identificadores. «Ventas 7 días» y «Ventas 30 días», sí: son dos preguntas.
 */
export function idDelIndicador(indicador: Indicador, dias: PeriodoDelIndicador): string {
  return `indicador-${indicador}-${dias}`;
}

export function leerIdDelIndicador(
  id: string,
): { readonly indicador: Indicador; readonly dias: PeriodoDelIndicador } | null {
  const partes = /^indicador-([a-z-]+)-(\d+)$/.exec(id);
  if (partes === null) return null;
  const indicador = partes[1];
  const dias = Number(partes[2]);
  if (!esIndicador(indicador) || !esPeriodoDelIndicador(dias)) return null;
  return { indicador, dias };
}

/** «Ventas · 7 días». Es el título de la tarjeta y su nombre en el catálogo. */
export function nombreDelIndicador(indicador: Indicador, dias: PeriodoDelIndicador): string {
  return `${COMO_ES_EL_INDICADOR[indicador].nombre} · ${dias} días`;
}

// ── Cómo ha cambiado ────────────────────────────────────────────────────────

export interface CambioDelIndicador {
  /** Verdadero si sube, falso si baja, nulo si está igual. */
  readonly sube: boolean | null;
  /**
   * Cuánto, en positivo y con un decimal.
   *
   * En **por ciento** para dinero y horas, y en **puntos** para lo que ya es un
   * porcentaje: que el food cost pase del 30 % al 33 % es «3 puntos», no «un 10 %
   * más». Decirlo en por ciento de un por ciento es la forma más rápida de que
   * nadie entienda la flecha.
   */
  readonly cuanto: number;
  readonly enPuntos: boolean;
  /** Si es buena noticia. Nulo cuando el indicador es neutro o no se mueve. */
  readonly bueno: boolean | null;
}

/**
 * Cómo ha cambiado frente al periodo anterior, o nulo si no se puede decir.
 *
 * Nulo cuando falta alguno de los dos, y **nulo también cuando el anterior es
 * cero** en lo que se mide en por ciento: de 0 € a 40 € no es «un infinito por
 * ciento más», es que antes no había. Una flecha que no se puede calcular no se
 * pinta.
 */
export function comoCambia(
  indicador: Indicador,
  actual: number | null,
  anterior: number | null,
): CambioDelIndicador | null {
  if (actual === null || anterior === null) return null;
  const como = COMO_ES_EL_INDICADOR[indicador];
  const enPuntos = como.unidad === 'porcentaje';

  // El redondeo a un decimal es el de `porcentajeDe`, que es su dueño (regla 9).
  // En puntos, la diferencia «sobre cien» es la propia diferencia con un decimal.
  const diferencia = Math.abs(actual - anterior);
  const cuanto = enPuntos ? porcentajeDe(diferencia, 100) : porcentajeDe(diferencia, anterior);
  if (cuanto === null) return null;

  const sube = cuanto === 0 ? null : actual > anterior;
  const bueno =
    sube === null || como.sentido === 'neutro'
      ? null
      : como.sentido === 'sube_es_bueno'
        ? sube
        : !sube;

  return { sube, cuanto, enPuntos, bueno };
}
