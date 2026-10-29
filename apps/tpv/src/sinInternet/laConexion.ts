/**
 * **Si llegamos a Estook** (T5 · 2 · 1), dicho por lo único que no engaña: la última petición.
 * `navigator.onLine` dice si hay wifi, no si hay internet (un router sin línea da wifi); así
 * que manda lo que contestan las peticiones, y el aviso del navegador solo adelanta el corte.
 *
 * Y **el aviso de la vuelta**, una vez: «Conexión recuperada · 12 cosas subidas, ninguna
 * repetida» (Anexo 10.9).
 */

export interface LaVuelta {
  readonly subidas: number;
  readonly fallidas: number;
}

type Escucha = () => void;
const escuchas = new Set<Escucha>();
let sinInternet = false;
let vuelta: LaVuelta | null = null;

function avisar(): void {
  for (const escucha of escuchas) escucha();
}

/** Lo dice cada petición: si llegó a Estook o se quedó sin red. */
export function marcarLaConexion(hay: boolean): void {
  if (sinInternet === !hay) return;
  sinInternet = !hay;
  avisar();
}

export function estamosSinInternet(): boolean {
  return sinInternet;
}

export function laVuelta(): LaVuelta | null {
  return vuelta;
}

export function avisarDeLaVuelta(subido: LaVuelta | null): void {
  vuelta = subido;
  avisar();
}

export function escucharLaConexion(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => {
    escuchas.delete(escucha);
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    marcarLaConexion(false);
  });
}
