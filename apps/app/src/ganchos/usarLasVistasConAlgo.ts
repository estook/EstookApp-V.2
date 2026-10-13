import { createContext, useContext, useEffect } from 'react';

/**
 * Las vistas que solo salen si tienen algo (repaso del 9-oct, y del 10-oct).
 *
 * «En Almacén, esconder "Sin precio", "Congelados" o "Desactivados" si están vacíos:
 * así no ocupan tanto.» Las vistas las pinta la pantalla de la app, arriba, y lo que
 * hay en cada una lo sabe la pantalla de dentro: esta es la línea entre las dos. La de
 * dentro dice **cuáles tienen algo**; la de fuera solo pinta esas (y la que se está
 * mirando), con `vistasQueSeEnsenan` de `@estook/ui`.
 *
 * ── Por qué al revés que el 9-oct ────────────────────────────────────────────
 *
 * El 9-oct la de dentro decía cuáles estaban **vacías**, y la lista de productos era
 * quien lo decía. Dos fallos que vio Richi el 10-oct:
 *
 *   · **Al entrar parpadeaban**: mientras no se sabía, no había ninguna vacía, y salían
 *     las tres para irse un instante después.
 *   · **En «Valor» volvían**: esa vista no es la lista, la lista se desmontaba y al
 *     desmontarse decía «ya no hay vacías».
 *
 * Ahora, sin saberlo, no sale ninguna, y lo dice `Almacen`, que no se desmonta al
 * cambiar de vista.
 */
export const LasVistasConAlgo = createContext<(ids: readonly string[]) => void>(() => undefined);

/** Nulo mientras no se sabe: entonces no sale ninguna de las que pueden estar vacías. */
export function usarLasVistasConAlgo(conAlgo: readonly string[] | null): void {
  const decir = useContext(LasVistasConAlgo);
  const clave = conAlgo === null ? null : conAlgo.join(',');
  useEffect(() => {
    if (clave !== null) decir(clave === '' ? [] : clave.split(','));
  }, [clave, decir]);
  // Al salir de la pantalla, se vuelve a no saber.
  useEffect(
    () => () => {
      decir([]);
    },
    [decir],
  );
}
