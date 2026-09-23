import { createContext, useContext } from 'react';
import type { ClienteApi } from '@estook/cliente-api';

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

/**
 * Dónde vive la sesión del admin. Lo llena `ProveedorDeSesion`, en su propio
 * fichero, para que este no mezcle componentes con el gancho.
 */
export const ContextoDeSesion = createContext<SesionDelAdmin | null>(null);

export function usarSesion(): SesionDelAdmin {
  const sesion = useContext(ContextoDeSesion);
  if (!sesion) throw new Error('usarSesion() necesita estar dentro de <ProveedorDeSesion>.');
  return sesion;
}
