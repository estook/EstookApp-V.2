import { useQueryClient } from '@tanstack/react-query';

/**
 * Tras tocar la carta (0086): la carta entera y la ficha abierta, otra vez. Y desde
 * M10 · 1 (0102), los agotados y el equilibrio, que salen de los mismos platos.
 */
export function usarRefrescarLaCarta() {
  const cache = useQueryClient();
  return async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['mi_carta'] }),
      cache.invalidateQueries({ queryKey: ['un_plato'] }),
      cache.invalidateQueries({ queryKey: ['los_agotados'] }),
      cache.invalidateQueries({ queryKey: ['el_equilibrio_de_la_carta'] }),
    ]);
  };
}
