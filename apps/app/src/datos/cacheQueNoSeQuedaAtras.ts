import { QueryClient } from '@tanstack/react-query';

/**
 * **La caché que no se queda con lo de antes de un cambio** (0085).
 *
 * Al guardar algo, la pantalla pide que se vuelva a leer lo que cambia
 * (`invalidateQueries`). Si eso se estaba leyendo **por primera vez**, TanStack Query no
 * lo vuelve a pedir: se queda esperando la lectura que ya iba de camino… que salió
 * **antes** del cambio. Escribías en el Tablón nada más abrir el Panel y seguía diciendo
 * «Sin avisos».
 *
 * Pasaba desde siempre, pero era raro: cada consulta suelta volvía enseguida. Con el
 * Panel en un solo lote la primera lectura tarda un poco más, y lo cazó la prueba del
 * Tablón. Ahora lo que se estaba leyendo por primera vez se cancela y se pide otra vez.
 */
export class CacheQueNoSeQuedaAtras extends QueryClient {
  override async invalidateQueries(
    ...[filtros, opciones]: Parameters<QueryClient['invalidateQueries']>
  ): Promise<void> {
    await this.cancelQueries({
      ...filtros,
      predicate: (consulta) =>
        consulta.state.data === undefined &&
        consulta.state.fetchStatus === 'fetching' &&
        (filtros?.predicate?.(consulta) ?? true),
    });
    return super.invalidateQueries(filtros, opciones);
  }
}
