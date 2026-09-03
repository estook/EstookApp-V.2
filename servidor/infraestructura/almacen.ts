import { variable } from '@estook/utiles';

/**
 * El almacen de ficheros (M5).
 *
 * Hasta hoy Estook no guardaba un solo fichero: todo cabia en Postgres. El logo
 * del local es el primero, y detras vienen los PDF de M11, las fotos de albaran
 * de M7 y las de las visitas de M24.
 *
 * ── Que se guarda en la base de datos y que aqui ─────────────────────────────
 *
 * En `estook.local.logo_clave` va **la clave del objeto**, no la imagen ni una
 * direccion. La imagen no cabe en una fila sin hincharla, y una direccion caduca:
 * los enlaces van firmados y con hora de muerte, asi que guardarla seria guardar
 * algo que manana no sirve.
 *
 * ── Por que hay un puerto y no una llamada directa a Supabase ────────────────
 *
 * Por lo mismo que el despachador habla con `Puertos` y no con Postgres: para
 * que la capa de aplicacion no sepa donde acaban los bytes. Y por una razon muy
 * practica: la API de pruebas levanta el servidor entero contra un Postgres
 * efimero **sin credenciales de Supabase**, y sin puerto no habria forma de
 * probar el alta de extremo a extremo.
 *
 * Son dos implementaciones de **donde** se guarda, no dos fuentes de verdad: la
 * verdad es la clave que guarda la fila del local, y es una sola.
 */

/** Lo unico que la capa de aplicacion sabe del almacen. */
export interface AlmacenDeFicheros {
  /** Guarda o sustituye. `tipo` es el tipo de contenido: `image/png`. */
  guardar(clave: string, contenido: Uint8Array, tipo: string): Promise<void>;
  /**
   * Un enlace para ver el fichero, que **caduca**. Nunca se guarda: se pide cada
   * vez que hace falta enseñarlo.
   */
  enlace(clave: string, segundos: number): Promise<string | null>;
  borrar(clave: string): Promise<void>;
}

/**
 * Lo mas grande que se acepta como logo, ya reducido por el navegador.
 *
 * «La foto pesa 8 MB → se reduce antes de subir» (Auditoria, parte 5). El
 * navegador la reduce a 512 px de lado; esto es el tope duro que impide que un
 * cliente que no reduzca —o que no sea nuestro— llene el almacen.
 */
export const TOPE_DEL_LOGO = 512 * 1024;

/** Los tipos que se aceptan. Nada de SVG: un SVG puede llevar JavaScript dentro. */
export const TIPOS_DE_LOGO: Readonly<Record<string, string>> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** El cubo donde vive la marca. Se crea con `pnpm almacen:preparar`. */
export const CUBO_DE_LA_MARCA = 'marca';

/**
 * La clave de un logo. Lleva el local dentro **y una marca de tiempo**.
 *
 * La marca de tiempo no es por orden: es porque los enlaces firmados se cachean
 * en el navegador, y sin ella, cambiar el logo dejaria el viejo en pantalla hasta
 * que a alguien se le ocurriera recargar sin cache.
 */
export function claveDelLogo(localId: string, extension: string, ahora: Date): string {
  return `${CUBO_DE_LA_MARCA}/${localId}/logo-${ahora.getTime()}.${extension}`;
}

// ── El de verdad · Supabase Storage ──────────────────────────────────────────

/**
 * Supabase Storage, por su API REST.
 *
 * Se habla con la **clave de servicio**, que no sale nunca de la funcion. El
 * cubo es privado: nadie llega a un logo sin un enlace firmado por nosotros, y
 * quien lo tiene lo tiene una hora.
 *
 * No se usa la libreria oficial: son tres peticiones y cargarla entera en el
 * paquete de Deno por esto seria una dependencia sin justificar.
 */
export function almacenDeSupabase(opciones?: {
  readonly url?: string;
  readonly clave?: string;
  readonly pedir?: typeof fetch;
}): AlmacenDeFicheros | null {
  const url = opciones?.url ?? variable('SUPABASE_URL') ?? variable('VITE_SUPABASE_URL');
  const clave = opciones?.clave ?? variable('CLAVE_DE_SERVICIO');
  const pedir = opciones?.pedir ?? fetch;

  // Sin credenciales no hay almacen, y se dice devolviendo nulo en vez de
  // fallando al primer uso: quien lo enchufa decide con que se queda.
  if (!url || !clave) return null;

  const raiz = `${url.replace(/\/+$/, '')}/storage/v1`;
  const cabeceras = { authorization: `Bearer ${clave}`, apikey: clave };

  return {
    async guardar(claveDelObjeto, contenido, tipo) {
      const respuesta = await pedir(`${raiz}/object/${claveDelObjeto}`, {
        method: 'POST',
        headers: { ...cabeceras, 'content-type': tipo, 'x-upsert': 'true' },
        // Los bytes tal cual. El tipo se afloja porque el servidor compila con la
        // biblioteca de Node (`lib: ES2023`), que no declara `BodyInit`; en Deno,
        // que es donde esto corre de verdad, un `Uint8Array` es un cuerpo válido.
        body: contenido as unknown as string,
      });
      if (!respuesta.ok) {
        throw new Error(`El almacen no acepto el fichero (${respuesta.status})`);
      }
    },

    async enlace(claveDelObjeto, segundos) {
      const respuesta = await pedir(`${raiz}/object/sign/${claveDelObjeto}`, {
        method: 'POST',
        headers: { ...cabeceras, 'content-type': 'application/json' },
        body: JSON.stringify({ expiresIn: segundos }),
      });
      if (!respuesta.ok) return null;

      const datos = (await respuesta.json()) as { signedURL?: string };
      return datos.signedURL ? `${url.replace(/\/+$/, '')}/storage/v1${datos.signedURL}` : null;
    },

    async borrar(claveDelObjeto) {
      // Que falle no es un fallo del alta: el fichero ya no lo referencia nadie.
      // Se intenta y se sigue.
      await pedir(`${raiz}/object/${claveDelObjeto}`, {
        method: 'DELETE',
        headers: cabeceras,
      }).catch(() => undefined);
    },
  };
}

// ── El de las pruebas · en memoria, y el enlace es el fichero ────────────────

/**
 * Un almacen que vive en memoria y devuelve el fichero **dentro del enlace**,
 * como `data:`.
 *
 * Es lo que permite que la API de pruebas sirva el alta entera, subida de logo
 * incluida, sin credenciales y sin una ruta nueva que en produccion no existiria
 * —y un camino que solo existe en las pruebas es tan malo como uno que solo
 * existe en produccion (E4).
 *
 * En produccion no se usa jamas: `servidor/index.ts` coge este solo cuando no
 * hay credenciales de Supabase, y entonces tampoco habria a donde subir.
 */
export function almacenEnMemoria(): AlmacenDeFicheros {
  const guardados = new Map<string, { contenido: Uint8Array; tipo: string }>();

  return {
    guardar(clave, contenido, tipo) {
      guardados.set(clave, { contenido, tipo });
      return Promise.resolve();
    },

    enlace(clave) {
      const fichero = guardados.get(clave);
      if (!fichero) return Promise.resolve(null);

      let binario = '';
      for (const byte of fichero.contenido) binario += String.fromCharCode(byte);
      return Promise.resolve(`data:${fichero.tipo};base64,${btoa(binario)}`);
    },

    borrar(clave) {
      guardados.delete(clave);
      return Promise.resolve();
    },
  };
}
