import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClienteApi } from '@estook/cliente-api';
import { crearClienteDelAdmin, guardarToken, hayApi, leerToken } from '../datos/cliente.ts';

/**
 * Quién está dentro del admin (0041).
 *
 * Una sola consulta, `admin_quien_soy`, decide qué pantalla toca: el código, la
 * contraseña, montar el segundo factor, o dentro. Se vuelve a preguntar al
 * cambiar cualquiera de las tres cosas, y **no se guarda nada más**: si a alguien
 * le quitan el acceso con el admin abierto, la siguiente pregunta contesta que no
 * y la pantalla le saca.
 */

export interface YoEnElAdmin {
  readonly personaId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly nivel: 'total' | 'comercial' | 'soporte' | 'vendedor';
  readonly conDobleFactor: boolean;
  readonly faltaElCodigo: boolean;
  readonly debeCambiarClave: boolean;
  readonly caducaEn: string;
}

export interface SesionDelAdmin {
  readonly yo: YoEnElAdmin | null;
  readonly cargando: boolean;
  readonly hayApi: boolean;
  readonly cliente: ClienteApi;
  readonly entrar: (token: string) => Promise<void>;
  readonly salir: () => Promise<void>;
  readonly refrescar: () => Promise<void>;
}

const Contexto = createContext<SesionDelAdmin | null>(null);

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

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarSesion(): SesionDelAdmin {
  const sesion = useContext(Contexto);
  if (!sesion) throw new Error('usarSesion() necesita estar dentro de <ProveedorDeSesion>.');
  return sesion;
}
