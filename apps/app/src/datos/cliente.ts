import { crearCliente, type ClienteApi } from '@estook/cliente-api';
import type { Registro } from '@estook/utiles';

/**
 * El cliente de la API, configurado una vez (M3).
 *
 * «Ninguna aplicacion hace `fetch` por su cuenta. Todo pasa por aqui»
 * (`@estook/cliente-api`, M2). Esta funcion solo le dice a donde llamar y quien
 * pregunta.
 *
 * ── Cuando no hay API ────────────────────────────────────────────────────────
 *
 * En M3 la API existe, esta probada contra Supabase de verdad y lista para
 * arrancar, pero **no esta desplegada**: eso es de M4, que es quien trae el
 * login y, con el, a alguien a quien servir.
 *
 * Asi que `VITE_API_URL` puede estar vacia, y eso no es un fallo: es el estado
 * de hoy. Cuando lo esta, `hayApi` sale `false` y la aplicacion lo dice en vez
 * de quedarse cargando para siempre. Todo lo que no necesita datos —navegar las
 * ocho apps, la rueda, deshacer, el tamano de letra, las acciones del
 * buscador— funciona igual.
 */
export const DIRECCION_DE_LA_API = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';

export const hayApi = DIRECCION_DE_LA_API !== '';

/**
 * Contra una API de verdad, quien pregunta y desde donde.
 *
 * Se declaran en `.env.local` para poder desarrollar contra Supabase; en lo
 * publicado van vacias, porque hasta M4 no hay login. Viven aqui, con el resto de
 * la configuracion, y no en los perfiles de muestra: asi ese fichero es datos y
 * nada mas, y lo puede leer la prueba que lo compara con la matriz de roles.
 */
export const PERSONA_DE_DESARROLLO =
  (import.meta.env['VITE_PERSONA_ID'] as string | undefined) ?? null;
export const LOCAL_DE_DESARROLLO = (import.meta.env['VITE_LOCAL_ID'] as string | undefined) ?? null;

export function crearClienteDeLaApp(opciones: {
  readonly personaId: string | null;
  readonly registro?: Registro;
}): ClienteApi {
  return crearCliente({
    base: DIRECCION_DE_LA_API,
    personaId: opciones.personaId,
    ...(opciones.registro ? { registro: opciones.registro } : {}),
  });
}
