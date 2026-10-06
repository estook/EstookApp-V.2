import { createContext, useContext } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  CLAVE_DE_MIS_CANALES,
  claveDeUnCanal,
  type MisCanales,
  type UnCanal,
} from '../chat/contrato.ts';

/**
 * El chat vivo (C1 · 0073): lo que hace falta en toda la app, no solo en el chat.
 *
 *   · **Abrirlo** al entrar en un local: los canales de fábrica, si no están, y el tema
 *     para lo que llega al segundo.
 *   · **Escuchar al segundo**: un toque «hay algo nuevo en tal canal» refresca ese
 *     canal y la lista. Sin toque —sin Supabase, o sin red—, se pregunta cada poco.
 *   · **El número del icono**: lo que no se ha leído.
 *   · **Entregado**: lo que la app ya tiene, aunque no se haya abierto.
 */

export interface ElChatVivo {
  /** Si llegan los toques al segundo. Si no, el chat abierto pregunta cada 30 segundos. */
  readonly conectado: boolean;
  readonly sinLeer: number;
}

export const ContextoDelChat = createContext<ElChatVivo>({ conectado: false, sinLeer: 0 });

export function usarElChatVivo(): ElChatVivo {
  return useContext(ContextoDelChat);
}

/** La lista de canales. La pide el proveedor; aquí se lee de la misma caché. */
export function usarMisCanales() {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: CLAVE_DE_MIS_CANALES,
    queryFn: async (): Promise<MisCanales> => {
      const respuesta = await cliente.consultar<MisCanales>('mis_canales', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}

/**
 * Un canal, de lo último hacia atrás. Sin toque al segundo, con el canal abierto se
 * pregunta cada 30 segundos: en un chat, un minuto es mucho (0071, lo que decido yo, 5).
 */
export function usarUnCanal(canalId: string | null) {
  const { cliente } = usarSesion();
  const { conectado } = usarElChatVivo();
  return useInfiniteQuery({
    queryKey: claveDeUnCanal(canalId ?? ''),
    enabled: canalId !== null,
    initialPageParam: null as string | null,
    refetchInterval: conectado ? false : 30_000,
    refetchOnWindowFocus: true,
    queryFn: async ({ pageParam }): Promise<UnCanal> => {
      const respuesta = await cliente.consultar<UnCanal>('un_canal', {
        canal_id: canalId ?? '',
        ...(pageParam === null ? {} : { antes: pageParam }),
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
    getNextPageParam: (pagina) => (pagina.hayMas ? (pagina.mensajes[0]?.id ?? null) : null),
  });
}
