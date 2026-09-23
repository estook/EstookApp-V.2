import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { crearClienteDelAdmin, guardarToken, hayApi, leerToken } from '../datos/cliente.ts';
import { ContextoDeSesion, type SesionDelAdmin, type YoEnElAdmin } from './Sesion.tsx';

/** Quién está dentro del admin, y cómo se mantiene al día (0041). Ver `Sesion.tsx`. */
export function ProveedorDeSesion({ children }: { readonly children: ReactNode }) {
  const cache = useQueryClient();
  const [hayToken, setHayToken] = useState(() => leerToken() !== null);

  const olvidarToken = useRef<() => void>(() => undefined);
  const cliente = useMemo(
    () =>
      crearClienteDelAdmin(() => {
        olvidarToken.current();
      }),
    [],
  );

  olvidarToken.current = useCallback(() => {
    guardarToken(null);
    setHayToken(false);
    cache.clear();
  }, [cache]);

  const consulta = useQuery({
    queryKey: ['admin_quien_soy'],
    enabled: hayApi && hayToken,
    retry: false,
    queryFn: async (): Promise<YoEnElAdmin> => {
      const respuesta = await cliente.consultar<YoEnElAdmin>('admin_quien_soy');
      if (!respuesta.ok) {
        // Sin acceso —o con una sesión que no es del admin— no hay nada que
        // enseñar: se vuelve a la puerta en vez de dejar una pantalla a medias.
        if (respuesta.error.codigo === 'sin_permiso') olvidarToken.current();
        throw new Error(respuesta.error.codigo);
      }
      return respuesta.datos;
    },
  });

  const entrar = useCallback(
    async (token: string) => {
      guardarToken(token);
      setHayToken(true);
      await cache.invalidateQueries({ queryKey: ['admin_quien_soy'] });
    },
    [cache],
  );

  const salir = useCallback(async () => {
    // Se avisa al servidor y **luego** se borra el token pase lo que pase: un
    // botón de salir que deja dentro es lo peor que puede hacer un botón de salir.
    try {
      await cliente.ejecutar('salir', {});
    } finally {
      olvidarToken.current();
    }
  }, [cliente]);

  const refrescar = useCallback(async () => {
    await cache.invalidateQueries({ queryKey: ['admin_quien_soy'] });
  }, [cache]);

  const valor = useMemo<SesionDelAdmin>(
    () => ({
      yo: hayToken ? (consulta.data ?? null) : null,
      cargando: hayApi && hayToken && consulta.isLoading,
      hayApi,
      cliente,
      entrar,
      salir,
      refrescar,
    }),
    [consulta.data, consulta.isLoading, hayToken, cliente, entrar, salir, refrescar],
  );

  return <ContextoDeSesion.Provider value={valor}>{children}</ContextoDeSesion.Provider>;
}
