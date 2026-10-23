/**
 * Lo que llega al segundo (C1 · decisión 0073), para la app y para Estook TPV.
 *
 * Cada pantalla escucha **su tema**, un nombre secreto que le da la API (`abrir_el_chat`).
 * Por él solo llega «hay algo nuevo en tal canal», nunca lo que hay: al oírlo, la pantalla
 * vuelve a preguntar a la API con su sesión, como siempre. El chat lo usa con sus canales
 * y la sala y la cocina con `servicio:<local>` (0106). Lo da Supabase Realtime, con su
 * librería oficial (`@supabase/realtime-js`), que **se descarga solo si hace falta**: sin
 * la dirección de Supabase, o sin red, no se carga nada y la pantalla pregunta cada poco.
 *
 * Vive aquí, y no en cada aplicación, porque la app y Estook TPV son dos puertas del
 * mismo código: dos copias serían dos formas de escuchar (Plan, M20A).
 */

/** Dónde está Supabase y su clave pública, que cada aplicación lee de su entorno. */
export interface DondeEscuchar {
  readonly direccion: string;
  readonly clavePublica: string;
}

/** Si con esto se sabe escuchar al segundo. Si no, la pantalla pregunta cada poco. */
export function haySegundo(donde: DondeEscuchar): boolean {
  return donde.direccion.startsWith('https://') && donde.clavePublica !== '';
}

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
  donde: DondeEscuchar,
  tema: string,
  alLlegar: (canalId: string) => void,
  alCambiar: (conectado: boolean) => void,
): Escucha {
  const estado = { parado: false };
  const parada = (): boolean => estado.parado;
  let parar: () => void = () => undefined;

  if (!haySegundo(donde)) {
    alCambiar(false);
    return { parar: () => undefined };
  }

  void (async () => {
    try {
      const { RealtimeClient, REALTIME_SUBSCRIBE_STATES } = await import('@supabase/realtime-js');
      if (parada()) return;
      const cliente = new RealtimeClient(
        `${donde.direccion.replace(/^https:/, 'wss:')}/realtime/v1`,
        { params: { apikey: donde.clavePublica } },
      );
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
