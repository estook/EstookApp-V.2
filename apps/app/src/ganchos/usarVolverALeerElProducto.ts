import { useQueryClient } from '@tanstack/react-query';

/**
 * Volver a leer un producto después de deshacer (M7, repaso).
 *
 * ── Por qué hace falta decirlo aparte ───────────────────────────────────────
 *
 * Porque guardar refresca por el camino de siempre —la pantalla lo hace al
 * confirmar— y **deshacer no pasa por ahí**: se llama desde la barra de abajo,
 * que sigue en pantalla cuando ya se ha cerrado la hoja y hasta cuando se ha
 * cambiado de sitio.
 *
 * Sin esto, deshacer deshacía de verdad en la base y la pantalla seguía
 * enseñando lo de antes. Es lo peor de los dos mundos, porque quien lo pulsa se
 * va creyendo lo que ve. Lo cazó la prueba de pantalla, que deshizo un precio de
 * venta y se encontró la tarjeta sin cambiar.
 */
export function usarVolverALeerElProducto(productoId: string): () => Promise<void> {
  const cache = useQueryClient();
  return async () => {
    await cache.invalidateQueries({ queryKey: ['un_producto', productoId] });
    await cache.invalidateQueries({ queryKey: ['mis_productos'] });
  };
}
