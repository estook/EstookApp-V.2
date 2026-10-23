import { createContext, useContext } from 'react';
import type { ClienteApi } from '@estook/cliente-api';
import type { PermisosResueltos } from '@estook/permisos';

/** Lo que Estook TPV sabe de quién está dentro: lo mismo que `quien_soy` de la app. */
export interface YoEnLaSala {
  readonly personaId: string;
  readonly nombre: string;
  readonly local: { readonly id: string; readonly nombre: string } | null;
  readonly permisos: PermisosResueltos;
}

export interface SesionDeLaSala {
  readonly yo: YoEnLaSala;
  readonly cliente: ClienteApi;
}

export const ContextoDeSesion = createContext<SesionDeLaSala | null>(null);

export function usarSesion(): SesionDeLaSala {
  const sesion = useContext(ContextoDeSesion);
  if (sesion === null) throw new Error('usarSesion fuera de la puerta de Estook TPV');
  return sesion;
}
