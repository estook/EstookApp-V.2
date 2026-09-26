import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { LoDeHoy } from '../objetivos/contrato.ts';

/**
 * Lo de hoy · la zona de atención del Panel, ordenada por el servidor (mejora 8).
 *
 * No confundir con `usarAlmacenHoy`, que es lo de Almacén: esto junta eso,
 * las compras, la caja y el turno de quien mira, y el servidor lo ordena.
 */
export function usarLoDeHoy(): UseQueryResult<LoDeHoy> {
  const { cliente, yo } = usarSesion();
  return useQuery({
    queryKey: ['lo_de_hoy'],
    enabled: yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<LoDeHoy> => {
      const respuesta = await cliente.consultar<LoDeHoy>('lo_de_hoy', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}
