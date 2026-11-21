import { useQuery } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import { AL_DIA } from '../datos/alDia.ts';
import type { ComoVaHoy } from '../panel/elPanel/datos.ts';

/**
 * Una consulta del Panel que se pone al día sola. La clave es la misma que la de `usarLectura`
 * (el nombre y lo que se pregunta): dos widgets que piden lo mismo hacen un solo viaje.
 */
export function usarLoDelPanel<T>(
  nombre: string,
  parametros: Readonly<Record<string, string>> = {},
  activa = true,
) {
  const { cliente, yo } = usarSesion();
  return useQuery({
    queryKey: [nombre, parametros],
    enabled: activa && yo?.local !== null && yo?.local !== undefined,
    ...AL_DIA,
    queryFn: async (): Promise<T> => {
      const respuesta = await cliente.consultar<T>(nombre, { ...parametros });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}

export function usarComoVaHoy(activa = true) {
  return usarLoDelPanel<ComoVaHoy>('como_va_hoy', {}, activa);
}
