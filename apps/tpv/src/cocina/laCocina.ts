import type { LaPantallaDeCocina, TarjetaDeCocina } from '../datos/tipos.ts';

/**
 * **Lo que piensa la pantalla de cocina** (T4 · 1, decisión 0116), sin pintar nada: el color
 * del tiempo, lo acabado que se ve y lo que se pliega, qué suena al llegar algo nuevo y qué
 * plato tacha el teclado de cocina. Cálculo puro: se prueba sin abrir nada.
 */

export type ColorDelTiempo = 'en_hora' | 'justo' | 'tarde';

/** Verde, ámbar a los `avisoMin` y rojo a los `tardeMin` (Ajustes del TPV › Cocina y barra). */
export function elColorDelTiempo(
  minutos: number,
  ajustes: { readonly avisoMin: number; readonly tardeMin: number },
): ColorDelTiempo {
  if (minutos >= ajustes.tardeMin) return 'tarde';
  if (minutos >= ajustes.avisoMin) return 'justo';
  return 'en_hora';
}

/** Lo acabado en los últimos 40 minutos se ve entero; lo de antes, plegado (Richi, 25-oct). */
export const MINUTOS_A_LA_VISTA = 40;

export function losAcabados(
  fuera: readonly TarjetaDeCocina[],
  ahoraMs: number,
): { readonly recientes: TarjetaDeCocina[]; readonly plegados: TarjetaDeCocina[] } {
  const recientes: TarjetaDeCocina[] = [];
  const plegados: TarjetaDeCocina[] = [];
  for (const t of fuera) {
    const salio = t.fueraEn === null ? ahoraMs : Date.parse(t.fueraEn);
    if (ahoraMs - salio <= MINUTOS_A_LA_VISTA * 60_000) recientes.push(t);
    else plegados.push(t);
  }
  return { recientes, plegados };
}

/**
 * **Lo de llevar programado se empieza veinte minutos antes de su hora** (0121; Richi, 28-oct:
 * «el cliente llama y lo quiere para una hora concreta»). Hasta entonces la cocina lo ve
 * aparte, con su hora, y no le da tecla: no se cocina antes de tiempo ni se olvida.
 */
export const MINUTOS_ANTES_DE_LO_PROGRAMADO = 20;

/** Cuándo empieza la cocina lo programado; nulo si es para ya. */
export function cuandoSeEmpieza(t: TarjetaDeCocina): number | null {
  const paraLas = t.paraLas ?? null;
  return paraLas === null ? null : Date.parse(paraLas) - MINUTOS_ANTES_DE_LO_PROGRAMADO * 60_000;
}

/** Lo que se hace ya, y lo programado que aún no toca, por su hora. */
export function separarLoProgramado(
  enMarcha: readonly TarjetaDeCocina[],
  ahoraMs: number,
): { readonly ya: TarjetaDeCocina[]; readonly programados: TarjetaDeCocina[] } {
  const ya: TarjetaDeCocina[] = [];
  const programados: TarjetaDeCocina[] = [];
  for (const t of enMarcha) {
    const empieza = cuandoSeEmpieza(t);
    if (empieza !== null && empieza > ahoraMs) programados.push(t);
    else ya.push(t);
  }
  programados.sort((a, b) => (cuandoSeEmpieza(a) ?? 0) - (cuandoSeEmpieza(b) ?? 0));
  return { ya, programados };
}

export type Sonido = 'nueva' | 'marcha' | 'aviso';

/**
 * **Qué suena** al llegar lo nuevo, comparado con lo de antes: una mesa nueva, una marcha, o
 * algo que pide mirar ya (un plato anulado, «tienen prisa»). Lo que pide mirar manda: suena
 * una sola vez, lo más importante. Nada la primera vez: al encender no suena todo lo que hay.
 */
export function loQueSuena(
  antes: LaPantallaDeCocina | undefined,
  ahora: LaPantallaDeCocina,
): Sonido | null {
  if (antes === undefined) return null;
  const deAntes = new Map(
    [...antes.enMarcha, ...antes.esperando, ...antes.fuera].map((t) => [t.cuentaId, t]),
  );
  let suena: Sonido | null = null;
  for (const t of [...ahora.enMarcha, ...ahora.esperando]) {
    const antesEra = deAntes.get(t.cuentaId);
    const anulados = (x: TarjetaDeCocina) =>
      x.pases.flatMap((p) => p.platos).filter((p) => p.anulado).length;
    if (
      (t.conPrisa && antesEra?.conPrisa !== true) ||
      (antesEra !== undefined && anulados(t) > anulados(antesEra))
    ) {
      return 'aviso';
    }
    // Una mesa nueva, una que vuelve de Acabados (los postres, otra ronda en la barra) o lo
    // pedido de más en una que está en marcha: suena como lo nuevo (0117).
    const platos = (x: TarjetaDeCocina) => x.pases.flatMap((p) => p.platos).length;
    if (antesEra === undefined || antesEra.estado === 'fuera' || platos(t) > platos(antesEra)) {
      suena = suena ?? 'nueva';
    }
    if (
      antesEra !== undefined &&
      t.ultimaMarcha !== null &&
      t.ultimaMarcha !== antesEra.ultimaMarcha
    ) {
      suena = 'marcha';
    }
  }
  return suena;
}

/** «¡MARCHA EL 2.º!» durante los primeros minutos de la marcha, para que se vea. */
export function elPaseQueAcabaDeMarchar(t: TarjetaDeCocina): number | null {
  if (t.ultimaMarcha === null || t.minutos >= 5) return null;
  const marchados = t.pases.filter((p) => p.marchadoEn === t.ultimaMarcha);
  return marchados[marchados.length - 1]?.numero ?? null;
}

/**
 * **El plato que tacha el teclado de cocina** con la tecla de su tarjeta: el primero que
 * falta por salir de lo que está en marcha. Lo que espera a la sala no se tacha.
 */
export function elPlatoQueSigue(t: TarjetaDeCocina): string | null {
  for (const pase of t.pases) {
    if (pase.marchadoEn === null) continue;
    const plato = pase.platos.find((p) => p.salioEn === null && !p.anulado);
    if (plato !== undefined) return plato.id;
  }
  return null;
}
