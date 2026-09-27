import { COMO_ES_EL_INDICADOR, comoCambia, laCifraEscrita, type Indicador } from './indicador.ts';
import { comoSeLlamaElDia } from './equipo.ts';
import { plural } from './textos.ts';
import {
  diaDeLaSemana,
  diasEntre,
  fechaOperativa,
  masDias,
  type FechaOperativa,
} from './tiempo.ts';

/**
 * Los informes · Tu día, Tu semana y Tu mes (entrega R2, mejora 16 · decisión 0053).
 *
 * «Por correo al gerente: ventas, food cost, merma y horas.» Primero **una
 * pantalla**, en Negocio → Informes, y el correo es su resumen con un enlace. Lo
 * que decidió Richi el 27-sep:
 *
 *   · **Tres**: el día, la semana y el mes. Cada uno **cerrado**: ayer, la semana
 *     de lunes a domingo que acaba de pasar y el mes que acaba de pasar. Lo que va
 *     por la mitad ya lo cuentan las cifras de cada app, con sus siete y treinta días.
 *   · **Tu día se compara con el mismo día de la semana anterior**: un sábado con
 *     otro sábado. Comparar un lunes con un domingo da flechas que no dicen nada.
 *   · **Las cifras son las de la app**, contadas por los mismos caminos que las
 *     tarjetas (`un_indicador`): lo que dice el informe lo dice la tarjeta.
 *   · **Tres frases**: lo que ha ido mejor, lo que ha ido peor y lo que conviene
 *     mirar. Salen de reglas, aquí, y no de un modelo (M22 las mejorará).
 */

export const TIPOS_DE_INFORME = ['dia', 'semana', 'mes'] as const;

export type TipoDeInforme = (typeof TIPOS_DE_INFORME)[number];

export function esTipoDeInforme(valor: unknown): valor is TipoDeInforme {
  return typeof valor === 'string' && (TIPOS_DE_INFORME as readonly string[]).includes(valor);
}

/** «Tu día», «Tu semana», «Tu mes»: el título de cada uno. */
export const TITULO_DEL_INFORME: Readonly<Record<TipoDeInforme, string>> = {
  dia: 'Tu día',
  semana: 'Tu semana',
  mes: 'Tu mes',
};

/**
 * Las cifras de un informe, en su orden: **lo que pidió Richi** —ventas, food cost,
 * merma y horas— y lo que las explica. Cada uno ve las que su puesto le deja
 * (`LO_QUE_PIDE_EL_INDICADOR`), como en las tarjetas.
 *
 * Sin las cajas cerradas en el día: de un día es «sí» o «no», y eso ya lo dicen las
 * ventas cuando no las hay.
 */
export const LAS_CIFRAS_DEL_INFORME: Readonly<Record<TipoDeInforme, readonly Indicador[]>> = {
  dia: [
    'ventas',
    'ticket-medio',
    'food-cost',
    'merma',
    'compras',
    'horas-equipo',
    'coste-personal',
  ],
  semana: [
    'ventas',
    'ticket-medio',
    'food-cost',
    'merma',
    'compras',
    'horas-equipo',
    'coste-personal',
    'cierres',
  ],
  mes: [
    'ventas',
    'ticket-medio',
    'food-cost',
    'merma',
    'compras',
    'horas-equipo',
    'coste-personal',
    'cierres',
  ],
};

/** Cuántos periodos hacia atrás se puede ir: un año de días, de semanas y de meses. */
export const HACIA_ATRAS_MAXIMO: Readonly<Record<TipoDeInforme, number>> = {
  dia: 365,
  semana: 52,
  mes: 12,
};

// ── El periodo ───────────────────────────────────────────────────────────────

export interface PeriodoDelInforme {
  readonly tipo: TipoDeInforme;
  /** El primer y el último día del periodo, los dos dentro. */
  readonly desde: FechaOperativa;
  readonly hasta: FechaOperativa;
  /** El periodo con el que se compara, del mismo largo o el mes de antes. */
  readonly antesDesde: FechaOperativa;
  readonly antesHasta: FechaOperativa;
  /** «el sábado 26 de septiembre», «del 21 al 27 de septiembre», «agosto de 2026». */
  readonly nombre: string;
  /** «que el sábado anterior», «que la semana anterior», «que en julio»: en una frase. */
  readonly frenteA: string;
  /** «frente al sábado anterior», «frente a julio»: al lado de una flecha. */
  readonly comparado: string;
  /** Cuántos días tiene: 1, 7, o los del mes. */
  readonly dias: number;
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

function partes(fecha: FechaOperativa): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  return { anio, mes, dia };
}

function elDiaUno(anio: number, mes: number): FechaOperativa {
  // `mes` puede salirse de 1‑12: Date.UTC lo lleva al año que toca.
  const fecha = new Date(Date.UTC(anio, mes - 1, 1));
  return fechaOperativa(
    `${String(fecha.getUTCFullYear())}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-01`,
  );
}

function nombreDelMes(fecha: FechaOperativa): string {
  return MESES[partes(fecha).mes - 1] ?? '';
}

/** «26 de septiembre»: sin el año, que en un informe de la semana pasada sobra. */
function diaYMes(fecha: FechaOperativa): string {
  const { dia } = partes(fecha);
  return `${String(dia)} de ${nombreDelMes(fecha)}`;
}

/**
 * El periodo de un informe, contado desde la jornada de hoy.
 *
 * `atras` es cuántos periodos hacia atrás: 0 es el último cerrado —ayer, la semana
 * pasada, el mes pasado—, 1 el de antes, y así. **Hoy nunca**: va por la mitad.
 */
export function elPeriodoDelInforme(
  tipo: TipoDeInforme,
  hoy: FechaOperativa,
  atras = 0,
): PeriodoDelInforme {
  const cuantos = Math.max(0, Math.min(Math.trunc(atras), HACIA_ATRAS_MAXIMO[tipo]));

  if (tipo === 'dia') {
    const dia = masDias(hoy, -1 - cuantos);
    const antes = masDias(dia, -7);
    const nombreDelDia = comoSeLlamaElDia(diaDeLaSemana(dia));
    return {
      tipo,
      desde: dia,
      hasta: dia,
      antesDesde: antes,
      antesHasta: antes,
      nombre: `el ${nombreDelDia} ${diaYMes(dia)}`,
      frenteA: `que el ${nombreDelDia} anterior`,
      comparado: `frente al ${nombreDelDia} anterior`,
      dias: 1,
    };
  }

  if (tipo === 'semana') {
    const lunesDeEsta = masDias(hoy, -(diaDeLaSemana(hoy) - 1));
    const desde = masDias(lunesDeEsta, -7 * (cuantos + 1));
    const hasta = masDias(desde, 6);
    const mismoMes = partes(desde).mes === partes(hasta).mes;
    return {
      tipo,
      desde,
      hasta,
      antesDesde: masDias(desde, -7),
      antesHasta: masDias(desde, -1),
      nombre: mismoMes
        ? `del ${String(partes(desde).dia)} al ${diaYMes(hasta)}`
        : `del ${diaYMes(desde)} al ${diaYMes(hasta)}`,
      frenteA: 'que la semana anterior',
      comparado: 'frente a la semana anterior',
      dias: 7,
    };
  }

  const { anio, mes } = partes(hoy);
  const desde = elDiaUno(anio, mes - 1 - cuantos);
  const hasta = masDias(elDiaUno(anio, mes - cuantos), -1);
  const antesDesde = elDiaUno(anio, mes - 2 - cuantos);
  return {
    tipo,
    desde,
    hasta,
    antesDesde,
    antesHasta: masDias(desde, -1),
    nombre: `${nombreDelMes(desde)} de ${String(partes(desde).anio)}`,
    frenteA: `que en ${nombreDelMes(antesDesde)}`,
    comparado: `frente a ${nombreDelMes(antesDesde)}`,
    dias: diasEntre(desde, hasta) + 1,
  };
}

/** Los días de un tramo, los dos extremos dentro, de viejo a nuevo. */
export function losDiasEntre(desde: FechaOperativa, hasta: FechaOperativa): FechaOperativa[] {
  const cuantos = diasEntre(desde, hasta);
  return Array.from({ length: Math.max(0, cuantos + 1) }, (_, i) => masDias(desde, i));
}

/**
 * Cuántos periodos hacia atrás está el que contiene una fecha: la inversa de
 * `elPeriodoDelInforme`. Es lo que lleva el enlace de un correo, que se puede abrir
 * una semana después y tiene que seguir enseñando la semana de la que habla.
 * Nunca menos de cero: una fecha de hoy o de después es el último cerrado.
 */
export function atrasDe(tipo: TipoDeInforme, hoy: FechaOperativa, fecha: FechaOperativa): number {
  let atras: number;
  if (tipo === 'dia') {
    atras = diasEntre(fecha, hoy) - 1;
  } else if (tipo === 'semana') {
    const lunes = (f: FechaOperativa) => masDias(f, -(diaDeLaSemana(f) - 1));
    atras = Math.floor(diasEntre(lunes(fecha), lunes(hoy)) / 7) - 1;
  } else {
    const a = partes(fecha);
    const b = partes(hoy);
    atras = (b.anio - a.anio) * 12 + (b.mes - a.mes) - 1;
  }
  return Math.max(0, Math.min(atras, HACIA_ATRAS_MAXIMO[tipo]));
}

// ── Las tres frases ─────────────────────────────────────────────────────────

/** Una cifra del informe, ya contada: la del periodo y la del de antes. */
export interface CifraDelInforme {
  readonly indicador: Indicador;
  readonly total: number | null;
  readonly anterior: number | null;
  /** Cuántos días del periodo tienen dato: «4 de 7 con caja cerrada». */
  readonly diasConDato: number;
}

/** Cómo se nombra cada cifra dentro de una frase. */
const CON_SU_ARTICULO: Readonly<Record<Indicador, string>> = {
  ventas: 'las ventas',
  'ticket-medio': 'el ticket medio',
  'food-cost': 'el food cost',
  merma: 'la merma',
  compras: 'las compras',
  'mis-horas': 'tus horas',
  'valor-camara': 'el valor de la cámara',
  'bajo-minimo': 'lo que está bajo mínimo',
  cierres: 'las cajas cerradas',
  'horas-equipo': 'las horas del equipo',
  'coste-personal': 'el coste de personal',
  retrasos: 'los retrasos',
};

/**
 * Lo que no es noticia aunque se mueva: **las cajas cerradas** dicen si faltan datos,
 * no cómo va el negocio. «Lo mejor: cerraste cinco cajas» no le sirve a nadie; que
 * falten, lo dice «lo que conviene mirar».
 */
const NO_ES_NOTICIA: ReadonlySet<Indicador> = new Set(['cierres']);

/** Medio punto de diferencia o menos es un empate: el redondeo del ticket medio da más. */
const EMPATE = 0.005;

/** Lo que tiene que moverse algo para contarlo: menos es ruido. */
const LO_QUE_CUENTA = { por_ciento: 2, puntos: 0.5, unidades: 1 } as const;

/** «un 12 % más», «3 puntos menos», «2 más». */
function cuantoCambia(cuanto: number, en: 'por_ciento' | 'puntos' | 'unidades', sube: boolean) {
  const numero = cuanto.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  const hacia = sube ? 'más' : 'menos';
  if (en === 'por_ciento') return `un ${numero} % ${hacia}`;
  if (en === 'puntos') return `${numero} ${cuanto === 1 ? 'punto' : 'puntos'} ${hacia}`;
  return `${numero} ${hacia}`;
}

export interface LoQueMasSeMueve {
  readonly indicador: Indicador;
  readonly frase: string;
}

/**
 * Lo que más se ha movido a bien (o a mal), con su frase.
 *
 * Se comparan **por lo que se mueven frente a lo que eran**: pasar del 30 al 33 %
 * de food cost es un 10 % peor, y así compite con las ventas en la misma escala.
 * Lo neutro —las compras, las horas— no es ni bueno ni malo: no entra.
 */
function loQueMasSeMueve(
  cifras: readonly CifraDelInforme[],
  periodo: PeriodoDelInforme,
  aBien: boolean,
): LoQueMasSeMueve | null {
  let elegida: { cifra: CifraDelInforme; peso: number; texto: string } | null = null;
  for (const cifra of cifras) {
    if (cifra.total === null || cifra.anterior === null) continue;
    if (NO_ES_NOTICIA.has(cifra.indicador)) continue;
    const cambio = comoCambia(cifra.indicador, cifra.total, cifra.anterior);
    if (cambio === null || cambio.bueno === null || cambio.sube === null) continue;
    if (cambio.bueno !== aBien || cambio.cuanto < LO_QUE_CUENTA[cambio.en]) continue;
    const peso =
      cifra.anterior === 0
        ? Math.abs(cifra.total)
        : Math.abs(cifra.total - cifra.anterior) / Math.abs(cifra.anterior);
    // Con lo mismo o casi, gana la que va antes en el informe, que es la que más
    // importa: si las ventas y el ticket medio suben un 23 %, lo mejor son las ventas.
    if (elegida !== null && peso <= elegida.peso + EMPATE) continue;
    const valor = laCifraEscrita(cifra.indicador, cifra.total, periodo.dias);
    elegida = {
      cifra,
      peso,
      texto: `${CON_SU_ARTICULO[cifra.indicador]}, ${valor}, ${cuantoCambia(cambio.cuanto, cambio.en, cambio.sube)} ${periodo.frenteA}`,
    };
  }
  return elegida === null ? null : { indicador: elegida.cifra.indicador, frase: elegida.texto };
}

/**
 * Si el informe dice algo. **Un cero de lo que vale cero sin apuntes** —la merma,
 * las compras, las horas— no es un dato: es que no se ha apuntado nada. Sin datos,
 * el reloj no manda el informe: «no hay nada» cada mañana es ruido.
 */
export function hayDatos(cifras: readonly CifraDelInforme[]): boolean {
  return cifras.some(
    (c) => c.total !== null && (c.total !== 0 || !COMO_ES_EL_INDICADOR[c.indicador].sinDatoEsCero),
  );
}

/** Lo que el servidor sabe además de las cifras, para decir qué conviene mirar. */
export interface LoQueSeSabeAdemas {
  /** Los objetivos en rojo, ya dichos: «food cost, 34 %, con objetivo 30 %». */
  readonly fueraDeObjetivo?: readonly string[];
}

export interface LasTresFrases {
  readonly mejor: string | null;
  readonly peor: string | null;
  readonly mirar: string;
}

/**
 * Lo mejor, lo peor y lo que conviene mirar.
 *
 * Lo que conviene mirar va por este orden, y sale lo primero que haya:
 *
 *   1 · Días sin caja cerrada: sin ellos, las ventas y el food cost cuentan corto.
 *   2 · Un objetivo en rojo (solo la semana: los objetivos son semanales).
 *   3 · Nada: se dice, que también es una noticia. O que no hay datos todavía.
 */
export function lasTresFrases(
  cifras: readonly CifraDelInforme[],
  periodo: PeriodoDelInforme,
  ademas: LoQueSeSabeAdemas = {},
): LasTresFrases {
  const mejor = loQueMasSeMueve(cifras, periodo, true);
  const peor = loQueMasSeMueve(cifras, periodo, false);

  const conDato = hayDatos(cifras);
  const ventas = cifras.find((c) => c.indicador === 'ventas');

  let mirar: string;
  if (ventas !== undefined && ventas.diasConDato < periodo.dias) {
    const sinCaja = periodo.dias - ventas.diasConDato;
    mirar =
      periodo.dias === 1
        ? 'Ese día no se cerró la caja: sin ella no hay ventas ni food cost.'
        : ventas.diasConDato === 0
          ? 'No se cerró la caja ningún día: sin ventas no hay food cost ni se sabe cómo va el negocio.'
          : `${plural(sinCaja, 'día', 'días')} sin caja cerrada: las ventas y el food cost cuentan solo ${ventas.diasConDato === 1 ? 'el otro' : `los otros ${String(ventas.diasConDato)}`}.`;
  } else if ((ademas.fueraDeObjetivo ?? []).length > 0) {
    mirar = `Fuera de objetivo: ${(ademas.fueraDeObjetivo ?? []).join('; ')}.`;
  } else if (!conDato) {
    mirar =
      'Todavía no hay datos de este periodo: con la caja cerrada y el género apuntado, aquí saldrá cómo va.';
  } else {
    mirar = 'Nada más que mirar: todo en su sitio.';
  }

  return {
    mejor: mejor === null ? null : `Lo mejor: ${mejor.frase}.`,
    peor: peor === null ? null : `Lo peor: ${peor.frase}.`,
    mirar,
  };
}

/** Las frases en un párrafo, para la campana y el correo. Sin las que no hay. */
export function lasFrasesJuntas(frases: LasTresFrases): string {
  return [frases.mejor, frases.peor, frases.mirar].filter((f): f is string => f !== null).join(' ');
}

// ── El correo ───────────────────────────────────────────────────────────────

/** Una fila de la tabla del correo: ya escrita, como la vería en la app. */
export interface CifraDelCorreo {
  readonly nombre: string;
  readonly valor: string;
  /** «+12 %», «−3 puntos», «+2», o nulo sin periodo anterior. */
  readonly cambio: string | null;
  /** Si es buena noticia, para su color. Nulo si es neutro o no se mueve. */
  readonly bueno: boolean | null;
}

/**
 * Las cifras del informe para su correo, **como las ve quien lo recibe**: el reloj
 * las cuenta a su nombre y se guardan con su aviso (0051). Sin dato, «—».
 */
export function lasCifrasDelCorreo(
  cifras: readonly CifraDelInforme[],
  periodo: PeriodoDelInforme,
): readonly CifraDelCorreo[] {
  return cifras.map((cifra) => {
    const cambio =
      cifra.total === null ? null : comoCambia(cifra.indicador, cifra.total, cifra.anterior);
    const numero =
      cambio === null ? '' : cambio.cuanto.toLocaleString('es-ES', { maximumFractionDigits: 1 });
    const signo = cambio?.sube === true ? '+' : cambio?.sube === false ? '−' : '';
    const unidad =
      cambio === null
        ? ''
        : cambio.en === 'por_ciento'
          ? ' %'
          : cambio.en === 'puntos'
            ? cambio.cuanto === 1
              ? ' punto'
              : ' puntos'
            : '';
    return {
      nombre: COMO_ES_EL_INDICADOR[cifra.indicador].nombre,
      valor:
        cifra.total === null ? '—' : laCifraEscrita(cifra.indicador, cifra.total, periodo.dias),
      cambio:
        cambio === null ? null : cambio.sube === null ? 'igual' : `${signo}${numero}${unidad}`,
      bueno: cambio?.bueno ?? null,
    };
  });
}
