import { useQueryClient } from '@tanstack/react-query';

/**
 * Tras tocar una ficha (0087): las fichas, la abierta, y la carta, que enseña los
 * alérgenos de cada receta y si un plato está vinculado.
 */
export function usarRefrescarLasFichas() {
  const cache = useQueryClient();
  return async () => {
    await Promise.all(
      ['mis_fichas', 'una_ficha', 'lo_que_puede_llevar', 'mi_carta', 'un_plato'].map((nombre) =>
        cache.invalidateQueries({ queryKey: [nombre] }),
      ),
    );
  };
}
