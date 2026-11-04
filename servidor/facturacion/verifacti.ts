import { variable } from '@estook/utiles';

/**
 * Verifacti, el componente externo de facturación (Anexo 4.1 y 4.2; T6 · 1, decisión 0126).
 *
 * **El único sitio de Estook que habla con Verifacti** (Anexo 2, regla 4): ningún otro fichero
 * conoce su dirección ni sus claves, y una prueba lo mira. La capa de aplicación ve esta
 * interfaz y no sabe que detrás hay una API.
 *
 * ── Las claves ──────────────────────────────────────────────────────────────────
 *
 * Verifacti tiene dos: **la de la cuenta** (`vfn_…`), para su API de NIF, que vive en los
 * secretos de Supabase como `VERIFACTI_CLAVE_DE_CUENTA`; y **la de cada NIF y entorno**
 * (`vf_test_…`, `vf_prod_…`), para mandar los registros. Esa segunda **no se guarda en ningún
 * sitio de Estook** (0126, cambia el Anexo 4.2, que decía Vault): se le pide a Verifacti con la
 * de la cuenta (`GET /nifs/keys/{entorno}/{nif}`) y se recuerda mientras vive el servidor. Así
 * no hay nada que llevarse de la base, y si se rota en Verifacti no queda una vieja por ahí.
 *
 * ── Lo que se usa, y de dónde ───────────────────────────────────────────────────
 *
 * De su documentación pública, leída entera el 4-nov-2026 (verifacti.com/nifs-docs y /docs):
 *
 *   POST /nifs/validar                    nif, nombre → nif, nombre, resultado
 *   POST /nifs                            [{nif, entorno, nombre, direccion, cp, poblacion,
 *                                           provincia, label}] → 200, 409 si ya estaba
 *   GET  /nifs/{entorno}/{nif}            nombre, direccion, cp, poblacion, provincia, activo
 *   GET  /nifs/keys/{entorno}/{nif}       api_key
 *   POST /representacion/firma_remota/{nif}  nombre, apellidos, municipio, calle, numero,
 *                                           email → url (2,90 € + IVA cada una)
 *   POST /representacion/generar/{nif}    tipo_entidad = juridica y los del representante → PDF
 *   POST /representacion/enviar/{nif}     el PDF firmado, en `file` → estado, error
 *   GET  /representacion/estado/{nif}     estado, error, firma_remota, url, fecha_expiracion
 *   GET  /verifactu/declaracion           url, url_version, sistema_informatico (con la de un NIF)
 *   GET  /nifs                            la lista: sirve para probar la clave de la cuenta
 *
 * **Nunca se llama a la eliminación permanente de un NIF** (Anexo 4.2): borra sus registros.
 */

const RAIZ = 'https://api.verifacti.com';

/** La empresa de pruebas que da Verifacti a todos, pública en su documentación (0125). */
export const NIF_DE_LA_EMPRESA_DE_PRUEBAS = 'B75777847';

/** Lo más que se espera: una persona está mirando la pantalla. */
const ESPERA_MAXIMA_MS = 20_000;

/** Lo que dura la clave de un NIF recordada: si se rota en Verifacti, a la hora se pide otra. */
const LO_QUE_SE_RECUERDA_UNA_CLAVE_MS = 60 * 60 * 1000;

export type EntornoDeVerifacti = 'test' | 'prod';

export interface ElNifEnHacienda {
  /** Lo que dice Hacienda, tal cual (`IDENTIFICADO`, `NO IDENTIFICADO`…). */
  readonly resultado: string;
  /** El nombre que tiene Hacienda para ese NIF, si lo da. */
  readonly nombre: string | null;
}

export interface DatosDelAlta {
  readonly nif: string;
  readonly nombre: string;
  readonly direccion: string;
  readonly cp: string;
  readonly poblacion: string;
  readonly provincia: string;
  readonly entorno: EntornoDeVerifacti;
  /** Para encontrarla en el panel de Verifacti: el nombre del local. */
  readonly etiqueta: string;
}

export interface ElNifEnVerifacti {
  readonly nif: string;
  readonly nombre: string;
  readonly direccion: string;
  readonly cp: string;
  readonly poblacion: string;
  readonly provincia: string;
  readonly activo: boolean;
}

export interface FirmaEnLinea {
  readonly nombre: string;
  readonly apellidos: string;
  readonly municipio: string;
  readonly calle: string;
  readonly numero: string;
  readonly email: string;
}

export interface ModeloDeSociedad {
  readonly nombreEntidad: string;
  readonly municipioEntidad: string;
  readonly calleEntidad: string;
  readonly numeroEntidad: string;
  readonly nombreRepresentante: string;
  readonly nifRepresentante: string;
  readonly municipioRepresentante: string;
  readonly calleRepresentante: string;
  readonly numeroRepresentante: string;
}

export interface LaAutorizacionEnVerifacti {
  /** Los seis de Verifacti: Correcto, Rechazado, Pendiente, Caducado, Cancelado, Inexistente. */
  readonly estado: string;
  readonly error: string | null;
  /** El enlace para seguir firmando, si hay una firma en línea en curso. */
  readonly url: string | null;
  readonly caduca: string | null;
}

export interface LaDeclaracionDeVerifacti {
  /** La vigente: no cambia nunca de dirección. */
  readonly url: string;
  /** La de esta versión, que no se sustituye nunca. */
  readonly urlDeLaVersion: string | null;
  readonly sistema: {
    readonly nombre: string;
    readonly id: string;
    readonly version: string;
  } | null;
}

export interface Verifacti {
  /** Quién es, para los registros: nunca sale a la pantalla. */
  readonly quien: string;
  /** Probar la clave de la cuenta: cuántos NIF tiene. */
  probar(): Promise<{ readonly nifs: number }>;
  comprobarNif(nif: string, nombre: string | null): Promise<ElNifEnHacienda>;
  /** Da de alta un NIF; si ya estaba en la cuenta, lo dice sin fallar. */
  darDeAlta(datos: DatosDelAlta): Promise<'dado_de_alta' | 'ya_estaba'>;
  elNif(entorno: EntornoDeVerifacti, nif: string): Promise<ElNifEnVerifacti | null>;
  empezarLaFirmaEnLinea(nif: string, datos: FirmaEnLinea): Promise<{ readonly url: string }>;
  elModeloParaFirmar(nif: string, datos: ModeloDeSociedad): Promise<Uint8Array>;
  mandarElModeloFirmado(nif: string, pdf: Uint8Array): Promise<LaAutorizacionEnVerifacti>;
  laAutorizacion(nif: string): Promise<LaAutorizacionEnVerifacti>;
  laDeclaracion(): Promise<LaDeclaracionDeVerifacti>;
}

/**
 * Verifacti no ha contestado bien. `estado` es el de la respuesta (nulo si no llegó), y
 * `detalle` lo que dijo en su campo `error`, **que nunca va a la pantalla tal cual**: lo traduce
 * la capa de aplicación, y lo de dentro va al registro.
 */
export class VerifactiNoContesta extends Error {
  // Sin propiedades en el constructor: la API de pruebas corre con Node quitando tipos.
  readonly estado: number | null;
  readonly detalle: string;

  constructor(estado: number | null, detalle = '') {
    super(
      `Verifacti ha contestado ${estado === null ? 'nada' : String(estado)}${detalle === '' ? '' : ` · ${detalle}`}`,
    );
    this.name = 'VerifactiNoContesta';
    this.estado = estado;
    this.detalle = detalle;
  }
}

/**
 * La clave tal como la pega una persona en Supabase: con espacios, entre comillas o con el
 * nombre delante. Ninguna clave de Verifacti lleva nada de eso (lección de Fogón, 19-oct).
 */
export function limpiarLaClaveDeVerifacti(clave: string): string {
  return clave
    .trim()
    .replace(/^VERIFACTI_CLAVE_DE_CUENTA\s*=\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, '');
}

/** Si la clave puesta es la de un NIF y no la de la cuenta: el error más fácil de cometer. */
export function esLaDeUnNif(clave: string): boolean {
  return /^vf_(test|prod)_/.test(limpiarLaClaveDeVerifacti(clave));
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function textoONulo(valor: unknown): string | null {
  return typeof valor === 'string' && valor !== '' ? valor : null;
}

/** La autorización tal como la cuenta Verifacti, leída sin fiarse de su forma. */
export function leerLaAutorizacion(cuerpo: unknown): LaAutorizacionEnVerifacti {
  const c = (cuerpo ?? {}) as Record<string, unknown>;
  return {
    estado: texto(c.estado) || 'Inexistente',
    error: textoONulo(c.error),
    url: textoONulo(c.url),
    caduca: textoONulo(c.fecha_expiracion),
  };
}

/**
 * El de verdad. **Nulo si no hay clave de la cuenta**, y entonces el alta dice que la
 * facturación todavía no está conectada, en vez de romperse (0022).
 */
export function verifactiDeVerdad(
  clave: string | undefined = variable('VERIFACTI_CLAVE_DE_CUENTA'),
): Verifacti | null {
  const deLaCuenta = limpiarLaClaveDeVerifacti(clave ?? '');
  if (deLaCuenta === '') return null;

  const clavesDeNif = new Map<string, { clave: string; hasta: number }>();
  let declaracion: { valor: LaDeclaracionDeVerifacti; hasta: number } | null = null;

  async function pedir(
    metodo: 'GET' | 'POST',
    camino: string,
    opciones: {
      readonly cuerpo?: unknown;
      readonly formulario?: FormData;
      readonly clave?: string;
    } = {},
  ): Promise<Response> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${RAIZ}${camino}`, {
        method: metodo,
        headers: {
          Authorization: `Bearer ${opciones.clave ?? deLaCuenta}`,
          ...(opciones.cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(opciones.cuerpo === undefined
          ? opciones.formulario === undefined
            ? {}
            : { body: opciones.formulario }
          : { body: JSON.stringify(opciones.cuerpo) }),
        signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
      });
    } catch (fallo) {
      throw new VerifactiNoContesta(null, fallo instanceof Error ? fallo.name : 'sin respuesta');
    }
    return respuesta;
  }

  async function enJson(respuesta: Response, aceptados: readonly number[] = []): Promise<unknown> {
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok && !aceptados.includes(respuesta.status)) {
      const dice = texto((cuerpo as { error?: unknown } | null)?.error).slice(0, 400);
      throw new VerifactiNoContesta(respuesta.status, dice);
    }
    return cuerpo;
  }

  async function laClaveDelNif(entorno: EntornoDeVerifacti, nif: string): Promise<string> {
    const recordada = clavesDeNif.get(`${entorno}/${nif}`);
    if (recordada !== undefined && recordada.hasta > Date.now()) return recordada.clave;
    const cuerpo = (await enJson(
      await pedir('GET', `/nifs/keys/${entorno}/${encodeURIComponent(nif)}`),
    )) as {
      api_key?: unknown;
    } | null;
    const laClave = texto(cuerpo?.api_key);
    if (laClave === '') throw new VerifactiNoContesta(200, 'sin api_key');
    clavesDeNif.set(`${entorno}/${nif}`, {
      clave: laClave,
      hasta: Date.now() + LO_QUE_SE_RECUERDA_UNA_CLAVE_MS,
    });
    return laClave;
  }

  return {
    quien: 'verifacti',

    async probar() {
      const cuerpo = await enJson(await pedir('GET', '/nifs'));
      const lista = Array.isArray(cuerpo)
        ? cuerpo
        : Array.isArray((cuerpo as { nifs?: unknown } | null)?.nifs)
          ? (cuerpo as { nifs: unknown[] }).nifs
          : [];
      return { nifs: lista.length };
    },

    async comprobarNif(nif, nombre) {
      const cuerpo = (await enJson(
        await pedir('POST', '/nifs/validar', {
          cuerpo: nombre === null ? { nif } : { nif, nombre },
        }),
      )) as Record<string, unknown> | null;
      return { resultado: texto(cuerpo?.resultado), nombre: textoONulo(cuerpo?.nombre) };
    },

    async darDeAlta(datos) {
      const respuesta = await pedir('POST', '/nifs', {
        cuerpo: [
          {
            nif: datos.nif,
            entorno: datos.entorno,
            hacienda: 'verifactu',
            nombre: datos.nombre,
            direccion: datos.direccion,
            cp: datos.cp,
            poblacion: datos.poblacion,
            provincia: datos.provincia,
            label: datos.etiqueta,
          },
        ],
      });
      if (respuesta.status === 409) return 'ya_estaba';
      await enJson(respuesta);
      return 'dado_de_alta';
    },

    async elNif(entorno, nif) {
      const respuesta = await pedir('GET', `/nifs/${entorno}/${encodeURIComponent(nif)}`);
      if (respuesta.status === 404) return null;
      const c = ((await enJson(respuesta)) ?? {}) as Record<string, unknown>;
      return {
        nif: texto(c.nif) || nif,
        nombre: texto(c.nombre),
        direccion: texto(c.direccion),
        cp: texto(c.cp),
        poblacion: texto(c.poblacion),
        provincia: texto(c.provincia),
        activo: c.activo !== false,
      };
    },

    async empezarLaFirmaEnLinea(nif, datos) {
      const cuerpo = (await enJson(
        await pedir('POST', `/representacion/firma_remota/${encodeURIComponent(nif)}`, {
          cuerpo: { ...datos, idioma: 'es' },
        }),
      )) as { url?: unknown } | null;
      return { url: texto(cuerpo?.url) };
    },

    async elModeloParaFirmar(nif, datos) {
      const respuesta = await pedir('POST', `/representacion/generar/${encodeURIComponent(nif)}`, {
        cuerpo: {
          tipo_entidad: 'juridica',
          nombre_entidad: datos.nombreEntidad,
          municipio_entidad: datos.municipioEntidad,
          calle_entidad: datos.calleEntidad,
          numero_entidad: datos.numeroEntidad,
          nombre_representante: datos.nombreRepresentante,
          nif_representante: datos.nifRepresentante,
          municipio_representante: datos.municipioRepresentante,
          calle_representante: datos.calleRepresentante,
          numero_representante: datos.numeroRepresentante,
        },
      });
      if (!respuesta.ok) await enJson(respuesta);
      return new Uint8Array(await respuesta.arrayBuffer());
    },

    async mandarElModeloFirmado(nif, pdf) {
      const formulario = new FormData();
      const copia = new Uint8Array(pdf.byteLength);
      copia.set(pdf);
      formulario.append(
        'file',
        new Blob([copia.buffer], { type: 'application/pdf' }),
        'modelo-firmado.pdf',
      );
      const cuerpo = await enJson(
        await pedir('POST', `/representacion/enviar/${encodeURIComponent(nif)}`, { formulario }),
      );
      return leerLaAutorizacion(cuerpo);
    },

    async laAutorizacion(nif) {
      return leerLaAutorizacion(
        await enJson(await pedir('GET', `/representacion/estado/${encodeURIComponent(nif)}`)),
      );
    },

    async laDeclaracion() {
      if (declaracion !== null && declaracion.hasta > Date.now()) return declaracion.valor;
      // Se pide con la clave de un NIF: la de la empresa de pruebas, que tienen todas las cuentas.
      const conClave = await laClaveDelNif('test', NIF_DE_LA_EMPRESA_DE_PRUEBAS);
      const c = ((await enJson(
        await pedir('GET', '/verifactu/declaracion', { clave: conClave }),
      )) ?? {}) as Record<string, unknown>;
      const s = (c.sistema_informatico ?? null) as Record<string, unknown> | null;
      const valor: LaDeclaracionDeVerifacti = {
        url: texto(c.url) || URL_DE_LA_DECLARACION_DE_VERIFACTI,
        urlDeLaVersion: textoONulo(c.url_version),
        sistema:
          s === null
            ? null
            : { nombre: texto(s.nombre), id: texto(s.id), version: texto(s.version) },
      };
      declaracion = { valor, hasta: Date.now() + LO_QUE_SE_RECUERDA_UNA_CLAVE_MS };
      return valor;
    },
  };
}

/** La declaración vigente de Verifacti, en su dirección que no cambia (su documentación, 4-nov). */
export const URL_DE_LA_DECLARACION_DE_VERIFACTI =
  'https://storage.googleapis.com/verifacti_non_sensitive_prod/declaracion/actual.pdf';
