import { createContext, useContext } from 'react';
import type { Destino, Idioma } from '@estook/dominio';
import type { PermisosResueltos } from '@estook/permisos';
import type { ClienteApi } from '@estook/cliente-api';

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
    /** Si ese color pinta la aplicación entera, y no solo la cabecera (0026). */
    readonly colorEnLaApp: boolean;
    readonly logo: string | null;
    /** Su dirección de carta, para siempre: la del QR que se imprime (0047). */
    readonly direccionDeLaCarta: string;
  } | null;
  readonly organizaciones: readonly { readonly id: string; readonly nombre: string }[];
  readonly locales: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly organizacionId: string;
  }[];
  readonly permisos: PermisosResueltos;
  /** Los roles que puede dar: los que quedan por debajo del suyo (0034). */
  readonly rolesQuePuedoDar: readonly string[];
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
  /**
   * Hay sesión guardada y el servidor no contesta, después de reintentar. **No es
   * lo mismo que no haber entrado**: la Puerta lo dice y deja volver a probar, en
   * vez de pedir la contraseña a quien ya está dentro (24-sep).
   */
  readonly sinServidor: boolean;
  readonly probandoOtraVez: boolean;
  readonly volverAProbar: () => void;
  /** `false` cuando no hay `VITE_API_URL`: no hay a quien preguntar. */
  readonly hayApi: boolean;
  readonly cliente: ClienteApi;
  /** Guarda el token y vuelve a preguntar quien es. */
  readonly entrar: (token: string) => Promise<void>;
  /** Cierra la sesion en el servidor y borra el token. */
  readonly salir: () => Promise<void>;
  /** Vuelve a preguntar. Se llama despues de cambiar algo que afecta al acceso. */
  readonly refrescar: () => Promise<void>;
  /**
   * Cambia de local o de organizacion · **la accion mas delicada de Estook**.
   *
   * Decide en que local aterriza todo lo que se apunte a partir de ahora, asi
   * que no puede fallar en silencio: devuelve `true` solo si el servidor ha
   * dicho que si **y** la sesion ya trae el sitio nuevo. Quien la llama no
   * navega hasta entonces.
   *
   * Existe para que los cinco sitios que cambian de local hagan lo mismo. Antes
   * eran cinco copias de `ejecutar` + `refrescar`, y **ninguna de las cinco
   * miraba si habia salido bien**: si fallaba, la pantalla se iba al Panel con
   * el local de antes y con cara de haber cambiado.
   */
  readonly cambiarDeSitio: (a: {
    readonly local?: string;
    readonly organizacion?: string;
  }) => Promise<boolean>;
}

/**
 * Dónde vive la sesión. Lo llena `ProveedorDeSesion`, en su propio fichero: así
 * este no mezcla componentes con el gancho, y la recarga en caliente de Vite puede
 * cambiar el proveedor sin recargar la página entera.
 */
export const ContextoDeSesion = createContext<Sesion | null>(null);

export function usarSesion(): Sesion {
  const sesion = useContext(ContextoDeSesion);
  if (!sesion) throw new Error('usarSesion() necesita estar dentro de <ProveedorDeSesion>.');
  return sesion;
}
