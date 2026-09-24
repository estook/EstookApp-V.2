import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { MisObjetivos } from '../objetivos/contrato.ts';

/**
 * Los objetivos y el semáforo de la semana (entrega O · 0047).
 *
 * Una lectura para el widget del Panel y para Ajustes: los dos piden la misma
 * `queryKey`, así que el segundo lee de la caché. Solo dentro de un local; qué
 * cifras llegan lo decide el servidor, por permisos.
 */
export function usarMisObjetivos(activo = true): UseQueryResult<MisObjetivos> {
  const { cliente, yo } = usarSesion();
  return useQuery({
    queryKey: ['mis_objetivos'],
    enabled: activo && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<MisObjetivos> => {
      const respuesta = await cliente.consultar<MisObjetivos>('mis_objetivos', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}
