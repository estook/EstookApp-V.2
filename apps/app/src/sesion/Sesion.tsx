import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PermisosResueltos } from '@estook/permisos';
import {
  LOCAL_DE_DESARROLLO,
  PERSONA_DE_DESARROLLO,
  crearClienteDeLaApp,
  hayApi,
} from '../datos/cliente.ts';
import { PERFILES_DE_MUESTRA, type PerfilDeMuestra } from './perfiles.ts';

/**
 * Quien pregunta y desde donde (M3).
 *
 * **Esto lo sustituye M4 entero.** M4 trae «login unico con correo y contrasena o
 * PIN · selector de organizacion y luego de local, con cambio de contexto sin
 * nueva sesion». Hasta entonces hay que resolver dos cosas para que el esqueleto
 * se pueda construir y, sobre todo, **comprobar**:
 *
 *   · **Quien es.** La API lo lee de la cabecera `x-persona-id` (asi lo dejo M2,
 *     a la espera de M4). Aqui se pasa tal cual.
 *   · **Que puede.** Lo dice el servidor con la consulta `mis_permisos`, que es
 *     lo que hace que la rueda reparta los sectores entre las apps que el rol
 *     tiene y ninguna mas.
 *
 * ── Y cuando no hay API ──────────────────────────────────────────────────────
 *
 * Sin API no hay a quien preguntar, y la rueda se quedaria vacia. En vez de
 * inventarse que se tienen las ocho apps —que seria mentir y ademas taparia el
 * fallo el dia que la consulta falle de verdad— se usa un **perfil de muestra**
 * elegido a mano, la aplicacion lo dice arriba con todas las letras, y se puede
 * cambiar en Ajustes.
 *
 * Eso no es una funcion del producto: es el andamio que permite ver hoy que la
 * rueda de un cocinero tiene tres sectores y la de un director ocho, que es un
 * criterio de terminado de M3 y no se puede dejar sin comprobar hasta M4.
 */
export interface Sesion {
  readonly perfil: PerfilDeMuestra;
  readonly cambiarDePerfil: (id: string) => void;
  readonly permisos: PermisosResueltos;
  /** `true` mientras el servidor todavia no ha contestado. */
  readonly cargando: boolean;
  /** De donde salen los permisos: del servidor, o del andamio de M3. */
  readonly deDonde: 'servidor' | 'muestra';
  readonly localId: string | null;
}

const Contexto = createContext<Sesion | null>(null);

/**
 * El perfil elegido se recuerda en este aparato.
 *
 * Sin esto, cada recarga volvia al primer perfil, y quien estaba mirando Estook
 * como gerente se encontraba de camarera al refrescar. Se guarda igual que el
 * tamano de letra: en el navegador, porque es del aparato y no de la persona, y
 * dentro de un `try` porque en navegacion privada no se puede escribir.
 */
const DONDE_SE_GUARDA = 'estook.perfil-de-muestra';

function leerGuardado(): string {
  const primero = PERFILES_DE_MUESTRA[0].id;
  if (typeof window === 'undefined') return primero;

  try {
    const guardado = window.localStorage.getItem(DONDE_SE_GUARDA);
    return PERFILES_DE_MUESTRA.some((p) => p.id === guardado) ? (guardado ?? primero) : primero;
  } catch {
    return primero;
  }
}

export function ProveedorDeSesion({ children }: { readonly children: ReactNode }) {
  const [perfilId, setPerfilId] = useState<string>(leerGuardado);

  const cambiarDePerfil = useCallback((id: string) => {
    setPerfilId(id);
    try {
      window.localStorage.setItem(DONDE_SE_GUARDA, id);
    } catch {
      // Se cambia igual, solo que no se recordara la proxima vez.
    }
  }, []);

  const perfil = useMemo(
    () => PERFILES_DE_MUESTRA.find((p) => p.id === perfilId) ?? PERFILES_DE_MUESTRA[0],
    [perfilId],
  );

  // Solo se pregunta si hay API y si el perfil sabe a que local mira. Sin las
  // dos cosas la consulta no tendria sentido y se quedaria fallando en bucle.
  const puedePreguntar = hayApi && PERSONA_DE_DESARROLLO !== null && LOCAL_DE_DESARROLLO !== null;

  const consulta = useQuery({
    queryKey: ['mis_permisos', PERSONA_DE_DESARROLLO, LOCAL_DE_DESARROLLO],
    enabled: puedePreguntar,
    queryFn: async (): Promise<PermisosResueltos> => {
      const cliente = crearClienteDeLaApp({ personaId: PERSONA_DE_DESARROLLO });
      const respuesta = await cliente.consultar<PermisosResueltos>('mis_permisos', {
        local_id: LOCAL_DE_DESARROLLO ?? '',
      });
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });

  const valor = useMemo<Sesion>(() => {
    const delServidor = puedePreguntar && consulta.data !== undefined;

    return {
      perfil,
      cambiarDePerfil,
      permisos: delServidor ? consulta.data : perfil.permisos,
      cargando: puedePreguntar && consulta.isLoading,
      deDonde: delServidor ? 'servidor' : 'muestra',
      localId: LOCAL_DE_DESARROLLO,
    };
  }, [perfil, cambiarDePerfil, puedePreguntar, consulta.data, consulta.isLoading]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usarSesion(): Sesion {
  const sesion = useContext(Contexto);
  if (!sesion) throw new Error('usarSesion() necesita estar dentro de <ProveedorDeSesion>.');
  return sesion;
}
