import { variable } from '@estook/utiles';

/**
 * Lo que llega al segundo (C1 · decisión 0073).
 *
 * Cuando alguien escribe en el chat, a cada móvil con la app abierta le llega un
 * toque: **«hay algo nuevo en tal canal»**, sin el mensaje dentro. La app lo pide a la
 * API con su sesión, como todo lo demás. Así, aunque alguien escuchase el tema de
 * otro, no leería nada (0071, lo que decido yo, 5).
 *
 * El toque lo da **Supabase Realtime**, con su API de difusión: un `POST` a
 * `/realtime/v1/api/broadcast` con una lista de `messages` (`topic`, `event`,
 * `payload`), tal como lo cuenta su documentación (supabase.com/docs/guides/realtime/
 * broadcast, «Send messages using REST calls»). Cada persona escucha **su** tema, un
 * nombre secreto que guarda la base (`estook.tema_al_segundo`).
 *
 * ── Un toque que no llega no rompe nada ─────────────────────────────────────
 *
 * Si Supabase no contesta, el mensaje ya está guardado: la app con el chat abierto
 * pregunta cada 30 segundos de todas formas, y con la app cerrada avisa el móvil. Por
 * eso esto **nunca lanza**: dice si ha salido, y ya.
 */

/** El único evento: algo nuevo en un canal. */
export const EVENTO_AL_SEGUNDO = 'nuevo';

export interface ToqueAlSegundo {
  /** El tema secreto de la persona que tiene que enterarse. */
  readonly tema: string;
  /** Qué ha cambiado: el canal. Nunca el mensaje. */
  readonly canalId: string;
}

export interface AlSegundo {
  avisar(toques: readonly ToqueAlSegundo[]): Promise<boolean>;
}

/** Cuántos toques se mandan de una vez: un equipo grande no hace una petición enorme. */
const DE_UNA_VEZ = 100;

/**
 * El de verdad, con Supabase. Usa **las mismas credenciales que el almacén** (la
 * dirección del proyecto y `CLAVE_DE_SERVICIO`), así que no hace falta ninguna clave
 * nueva. Nulo sin ellas: entonces no hay toque, y la app pregunta.
 */
export function alSegundoDeSupabase(opciones?: {
  readonly url?: string;
  readonly clave?: string;
  readonly pedir?: typeof fetch;
}): AlSegundo | null {
  const url = opciones?.url ?? variable('SUPABASE_URL') ?? variable('VITE_SUPABASE_URL');
  const clave = opciones?.clave ?? variable('CLAVE_DE_SERVICIO');
  const pedir = opciones?.pedir ?? fetch;
  if (url === undefined || url === '' || clave === undefined || clave === '') return null;

  const direccion = `${url.replace(/\/+$/, '')}/realtime/v1/api/broadcast`;

  return {
    async avisar(toques) {
      if (toques.length === 0) return true;
      let todo = true;
      for (let i = 0; i < toques.length; i += DE_UNA_VEZ) {
        const tanda = toques.slice(i, i + DE_UNA_VEZ);
        try {
          const respuesta = await pedir(direccion, {
            method: 'POST',
            headers: {
              apikey: clave,
              authorization: `Bearer ${clave}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              messages: tanda.map((t) => ({
                topic: t.tema,
                event: EVENTO_AL_SEGUNDO,
                payload: { canal: t.canalId },
                private: false,
              })),
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (!respuesta.ok) todo = false;
        } catch {
          todo = false;
        }
      }
      return todo;
    },
  };
}

/** El de mentira, para las pruebas: no sale a internet y guarda lo que se le pide. */
export function alSegundoDeMentira(): AlSegundo & { readonly toques: ToqueAlSegundo[] } {
  const toques: ToqueAlSegundo[] = [];
  return {
    toques,
    avisar(nuevos) {
      toques.push(...nuevos);
      return Promise.resolve(true);
    },
  };
}
