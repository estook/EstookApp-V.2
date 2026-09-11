import { useQuery } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Lee una consulta de la API (M7).
 *
 * La clave de caché es **el nombre y lo que se pregunta**, así que invalidar solo
 * por el nombre —`['mis_pedidos']`— las refresca todas a la vez: un pedido
 * recibido refresca la lista de abiertos y la de recibidos sin tener que
 * acordarse de cuál estaba en pantalla.
 *
 * Y como la clave es la misma se lea desde donde se lea, la cabecera de Pedidos,
 * la tarjeta de «Hoy» y el widget del Panel que piden `compras_de_hoy` hacen **un
 * solo viaje** entre los tres.
 */
export function usarLectura<T>(
  nombre: string,
  parametros: Readonly<Record<string, string>> = {},
  activa = true,
) {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: [nombre, parametros],
    enabled: activa,
    queryFn: async (): Promise<T> => {
      const respuesta = await cliente.consultar<T>(nombre, { ...parametros });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}
