import { crearCliente, type ClienteApi } from '@estook/cliente-api';

/**
 * El cliente de la API del admin (0041).
 *
 * El mismo cliente que la app, con **dos diferencias a propósito**:
 *
 *   · **El token vive en `sessionStorage`, no en `localStorage`.** Se va al cerrar
 *     la pestaña. En la app eso sería un fastidio —la tablet del pase no puede
 *     pedir la contraseña cada vez—; en el admin es lo que se quiere: nadie
 *     necesita el admin abierto en un portátil que se queda en una mesa.
 *   · **Y se guarda con otro nombre.** La app y el admin viven en el mismo dominio
 *     y comparten almacén: con el mismo nombre, entrar en uno pisaría la sesión
 *     del otro. El servidor ya no deja usar una en el sitio de la otra, pero la
 *     pantalla no tiene por qué ni intentarlo.
 */
export const DIRECCION_DE_LA_API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

export const hayApi = DIRECCION_DE_LA_API !== '';

const DONDE_VIVE_EL_TOKEN = 'estook.admin.sesion';

export function leerToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(DONDE_VIVE_EL_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null): void {
  try {
    if (token === null) window.sessionStorage.removeItem(DONDE_VIVE_EL_TOKEN);
    else window.sessionStorage.setItem(DONDE_VIVE_EL_TOKEN, token);
  } catch {
    // Se sigue con la sesión en memoria; solo se perderá al recargar.
  }
}

export function crearClienteDelAdmin(alCaducarLaSesion: () => void): ClienteApi {
  return crearCliente({
    base: DIRECCION_DE_LA_API,
    // Una función, no un valor: el token cambia al entrar y al salir.
    token: leerToken,
    alCaducarLaSesion,
  });
}

/** «16/09/2026, 13:41», en la hora de España, que es donde se lee el admin. */
export function fechaYHora(instante: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(new Date(instante));
}

/** «13:41», para decir cuándo se acaba la sesión. */
export function soloLaHora(instante: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(new Date(instante));
}
