import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';
import { CLAVE_DE_LA_CAMPANA, CLAVE_DE_MIS_AVISOS } from '../ganchos/usarLosAvisos.ts';
import { ContextoDelChat } from '../ganchos/usarElChat.ts';
import { escucharAlSegundo } from './alSegundo.ts';
import { CLAVE_DE_MIS_CANALES, claveDeUnCanal, type MisCanales } from './contrato.ts';

/** Con toque, la lista se repasa de vez en cuando por si acaso; sin él, cada minuto. */
const CON_TOQUE = 5 * 60_000;
const SIN_TOQUE = 60_000;

export function ProveedorDelChat({ children }: { readonly children: ReactNode }) {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const localId = yo?.local?.id ?? null;
  const [conectado, setConectado] = useState(false);

  // Abrir el chat, una vez por local: los canales de fábrica y el tema.
  const abierto = useQuery({
    queryKey: ['abrir_el_chat', localId],
    enabled: localId !== null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 2,
    queryFn: async (): Promise<string> => {
      const respuesta = await cliente.ejecutar<{ tema: string }>('abrir_el_chat', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos.tema;
    },
  });
  const tema = abierto.data ?? null;

  // Lo que llega al segundo: el canal y la lista; la campana, si es de la campana.
  useEffect(() => {
    if (tema === null) return undefined;
    const escucha = escucharAlSegundo(
      tema,
      (canalId) => {
        if (canalId === 'campana') {
          void cache.invalidateQueries({ queryKey: CLAVE_DE_LA_CAMPANA });
          void cache.invalidateQueries({ queryKey: CLAVE_DE_MIS_AVISOS });
          return;
        }
        void cache.invalidateQueries({ queryKey: CLAVE_DE_MIS_CANALES });
        void cache.invalidateQueries({ queryKey: claveDeUnCanal(canalId) });
      },
      setConectado,
    );
    return () => {
      escucha.parar();
    };
  }, [tema, cache]);

  const lista = useQuery({
    queryKey: CLAVE_DE_MIS_CANALES,
    enabled: localId !== null && abierto.isSuccess,
    refetchInterval: conectado ? CON_TOQUE : SIN_TOQUE,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<MisCanales> => {
      const respuesta = await cliente.consultar<MisCanales>('mis_canales', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  // «Entregado»: lo último de cada canal que ya tiene la app, una vez por mensaje.
  const avisado = useRef(new Map<string, string>());
  useEffect(() => {
    const canales = lista.data?.canales ?? [];
    const nuevos = canales
      .filter((c) => c.ultimo !== null && !c.ultimo.esMio)
      .filter((c) => avisado.current.get(c.id) !== c.ultimo?.id)
      .map((c) => ({ canal_id: c.id, hasta: c.ultimo?.id ?? '0' }));
    if (nuevos.length === 0) return;
    for (const n of nuevos) avisado.current.set(n.canal_id, n.hasta);
    void cliente.ejecutar('ya_me_ha_llegado', { canales: nuevos });
  }, [lista.data, cliente]);

  return (
    <ContextoDelChat.Provider value={{ conectado, sinLeer: lista.data?.sinLeer ?? 0 }}>
      {children}
    </ContextoDelChat.Provider>
  );
}
