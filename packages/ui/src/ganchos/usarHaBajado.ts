import { useEffect, useState } from 'react';

/** Lo que hay que bajar para que el saludo del Panel deje de verse. */
const BAJADO_DEL_SALUDO = 72;

/**
 * Si se ha bajado lo bastante como para que el saludo del Panel ya no se vea.
 * Solo escucha cuando hace falta, y una vez por fotograma.
 */
export function usarHaBajado(escuchar: boolean): boolean {
  const [bajado, setBajado] = useState(false);
  useEffect(() => {
    if (!escuchar) return;
    let pendiente = 0;
    const mirar = () => {
      pendiente = 0;
      setBajado(window.scrollY > BAJADO_DEL_SALUDO);
    };
    const alMoverse = () => {
      if (pendiente === 0) pendiente = window.requestAnimationFrame(mirar);
    };
    mirar();
    window.addEventListener('scroll', alMoverse, { passive: true });
    return () => {
      window.removeEventListener('scroll', alMoverse);
      if (pendiente !== 0) window.cancelAnimationFrame(pendiente);
    };
  }, [escuchar]);
  return escuchar ? bajado : true;
}
