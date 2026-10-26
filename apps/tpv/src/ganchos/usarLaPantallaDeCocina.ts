import { useEffect, useState } from 'react';

/**
 * Los ganchos de la pantalla de cocina (T4 · 1, decisión 0116): que la pantalla no se apague
 * sola, y la hora del aparato para pintar lo que se pliega en Acabados.
 */

/** Que la pantalla no se apague sola mientras está abierta (y volver a pedirlo al volver). */
export function usarPantallaEncendida(): void {
  useEffect(() => {
    let cerrojo: WakeLockSentinel | null = null;
    const pedir = () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      void navigator.wakeLock
        .request('screen')
        .then((c) => {
          cerrojo = c;
        })
        .catch(() => {
          // Sin permiso (o sin pantalla), la tablet se apaga como siempre: nada más.
        });
    };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      document.removeEventListener('visibilitychange', pedir);
      void cerrojo?.release();
    };
  }, []);
}

/** La hora del aparato, solo para pintar lo que se pliega: lo de hacer lo pone el servidor. */
export function usarReloj(cada: number): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      setAhora(Date.now());
    }, cada);
    return () => {
      window.clearInterval(id);
    };
  }, [cada]);
  return ahora;
}
