import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usarSesion, type QuienSoy } from '../sesion/Sesion.tsx';

/**
 * Si toca ofrecer el recorrido de la primera vez, y cómo decir que ya está (0084): en la
 * cuenta (`ya_he_visto_el_recorrido`) y en el aparato, por si la cuenta no se puede
 * escribir (la demostración, o una API de antes de desplegar).
 */
const EN_EL_APARATO = 'estook.recorrido';

function vistoEnElAparato(): boolean {
  try {
    return window.localStorage.getItem(EN_EL_APARATO) === 'visto';
  } catch {
    return false;
  }
}

/** Si toca ofrecerlo, y cómo decir que ya está. */
export function usarElRecorrido(): { readonly toca: boolean; readonly yaEsta: () => void } {
  const { yo, cliente } = usarSesion();
  const cache = useQueryClient();
  const [aqui, setAqui] = useState(vistoEnElAparato);

  // Sin `preferencias` es una API de antes de la 0066: no se sabe, y no se ofrece.
  const toca =
    yo?.preferencias !== undefined && !yo.preferencias.recorridoVisto && !aqui && yo.local !== null;

  const yaEsta = useCallback(() => {
    setAqui(true);
    try {
      window.localStorage.setItem(EN_EL_APARATO, 'visto');
    } catch {
      /* sin almacenamiento, lo recuerda la cuenta */
    }
    cache.setQueryData<QuienSoy>(['quien_soy'], (antes) =>
      antes?.preferencias === undefined
        ? antes
        : { ...antes, preferencias: { ...antes.preferencias, recorridoVisto: true } },
    );
    void cliente.ejecutar('ya_he_visto_el_recorrido', {});
  }, [cache, cliente]);

  return { toca, yaEsta };
}
