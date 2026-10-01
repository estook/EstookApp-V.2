import { useSyncExternalStore } from 'react';
import { alCambiarLaRed, hayRed } from '../sinConexion/red.ts';
import {
  alCambiarLoPendiente,
  loNoApuntadoDe,
  loPendienteDe,
  type NoApuntado,
  type Pendiente,
} from '../sinConexion/cola.ts';

/** Si hay señal, y se vuelve a pintar cuando cambia. */
export function usarHayRed(): boolean {
  return useSyncExternalStore(alCambiarLaRed, hayRed, () => true);
}

/**
 * Lo que alguien tiene sin mandar y lo que no se pudo apuntar. La lista cambia de
 * identidad solo cuando cambia de verdad, para no volver a pintar por nada.
 */
export function usarLoPendiente(de: string | null): {
  readonly pendientes: readonly Pendiente[];
  readonly noApuntados: readonly NoApuntado[];
} {
  const pendientes = useSyncExternalStore(
    alCambiarLoPendiente,
    () => (de === null ? NADA : enCache('p', de, loPendienteDe(de))),
    () => NADA,
  );
  const noApuntados = useSyncExternalStore(
    alCambiarLoPendiente,
    () => (de === null ? NADA_NO : enCache('n', de, loNoApuntadoDe(de))),
    () => NADA_NO,
  );
  return { pendientes, noApuntados };
}

const NADA: readonly Pendiente[] = [];
const NADA_NO: readonly NoApuntado[] = [];

/** `useSyncExternalStore` pide la misma lista si no ha cambiado: se recuerda la última. */
const ultimas = new Map<string, readonly unknown[]>();
function enCache<T>(tipo: string, de: string, lista: readonly T[]): readonly T[] {
  const clave = `${tipo}:${de}`;
  const antes = ultimas.get(clave) as readonly T[] | undefined;
  if (
    antes !== undefined &&
    antes.length === lista.length &&
    antes.every((p, i) => (p as { id: string }).id === (lista[i] as { id: string }).id)
  ) {
    return antes;
  }
  ultimas.set(clave, lista);
  return lista;
}
