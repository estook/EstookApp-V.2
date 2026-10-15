import { useQueryClient } from '@tanstack/react-query';

/** Tras tocar la carta (0086): la carta entera y la ficha abierta, otra vez. */
export function usarRefrescarLaCarta() {
  const cache = useQueryClient();
  return async () => {
    await cache.invalidateQueries({ queryKey: ['mi_carta'] });
    await cache.invalidateQueries({ queryKey: ['un_plato'] });
  };
}
