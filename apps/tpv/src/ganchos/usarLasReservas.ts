import { useQuery } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { LasHorasParaReservar, LasReservas, LosAjustesDeReservas } from '../datos/tipos.ts';
import { FalloDeLaSala, usarAlSegundo } from './usarLaSala.ts';
import { guardarLaCopia, leerLaCopia } from '../sinInternet/laCopia.ts';

/**
 * Las reservas en Estook TPV (la Ampliación 5 · 1, 0153). Van con la sala (`['sala', …]`): el toque al
 * segundo que despierta el plano las vuelve a leer, así una reserva hecha en otro aparato sale aquí al
 * momento. Sin el toque, cada poco, como la sala. **Sin internet, las de hoy guardadas** en el aparato
 * (0153): se ven y se sientan; reservar una nueva necesita conexión.
 */

async function leer<T>(
  cliente: ReturnType<typeof usarSesion>['cliente'],
  nombre: string,
  parametros: Record<string, string>,
): Promise<T> {
  const respuesta = await cliente.consultar<T>(nombre, parametros);
  if (respuesta.ok) return respuesta.datos;
  throw new FalloDeLaSala(respuesta.error);
}

/** Las de un día; sin día, las de hoy en el local (y esas se guardan para sin internet). */
export function usarLasReservas(dia?: string, activa = true) {
  const { cliente } = usarSesion();
  const conectado = usarAlSegundo();
  return useQuery({
    queryKey: ['sala', 'las_reservas', dia ?? 'hoy'],
    queryFn: async () => {
      if (dia !== undefined) return leer<LasReservas>(cliente, 'las_reservas', { dia });
      const respuesta = await cliente.consultar<LasReservas>('las_reservas', {});
      if (respuesta.ok) {
        guardarLaCopia('las_reservas', respuesta.datos);
        return respuesta.datos;
      }
      if (respuesta.error.codigo === 'sin_conexion') {
        const guardadas = leerLaCopia<LasReservas>('las_reservas');
        if (guardadas !== undefined) return guardadas;
      }
      throw new FalloDeLaSala(respuesta.error);
    },
    refetchInterval: conectado ? 60_000 : 15_000,
    enabled: activa,
  });
}

/** Las horas que quedan para tantos un día, con la mesa que pondría Estook. */
export function usarLasHoras(dia: string, comensales: number, reservaId: string | null) {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['sala', 'horas_para_reservar', dia, comensales, reservaId],
    queryFn: () =>
      leer<LasHorasParaReservar>(cliente, 'horas_para_reservar', {
        dia,
        comensales: String(comensales),
        ...(reservaId === null ? {} : { reserva_id: reservaId }),
      }),
    placeholderData: (antes) => antes,
  });
}

export function usarLosAjustesDeReservas() {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['sala', 'los_ajustes_de_reservas'],
    queryFn: () => leer<LosAjustesDeReservas>(cliente, 'los_ajustes_de_reservas', {}),
  });
}
