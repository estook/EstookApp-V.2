import { useQuery } from '@tanstack/react-query';
import { puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { MisCierres } from '../servicio/contrato.ts';

/**
 * Cómo se cierra la caja de este local y si esta persona puede cerrarla: el último
 * cierre y poco más. La misma consulta para la tarjeta del Panel y para el widget de
 * Ventas sin cajas (0085): con dos, el Panel pedía una aparte, después del lote.
 */
export function usarComoSeCierra() {
  const { cliente, permisos, yo } = usarSesion();
  return useQuery({
    queryKey: ['mis_cierres', 'como'],
    enabled: puedeVer(permisos, 'dato.ventas') && yo?.local !== null && yo?.local !== undefined,
    retry: 1,
    queryFn: async (): Promise<MisCierres> => {
      const respuesta = await cliente.consultar<MisCierres>('mis_cierres', { limite: '1' });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}
