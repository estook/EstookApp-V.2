import { useQueryClient } from '@tanstack/react-query';

/**
 * Lo que se refresca al quitar o congelar un lote (M7, repaso).
 *
 * Un lote toca lo que avisa («Caduca esta semana»), la ficha del producto, la
 * lista con su etiqueta «congelado», el Calendario y, si se tira, la merma y el
 * libro de movimientos. Se refresca todo junto para que ninguna pantalla se
 * quede enseñando un lote que ya no está.
 */
const LO_QUE_TOCAN_LOS_LOTES = [
  'inventario_hoy',
  'un_producto',
  'mis_productos',
  'lo_que_viene',
  'merma_de_hoy',
  'mis_mermas',
  'mis_movimientos',
] as const;

export function usarRefrescarLotes(): () => Promise<void> {
  const cache = useQueryClient();
  return async () => {
    await Promise.all(
      LO_QUE_TOCAN_LOS_LOTES.map((clave) => cache.invalidateQueries({ queryKey: [clave] })),
    );
  };
}
