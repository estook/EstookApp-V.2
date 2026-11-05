import { dehydrate, hydrate, type DehydratedState, type QueryClient } from '@tanstack/react-query';
import { borrar, guardar, leerUno } from './guardado.ts';
import { hayRed } from './red.ts';

/**
 * **Lo último que viste, para mirarlo sin señal** (I · decisión 0070, pregunta 2 de
 * Richi: «sí»).
 *
 * Lo que la app ha leído del servidor se guarda en el móvil, y al abrirla sin señal se
 * enseña eso, con un aviso arriba: «Sin conexión · lo de las 10:42». En la cámara o en
 * un sótano sin cobertura se puede mirar el horario, «Mi turno» o cuánto queda de algo.
 * **Solo para mirar**: lo único que se hace sin señal es fichar y apuntar mermas.
 *
 * ── De quién es lo guardado ─────────────────────────────────────────────────
 *
 * Va atado a la sesión que lo leyó (por la huella de su token, nunca el token): si
 * entra otra persona en el mismo móvil, no ve lo de la anterior. Y **se borra al salir**
 * de la app, como todo lo demás. A la semana caduca solo.
 */

const CLAVE = 'consultas';
const DURA_MS = 7 * 24 * 60 * 60 * 1000;
/** Lo que pesa más que esto no se guarda: un PDF entero no es para mirar sin señal. */
const TOPE_POR_CONSULTA = 300_000;
/** Se guarda un poco después del último cambio, no en cada uno. */
const ESPERA_AL_GUARDAR_MS = 2_000;

interface LoGuardado {
  readonly huella: string;
  readonly cuando: number;
  readonly estado: DehydratedState;
}

async function huellaDe(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * **Lo guardado, solo cuando no hay señal** (lo cazó la batería de pantalla, 1-oct).
 *
 * Con señal se pregunta al servidor como siempre: lo guardado puede ser de antes del
 * último cambio, y enseñarlo primero era ver un momento el Panel de antes, o la
 * pantalla de elegir local que ya se había elegido. Así que se recupera en dos casos:
 * al abrir sin red, y cuando el servidor no contesta porque no hay conexión
 * (`ProveedorDeSesion`). De esta misma sesión, y si no es viejo.
 */
export async function recuperarLoGuardado(
  cache: QueryClient,
  token: string | null,
  cuando: 'al_abrir' | 'sin_conexion',
): Promise<void> {
  try {
    if (token === null) {
      await borrar('cache', CLAVE);
      return;
    }
    if (cuando === 'al_abrir' && hayRed()) return;
    const guardado = await leerUno<LoGuardado>('cache', CLAVE);
    if (guardado === undefined) return;
    if (guardado.huella !== (await huellaDe(token)) || Date.now() - guardado.cuando > DURA_MS) {
      await borrar('cache', CLAVE);
      return;
    }
    hydrate(cache, guardado.estado);
  } catch {
    // Sin lo guardado se arranca como siempre, preguntando al servidor.
  }
}

/** Cuándo se leyó por última vez algo del servidor: lo que dice el aviso de arriba. */
export function loMasNuevo(cache: QueryClient): number | null {
  let mas: number | null = null;
  for (const consulta of cache.getQueryCache().getAll()) {
    const cuando = consulta.state.dataUpdatedAt;
    if (cuando > 0 && (mas === null || cuando > mas)) mas = cuando;
  }
  return mas;
}

/**
 * Guardarlo cuando cambia, **sumando y no pisando** (lo cazó una captura, 1-oct): al
 * abrir la app con señal, los primeros segundos todavía no hay nada leído, y guardar
 * eso tal cual borraba lo bueno de la vez anterior; si la señal se iba justo entonces,
 * sin red no había nada que enseñar. Así que lo nuevo de cada consulta sustituye a lo
 * suyo, y lo que todavía no se ha vuelto a leer se queda como estaba.
 *
 * Y **como mucho dos segundos después del primer cambio**, no del último: con una
 * pantalla que no para de leer cosas, esperar al último no guardaba nunca.
 */
export function guardarAlCambiar(cache: QueryClient, token: () => string | null): () => void {
  let espera: ReturnType<typeof setTimeout> | null = null;
  const guardarYa = async () => {
    espera = null;
    const elToken = token();
    if (elToken === null) return;
    try {
      const huella = await huellaDe(elToken);
      const ahora = dehydrate(cache, {
        shouldDehydrateQuery: (consulta) =>
          consulta.state.status === 'success' &&
          JSON.stringify(consulta.state.data ?? null).length <= TOPE_POR_CONSULTA,
      });
      const antes = await leerUno<LoGuardado>('cache', CLAVE);
      const deAntes =
        antes !== undefined && antes.huella === huella
          ? antes.estado.queries.filter(
              (q) =>
                Date.now() - q.state.dataUpdatedAt <= DURA_MS &&
                !ahora.queries.some((n) => n.queryHash === q.queryHash),
            )
          : [];
      await guardar('cache', CLAVE, {
        huella,
        cuando: Date.now(),
        estado: { ...ahora, queries: [...deAntes, ...ahora.queries] },
      } satisfies LoGuardado);
    } catch {
      // Si no se puede guardar, sin señal se verá menos: no se rompe nada.
    }
  };
  const quitar = cache.getQueryCache().subscribe((evento) => {
    if (evento.type !== 'updated' && evento.type !== 'removed') return;
    if (espera !== null) return;
    espera = setTimeout(() => {
      void guardarYa();
    }, ESPERA_AL_GUARDAR_MS);
  });
  return () => {
    if (espera !== null) clearTimeout(espera);
    quitar();
  };
}

/** Al salir: fuera lo guardado. */
export async function olvidarLoGuardado(): Promise<void> {
  await borrar('cache', CLAVE);
}
