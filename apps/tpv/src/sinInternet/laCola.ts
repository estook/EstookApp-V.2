/**
 * **Lo que falta por subir** (T5 · 2 · 1; Arquitectura, capítulo 7): lo que se hizo sin
 * internet, en el orden en que se hizo, guardado en el aparato hasta que llega a Estook.
 *
 * Cada cosa es **un comando con su clave**, nacida aquí: subirla dos veces no la hace dos
 * veces (la idempotencia de la API). Lleva **quién la hizo** y **con qué se sube**: el turno de
 * quien estaba dentro, o la entrada sin internet de quien volvió a entrar con su PIN (que sube
 * delante, cifrada). La pantalla dice cuántas faltan: guardar sin decir que no se ha mandado
 * es peor que no guardar.
 *
 * Sobrevive a recargar el aparato, y se borra al desvincularlo.
 */

import type { LoQueSePasaPorLaCaja } from '@estook/dominio';

const DONDE = 'estook.tpv.por-subir';

/** Con qué se sube: el turno vivo de quien lo hizo, o su entrada sin internet. */
export type ConQueSeSube = { readonly turno: string } | { readonly entrada: string };

/** Lo que se enseña de un plato guardado, en la mesa y en «Por subir». */
export interface LineaGuardada {
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioCentimos: number;
}

export interface CosaPorSubir {
  /** También su clave de idempotencia. */
  readonly id: string;
  readonly nombre: string;
  readonly entrada: unknown;
  /** El reloj del aparato al hacerlo: al subir se manda cuánto hace, no qué hora era. */
  readonly hechoEn: number;
  readonly quien: { readonly id: string; readonly nombre: string };
  readonly con: ConQueSeSube;
  /** «Mesa 4 · 3 platos mandados», para «Por subir». */
  readonly que: string;
  readonly cuentaId?: string;
  readonly lineas?: readonly LineaGuardada[];
  /** Lo que no se pudo hacer al subir, dicho para quien lo mira. Sin poner, aún espera. */
  readonly fallo?: string;
  /**
   * **Lo que la cocina tiene que ver**, para pasárselo a la caja de centro (T5 · 2 · 2, 0123):
   * lo mandado y lo marchado sin internet.
   */
  readonly paraLaCaja?: LoQueSePasaPorLaCaja;
  /** La caja ya lo tiene: la cocina lo ha recibido. Al subir, Estook no lo vuelve a imprimir. */
  readonly enLaCaja?: true;
}

type Escucha = () => void;
const escuchas = new Set<Escucha>();
let enMemoria: readonly CosaPorSubir[] | null = null;

function leer(): readonly CosaPorSubir[] {
  if (enMemoria !== null) return enMemoria;
  try {
    const guardada = window.localStorage.getItem(DONDE);
    enMemoria = guardada === null ? [] : (JSON.parse(guardada) as CosaPorSubir[]);
  } catch {
    enMemoria = [];
  }
  return enMemoria;
}

function escribir(cola: readonly CosaPorSubir[]): void {
  enMemoria = cola;
  try {
    if (cola.length === 0) window.localStorage.removeItem(DONDE);
    else window.localStorage.setItem(DONDE, JSON.stringify(cola));
  } catch {
    // Sin sitio, se queda en la memoria hasta subir o recargar.
  }
  for (const escucha of escuchas) escucha();
}

/** Toda la cola, la que espera y la que falló, en orden. Siempre la misma lista si no cambia. */
export function laCola(): readonly CosaPorSubir[] {
  return leer();
}

export function escucharLaCola(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

export function anadirALaCola(cosa: CosaPorSubir): void {
  if (leer().some((c) => c.id === cosa.id)) return;
  escribir([...leer(), cosa]);
}

export function quitarDeLaCola(id: string): void {
  escribir(leer().filter((c) => c.id !== id));
}

/**
 * La entrada sin internet ya subió: lo que queda de esa persona pasa a su turno de verdad,
 * para que, si se corta otra vez a medias, lo suyo siga sabiendo con qué subir.
 */
export function pasarAlTurno(entradaId: string, turno: string): void {
  escribir(
    leer().map((c) =>
      'entrada' in c.con && c.con.entrada === entradaId ? { ...c, con: { turno } } : c,
    ),
  );
}

/** La caja de centro lo recibió: ya está en cocina, aunque Estook aún no lo sepa. */
export function marcarEnLaCaja(id: string): void {
  if (!leer().some((c) => c.id === id && c.enLaCaja !== true)) return;
  escribir(leer().map((c) => (c.id === id ? { ...c, enLaCaja: true as const } : c)));
}

/** Lo que aún no ha llegado a la caja, en su orden. */
export function loQueFaltaPasar(cola: readonly CosaPorSubir[]): readonly CosaPorSubir[] {
  return loQueEspera(cola).filter((c) => c.paraLaCaja !== undefined && c.enLaCaja !== true);
}

/**
 * Si la cocina ya tiene lo de esta mesa: todo lo mandado o marchado sin internet pasó por la caja.
 * Falso si no se ha mandado nada.
 */
export function laCocinaLoTiene(cuentaId: string, cola: readonly CosaPorSubir[]): boolean {
  const deLaMesa = loQueEspera(cola).filter(
    (c) => c.cuentaId === cuentaId && c.paraLaCaja !== undefined,
  );
  return deLaMesa.length > 0 && deLaMesa.every((c) => c.enLaCaja === true);
}

export function apuntarElFallo(id: string, fallo: string): void {
  escribir(leer().map((c) => (c.id === id ? { ...c, fallo } : c)));
}

/**
 * Lo que se enseña y se cuenta: entrar y bloquear también suben, pero son de la puerta, no
 * del servicio; solo se enseñan si fallan.
 */
export function seEnsena(cosa: CosaPorSubir): boolean {
  return (
    cosa.fallo !== undefined || (cosa.nombre !== 'bloquear' && cosa.nombre !== 'entrar_con_pin')
  );
}

/** Lo que de verdad espera: lo que falló ya no se vuelve a intentar. */
export function loQueEspera(cola: readonly CosaPorSubir[]): readonly CosaPorSubir[] {
  return cola.filter((c) => c.fallo === undefined);
}

/** Al desvincular: nada del local se queda en un aparato que ya no es suyo. */
export function vaciarLaCola(): void {
  escribir([]);
}
