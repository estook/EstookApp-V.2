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
  /**
   * Muchos enlaces **de una vez** (entrega V, fotos de producto).
   *
   * Una lista de cincuenta productos con foto no puede costar cincuenta viajes al
   * almacén: Supabase firma una tanda entera en una sola petición. Devuelve un mapa
   * de clave a enlace; la que no se haya podido firmar, simplemente no está, y la
   * pantalla enseña la inicial en su lugar.
   */
  enlaces(claves: readonly string[], segundos: number): Promise<ReadonlyMap<string, string>>;
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

// ── Las fotos de producto (entrega V, punto 5) ───────────────────────────────

/** El cubo de las fotos de producto. Se crea con `pnpm almacen:preparar`, como el de la marca. */
export const CUBO_DE_LAS_FOTOS = 'fotos-de-producto';

/**
 * Lo más grande que se acepta como foto y como miniatura, ya reducidas.
 *
 * El navegador las deja en 800 y 160 px de lado, en WebP o JPG: unos 80 KB y unos
 * 8 KB. El tope da margen de sobra a una foto con mucho detalle, y es lo que impide
 * que quien llame a la API a pelo con una foto de 12 megas llene el almacén.
 */
export const TOPE_DE_LA_FOTO = 400 * 1024;
export const TOPE_DE_LA_MINIATURA = 40 * 1024;

/**
 * Los tipos que se aceptan para una foto: los dos en que el navegador sabe
 * reducir. WebP donde se puede; JPG en Safari, que no sabe escribir WebP desde un
 * lienzo. Ni PNG —una foto en PNG pesa diez veces más— ni SVG, que puede llevar
 * JavaScript dentro.
 */
export const TIPOS_DE_FOTO: Readonly<Record<string, string>> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};

/** Cuánto vive el enlace de una foto: un turno largo, con la lista abierta en la tableta. */
export const SEGUNDOS_DEL_ENLACE_DE_LA_FOTO = 12 * 60 * 60;

/**
 * La clave de una foto o de su miniatura: el local, el producto y **una marca de
 * tiempo**, por lo mismo que el logo: el navegador guarda las imágenes, y sin ella
 * cambiar la foto dejaría la vieja en pantalla hasta recargar sin caché.
 */
export function claveDeLaFoto(
  localId: string,
  productoId: string,
  cual: 'foto' | 'miniatura',
  extension: string,
  ahora: Date,
): string {
  return `${CUBO_DE_LAS_FOTOS}/${localId}/${productoId}/${cual}-${ahora.getTime()}.${extension}`;
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

    async enlaces(claves, segundos) {
      const firmados = new Map<string, string>();

      // La clave lleva el cubo delante (`fotos-de-producto/…`), y Supabase firma una
      // tanda **por cubo**: se agrupan y se pide una vez por cada uno.
      const porCubo = new Map<string, string[]>();
      for (const clave of new Set(claves)) {
        const barra = clave.indexOf('/');
        if (barra <= 0) continue;
        const cubo = clave.slice(0, barra);
        porCubo.set(cubo, [...(porCubo.get(cubo) ?? []), clave.slice(barra + 1)]);
      }

      for (const [cubo, caminos] of porCubo) {
        const respuesta = await pedir(`${raiz}/object/sign/${cubo}`, {
          method: 'POST',
          headers: { ...cabeceras, 'content-type': 'application/json' },
          body: JSON.stringify({ expiresIn: segundos, paths: caminos }),
        }).catch(() => null);
        // Si el almacén no contesta, la lista sale igual, con las iniciales: una
        // foto que no llega no puede dejar a nadie sin su lista de productos.
        if (respuesta === null || !respuesta.ok) continue;

        const datos = (await respuesta.json()) as readonly {
          path?: string;
          signedURL?: string | null;
          error?: string | null;
        }[];
        for (const firmado of datos) {
          if (!firmado.path || !firmado.signedURL) continue;
          firmados.set(
            `${cubo}/${firmado.path}`,
            `${url.replace(/\/+$/, '')}/storage/v1${firmado.signedURL}`,
          );
        }
      }

      return firmados;
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
export function almacenEnMemoria(): AlmacenDeFicheros & {
  /** Qué hay guardado, para que una prueba compruebe que lo viejo se borró. */
  readonly claves: () => readonly string[];
} {
  const guardados = new Map<string, { contenido: Uint8Array; tipo: string }>();

  function comoDireccion(clave: string): string | null {
    const fichero = guardados.get(clave);
    if (!fichero) return null;

    let binario = '';
    for (const byte of fichero.contenido) binario += String.fromCharCode(byte);
    return `data:${fichero.tipo};base64,${btoa(binario)}`;
  }

  return {
    claves: () => [...guardados.keys()],

    guardar(clave, contenido, tipo) {
      guardados.set(clave, { contenido, tipo });
      return Promise.resolve();
    },

    enlace(clave) {
      return Promise.resolve(comoDireccion(clave));
    },

    enlaces(claves) {
      const firmados = new Map<string, string>();
      for (const clave of claves) {
        const direccion = comoDireccion(clave);
        if (direccion !== null) firmados.set(clave, direccion);
      }
      return Promise.resolve(firmados);
    },

    borrar(clave) {
      guardados.delete(clave);
      return Promise.resolve();
    },
  };
}
