/**
 * Instalar Estook en la pantalla de inicio (I · decisión 0070).
 *
 * **En Android** (y en Chrome y Edge del ordenador) el navegador avisa de que se puede
 * instalar (`beforeinstallprompt`), y se le pide en el momento: es el botón
 * «Instalar» de la tarjeta del Panel. **En el iPhone, Apple no deja**: se hace desde
 * Compartir → «Añadir a pantalla de inicio», y la tarjeta lo enseña con un dibujo.
 *
 * El aviso del navegador llega una vez y al cargar, así que se escucha desde que
 * arranca la app (`principal.tsx`) y se guarda hasta que se use.
 */

interface PeticionDeInstalar extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

let laPeticion: PeticionDeInstalar | null = null;
const oyentes = new Set<() => void>();
const avisar = () => {
  for (const oyente of oyentes) oyente();
};

export function escucharSiSePuedeInstalar(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    laPeticion = evento as PeticionDeInstalar;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    laPeticion = null;
    avisar();
  });
}

/** Si ya se está usando instalada: abierta desde el icono, sin barra del navegador. */
export function estaInstalada(): boolean {
  if (typeof window === 'undefined') return false;
  const enIos = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return enIos || window.matchMedia('(display-mode: standalone)').matches;
}

/** iPhone o iPad, Safari o no: allí se instala con dos toques y no con un botón. */
export function esUnIphone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const agente = navigator.userAgent;
  // El iPad dice que es un Mac, pero tiene pantalla táctil.
  return (
    /iPhone|iPad|iPod/.test(agente) || (/Macintosh/.test(agente) && navigator.maxTouchPoints > 1)
  );
}

/** Un teléfono (o tableta): lo demás es un ordenador, y se le llama así (repaso, 1-oct). */
export function esUnMovil(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent) || esUnIphone();
}

export type ComoSeInstala = 'ya' | 'boton' | 'iphone' | 'no';

export function comoSeInstalaAhora(): ComoSeInstala {
  if (estaInstalada()) return 'ya';
  if (laPeticion !== null) return 'boton';
  if (esUnIphone()) return 'iphone';
  return 'no';
}

/** Para el gancho (`ganchos/usarComoSeInstala.ts`): avisa cuando cambia. */
export function alCambiarComoSeInstala(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** El botón «Instalar»: el navegador pregunta, y si dice que sí, ya está. */
export async function instalar(): Promise<boolean> {
  const peticion = laPeticion;
  if (peticion === null) return false;
  await peticion.prompt();
  const { outcome } = await peticion.userChoice;
  laPeticion = null;
  avisar();
  return outcome === 'accepted';
}
