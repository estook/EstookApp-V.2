import type { ErrorDeLaApi, Respuesta } from '@estook/cliente-api';
import type { TipoDeAdjunto } from '@estook/dominio';

/**
 * Lo que se ha escrito y todavía no ha llegado al servidor (repaso de C1, 6-oct).
 *
 * «Tarda en enviarse desde que das a enviar hasta que aparece, y resulta raro: mejor
 * que salga de golpe en el chat y se envíe cuando pueda.» Así es en cualquier chat: el
 * mensaje sale **al momento** con un reloj, y el reloj se vuelve ✓ cuando llega.
 *
 *   · **En orden**: se mandan de uno en uno, como se escribieron.
 *   · **Sin red, espera**: se reintenta al volver la conexión y cada pocos segundos,
 *     con la misma clave, así que reintentar no duplica nada (la idempotencia de la API).
 *   · **Si el servidor dice que no** (un fichero que no vale), se queda en rojo con
 *     «Reintentar» y «Quitar», y los demás siguen.
 *   · **Vive fuera de la pantalla**: cambiar de conversación no lo pierde. Cerrar la app
 *     sí: lo que importa sin red de verdad (fichar, mermas) tiene su cola guardada (I).
 */

export interface AdjuntoPorMandar {
  readonly tipo: TipoDeAdjunto;
  readonly mime: string;
  readonly nombre: string;
  /** En base64, sin el `data:` delante. */
  readonly contenido: string;
  readonly bytes: number;
  readonly segundos?: number;
}

export type EstadoPorMandar = 'mandando' | 'sin_red' | 'fallo';

export interface PorMandar {
  /** La clave de idempotencia: la misma en cada intento. */
  readonly clave: string;
  readonly canalId: string;
  readonly texto: string | null;
  readonly adjunto: AdjuntoPorMandar | null;
  readonly respondeA: {
    readonly id: string;
    readonly autor: string;
    readonly vista: string;
  } | null;
  readonly en: string;
  readonly estado: EstadoPorMandar;
  readonly error: ErrorDeLaApi | null;
  /** Cuando ya ha llegado: hasta que la lista lo trae, se sigue enseñando este. */
  readonly mensajeId: string | null;
}

type Mandar = (clave: string) => Promise<Respuesta<{ mensajeId: string }>>;

interface EnCola {
  item: PorMandar;
  readonly mandar: Mandar;
  readonly alLlegar: () => Promise<void>;
}

/** Cada cuánto se reintenta sin red. */
const REINTENTO_MS = 5_000;

let cola: EnCola[] = [];
let foto: readonly PorMandar[] = [];
const quienMira = new Set<() => void>();
let ocupado = false;
let reintento: ReturnType<typeof setTimeout> | null = null;

function avisar(): void {
  foto = cola.map((e) => e.item);
  for (const mirar of quienMira) mirar();
}

function cambiar(clave: string, cambio: Partial<PorMandar>): void {
  cola = cola.map((e) => (e.item.clave === clave ? { ...e, item: { ...e.item, ...cambio } } : e));
  avisar();
}

function volverAProbar(): void {
  if (reintento !== null) {
    globalThis.clearTimeout(reintento);
    reintento = null;
  }
  if (!cola.some((e) => e.item.estado === 'sin_red')) return;
  cola = cola.map((e) =>
    e.item.estado === 'sin_red' ? { ...e, item: { ...e.item, estado: 'mandando' } } : e,
  );
  avisar();
  void seguir();
}

if (typeof window !== 'undefined') window.addEventListener('online', volverAProbar);

async function seguir(): Promise<void> {
  if (ocupado) return;
  // Sin red, nada sale: si saliera el siguiente, llegarían desordenados.
  if (cola.some((e) => e.item.estado === 'sin_red')) return;
  const siguiente = cola.find((e) => e.item.estado === 'mandando' && e.item.mensajeId === null);
  if (siguiente === undefined) return;
  ocupado = true;
  try {
    const respuesta = await siguiente.mandar(siguiente.item.clave);
    if (respuesta.ok) {
      cambiar(siguiente.item.clave, { mensajeId: respuesta.datos.mensajeId, error: null });
      await siguiente.alLlegar().catch(() => undefined);
    } else if (respuesta.error.codigo === 'sin_conexion') {
      cambiar(siguiente.item.clave, { estado: 'sin_red', error: null });
      reintento ??= globalThis.setTimeout(volverAProbar, REINTENTO_MS);
    } else {
      cambiar(siguiente.item.clave, { estado: 'fallo', error: respuesta.error });
    }
  } finally {
    ocupado = false;
  }
  void seguir();
}

/** Lo escrito, a la cola: sale en la conversación al momento. */
export function mandarCuandoSePueda(
  item: PorMandar,
  mandar: Mandar,
  alLlegar: () => Promise<void>,
) {
  cola = [...cola, { item, mandar, alLlegar }];
  avisar();
  void seguir();
}

/** Uno en rojo, otra vez. */
export function reintentar(clave: string): void {
  cambiar(clave, { estado: 'mandando', error: null });
  void seguir();
}

/** Uno que ya no se quiere mandar, o que ya está en la lista. */
export function olvidar(claves: readonly string[]): void {
  if (claves.length === 0) return;
  cola = cola.filter((e) => !claves.includes(e.item.clave));
  avisar();
}

/** Para usarPorMandar: quien mira la cola se entera de cada cambio. */
export function suscribirseALaCola(mirar: () => void): () => void {
  quienMira.add(mirar);
  return () => {
    quienMira.delete(mirar);
  };
}

/** Lo que espera, en el orden en que se escribió. La misma lista mientras no cambie. */
export function laCola(): readonly PorMandar[] {
  return foto;
}

/** Para las pruebas: la cola vacía. */
export function vaciarLaCola(): void {
  cola = [];
  ocupado = false;
  if (reintento !== null) globalThis.clearTimeout(reintento);
  reintento = null;
  avisar();
}
