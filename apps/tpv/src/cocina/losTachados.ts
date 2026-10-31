import type { Respuesta } from '@estook/cliente-api';
import type { TachadoSinInternet } from './porLaCaja.ts';

/**
 * **Lo tachado en la pantalla de cocina sin internet** (T5 · 2 · 2, decisión 0123; maqueta de
 * T5 · 2, sección 4: «Lo tachado se guarda y sube al volver»). Se guarda en la pantalla, en su
 * orden, y sube al volver: tachar o destachar cada plato como quedó.
 *
 * Un plato que pasó por la caja puede no existir aún en Estook (lo sube su comandero): se
 * espera a que llegue, media hora como mucho. Lo demás que Estook no acepte se deja: la cocina
 * ya lo ve como está.
 */

const DONDE = 'estook.tpv.tachado-sin-internet';
const ESPERA_A_SU_PLATO_MS = 30 * 60_000;

type Escucha = () => void;
const escuchas = new Set<Escucha>();
let enMemoria: readonly TachadoSinInternet[] | null = null;

function leer(): readonly TachadoSinInternet[] {
  if (enMemoria !== null) return enMemoria;
  try {
    const guardado = window.localStorage.getItem(DONDE);
    enMemoria = guardado === null ? [] : (JSON.parse(guardado) as TachadoSinInternet[]);
  } catch {
    enMemoria = [];
  }
  return enMemoria;
}

function escribir(lista: readonly TachadoSinInternet[]): void {
  enMemoria = lista;
  try {
    if (lista.length === 0) window.localStorage.removeItem(DONDE);
    else window.localStorage.setItem(DONDE, JSON.stringify(lista));
  } catch {
    // Sin sitio, se queda en la memoria hasta subir o recargar.
  }
  for (const escucha of escuchas) escucha();
}

export function losTachados(): readonly TachadoSinInternet[] {
  return leer();
}

export function escucharLosTachados(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

export function tacharSinInternet(lineaId: string, salio: boolean, en = Date.now()): void {
  escribir([...leer(), { lineaId, salio, en }]);
}

/** Al desvincular: nada del local se queda en un aparato que ya no es suyo. */
export function olvidarLosTachados(): void {
  escribir([]);
}

/**
 * Sube lo tachado sin internet, en orden. Para si se corta otra vez. Devuelve cuántos subió.
 */
export async function subirLosTachados(
  mandar: (
    orden: 'tachar_en_la_pantalla' | 'destachar_en_la_pantalla',
    lineaId: string,
  ) => Promise<Respuesta<unknown>>,
  ahora = Date.now(),
): Promise<number> {
  let subidos = 0;
  for (const t of leer()) {
    const respuesta = await mandar(
      t.salio ? 'tachar_en_la_pantalla' : 'destachar_en_la_pantalla',
      t.lineaId,
    );
    if (!respuesta.ok && respuesta.error.codigo === 'sin_conexion') return subidos;
    const esperaASuPlato =
      !respuesta.ok &&
      respuesta.error.codigo === 'no_existe' &&
      ahora - t.en < ESPERA_A_SU_PLATO_MS;
    if (esperaASuPlato) continue;
    escribir(leer().filter((x) => x !== t));
    if (respuesta.ok) subidos += 1;
  }
  return subidos;
}
