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
import type { Destino, Idioma } from '@estook/dominio';
import type { PermisosResueltos } from '@estook/permisos';
import type { ClienteApi } from '@estook/cliente-api';
import { crearClienteDeLaApp, guardarToken, hayApi, leerToken } from '../datos/cliente.ts';

/**
 * Quien ha entrado, donde esta y que puede (M4).
 *
 * **Esto sustituye entero al andamio de M3.** Donde antes habia seis perfiles de
 * muestra elegidos a mano, ahora hay una sesion de verdad: un token, y un
 * servidor que dice quien eres.
 *
 * ── Una sola consulta, y por que ─────────────────────────────────────────────
 *
 * Todo sale de `quien_soy`: quien eres, en que organizacion y en que local estas,
 * a donde te lleva la resolucion de destino, y tus permisos sobre ese local.
 *
 * Podrian ser cuatro consultas, y seria peor. En cuatro, la aplicacion pintaria
 * la rueda vacia, luego con cuatro sectores, luego con ocho; y en un movil con
 * mala cobertura eso no son milisegundos. B7 pide que la primera pantalla util
 * llegue rapido, y encadenar cuatro viajes es la forma mas segura de que no.
 *
 * ── Y se vuelve a preguntar, no se guarda ────────────────────────────────────
 *
 * El destino y los permisos se rehacen en cada peticion del servidor, no se
 * cachean para siempre. Es lo que hace verdad «cambiar el rol de alguien surte
 * efecto en la peticion siguiente» (Auditoria, Parte 8): si a la camarera le
 * quitan el acceso a costes mientras tiene la aplicacion abierta, en el proximo
 * refresco los campos dejan de llegar y la pantalla deja de ensenarlos.
 */

export interface QuienSoy {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly correo: string;
  readonly idioma: Idioma;
  readonly version: number;
  readonly destino: Destino;
  readonly porque: string;
  readonly organizacion: {
    readonly id: string;
    readonly nombre: string;
    readonly usaAreas: boolean;
    readonly estado: string;
    readonly exigeDobleFactor: boolean;
    readonly correoDeRecuperacion: string | null;
    readonly alcance: 'organizacion' | 'area' | 'local';
    readonly version: number;
  } | null;
  readonly local: {
    readonly id: string;
    readonly nombre: string;
    readonly codigo: string;
    readonly area: string | null;
    /** La marca del local (M5): el color y el enlace firmado a su logo. */
    readonly colorDeMarca: string | null;
    readonly logo: string | null;
  } | null;
  readonly organizaciones: readonly { readonly id: string; readonly nombre: string }[];
  readonly locales: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly organizacionId: string;
  }[];
  readonly permisos: PermisosResueltos;
  readonly debeCambiarClave: boolean;
  readonly faltaDobleFactor: boolean;
  readonly debeActivarDobleFactor: boolean;
  /** Si es una visita de demostración: se mira todo y no se guarda nada (M5). */
  readonly esDemostracion: boolean;
}

export interface Sesion {
  /** Nulo mientras no se ha entrado. */
  readonly yo: QuienSoy | null;
  readonly permisos: PermisosResueltos;
  readonly cargando: boolean;
  /** `false` cuando no hay `VITE_API_URL`: no hay a quien preguntar. */
  readonly hayApi: boolean;
  readonly cliente: ClienteApi;
  /** Guarda el token y vuelve a preguntar quien es. */
  readonly entrar: (token: string) => Promise<void>;
  /** Cierra la sesion en el servidor y borra el token. */
  readonly salir: () => Promise<void>;
  /** Vuelve a preguntar. Se llama despues de cambiar algo que afecta al acceso. */
  readonly refrescar: () => Promise<void>;
}

const Contexto = createContext<Sesion | null>(null);

export function ProveedorDeSesion({ children }: { readonly children: ReactNode }) {
  const cache = useQueryClient();
  const [hayToken, setHayToken] = useState(() => leerToken() !== null);

  // El cliente se crea **una vez** y lee el token en cada llamada. Recrearlo al
  // entrar dejaria a medias cualquier consulta que ya tuviera el viejo.
  const olvidarToken = useRef<() => void>(() => undefined);
  const cliente = useMemo(
    () =>
      crearClienteDeLaApp({
        alCaducarLaSesion: () => {
          olvidarToken.current();
        },
      }),
    [],
  );

  olvidarToken.current = useCallback(() => {
    guardarToken(null);
    setHayToken(false);
    // Se tira la cache entera, no solo `quien_soy`: dentro puede haber datos del
    // local de quien acaba de salir, y no tienen por que estar cuando entre otra
    // persona en la misma tablet.
    cache.clear();
  }, [cache]);

  const consulta = useQuery({
    queryKey: ['quien_soy'],
    enabled: hayApi && hayToken,
    // Si el token no vale, no se reintenta: el servidor ya ha dicho que no.
    retry: false,
    queryFn: async (): Promise<QuienSoy> => {
      const respuesta = await cliente.consultar<QuienSoy>('quien_soy');
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const entrar = useCallback(
    async (token: string) => {
      guardarToken(token);
      setHayToken(true);
      await cache.invalidateQueries({ queryKey: ['quien_soy'] });
    },
    [cache],
  );

  const salir = useCallback(async () => {
    // Se avisa al servidor para que cierre la fila, y **luego** se borra el
    // token pase lo que pase. Si el aviso fallara y no se borrara, quien pulsa
    // «salir» se quedaria dentro, que es lo peor que puede hacer un boton de
    // salir. La sesion del servidor caduca sola de todas formas.
    //
    // Este `finally` tapo un fallo durante un tiempo: `salir` no admitia
    // demostraciones y devolvia 403, la pantalla se olvidaba del token igual, y
    // por eso nadie noto que **la sesion seguia viva en el servidor**. Un
    // remiendo que funciona esconde el agujero que hay debajo. Ya no: `salir`
    // borra la visita, y ademas hay un boton propio en la barra de demostracion.
    try {
      await cliente.ejecutar('salir', {});
    } finally {
      olvidarToken.current();
    }
  }, [cliente]);

  const refrescar = useCallback(async () => {
    await cache.invalidateQueries({ queryKey: ['quien_soy'] });
  }, [cache]);

  const valor = useMemo<Sesion>(
    () => ({
      yo: consulta.data ?? null,
      permisos: consulta.data?.permisos ?? {},
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

export function usarSesion(): Sesion {
  const sesion = useContext(Contexto);
  if (!sesion) throw new Error('usarSesion() necesita estar dentro de <ProveedorDeSesion>.');
  return sesion;
}
