/**
 * Lo que llega al segundo (C1 · decisión 0073).
 *
 * La app escucha **su tema**, un nombre secreto que le da la API al abrir el chat. Por
 * él solo llega «hay algo nuevo en tal canal», nunca el mensaje: al oírlo, la app
 * vuelve a preguntar a la API con su sesión, como siempre. Lo da Supabase Realtime, con
 * su librería oficial (`@supabase/realtime-js`), que **se descarga solo si hace falta**:
 * sin la dirección de Supabase, o sin red, no se carga nada y el chat pregunta cada poco.
 */

const DIRECCION = (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? '';
const CLAVE_PUBLICA = (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? '';

/** Si esta construcción sabe escuchar al segundo. Si no, el chat pregunta cada poco. */
export const HAY_AL_SEGUNDO = DIRECCION.startsWith('https://') && CLAVE_PUBLICA !== '';

/** El evento que manda la API: el mismo nombre que en `servidor/infraestructura/al-segundo.ts`. */
const EVENTO = 'nuevo';

export interface Escucha {
  parar(): void;
}

/**
 * Empieza a escuchar el tema. `alLlegar` recibe el canal en el que hay algo nuevo.
 * Devuelve cómo pararlo. Nunca lanza: si no se puede conectar, no pasa nada.
 */
export function escucharAlSegundo(
  tema: string,
  alLlegar: (canalId: string) => void,
  alCambiar: (conectado: boolean) => void,
): Escucha {
  const estado = { parado: false };
  const parada = (): boolean => estado.parado;
  let parar: () => void = () => undefined;

  if (!HAY_AL_SEGUNDO) {
    alCambiar(false);
    return { parar: () => undefined };
  }

  void (async () => {
    try {
      const { RealtimeClient, REALTIME_SUBSCRIBE_STATES } = await import('@supabase/realtime-js');
      if (parada()) return;
      const cliente = new RealtimeClient(`${DIRECCION.replace(/^https:/, 'wss:')}/realtime/v1`, {
        params: { apikey: CLAVE_PUBLICA },
      });
      const canal = cliente.channel(tema, { config: { broadcast: { self: false } } });
      canal.on('broadcast', { event: EVENTO }, (mensaje: { payload?: { canal?: unknown } }) => {
        const canalId = mensaje.payload?.canal;
        if (typeof canalId === 'string') alLlegar(canalId);
      });
      canal.subscribe((como) => {
        alCambiar(como === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
      });
      parar = () => {
        void cliente.removeChannel(canal);
        void cliente.disconnect();
      };
      if (parada()) parar();
    } catch {
      alCambiar(false);
    }
  })();

  return {
    parar() {
      estado.parado = true;
      parar();
    },
  };
}
