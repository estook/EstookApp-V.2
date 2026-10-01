import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import { AL_DIA } from '../datos/alDia.ts';
import type { ElHorario } from '../horario/contrato.ts';

/**
 * El horario publicado de esta semana (H2 · 0069), para «Mi turno» del Panel. Lo
 * escriben otros —quien lo monta y lo publica—, así que se pone al día solo
 * mientras se mira (`datos/alDia.ts`).
 */
export function usarElHorarioDeEstaSemana(): UseQueryResult<ElHorario> {
  const { cliente, yo } = usarSesion();
  return useQuery({
    queryKey: ['el_horario', 'esta'],
    enabled: yo?.local !== null && yo?.local !== undefined,
    ...AL_DIA,
    queryFn: async (): Promise<ElHorario> => {
      const respuesta = await cliente.consultar<ElHorario>('el_horario', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}
