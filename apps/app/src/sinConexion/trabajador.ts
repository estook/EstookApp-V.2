/**
 * El trabajador de servicio, del lado de la app (I · decisión 0070).
 *
 * Lo genera la construcción (`herramientas/trabajador-de-servicio.ts`) y aquí solo se
 * pone en marcha y se le escucha. **Solo en lo construido**: en desarrollo guardaría
 * el código y se vería el de ayer.
 *
 * Lo que dice el trabajador a la app:
 *
 *   estook-ir      han tocado un aviso con la app abierta: ir a donde se resuelve
 *   estook-aviso   ha llegado un aviso: la campana, al día
 */

type Oyente = () => void;
const alLlegar = new Set<Oyente>();

export function ponerElTrabajador(): void {
  if (
    !import.meta.env.PROD ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }
  const base = import.meta.env.BASE_URL;
  const poner = () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // Sin trabajador, la app va igual: sin señal no abre, y no llegan avisos al móvil.
    });
  };
  if (document.readyState === 'complete') poner();
  else window.addEventListener('load', poner, { once: true });

  navigator.serviceWorker.addEventListener('message', (evento: MessageEvent<unknown>) => {
    const datos = evento.data as { tipo?: string; ir?: string } | null;
    if (datos?.tipo === 'estook-ir' && typeof datos.ir === 'string' && datos.ir.startsWith('/')) {
      window.location.hash = datos.ir;
    }
    if (datos?.tipo === 'estook-aviso') for (const oyente of alLlegar) oyente();
  });
}

/** Cuando llega un aviso con la app abierta. */
export function alLlegarUnAviso(oyente: Oyente): () => void {
  alLlegar.add(oyente);
  return () => {
    alLlegar.delete(oyente);
  };
}

/**
 * El registro del trabajador, si lo hay. **Sin esperar**, salvo que se pida: donde no
 * hay trabajador (el ordenador en desarrollo, un navegador que no lo deja) no llega
 * nunca, y salir de la app esperaba cinco segundos por él (lo cazó la batería, 1-oct).
 * Solo espera quien lo necesita listo: suscribirse a los avisos.
 */
export async function elRegistro(esperar = false): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (!esperar) return (await navigator.serviceWorker.getRegistration()) ?? null;
  const listo = navigator.serviceWorker.ready;
  const tope = new Promise<null>((resolver) => {
    setTimeout(() => {
      resolver(null);
    }, 5_000);
  });
  return Promise.race([listo, tope]);
}
