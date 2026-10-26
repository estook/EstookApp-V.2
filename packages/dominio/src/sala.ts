/**
 * La sala y la cocina (M20A · 1, decisión 0106): lo que se deduce de una mesa sin
 * preguntarle a nadie.
 *
 * Todo sale de los platos de la cuenta y de sus pases. Nada de esto se guarda: se
 * calcula cada vez, en el servidor y en la pantalla con la misma función (regla 6), así
 * que la sala y la cocina no pueden decir dos cosas distintas.
 *
 *   · **Qué pase sale al mandar.** Sale el que no tiene a nadie delante esperando: en la
 *     primera comanda, el 1.º; los postres del final, porque el 1.º y el 2.º ya salieron;
 *     un segundo pedido tarde, si el 2.º ya está marchado. El 2.º de una mesa que aún
 *     come el 1.º, espera.
 *   · **Cuándo toca marchar.** Cuando la cocina ha sacado todo lo de antes. **Marcha la
 *     sala, nunca la cocina** (0106): esto solo le dice a la sala que ya puede.
 *   · **Qué dice el botón grande.** Lo siguiente: pedir en una mesa recién abierta, mandar
 *     lo que no se ha mandado, marchar lo que toca, y si no, cobrar. El camarero no tiene
 *     que pensar.
 *   · **Dónde está la mesa en la cocina.** En marcha, esperando a que la sala marche, o
 *     fuera, cuando ha salido todo.
 */

import { sinAcentos } from './parecido.ts';
import { ALERGENOS } from './referencia.ts';

export type DestinoDeLaLinea = 'cocina' | 'barra' | 'ninguno';

/**
 * Las palabras que hacen de una sección una de bebidas (0106), las mismas que marcaron
 * lo que ya había en la migración 0082. Una sección nueva que se llama así nace de
 * bebidas; el local lo cambia en la Carta con un toque.
 */
const PALABRAS_DE_BEBIDAS =
  /(bebida|vino|cerveza|refresco|cafe|infusion|copa|combinado|coctel|licor|cava|champan|zumo|vermut|sidra)/;

/** Si el nombre de una sección dice que es de bebidas: «Vinos», «Cafés e infusiones». */
export function esDeBebidas(nombre: string): boolean {
  return PALABRAS_DE_BEBIDAS.test(sinAcentos(nombre));
}

/** Lo que hace falta de un plato de la cuenta para saber cómo va la mesa. */
export interface PlatoDeLaMesa {
  readonly destino: DestinoDeLaLinea;
  /** El pase, si va a cocina: 1, 2… */
  readonly pase: number | null;
  readonly mandado: boolean;
  readonly salio: boolean;
  readonly quitado: boolean;
}

export interface PaseDeLaMesa {
  readonly numero: number;
  readonly marchado: boolean;
  /** Salió todo, o se pulsó «Todo fuera». «Recuperar» lo quita. */
  readonly fuera: boolean;
}

/** Lo que la cocina tiene que hacer de verdad: en cocina, mandado, sin quitar. */
function cuentaEnCocina(plato: PlatoDeLaMesa): boolean {
  return plato.destino === 'cocina' && plato.pase !== null && !plato.quitado;
}

/** Los pases que tienen algo en cocina (mandado o a punto de mandarse), en orden. */
function losPasesConPlatos(platos: readonly PlatoDeLaMesa[]): number[] {
  const pases = new Set<number>();
  for (const p of platos) if (cuentaEnCocina(p) && p.pase !== null) pases.add(p.pase);
  return [...pases].sort((a, b) => a - b);
}

/** Si a un pase le queda algo por salir de lo que está (o va a estar) en cocina. */
function lePendiente(platos: readonly PlatoDeLaMesa[], pase: number): boolean {
  return platos.some((p) => cuentaEnCocina(p) && p.pase === pase && !p.salio);
}

/**
 * Los pases que se marchan solos al mandar lo nuevo.
 *
 * Con «todo junto» (`porPases` falso) sale todo. Por pases, sale un pase si **ningún pase
 * anterior tiene nada pendiente**, contando lo que se manda ahora: así la primera
 * comanda saca el 1.º y deja el 2.º en espera, y los postres del final salen solos. Un
 * pase ya marchado no se vuelve a marchar.
 *
 * **Un pase que ya estaba esperando sigue esperando** aunque se le añada algo
 * (`yaEsperaban`): si el 1.º ha salido de cocina pero la mesa aún se lo está comiendo,
 * pedir otro principal no saca el 2.º. Ese lo marcha el camarero (0106). Solo sale solo
 * un pase **nuevo**: el postre que se pide al final, los principales de una mesa que
 * primero pidió solo entrantes.
 *
 * `platos` son todos los de la mesa, con lo que se manda ahora ya como `mandado`.
 */
export function losPasesQueSalenAlMandar(
  platos: readonly PlatoDeLaMesa[],
  pases: readonly PaseDeLaMesa[],
  porPases: boolean,
  yaEsperaban: readonly number[] = [],
): number[] {
  const marchados = new Set(pases.filter((p) => p.marchado).map((p) => p.numero));
  const esperando = new Set(yaEsperaban);
  const conPlatos = losPasesConPlatos(platos.filter((p) => p.mandado));
  const salen: number[] = [];
  for (const numero of conPlatos) {
    if (marchados.has(numero)) continue;
    if (porPases && esperando.has(numero)) continue;
    const delante = conPlatos.filter((n) => n < numero);
    const nadieDelante = delante.every((n) => !lePendiente(platos, n));
    if (!porPases || nadieDelante) salen.push(numero);
  }
  return salen;
}

/**
 * El pase que toca marchar, si toca: el primero sin marchar cuyo de delante **ya ha
 * salido entero**. Nulo si no toca nada (o si lo de delante aún se está cocinando).
 */
export function elPaseQueTocaMarchar(
  platos: readonly PlatoDeLaMesa[],
  pases: readonly PaseDeLaMesa[],
): number | null {
  const marchados = new Set(pases.filter((p) => p.marchado).map((p) => p.numero));
  const mandados = platos.filter((p) => p.mandado);
  const conPlatos = losPasesConPlatos(mandados);
  for (const numero of conPlatos) {
    if (marchados.has(numero)) continue;
    const delante = conPlatos.filter((n) => n < numero);
    if (delante.length === 0) return null;
    return delante.every((n) => !lePendiente(mandados, n)) ? numero : null;
  }
  return null;
}

/** Lo que dice el botón grande de la mesa. */
export type LoSiguiente =
  | { readonly que: 'pedir' }
  | { readonly que: 'mandar' }
  | { readonly que: 'marchar'; readonly pase: number }
  | { readonly que: 'cobrar' };

export function loSiguienteDeLaMesa(
  platos: readonly PlatoDeLaMesa[],
  pases: readonly PaseDeLaMesa[],
): LoSiguiente {
  // Recién abierta (o con todo quitado): lo primero es tomar nota.
  if (platos.every((p) => p.quitado)) return { que: 'pedir' };
  if (platos.some((p) => !p.mandado && !p.quitado && p.destino !== 'ninguno')) {
    return { que: 'mandar' };
  }
  const toca = elPaseQueTocaMarchar(platos, pases);
  if (toca !== null) return { que: 'marchar', pase: toca };
  return { que: 'cobrar' };
}

/** Dónde está la mesa en la pantalla de cocina. */
export type LaMesaEnCocina = 'nada' | 'en_marcha' | 'esperando' | 'fuera';

/**
 * En marcha si a algún pase marchado le queda algo por salir; esperando si lo marchado
 * ha salido entero y hay un pase sin marchar; fuera si ha salido todo (o se pulsó «Todo
 * fuera» en cada pase). «Nada» si no tiene ni un plato en cocina.
 */
export function laMesaEnCocina(
  platos: readonly PlatoDeLaMesa[],
  pases: readonly PaseDeLaMesa[],
): LaMesaEnCocina {
  const mandados = platos.filter((p) => p.mandado);
  const conPlatos = losPasesConPlatos(mandados);
  if (conPlatos.length === 0) return 'nada';
  const elPase = (n: number) => pases.find((p) => p.numero === n);
  const sigue = (n: number) => lePendiente(mandados, n) && elPase(n)?.fuera !== true;
  const marchados = conPlatos.filter((n) => elPase(n)?.marchado === true);
  if (marchados.some(sigue)) return 'en_marcha';
  if (conPlatos.some((n) => elPase(n)?.marchado !== true)) return 'esperando';
  return 'fuera';
}

/** Si un pase ha salido entero: cada plato suyo en cocina, tachado. */
export function elPaseHaSalido(platos: readonly PlatoDeLaMesa[], pase: number): boolean {
  return (
    platos.some((p) => cuentaEnCocina(p) && p.mandado && p.pase === pase) &&
    !lePendiente(
      platos.filter((p) => p.mandado),
      pase,
    )
  );
}

/** Una sección de un menú, para saber en qué pase sale lo que se elige de ella. */
export interface SeccionDelMenuEnLaSala {
  readonly id: string;
  readonly orden: number;
  readonly esPostre: boolean;
  readonly esBebida: boolean;
}

/**
 * En qué pase sale lo de cada sección de un menú (0106): las de comida, una detrás de
 * otra (Primeros el 1.º, Segundos el 2.º); **el postre, al final**, en el pase siguiente;
 * y la bebida no tiene pase, porque va a la barra (nulo).
 */
export function losPasesDelMenu(
  secciones: readonly SeccionDelMenuEnLaSala[],
): ReadonlyMap<string, number | null> {
  const enOrden = [...secciones].sort((a, b) => a.orden - b.orden);
  const pases = new Map<string, number | null>();
  let pase = 0;
  for (const s of enOrden) {
    if (s.esBebida || s.esPostre) continue;
    pase = Math.min(pase + 1, 9);
    pases.set(s.id, pase);
  }
  const elDelPostre = Math.min(pase + 1, 9);
  for (const s of enOrden) {
    if (s.esBebida) pases.set(s.id, null);
    else if (s.esPostre) pases.set(s.id, elDelPostre);
  }
  return pases;
}

// ── T4 · 2 · La barra y la alergia de la mesa (0117) ─────────────────────────

/** Lo que hace falta de una línea de la barra para saber qué ronda sale en su pantalla. */
export interface LineaDeLaBarra {
  readonly id: string;
  /** Cuándo llegó a la barra (al mandar). */
  readonly mandadaEn: string;
  readonly salioEn: string | null;
  readonly quitadaEn: string | null;
}

export interface RondaDeLaBarra {
  /** Las líneas de esta ronda, en el orden en que llegaron. */
  readonly ids: readonly string[];
  /** Cuándo llegó lo primero de la ronda: de ahí cuentan los minutos y lo «NUEVO». */
  readonly llegoEn: string;
  /** Lo que falta por servir. Sin nada, la ronda está acabada. */
  readonly pendientes: number;
  /** Cuándo se sirvió lo último, si está acabada. */
  readonly fueraEn: string | null;
}

/**
 * **La ronda de la barra de una mesa** (T4 · 2, 0117). La barra no tiene pases: cada bebida
 * sale en cuanto llega. Pero una mesa pide bebida tres o cuatro veces en la comida, y la
 * tarjeta no puede crecer con todo lo de la noche: **una ronda nueva empieza cuando llega
 * algo y lo de antes ya estaba servido**. Lo que llega mientras la barra aún sirve la ronda,
 * entra en ella («NUEVO»). Nulo si la mesa no tiene nada mandado a la barra.
 */
export function laRondaDeLaBarra(lineas: readonly LineaDeLaBarra[]): RondaDeLaBarra | null {
  // Las horas van al segundo: a la misma hora, lo ya servido va antes que lo que falta (se
  // pidió antes), para que la caña servida y el café recién pedido no caigan al azar.
  const falta = (l: LineaDeLaBarra) => Number(l.salioEn === null && l.quitadaEn === null);
  const enOrden = [...lineas].sort(
    (a, b) =>
      a.mandadaEn.localeCompare(b.mandadaEn) || falta(a) - falta(b) || a.id.localeCompare(b.id),
  );
  if (enOrden.length === 0) return null;
  let empieza = 0;
  let todoHecho = true;
  let hechoA = '';
  enOrden.forEach((l, i) => {
    if (i > 0 && todoHecho && hechoA <= l.mandadaEn) empieza = i;
    const hecho = l.salioEn ?? l.quitadaEn;
    if (hecho === null) todoHecho = false;
    else if (hecho > hechoA) hechoA = hecho;
  });
  const ronda = enOrden.slice(empieza);
  const pendientes = ronda.filter((l) => l.salioEn === null && l.quitadaEn === null).length;
  const hechos = ronda.flatMap((l) => {
    const hecho = l.salioEn ?? l.quitadaEn;
    return hecho === null ? [] : [hecho];
  });
  return {
    ids: ronda.map((l) => l.id),
    llegoEn: ronda[0]?.mandadaEn ?? enOrden[0]?.mandadaEn ?? '',
    pendientes,
    fueraEn: pendientes > 0 ? null : (hechos.sort().at(-1) ?? null),
  };
}

/**
 * **Lo que lleva un plato de lo que la mesa no puede tomar** (Anexo 3.2): lo de los dos, en
 * el orden del reglamento. Vacío: nada que avisar.
 */
export function lasAlergiasQueLleva(
  loQueLleva: readonly string[],
  alergiasDeLaMesa: readonly string[],
): string[] {
  const deLaMesa = new Set(alergiasDeLaMesa);
  return enSuOrden(loQueLleva.filter((a) => deLaMesa.has(a)));
}

/** Los alérgenos sin repetir y en el orden del reglamento (gluten, crustáceos, huevo…). */
export function enSuOrden(alergenos: readonly string[]): string[] {
  const orden = (a: string) => {
    const i = (ALERGENOS as readonly string[]).indexOf(a);
    return i === -1 ? ALERGENOS.length : i;
  };
  return [...new Set(alergenos)].sort((a, b) => orden(a) - orden(b) || a.localeCompare(b));
}
