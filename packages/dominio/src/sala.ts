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

export type DestinoDeLaLinea = 'cocina' | 'barra' | 'ninguno';

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
 * `platos` son todos los de la mesa, con lo que se manda ahora ya como `mandado`.
 */
export function losPasesQueSalenAlMandar(
  platos: readonly PlatoDeLaMesa[],
  pases: readonly PaseDeLaMesa[],
  porPases: boolean,
): number[] {
  const marchados = new Set(pases.filter((p) => p.marchado).map((p) => p.numero));
  const conPlatos = losPasesConPlatos(platos.filter((p) => p.mandado));
  const salen: number[] = [];
  for (const numero of conPlatos) {
    if (marchados.has(numero)) continue;
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
