/**
 * Lo que se guarda en el móvil (I · decisión 0070), en IndexedDB.
 *
 * Tres cajones:
 *
 *   pendientes     lo hecho sin señal que falta mandar (fichar, mermas)
 *   no_apuntados   lo que se mandó y Estook no pudo apuntar, para decirlo
 *   cache          lo último que se vio, para mirarlo sin señal (pregunta 2 de Richi)
 *
 * **IndexedDB y no `localStorage`**: aguanta mucho más, no bloquea la pantalla al
 * escribir y es lo que el iPhone conserva en una app de la pantalla de inicio.
 *
 * Si no se puede abrir —navegación privada, un navegador viejo—, se guarda en memoria:
 * la app funciona igual mientras esté abierta, y nada se rompe.
 */

export type Cajon = 'pendientes' | 'no_apuntados' | 'cache';

const BASE = 'estook';
const VERSION = 1;
const CAJONES: readonly Cajon[] = ['pendientes', 'no_apuntados', 'cache'];

let laBase: Promise<IDBDatabase | null> | null = null;
const enMemoria = new Map<Cajon, Map<string, unknown>>(CAJONES.map((c) => [c, new Map()]));

function abrir(): Promise<IDBDatabase | null> {
  laBase ??= new Promise((resolver) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolver(null);
        return;
      }
      const peticion = indexedDB.open(BASE, VERSION);
      peticion.onupgradeneeded = () => {
        for (const cajon of CAJONES) {
          if (!peticion.result.objectStoreNames.contains(cajon)) {
            peticion.result.createObjectStore(cajon);
          }
        }
      };
      peticion.onsuccess = () => {
        resolver(peticion.result);
      };
      peticion.onerror = () => {
        resolver(null);
      };
      peticion.onblocked = () => {
        resolver(null);
      };
    } catch {
      resolver(null);
    }
  });
  return laBase;
}

function hecho<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => {
      resolver(peticion.result);
    };
    peticion.onerror = () => {
      rechazar(peticion.error ?? new Error('IndexedDB no ha contestado'));
    };
  });
}

export async function leerTodo<T>(cajon: Cajon): Promise<T[]> {
  const base = await abrir();
  if (base === null) return [...(enMemoria.get(cajon)?.values() ?? [])] as T[];
  try {
    return await hecho(
      base.transaction(cajon, 'readonly').objectStore(cajon).getAll() as IDBRequest<T[]>,
    );
  } catch {
    return [...(enMemoria.get(cajon)?.values() ?? [])] as T[];
  }
}

export async function leerUno<T>(cajon: Cajon, clave: string): Promise<T | undefined> {
  const base = await abrir();
  if (base === null) return enMemoria.get(cajon)?.get(clave) as T | undefined;
  try {
    return await hecho(
      base.transaction(cajon, 'readonly').objectStore(cajon).get(clave) as IDBRequest<
        T | undefined
      >,
    );
  } catch {
    return enMemoria.get(cajon)?.get(clave) as T | undefined;
  }
}

export async function guardar(cajon: Cajon, clave: string, valor: unknown): Promise<void> {
  enMemoria.get(cajon)?.set(clave, valor);
  const base = await abrir();
  if (base === null) return;
  try {
    await hecho(base.transaction(cajon, 'readwrite').objectStore(cajon).put(valor, clave));
  } catch {
    // Se queda en memoria: mientras la app siga abierta, no se pierde.
  }
}

export async function borrar(cajon: Cajon, clave: string): Promise<void> {
  enMemoria.get(cajon)?.delete(clave);
  const base = await abrir();
  if (base === null) return;
  try {
    await hecho(base.transaction(cajon, 'readwrite').objectStore(cajon).delete(clave));
  } catch {
    // Si no se puede borrar, se volverá a intentar mandar: la clave impide el doble.
  }
}

export async function vaciar(cajon: Cajon): Promise<void> {
  enMemoria.get(cajon)?.clear();
  const base = await abrir();
  if (base === null) return;
  try {
    await hecho(base.transaction(cajon, 'readwrite').objectStore(cajon).clear());
  } catch {
    // Nada que hacer: lo de dentro caduca solo (la caché, a la semana).
  }
}
