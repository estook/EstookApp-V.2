import { crearCliente, type ClienteApi } from '@estook/cliente-api';

/**
 * El cliente de la API de Estook TPV (M20A, 0056).
 *
 * **Entra con la sesión de Estook**, a propósito: la app y Estook TPV viven en el mismo
 * dominio (`estook.com/app/` y `estook.com/tpv/`), y el token está guardado con el mismo
 * nombre. Quien ya ha entrado en Estook en este aparato abre la sala sin volver a escribir
 * su contraseña, que es lo que pide el Anexo: «desde un móvil personal se entra con un
 * botón desde Estook». La tablet compartida del local, con su PIN, llega con los
 * terminales (Anexo 3.4).
 */
export const DIRECCION_DE_LA_API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

export const hayApi = DIRECCION_DE_LA_API !== '';

/** El mismo que `apps/app/src/datos/cliente.ts`. */
const DONDE_VIVE_EL_TOKEN = 'estook.sesion';

export function leerToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DONDE_VIVE_EL_TOKEN);
  } catch {
    return null;
  }
}

/** Dónde está Estook, para entrar o volver: al lado de esta puerta. */
export const DIRECCION_DE_ESTOOK = `${import.meta.env.BASE_URL}../app/`;

export function crearClienteDelTpv(alCaducarLaSesion: () => void): ClienteApi {
  return crearCliente({
    base: DIRECCION_DE_LA_API,
    token: leerToken,
    juntar: true,
    alCaducarLaSesion,
  });
}
