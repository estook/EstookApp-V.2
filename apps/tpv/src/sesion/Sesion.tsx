import { createContext, useContext } from 'react';
import type { ClienteApi } from '@estook/cliente-api';
import type { PermisosResueltos } from '@estook/permisos';
import type { ElAparatoPorDentro, YoEnElTpv } from '../datos/tipos.ts';
import type { ConQueSeSube } from '../sinInternet/laCola.ts';

/**
 * Quién está dentro de Estook TPV (T1 · 0107): **quien tecleó su PIN en este aparato**,
 * no quien entró en Estook. Lo que hace queda a su nombre, con la hora y el aparato.
 */
export interface YoEnLaSala {
  readonly personaId: string;
  readonly nombre: string;
  readonly local: { readonly id: string; readonly nombre: string } | null;
  readonly permisos: PermisosResueltos;
}

export interface SesionDeLaSala {
  readonly yo: YoEnLaSala;
  /** Con el turno de quien está y la llave del aparato, en cada petición. */
  readonly cliente: ClienteApi;
  /** El aparato: su función, su local, su bloqueo y su toque al segundo. */
  readonly aparato: ElAparatoPorDentro;
  /** Lo demás de quien está: su fichaje, sus mesas y a quién pasárselas. */
  readonly datos: YoEnElTpv;
  /** Bloquear ahora: el siguiente entra con su PIN. */
  readonly bloquear: () => void;
  /** Volver a leer lo de quien está (al fichar, al pasar mesas). */
  readonly refrescar: () => void;
  /**
   * **Sin internet** (T5 · 2 · 1), con qué sube lo que haga: su turno, o, si entró sin
   * internet, su entrada guardada, que sube delante.
   */
  readonly seSubeCon: ConQueSeSube;
}

export const ContextoDeSesion = createContext<SesionDeLaSala | null>(null);

export function usarSesion(): SesionDeLaSala {
  const sesion = useContext(ContextoDeSesion);
  if (sesion === null) throw new Error('usarSesion fuera de la puerta de Estook TPV');
  return sesion;
}
