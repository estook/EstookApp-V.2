import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Qué ficha está abierta · en la dirección, no en un estado (M7).
 *
 * Es `usarPersonaAbierta` hecho general, por la misma razón y con más casos. Un
 * pedido se abre desde su lista, desde «Hoy», desde el widget del Panel y desde su
 * entrega en el Calendario: «un evento de una entrega lleva a su pedido; uno de
 * una caducidad, a su producto» (0031). Son cuatro sitios que no están unos
 * dentro de otros, y con la dirección cualquiera escribe `?pedido=…` y ya está.
 *
 * Y trae lo mismo de regalo: el enlace se puede mandar —«mira el pedido de
 * Makro»—, y el botón de atrás del móvil **cierra la ficha** en vez de sacarte de
 * la pantalla.
 */
export function usarAbiertoEnLaDireccion(clave: string): {
  readonly abierto: string | null;
  readonly abrir: (id: string) => void;
  readonly cerrar: () => void;
} {
  const [parametros, ponerParametros] = useSearchParams();
  const abierto = parametros.get(clave);

  const abrir = useCallback(
    (id: string) => {
      const nuevos = new URLSearchParams(parametros);
      nuevos.set(clave, id);
      ponerParametros(nuevos);
    },
    [clave, parametros, ponerParametros],
  );

  const cerrar = useCallback(() => {
    const nuevos = new URLSearchParams(parametros);
    nuevos.delete(clave);
    ponerParametros(nuevos, { replace: true });
  }, [clave, parametros, ponerParametros]);

  return { abierto, abrir, cerrar };
}
