import { porcentajeDe } from './cierre.ts';
import { centimos, conSimbolo } from './dinero.ts';
import { plural } from './textos.ts';

/**
 * Los objetivos del local y su semáforo (entrega O, mejora 17 · decisión 0047).
 *
 * ── Qué se mide, y por qué así ──────────────────────────────────────────────
 *
 * Son las cifras con las que se lleva un restaurante en todas partes, y se miden
 * **como las miden los que mejor lo hacen**, no como sería más cómodo:
 *
 *   materia_prima  el food cost: género gastado ÷ ventas          baja es bueno
 *   personal       lo que cuestan las horas fichadas ÷ ventas     baja es bueno
 *   coste_primo    los dos juntos ÷ ventas. No se pone: es la     baja es bueno
 *                  suma de los dos de arriba
 *   merma          lo tirado ÷ lo comprado, en la semana          baja es bueno
 *   ventas         lo facturado en la semana, en euros            sube es bueno
 *
 * La merma **en porcentaje de lo comprado** y no en euros sueltos: es como la miden
 * los que se dedican a ello (entre el 4 y el 10 % de lo que se compra, con el 4 %
 * como meta), no depende del tamaño del local y **se sabe aunque no se cierre la
 * caja**, porque las compras y la merma están en el libro. El importe va al lado.
 *
 * El coste primo es lo primero que mira quien lleva bien un restaurante (entre el
 * 55 y el 65 % de lo facturado) y no se pide: su objetivo es la suma de los otros
 * dos. Pedirlo aparte dejaría poner tres números que no cuadran entre sí.
 *
 * ── Los tres colores, y la franja ───────────────────────────────────────────
 *
 * Verde dentro del objetivo; **ámbar a poco de él**; rojo fuera. Sin ámbar, el
 * aviso llega cuando ya no hay nada que hacer. La franja es de **puntos**, no de
 * tanto por ciento del objetivo: tres puntos de food cost son tres euros de cada
 * cien, se tenga el objetivo en el 25 o en el 35.
 *
 *   materia prima, personal, coste primo   ámbar hasta 3 puntos por encima
 *   merma                                   ámbar hasta 1 punto por encima
 *   ventas                                  ámbar desde el 90 % del objetivo
 *
 * Y **nunca el color solo** (M21): la tarjeta lleva la cifra, el objetivo y por
 * qué, y el porqué lo saca el servidor de lo que ya sabe. Si no lo sabe, no se
 * inventa.
 */

export const CLAVES_DE_OBJETIVO = [
  'materia_prima',
  'personal',
  'margen',
  'merma',
  'ventas_semanales',
] as const;

export type ClaveDeObjetivo = (typeof CLAVES_DE_OBJETIVO)[number];

/**
 * Los tres que pregunta el alta (M5). La merma y las ventas se ponen después, en
 * Ajustes, cuando ya hay compras y cajas de las que sacar una propuesta.
 */
export const CLAVES_DEL_ALTA = ['materia_prima', 'personal', 'margen'] as const;

export type ClaveDelAlta = (typeof CLAVES_DEL_ALTA)[number];

/** Los que se guardan en fracción (0,28 es el 28 %). Las ventas, en céntimos. */
export const CLAVES_EN_FRACCION = ['materia_prima', 'personal', 'margen', 'merma'] as const;

export type ClaveEnFraccion = (typeof CLAVES_EN_FRACCION)[number];

export function esClaveDeObjetivo(valor: unknown): valor is ClaveDeObjetivo {
  return typeof valor === 'string' && (CLAVES_DE_OBJETIVO as readonly string[]).includes(valor);
}

export function vaEnFraccion(clave: ClaveDeObjetivo): clave is ClaveEnFraccion {
  return (CLAVES_EN_FRACCION as readonly string[]).includes(clave);
}

export const NOMBRE_DEL_OBJETIVO: Readonly<Record<ClaveDeObjetivo, string>> = {
  materia_prima: 'Materia prima',
  personal: 'Personal',
  margen: 'Margen',
  merma: 'Merma',
  ventas_semanales: 'Ventas de la semana',
};

/**
 * Qué significa cada uno, en una frase.
 *
 * No es decoración: «este es el dato más silencioso y más influyente del
 * sistema. Un objetivo mal puesto tiñe de rojo o de verde una aplicación
 * entera» (Auditoría 1.2). Quien no entiende qué está poniendo, lo pone mal.
 */
export const QUE_ES_EL_OBJETIVO: Readonly<Record<ClaveDeObjetivo, string>> = {
  materia_prima: 'De cada 100 € que facturas, cuántos se van en género.',
  personal: 'De cada 100 € que facturas, cuántos se van en sueldos.',
  margen: 'Lo que te queda de cada plato antes de contar los gastos del local.',
  merma: 'De cada 100 € de género que compras, cuántos acaban en la basura.',
  ventas_semanales: 'Lo que quieres facturar en siete días.',
};

/**
 * Lo normal en el sector, para que quien pone el suyo sepa dónde está.
 *
 * Son los rangos que dan en 2026 los que publican cifras de restauración —y que ya
 * usaba el alta para proponer los de partida—. Se enseñan al lado de la casilla,
 * nunca se imponen.
 */
export const LO_NORMAL_EN_EL_SECTOR: Readonly<Partial<Record<ClaveDeObjetivo, string>>> = {
  materia_prima: 'Lo normal va del 28 al 35 %. Un obrador, algo más.',
  personal: 'Lo normal va del 28 al 35 %. Un bar, desde el 25 %.',
  merma: 'Lo normal va del 4 al 10 % de lo comprado. La meta de los buenos, el 4 %.',
};

/** El de la merma cuando nadie ha puesto uno: la meta del sector. */
export const MERMA_DE_PARTIDA = 0.04;

// ── El semáforo ──────────────────────────────────────────────────────────────

export type Semaforo = 'verde' | 'ambar' | 'rojo' | 'sin_dato';

/** Lo que se juzga: los objetivos con semáforo, coste primo incluido. */
export type QueSeJuzga =
  'materia_prima' | 'personal' | 'coste_primo' | 'merma' | 'ventas_semanales';

export const LO_QUE_SE_JUZGA: readonly QueSeJuzga[] = [
  'materia_prima',
  'personal',
  'coste_primo',
  'merma',
  'ventas_semanales',
];

export const NOMBRE_DE_LO_QUE_SE_JUZGA: Readonly<Record<QueSeJuzga, string>> = {
  materia_prima: 'Food cost',
  personal: 'Personal',
  coste_primo: 'Coste primo',
  merma: 'Merma',
  ventas_semanales: 'Ventas',
};

/** Cuántos puntos por encima sigue siendo ámbar, en los que se miden en %. */
export const FRANJA_EN_PUNTOS: Readonly<Record<Exclude<QueSeJuzga, 'ventas_semanales'>, number>> = {
  materia_prima: 3,
  personal: 3,
  coste_primo: 3,
  merma: 1,
};

/** Desde qué parte del objetivo de ventas es ámbar y no rojo. */
export const FRANJA_DE_VENTAS = 0.9;

/**
 * El color de una cifra frente a su objetivo.
 *
 * Los porcentajes llegan **en puntos** (32,4 es el 32,4 %), que es como los da
 * `porcentajeDe` y como se leen; el objetivo, en fracción, que es como se guarda.
 * Las ventas, las dos en céntimos. Lo que falta —sin cajas cerradas no hay food
 * cost; sin objetivo de ventas no hay nada que juzgar— es `sin_dato`, que no es
 * verde: un semáforo sin dato en verde es la mentira más cómoda de todas.
 */
export function comoVaFrenteAlObjetivo(
  que: QueSeJuzga,
  valor: number | null,
  objetivo: number | null,
): Semaforo {
  if (valor === null || objetivo === null) return 'sin_dato';

  if (que === 'ventas_semanales') {
    if (objetivo <= 0) return 'sin_dato';
    if (valor >= objetivo) return 'verde';
    return valor >= objetivo * FRANJA_DE_VENTAS ? 'ambar' : 'rojo';
  }

  const enPuntos = objetivo * 100;
  // Con una décima de holgura: 32,0 contra un objetivo de 0,32 es verde aunque la
  // coma flotante diga 32,00000000000001.
  if (valor <= enPuntos + 0.05) return 'verde';
  return valor <= enPuntos + FRANJA_EN_PUNTOS[que] + 0.05 ? 'ambar' : 'rojo';
}

/**
 * El objetivo del coste primo: la suma de los otros dos.
 *
 * Nulo si falta alguno: con medio objetivo no hay coste primo que juzgar.
 */
export function objetivoDelCostePrimo(
  materiaPrima: number | null,
  personal: number | null,
): number | null {
  if (materiaPrima === null || personal === null) return null;
  return materiaPrima + personal;
}

/**
 * La merma de la semana en puntos de lo comprado.
 *
 * Sin compras no hay con qué comparar —una semana de no comprar nada no es una
 * semana de merma infinita—, y se dice como `null`.
 */
export function mermaSobreCompras(mermaCentimos: number, comprasCentimos: number): number | null {
  if (comprasCentimos <= 0) return null;
  return porcentajeDe(mermaCentimos, comprasCentimos);
}

// ── Las cifras del semáforo, con su porqué ───────────────────────────────────

/**
 * Lo que el servidor ha leído de los últimos siete días, ya sumado.
 *
 * Todo en céntimos. **Las ventas, el género y el personal son de los días con la
 * caja cerrada**, que es como cuenta el food cost desde M6½: un día sin caja no
 * vendió cero, no se sabe, y meter su género sin sus ventas inflaría el porcentaje.
 * La merma y las compras, de los siete días: el libro está siempre.
 */
export interface LoQueSeSabeDeLaSemana {
  readonly diasConCaja: number;
  readonly ventas: number;
  readonly genero: number;
  readonly personal: number;
  /** Personas que ficharon y no tienen puesto lo que cobran: no cuentan. */
  readonly sinSalario: number;
  readonly merma: number;
  readonly compras: number;
  /** Lo facturado en los siete días de antes, para comparar. Nulo sin cajas. */
  readonly ventasDeAntes: number | null;
  /** Lo que más pesa en el género gastado, y lo que más se ha tirado. */
  readonly masPesa: { readonly nombre: string; readonly centimos: number } | null;
  readonly masSeTira: { readonly nombre: string; readonly centimos: number } | null;
}

/** Los objetivos vigentes: en fracción, y las ventas en céntimos. */
export interface ObjetivosVigentes {
  readonly materia_prima: number | null;
  readonly personal: number | null;
  readonly merma: number | null;
  readonly ventas_semanales: number | null;
}

export interface CifraDelSemaforo {
  readonly que: QueSeJuzga;
  readonly nombre: string;
  /** En puntos (32,4) los porcentajes, en céntimos las ventas. Nulo sin dato. */
  readonly valor: number | null;
  /** En fracción los porcentajes, en céntimos las ventas. */
  readonly objetivo: number | null;
  readonly semaforo: Semaforo;
  /** «32,4 %», «1.250,00 €» o «—». */
  readonly valorEnTexto: string;
  /** «objetivo 30 %», o nada si no hay objetivo. */
  readonly objetivoEnTexto: string | null;
  /** Una o dos frases: de dónde sale la cifra y qué la mueve. Nunca el color solo. */
  readonly porque: readonly string[];
  /** Lo que hay que hacer para que la cifra exista, cuando no existe. */
  readonly queHacer: { readonly texto: string; readonly ir: string } | null;
}

function euros(centimosEnteros: number): string {
  return conSimbolo(centimos(centimosEnteros));
}

/** «32,4 %», sin la coma si es entero: «32 %». */
export function enPuntos(puntos: number): string {
  const conUna = puntos.toFixed(1).replace('.', ',');
  return `${conUna.endsWith(',0') ? conUna.slice(0, -2) : conUna} %`;
}

const CERRAR_LA_CAJA = { texto: 'Cerrar la caja', ir: '/servicio/jornada/cierre' } as const;
const PONER_OBJETIVOS = { texto: 'Poner tus objetivos', ir: '/ajustes/local#objetivos' } as const;

/**
 * Las cinco cifras del semáforo, con su color y su porqué.
 *
 * Todo sale de `LoQueSeSabeDeLaSemana` y de los objetivos: esta función no lee
 * nada, así que se puede probar caso a caso —semana sin cajas, gente sin salario,
 * semana sin compras— sin montar una base de datos.
 */
export function lasCifrasDelSemaforo(
  sabe: LoQueSeSabeDeLaSemana,
  objetivos: ObjetivosVigentes,
): readonly CifraDelSemaforo[] {
  const conCaja = sabe.diasConCaja > 0 && sabe.ventas > 0;
  const enDias =
    sabe.diasConCaja >= 7 ? '' : `, en ${plural(sabe.diasConCaja, 'día', 'días')} con caja`;
  const sinCaja = 'Sin cajas cerradas estos siete días: sin ventas no se puede saber.';

  const cifra = (
    que: QueSeJuzga,
    valor: number | null,
    objetivo: number | null,
    porque: readonly (string | null)[],
    queHacer: CifraDelSemaforo['queHacer'] = null,
  ): CifraDelSemaforo => ({
    que,
    nombre: NOMBRE_DE_LO_QUE_SE_JUZGA[que],
    valor,
    objetivo,
    semaforo: comoVaFrenteAlObjetivo(que, valor, objetivo),
    valorEnTexto:
      valor === null ? '—' : que === 'ventas_semanales' ? euros(valor) : enPuntos(valor),
    objetivoEnTexto:
      objetivo === null
        ? null
        : `objetivo ${que === 'ventas_semanales' ? euros(objetivo) : enPuntos(objetivo * 100)}`,
    porque: porque.filter((frase): frase is string => frase !== null),
    queHacer,
  });

  // ── Food cost ──
  const generoEnPuntos = conCaja ? porcentajeDe(sabe.genero, sabe.ventas) : null;
  const materiaPrima = cifra(
    'materia_prima',
    generoEnPuntos,
    objetivos.materia_prima,
    conCaja
      ? [
          `${euros(sabe.genero)} de género para ${euros(sabe.ventas)} vendidos${enDias}.`,
          sabe.masPesa === null
            ? null
            : `Lo que más pesa: ${sabe.masPesa.nombre}, ${euros(sabe.masPesa.centimos)}.`,
        ]
      : [sinCaja],
    conCaja ? null : CERRAR_LA_CAJA,
  );

  // ── Personal ──
  const nadieCobra = sabe.personal === 0 && sabe.sinSalario > 0;
  const personalEnPuntos = conCaja && !nadieCobra ? porcentajeDe(sabe.personal, sabe.ventas) : null;
  const uno = sabe.sinSalario === 1;
  const faltan =
    sabe.sinSalario === 0
      ? null
      : `${plural(sabe.sinSalario, 'persona ficha', 'personas fichan')} sin lo que cobra${uno ? '' : 'n'} puesto: no cuenta${uno ? '' : 'n'}.`;
  const personal = cifra(
    'personal',
    personalEnPuntos,
    objetivos.personal,
    !conCaja
      ? [sinCaja]
      : nadieCobra
        ? ['Nadie tiene puesto lo que cobra: sin eso no hay coste de personal.']
        : [
            `${euros(sabe.personal)} en horas para ${euros(sabe.ventas)} vendidos${enDias}.`,
            faltan,
          ],
    !conCaja
      ? CERRAR_LA_CAJA
      : nadieCobra
        ? { texto: 'Ponerlo en Equipo', ir: '/equipo/personas/con-acceso' }
        : null,
  );

  // ── Coste primo ──
  const primo =
    generoEnPuntos === null || personalEnPuntos === null
      ? null
      : porcentajeDe(sabe.genero + sabe.personal, sabe.ventas);
  const costePrimo = cifra(
    'coste_primo',
    primo,
    objetivoDelCostePrimo(objetivos.materia_prima, objetivos.personal),
    primo === null || generoEnPuntos === null || personalEnPuntos === null
      ? ['Sale de juntar el género y el personal: falta uno de los dos.']
      : [
          `Género ${enPuntos(generoEnPuntos)} y personal ${enPuntos(personalEnPuntos)}. Los que mejor lo llevan, por debajo del 60 %.`,
        ],
  );

  // ── Merma ──
  const merma = cifra(
    'merma',
    mermaSobreCompras(sabe.merma, sabe.compras),
    objetivos.merma,
    sabe.compras <= 0
      ? ['Sin compras apuntadas estos siete días: sin ellas no se sabe qué parte se tira.']
      : [
          `${euros(sabe.merma)} tirados de ${euros(sabe.compras)} comprados.`,
          sabe.masSeTira === null
            ? null
            : `Lo que más se ha tirado: ${sabe.masSeTira.nombre}, ${euros(sabe.masSeTira.centimos)}.`,
        ],
  );

  // ── Ventas ──
  const ventas = cifra(
    'ventas_semanales',
    sabe.diasConCaja > 0 ? sabe.ventas : null,
    objetivos.ventas_semanales,
    [
      objetivos.ventas_semanales === null
        ? 'Sin objetivo de ventas: ponle uno y sabrás cómo vas cada día.'
        : sabe.diasConCaja === 0
          ? sinCaja
          : `${euros(sabe.ventas)} de ${euros(objetivos.ventas_semanales)}${enDias}.`,
      sabe.ventasDeAntes === null ? null : `La semana anterior, ${euros(sabe.ventasDeAntes)}.`,
    ],
    objetivos.ventas_semanales === null
      ? PONER_OBJETIVOS
      : sabe.diasConCaja === 0
        ? CERRAR_LA_CAJA
        : null,
  );

  return [materiaPrima, personal, costePrimo, merma, ventas];
}
