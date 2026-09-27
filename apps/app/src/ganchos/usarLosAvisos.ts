import { useCallback } from 'react';
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { FechaOperativa, TipoDeAviso } from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La campana (entrega R · decisión 0052): cuántos avisos hay sin leer, la lista, y
 * marcarlos como vistos.
 *
 * **El número se pregunta cada minuto**, y solo con la app a la vista: con el móvil
 * en el bolsillo no hay nadie mirando la campana, y preguntar gastaría batería por
 * nada (React Query no repite con la pestaña escondida). Al volver a la app se
 * pregunta al momento.
 */
export interface UnAviso {
  readonly id: string;
  readonly tipo: TipoDeAviso;
  readonly titulo: string;
  readonly detalle: string | null;
  readonly ir: string | null;
  readonly localId: string | null;
  readonly local: string | null;
  readonly cuando: string;
  readonly dia: FechaOperativa;
  readonly leido: boolean;
}

export interface MisAvisos {
  readonly hoy: FechaOperativa;
  readonly sinLeer: number;
  readonly avisos: readonly UnAviso[];
}

export const CLAVE_DE_LA_CAMPANA = ['cuantos_avisos'] as const;
export const CLAVE_DE_MIS_AVISOS = ['mis_avisos'] as const;

const CADA_MINUTO = 60_000;

/** El número de la campana. Cero mientras no se sabe: una campana no se inventa avisos. */
export function usarLaCampana(): number {
  const { cliente, yo } = usarSesion();
  const consulta = useQuery({
    queryKey: CLAVE_DE_LA_CAMPANA,
    enabled: yo !== null,
    refetchInterval: CADA_MINUTO,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<number> => {
      const respuesta = await cliente.consultar<{ sinLeer: number }>('cuantos_avisos', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos.sinLeer;
    },
  });
  return consulta.data ?? 0;
}

/** La lista, solo con la hoja abierta. */
export function usarMisAvisos(abierta: boolean): UseQueryResult<MisAvisos> {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: CLAVE_DE_MIS_AVISOS,
    enabled: abierta,
    queryFn: async (): Promise<MisAvisos> => {
      const respuesta = await cliente.consultar<MisAvisos>('mis_avisos', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}

/**
 * Marcar como vistos unos, o todos. **Se ve al momento** —la campana baja y el
 * punto se va— y se guarda por detrás: esperar a la red para quitar un punto es lo
 * que hace que una app parezca lenta. Si no se guarda, la siguiente lectura lo
 * vuelve a poner como estaba.
 */
export function usarLeerAvisos(): (ids?: readonly string[]) => Promise<void> {
  const { cliente } = usarSesion();
  const cache = useQueryClient();

  return useCallback(
    async (ids?: readonly string[]) => {
      const antes = cache.getQueryData<MisAvisos>(CLAVE_DE_MIS_AVISOS);
      if (antes !== undefined) {
        const vistos = ids === undefined ? null : new Set(ids);
        const avisos = antes.avisos.map((a) =>
          vistos === null || vistos.has(a.id) ? { ...a, leido: true } : a,
        );
        const sinLeer = avisos.filter((a) => !a.leido).length;
        cache.setQueryData<MisAvisos>(CLAVE_DE_MIS_AVISOS, { ...antes, avisos, sinLeer });
        cache.setQueryData<number>(CLAVE_DE_LA_CAMPANA, sinLeer);
      } else if (ids === undefined) {
        cache.setQueryData<number>(CLAVE_DE_LA_CAMPANA, 0);
      }

      await cliente.ejecutar('leer_avisos', ids === undefined ? {} : { ids });
      void cache.invalidateQueries({ queryKey: CLAVE_DE_LA_CAMPANA });
    },
    [cliente, cache],
  );
}
