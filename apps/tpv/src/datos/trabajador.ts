/**
 * El trabajador de servicio de Estook TPV, del lado de la app (0115). Es el mismo de Estook
 * (`herramientas/trabajador-de-servicio.ts`), con su propia caché: **abre sin señal** y hace
 * que Estook TPV se pueda instalar. **Solo en lo construido**: en desarrollo guardaría el
 * código y se vería el de ayer.
 *
 * **La versión nueva, sin recargar delante de nadie** (la pausa del 5-nov), como en Estook:
 * la que está abierta sigue con la suya y la nueva entra la próxima vez que se abra. Solo se
 * recarga si la página no se está viendo. Antes se recargaba si llegaba en los primeros 15
 * segundos sin tocar nada, y en pleno servicio volvía el logo.
 */
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
      // Sin trabajador, Estook TPV va igual: sin señal no abre, y no se instala.
    });
  };
  if (document.readyState === 'complete') poner();
  else window.addEventListener('load', poner, { once: true });

  const habiaTrabajador = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaTrabajador && document.visibilityState === 'hidden') window.location.reload();
  });
}
