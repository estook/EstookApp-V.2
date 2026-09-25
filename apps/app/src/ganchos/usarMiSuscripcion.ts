import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import type { MiSuscripcion } from '../pago/contrato.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La suscripción de tu organización (0048): Elegir plan y Ajustes → Suscripción.
 *
 * Solo la lee quien lleva la facturación; a los demás el servidor les dice
 * `sin_permiso`, y la pantalla lo cuenta como lo que es: que la lleva otra persona.
 * Por eso no se reintenta un «no».
 */
export function usarMiSuscripcion(enabled = true): UseQueryResult<MiSuscripcion, FalloDeLaApi> {
  const { cliente, yo } = usarSesion();
  return useQuery({
    queryKey: ['mi_suscripcion', yo?.organizacion?.id ?? null],
    enabled: enabled && yo?.organizacion !== null && yo?.organizacion !== undefined,
    retry: (veces, fallo) => fallo.error.codigo === 'sin_conexion' && veces < 2,
    queryFn: async (): Promise<MiSuscripcion> => {
      const respuesta = await cliente.consultar<MiSuscripcion>('mi_suscripcion', {});
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });
}
