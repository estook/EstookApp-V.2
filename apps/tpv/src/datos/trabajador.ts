/**
 * El trabajador de servicio de Estook TPV, del lado de la app (0115). Es el mismo de Estook
 * (`herramientas/trabajador-de-servicio.ts`), con su propia caché: **abre sin señal** y hace
 * que Estook TPV se pueda instalar. **Solo en lo construido**: en desarrollo guardaría el
 * código y se vería el de ayer.
 *
 * **La versión nueva, sin quedarse en la vieja**, como en Estook: si al abrir llega un
 * trabajador nuevo y todavía no se ha tocado nada, se recarga una vez con la nueva.
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
  let tocado = false;
  const alTocar = () => {
    tocado = true;
  };
  window.addEventListener('pointerdown', alTocar, { once: true, capture: true });
  window.addEventListener('keydown', alTocar, { once: true, capture: true });
  const abiertaEn = performance.now();
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaTrabajador && !tocado && performance.now() - abiertaEn < 15_000) {
      window.location.reload();
    }
  });
}
