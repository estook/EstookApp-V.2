import { useEffect, useRef } from 'react';

/**
 * **El bloqueo** (Anexo 11.4, respuesta 4 de la 0107): la caja y el comandero para todos,
 * a los 2 minutos sin tocar; el móvil de cada camarero, a los 10; las pantallas de cocina
 * y de barra, nunca (`minutos` nulo).
 *
 * **No se bloquea en mitad de algo**: el tiempo cuenta desde el último toque, también
 * escribiendo una nota. Y lo que se estaba pidiendo se queda en la mesa, sin mandar.
 */
export function usarElBloqueo(minutos: number | null, alBloquear: () => void): void {
  const ultimo = useRef(Date.now());
  const bloquear = useRef(alBloquear);
  bloquear.current = alBloquear;

  useEffect(() => {
    if (minutos === null) return undefined;
    ultimo.current = Date.now();
    const tocado = () => {
      ultimo.current = Date.now();
    };
    const eventos = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    for (const evento of eventos) window.addEventListener(evento, tocado, { passive: true });
    // Se mira cada pocos segundos: un temporizador largo se duerme con la pantalla apagada.
    const reloj = window.setInterval(() => {
      if (Date.now() - ultimo.current >= minutos * 60_000) bloquear.current();
    }, 5_000);
    return () => {
      for (const evento of eventos) window.removeEventListener(evento, tocado);
      window.clearInterval(reloj);
    };
  }, [minutos]);
}
