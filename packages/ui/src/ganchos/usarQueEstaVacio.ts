import { useContext, useEffect } from 'react';
import { AvisoDeVacio } from '../panel/vacio.ts';

/**
 * Le dice a la rejilla del Panel si este widget está vacío ahora (M7, 0039).
 *
 * `undefined` mientras se carga: **cargando no es vacío**. Si se contara como
 * vacío, el Panel abriría sin widgets y los iría enseñando según llegan los
 * datos, que es justo el salto que se quiere evitar.
 *
 * Solo lo llaman los widgets que pueden quedarse sin nada que decir —lo que
 * caduca, lo que falta, lo que llega—. Un widget que siempre tiene algo, como
 * fichar o las apps, no lo llama y nunca se aparta.
 */
export function usarQueEstaVacio(vacio: boolean | undefined): void {
  const avisar = useContext(AvisoDeVacio);

  useEffect(() => {
    if (avisar === null || vacio === undefined) return;
    avisar(vacio);
  }, [avisar, vacio]);

  // Al irse, deja de contar como vacío: si se quita del Panel, no tiene que
  // seguir saliendo en «sin nada ahora».
  useEffect(
    () => () => {
      avisar?.(false);
    },
    [avisar],
  );
}
