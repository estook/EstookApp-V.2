import { useQueryClient } from '@tanstack/react-query';
import { LO_QUE_TOCAN_LAS_COMPRAS } from '../compras/contrato.ts';

/**
 * Lo que hay que volver a leer después de cambiar algo en compras (M7).
 *
 * Un pedido recibido cambia el pedido, la lista, lo de hoy, el Calendario, el
 * producto, el libro y lo que hay que atender. Se invalida todo junto, desde un
 * sitio, para que ninguna pantalla se quede enseñando lo de antes.
 */
export function usarRefrescarCompras(): () => Promise<void> {
  const cache = useQueryClient();
  return async () => {
    await Promise.all(
      LO_QUE_TOCAN_LAS_COMPRAS.map((clave) => cache.invalidateQueries({ queryKey: [...clave] })),
    );
  };
}
