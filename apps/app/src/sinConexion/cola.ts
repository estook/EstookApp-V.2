import { nuevaCorrelacionId } from '@estook/utiles';
import type { ClienteApi, ErrorDeLaApi, Respuesta } from '@estook/cliente-api';
import { borrar, guardar, leerTodo, vaciar } from './guardado.ts';

/**
 * Lo hecho sin señal, guardado hasta que vuelve (I · decisión 0070, mejora 15).
 *
 * **Solo fichar y apuntar mermas**, en el móvil de cada uno y en el aparato del local.
 * Se intenta mandar al momento; si no sale, se guarda aquí con **la hora de este
 * aparato** al hacerlo, y al volver la señal se manda diciendo **cuánto hace**: la
 * hora la pone el servidor con la suya (regla 10).
 *
 * ── Que no se haga dos veces ────────────────────────────────────────────────
 *
 * Cada cosa lleva su clave de idempotencia desde que se hace, y se manda siempre con
 * la misma: si la primera llegó pero no volvió la respuesta, la segunda no apunta
 * nada nuevo. Por eso «cuánto hace» va en una cabecera y no en lo que se manda.
 *
 * ── Y que no se pierda en silencio (regla 34) ────────────────────────────────
 *
 * La app dice cuántas cosas tiene sin mandar. Y lo que Estook no pudo apuntar al
 * volver —entrar estando ya dentro, una merma de más de lo que hay— se queda en una
 * lista aparte, con su porqué, hasta que quien lo hizo lo ve.
 */

export interface Pendiente {
  /** La clave de idempotencia: la misma en cada intento. */
  readonly id: string;
  /** De quién: la persona, o `aparato`. Cada uno manda solo lo suyo. */
  readonly de: string;
  readonly comando: string;
  readonly entrada: unknown;
  /** `Date.now()` de este aparato al hacerlo. Solo cuenta la diferencia con el de mandarlo. */
  readonly hechoEn: number;
  /** Lo que se enseña en la lista: «Entrada», «Merma · 1 l de Leche». */
  readonly que: string;
}

export interface NoApuntado extends Pendiente {
  readonly porque: string;
}

type Oyente = () => void;

let pendientes: Pendiente[] = [];
let noApuntados: NoApuntado[] = [];
let cargado: Promise<void> | null = null;
const oyentes = new Set<Oyente>();

function avisar(): void {
  for (const oyente of oyentes) oyente();
}

export function alCambiarLoPendiente(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Lo guardado en el móvil, una vez al arrancar. */
export function cargarLoPendiente(): Promise<void> {
  cargado ??= (async () => {
    pendientes = (await leerTodo<Pendiente>('pendientes')).sort((a, b) => a.hechoEn - b.hechoEn);
    noApuntados = await leerTodo<NoApuntado>('no_apuntados');
    avisar();
  })();
  return cargado;
}

export function loPendienteDe(de: string): readonly Pendiente[] {
  return pendientes.filter((p) => p.de === de);
}

export function loNoApuntadoDe(de: string): readonly NoApuntado[] {
  return noApuntados.filter((p) => p.de === de);
}

async function apuntarPendiente(pendiente: Pendiente): Promise<void> {
  pendientes = [...pendientes.filter((p) => p.id !== pendiente.id), pendiente].sort(
    (a, b) => a.hechoEn - b.hechoEn,
  );
  avisar();
  await guardar('pendientes', pendiente.id, pendiente);
}

async function quitarPendiente(id: string): Promise<void> {
  pendientes = pendientes.filter((p) => p.id !== id);
  avisar();
  await borrar('pendientes', id);
}

export async function olvidarNoApuntado(id: string): Promise<void> {
  noApuntados = noApuntados.filter((p) => p.id !== id);
  avisar();
  await borrar('no_apuntados', id);
}

/**
 * **Hacerlo, o guardarlo si no hay señal.** Lo que no llega ni a salir se guarda; lo
 * que llega y Estook dice que no, se dice, como siempre.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- la forma de lo que vuelve la afirma quien llama, como en `cliente.ejecutar<T>`
export async function hacerOGuardar<T>(
  cliente: ClienteApi,
  comando: string,
  entrada: unknown,
  como: { readonly de: string; readonly que: string },
): Promise<
  | { readonly tipo: 'hecho'; readonly datos: T }
  | { readonly tipo: 'guardado' }
  | { readonly tipo: 'error'; readonly error: ErrorDeLaApi }
> {
  const id = nuevaCorrelacionId();
  const hechoEn = Date.now();
  const respuesta: Respuesta<T> = await cliente.ejecutar<T>(comando, entrada, {
    claveDeIdempotencia: id,
  });
  if (respuesta.ok) return { tipo: 'hecho', datos: respuesta.datos };
  if (respuesta.error.codigo !== 'sin_conexion') return { tipo: 'error', error: respuesta.error };
  await apuntarPendiente({ id, de: como.de, comando, entrada, hechoEn, que: como.que });
  return { tipo: 'guardado' };
}

/** Guardar sin intentar mandar: el aparato del local, cuando ya sabe que no hay red. */
export async function guardarParaDespues(
  comando: string,
  entrada: unknown,
  como: { readonly de: string; readonly que: string },
): Promise<void> {
  await apuntarPendiente({
    id: nuevaCorrelacionId(),
    de: como.de,
    comando,
    entrada,
    hechoEn: Date.now(),
    que: como.que,
  });
}

/** Lo que no se va a arreglar esperando: se para y se reintenta más tarde. */
const ESPERAR_Y_REINTENTAR: ReadonlySet<string> = new Set([
  'sin_conexion',
  'sin_sesion',
  'aparato_parado',
  'demasiados_intentos',
  'fallo_nuestro',
]);

const mandando = new Map<string, Promise<number>>();

/**
 * **Mandar lo pendiente de alguien**, en el orden en que se hizo. Para en cuanto algo
 * no sale (sigue sin señal), y lo que Estook rechaza pasa a «no se pudo apuntar».
 * Devuelve cuántas cosas han salido. Nunca dos a la vez para el mismo.
 */
export function mandarLoPendiente(cliente: ClienteApi, de: string): Promise<number> {
  const enMarcha = mandando.get(de);
  if (enMarcha !== undefined) return enMarcha;
  const ahora = (async () => {
    await cargarLoPendiente();
    let salidos = 0;
    for (const pendiente of loPendienteDe(de)) {
      const respuesta = await cliente.ejecutar(pendiente.comando, pendiente.entrada, {
        claveDeIdempotencia: pendiente.id,
        hechoHaceMs: Math.max(0, Date.now() - pendiente.hechoEn),
      });
      if (respuesta.ok) {
        await quitarPendiente(pendiente.id);
        salidos += 1;
        continue;
      }
      if (ESPERAR_Y_REINTENTAR.has(respuesta.error.codigo)) break;
      const noApuntado: NoApuntado = { ...pendiente, porque: respuesta.error.quePasa };
      noApuntados = [...noApuntados, noApuntado];
      await guardar('no_apuntados', pendiente.id, noApuntado);
      await quitarPendiente(pendiente.id);
    }
    return salidos;
  })();
  mandando.set(de, ahora);
  return ahora.finally(() => {
    mandando.delete(de);
  });
}

/** Al salir de la app: lo de quien sale se tira, y él lo ha dicho (`Salir y tirarlo`). */
export async function tirarLoDe(de: string): Promise<void> {
  for (const p of loPendienteDe(de)) await quitarPendiente(p.id);
  for (const p of loNoApuntadoDe(de)) await olvidarNoApuntado(p.id);
}

/** Para las pruebas de la pantalla: dejarlo todo como recién instalado. */
export async function vaciarLoPendiente(): Promise<void> {
  pendientes = [];
  noApuntados = [];
  avisar();
  await vaciar('pendientes');
  await vaciar('no_apuntados');
}
