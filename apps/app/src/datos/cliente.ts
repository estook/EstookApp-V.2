import { crearCliente, type ClienteApi } from '@estook/cliente-api';
import type { Registro } from '@estook/utiles';

/**
 * El cliente de la API, configurado una vez (M3, con la sesion de M4).
 *
 * «Ninguna aplicacion hace `fetch` por su cuenta. Todo pasa por aqui»
 * (`@estook/cliente-api`, M2). Esta funcion solo le dice a donde llamar y con
 * que token.
 *
 * ── Cuando no hay API ────────────────────────────────────────────────────────
 *
 * `VITE_API_URL` puede estar vacia. Cuando lo esta, `hayApi` sale `false` y la
 * aplicacion **lo dice** en vez de quedarse cargando para siempre o, peor,
 * ensenando una pantalla de entrar que no lleva a ningun sitio.
 */
export const DIRECCION_DE_LA_API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

export const hayApi = DIRECCION_DE_LA_API !== '';

/**
 * Donde vive el token, y por que ahi (M4).
 *
 * En `localStorage`, no en una cookie. Y no es por comodidad:
 *
 *   · La aplicacion y la API **estan en dominios distintos** —GitHub Pages y
 *     Supabase hoy; `estook.com` y su API manana— y una cookie entre dominios es
 *     una cookie de terceros, que los navegadores llevan anos bloqueando. Con una
 *     cookie, media plantilla no podria entrar segun el navegador que use.
 *   · Un token que se manda **a mano en una cabecera** no lo envia el navegador
 *     solo, asi que una peticion desde otra pagina no lo lleva. Eso quita de
 *     golpe toda una familia de ataques que con cookies hay que ir tapando.
 *
 * Lo que se paga a cambio: si alguien consiguiera ejecutar JavaScript dentro de
 * la aplicacion, podria leerlo. Contra eso hay dos cosas, y hasta hace poco solo
 * habia una:
 *
 *   · **No se pinta HTML de nadie.** El unico `dangerouslySetInnerHTML` del
 *     proyecto esta en `packages/iconos`, y lo que pinta son los SVG de Lucide
 *     que estan en el repositorio: no pasa por ahi ni un dato de una persona.
 *   · **Y una politica de seguridad de contenido con `script-src 'self'`**, que
 *     la pone el navegador y no depende de que el codigo de manana siga siendo
 *     igual de cuidadoso. Vive en `herramientas/politica-de-seguridad.ts`.
 *
 * Lo primero es una promesa; lo segundo es una regla. Hacia falta lo segundo.
 *
 * Se guarda por aparato, como el tamano de letra, y dentro de un `try` porque en
 * navegacion privada escribir puede fallar.
 */
const DONDE_VIVE_EL_TOKEN = 'estook.sesion';

export function leerToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DONDE_VIVE_EL_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null): void {
  try {
    if (token === null) window.localStorage.removeItem(DONDE_VIVE_EL_TOKEN);
    else window.localStorage.setItem(DONDE_VIVE_EL_TOKEN, token);
  } catch {
    // Se sigue con la sesion en memoria; solo se perdera al recargar.
  }
}

export function crearClienteDeLaApp(opciones: {
  readonly registro?: Registro;
  readonly alCaducarLaSesion?: () => void;
}): ClienteApi {
  return crearCliente({
    base: DIRECCION_DE_LA_API,
    // Una funcion, no un valor: el cliente se crea una vez y el token cambia al
    // entrar y al salir. Con un valor fijo, la primera consulta despues de entrar
    // seguiria yendo sin el.
    token: leerToken,
    ...(opciones.registro ? { registro: opciones.registro } : {}),
    ...(opciones.alCaducarLaSesion ? { alCaducarLaSesion: opciones.alCaducarLaSesion } : {}),
  });
}

// ── El aparato desde el que se entra (M5) ────────────────────────────────────
//
// Vive en `@estook/cliente-api` desde la 0041: el admin entra igual y necesita
// reconocer el aparato igual. Dos copias serían dos formas de llamar a un móvil.
export {
  comoSeLlamaEsteAparato,
  elAparato,
  marcaDelAparato,
  queClaseDeAparatoEs,
} from '@estook/cliente-api';
