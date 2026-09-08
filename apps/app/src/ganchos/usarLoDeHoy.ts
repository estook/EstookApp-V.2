import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { InventarioHoy } from '../inventario/contrato.ts';

/**
 * Lo que hay que atender del inventario, pedido **una vez** para todo el Panel.
 *
 * ── Por qué esto es un gancho y no una consulta dentro de cada widget ────────
 *
 * Porque de esta misma respuesta salen cinco cosas del Panel —lo que caduca, lo
 * que está bajo mínimo, los que no tienen precio, lo que vale la cámara y cuánto
 * género hay— más la línea de «lo que falta». Si cada uno la pidiera por su
 * cuenta serían seis viajes para pintar una pantalla, y el presupuesto de
 * velocidad de B7 da **un segundo** para el Panel entero con un año de datos.
 *
 * Lo resuelve TanStack Query solo: todos usan la misma `queryKey`, así que el
 * primero pide y los demás leen de la caché. Y quitar un widget del Panel deja de
 * pedir su parte sin que nadie tenga que acordarse de nada.
 *
 * ── Y por qué no se pide si no toca ──────────────────────────────────────────
 *
 * Sin la app de Inventario en el acceso, o sin estar dentro de un local, esto se
 * queda quieto: preguntarlo sería llevarse un «esto no está en tu acceso» en la
 * primera pantalla del día, que es exactamente lo que no puede pasar en el Panel.
 */
export function usarLoDeHoy(): UseQueryResult<InventarioHoy> {
  const { cliente, permisos, yo } = usarSesion();
  const loTiene = puedeVer(permisos, 'app.inventario');

  return useQuery({
    queryKey: ['inventario_hoy'],
    enabled: loTiene && yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<InventarioHoy> => {
      const respuesta = await cliente.consultar<InventarioHoy>('inventario_hoy', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}
