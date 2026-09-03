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
 * la aplicacion, podria leerlo. Es real, y es la razon de que no haya ni un
 * `dangerouslySetInnerHTML` en todo el proyecto.
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

/**
 * Una marca opaca del navegador, para reconocer el aparato.
 *
 * ── Por que hace falta ───────────────────────────────────────────────────────
 *
 * Porque hasta M5 `estook.dispositivo` estaba vacia: 0 filas, 0 sesiones con
 * dispositivo. «Mis dispositivos» acababa ensenando el local de cada sesion en
 * vez del aparato, y salian veintitres filas identicas diciendo «Bar Centro».
 *
 * Y eso tiene consecuencia de seguridad: **el caso para el que existe esa
 * pantalla es reconocer una sesion que no es tuya**, y con todas las filas
 * iguales no se puede.
 *
 * ── Que es exactamente, y que NO es ──────────────────────────────────────────
 *
 * Es un numero al azar que se guarda en este navegador la primera vez y no se
 * mueve de aqui. **No es una huella del aparato**: no se mira el modelo, ni la
 * resolucion, ni las fuentes instaladas, ni nada de lo que hacen las tecnicas de
 * rastreo. Lo dice el comentario de la columna desde M1 y sigue en pie: «nunca
 * modelo, numero de serie ni nada que identifique el aparato fisico».
 *
 * Se borra al borrar los datos del navegador, y entonces el aparato aparece como
 * uno nuevo. Es correcto: para quien mira su lista de dispositivos, un navegador
 * al que se le ha borrado todo **es** otro sitio desde el que se ha entrado.
 */
const DONDE_VIVE_LA_MARCA = 'estook.aparato';

export function marcaDelAparato(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const guardada = window.localStorage.getItem(DONDE_VIVE_LA_MARCA);
    if (guardada !== null && guardada.length >= 8) return guardada;

    const nueva = crypto.randomUUID().replace(/-/g, '');
    window.localStorage.setItem(DONDE_VIVE_LA_MARCA, nueva);
    return nueva;
  } catch {
    // En navegacion privada escribir puede fallar. Se entra igual, con la sesion
    // sin dispositivo: es un dato de comodidad, no un requisito de acceso.
    return null;
  }
}

/**
 * Como se llama este aparato, en cristiano.
 *
 * Lo que se enseña en «Mis dispositivos», asi que tiene que ser algo que su
 * dueño reconozca: «Chrome en Android», no una cadena de agente de usuario.
 */
export function comoSeLlamaEsteAparato(): string {
  if (typeof navigator === 'undefined') return 'Un aparato';

  const agente = navigator.userAgent;

  const navegador = /Edg\//.test(agente)
    ? 'Edge'
    : /OPR\//.test(agente)
      ? 'Opera'
      : /Firefox\//.test(agente)
        ? 'Firefox'
        : /Chrome\//.test(agente)
          ? 'Chrome'
          : /Safari\//.test(agente)
            ? 'Safari'
            : 'Un navegador';

  const sistema = /Android/.test(agente)
    ? 'Android'
    : /iPhone/.test(agente)
      ? 'iPhone'
      : /iPad/.test(agente)
        ? 'iPad'
        : /Windows/.test(agente)
          ? 'Windows'
          : /Mac OS X/.test(agente)
            ? 'Mac'
            : /Linux/.test(agente)
              ? 'Linux'
              : null;

  return sistema === null ? navegador : `${navegador} en ${sistema}`;
}

/** Movil, tablet o escritorio. El quiosco lo declara quien lo monta (M15). */
export function queClaseDeAparatoEs(): 'movil' | 'tablet' | 'escritorio' {
  if (typeof navigator === 'undefined') return 'escritorio';

  const agente = navigator.userAgent;
  if (/iPad|Tablet/.test(agente)) return 'tablet';
  // El iPad moderno dice ser un Mac; se le reconoce por el tacto.
  if (/Macintosh/.test(agente) && navigator.maxTouchPoints > 1) return 'tablet';
  if (/Android|iPhone|iPod|Mobile/.test(agente)) return 'movil';
  return 'escritorio';
}

/** Lo que `entrar` manda del aparato, o nulo si este navegador no deja guardar. */
export function elAparato(): {
  readonly huella: string;
  readonly nombre: string;
  readonly tipo: 'movil' | 'tablet' | 'escritorio';
} | null {
  const huella = marcaDelAparato();
  if (huella === null) return null;

  return { huella, nombre: comoSeLlamaEsteAparato(), tipo: queClaseDeAparatoEs() };
}
