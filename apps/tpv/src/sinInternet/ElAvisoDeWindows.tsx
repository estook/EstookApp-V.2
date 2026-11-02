import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { laCajaParaWindows } from '../datos/laCajaParaWindows.ts';
import { usarLoDeEstaCaja } from '../ganchos/usarLoDeEstaCaja.ts';

/** Lo que tarda en preguntar Windows después de que se vea la línea: para leerla antes. */
const LEER_ANTES_MS = 4_000;
let yaSePidio = false;

/**
 * **Windows pregunta una vez** (T5 · 2 · 2 · 2, decisión 0124; maqueta de la caja de centro,
 * sección 2): la primera vez que la caja hace de centro, Windows pide permiso con su propio
 * aviso. **Antes, Estook TPV dice qué contestar**: la caja escucha solo por dentro hasta que
 * esta línea se ve, y entonces se abre a la red del local y Windows pregunta.
 *
 * Solo en la caja para Windows, y solo mientras Windows no haya preguntado nunca.
 */
export function ElAvisoDeWindows({ enLaPuerta = false }: { readonly enLaPuerta?: boolean }) {
  const caja = usarLoDeEstaCaja();
  const cache = useQueryClient();
  const espera = caja?.soloPorDentro === true;

  useEffect(() => {
    if (!espera || yaSePidio) return undefined;
    const reloj = window.setTimeout(() => {
      yaSePidio = true;
      void laCajaParaWindows()
        ?.escucharEnLaRed?.()
        .finally(() => {
          void cache.invalidateQueries({ queryKey: ['la_caja_de_centro'] });
        });
    }, LEER_ANTES_MS);
    return () => {
      window.clearTimeout(reloj);
    };
  }, [espera, cache]);

  if (!espera) return null;
  return (
    <div className={enLaPuerta ? '' : 'px-e4 pt-e3 md:px-e5'}>
      <div
        role="status"
        className="rounded-grande bg-info-suave py-e2 pl-e4 pr-e2 font-bold text-info"
      >
        Windows va a preguntar si Estook TPV puede usar la red. Deja marcado «Redes privadas» y toca
        «Permitir acceso»
      </div>
    </div>
  );
}
