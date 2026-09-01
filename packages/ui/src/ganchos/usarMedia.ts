import { useEffect, useState } from 'react';

/**
 * Escuchar una consulta de medios desde React.
 *
 * Casi todo se resuelve con CSS, y asi debe ser. Esto es para lo que **no** se
 * puede: cuando la diferencia no es como se pinta algo sino **que se pinta**. La
 * rueda de apps es el caso: con «reducir movimiento» no es la misma rueda mas
 * quieta, es una rejilla de tarjetas distinta.
 *
 * Se usa `useSyncExternalStore` por dentro? No: `useState` con suscripcion basta
 * y se lee mejor. Lo importante es que el valor inicial se calcule en el primer
 * pintado y no en un efecto, o la rueda parpadearia al abrirse.
 */
export function usarMedia(consulta: string): boolean {
  const [encaja, setEncaja] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(consulta).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(consulta);
    const alCambiar = () => {
      setEncaja(media.matches);
    };

    alCambiar();
    media.addEventListener('change', alCambiar);
    return () => {
      media.removeEventListener('change', alCambiar);
    };
  }, [consulta]);

  return encaja;
}

/**
 * «Con "reducir movimiento" activo, la rueda es una rejilla de tarjetas con la
 * misma informacion» (B5).
 */
export function usarMovimientoReducido(): boolean {
  return usarMedia('(prefers-reduced-motion: reduce)');
}

/**
 * «En tableta, por debajo de 1.024 px se comporta como el movil, y por encima
 * como el ordenador» (Manifiesto).
 *
 * Es el unico corte de la aplicacion, y esta escrito una vez aqui para que
 * ninguna pantalla se invente el suyo.
 */
export const CORTE_DE_ESCRITORIO = 1024;

export function usarEsEscritorio(): boolean {
  return usarMedia(`(min-width: ${CORTE_DE_ESCRITORIO}px)`);
}
