import { elEstadoConSuDuplicado } from '@estook/dominio';
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
 * Y para emitir (T6 · 2 · 1, 0136), de su especificación OpenAPI (verifactu.min.yaml y
 * nifs.min.yaml, leídas enteras el 6-nov-2026):
 *
 *   POST /verifactu/create                el documento, con `Idempotency-Key` → uuid, estado
 *                                           (siempre «Pendiente»), url, qr, huella; 400 con
 *                                           error y codigo; 409 si la misma clave está en curso;
 *                                           422 si la clave se usó con otro cuerpo
 *   GET  /verifactu/status?uuid=          el estado del registro: estado, url, qr,
 *                                           codigo_error, mensaje_error, operacion
 *   POST /verifactu/status                serie, numero, fecha_expedicion → la factura en
 *                                           Hacienda, con el uuid de su último registro aceptado
 *   POST /verifactu/cancel                serie, numero, fecha_expedicion, con `Idempotency-Key`
 *                                           → **su propio** uuid, huella y estado, sin QR (0140)
 *   GET/POST /webhooks, PUT /webhooks/{id}, POST /webhooks/{id}/nifs/{nif}   los avisos (url,
 *                                           entorno, secret, activo, nifs); 409 si ya hay uno con
 *                                           esa dirección
 *   POST /nifs/validar/vies              codigo_pais, iva → iva, resultado (IDENTIFICADO,
 *                                           NO IDENTIFICADO, ERROR API VIES)
 *
 * **Nunca se llama a la eliminación permanente de un NIF** (Anexo 4.2): borra sus registros.
 */

const RAIZ = 'https://api.verifacti.com';

/** La empresa de pruebas que da Verifacti a todos, pública en su documentación (0125). */
export const NIF_DE_LA_EMPRESA_DE_PRUEBAS = 'B75777847';

/** Lo más que se espera: una persona está mirando la pantalla. */
const ESPERA_MAXIMA_MS = 20_000;

/**
 * Lo más que se espera al emitir: alguien espera su ticket delante de la caja. Pasado esto, se
 * da por perdido y se pregunta después con la misma clave (Anexo 4.9).
 */
const ESPERA_PARA_EMITIR_MS = 8_000;

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

/** Lo que pasó al mandar un documento (Anexo 4.9, paso 6). */
export type LoQuePasoAlEmitir =
  | {
      readonly resultado: 'aceptado';
      readonly uuid: string;
      readonly estado: string;
      readonly url: string | null;
      readonly qr: string | null;
      readonly huella: string | null;
    }
  /** 400: no se genera el registro ni va nada a Hacienda. Con su código estable y su frase. */
  | {
      readonly resultado: 'rechazado_por_datos';
      readonly codigoHttp: number;
      readonly codigo: string | null;
      readonly mensaje: string;
    }
  /** 409: otra petición con la misma clave está en curso. Se espera y se pregunta. */
  | { readonly resultado: 'en_curso'; readonly codigoHttp: number }
  /** Sin respuesta, un 5xx o un 422: no se sabe si se registró. Se pregunta. */
  | {
      readonly resultado: 'sin_respuesta';
      readonly codigoHttp: number | null;
      readonly mensaje: string;
    };

/** El estado de un registro, como lo da `GET /verifactu/status` y como llega en un aviso. */
export interface ElRegistroEnVerifacti {
  readonly uuid: string;
  readonly estado: string;
  readonly url: string | null;
  readonly qr: string | null;
  readonly codigoError: string | null;
  readonly mensajeError: string | null;
  readonly operacion: string | null;
  readonly serie: string | null;
  readonly numero: string | null;
}

export interface Verifacti {
  /** Quién es, para los registros: nunca sale a la pantalla. */
  readonly quien: string;
  /**
   * **Manda un documento** (`POST /verifactu/create`) con la clave de su NIF y entorno, y con la
   * de idempotencia: el mismo cuerpo con la misma clave nunca registra dos veces. **No lanza**:
   * todo lo que puede pasar vuelve dicho, para apuntarlo.
   */
  emitir(
    nif: string,
    entorno: EntornoDeVerifacti,
    cuerpo: unknown,
    idempotencia: string,
  ): Promise<LoQuePasoAlEmitir>;
  /**
   * **Anula un documento** (`POST /verifactu/cancel`, 0140). Su registro es otro que el del alta, con
   * su uuid, y se pregunta igual. **No lanza**, como `emitir`.
   */
  anular(
    nif: string,
    entorno: EntornoDeVerifacti,
    cuerpo: { readonly serie: string; readonly numero: string; readonly fecha_expedicion: string },
    idempotencia: string,
  ): Promise<LoQuePasoAlEmitir>;
  /** El estado de un registro por su uuid. Nulo si no existe (404). */
  elRegistro(
    nif: string,
    entorno: EntornoDeVerifacti,
    uuid: string,
  ): Promise<ElRegistroEnVerifacti | null>;
  /**
   * **Si Hacienda ya tiene ese número con esa fecha** (`POST /verifactu/status`): el uuid de su
   * último registro aceptado, o nulo. Es lo que se pregunta antes de volver a mandar otro día
   * un documento que se quedó sin respuesta, para no registrarlo dos veces.
   */
  buscarEnHacienda(
    nif: string,
    entorno: EntornoDeVerifacti,
    factura: {
      readonly serie: string;
      readonly numero: string;
      readonly fecha: string;
      /** La de la operación, si fue en el registro original porque es otra (su especificación). */
      readonly fechaOperacion?: string;
    },
  ): Promise<string | null>;
  /**
   * Que los avisos de ese NIF lleguen a `url` (4.10): crea el aviso del entorno o le añade el NIF.
   * Devuelve el id del aviso.
   */
  escucharElNif(
    entorno: EntornoDeVerifacti,
    nif: string,
    aviso: { readonly id: string | null; readonly url: string; readonly secreto: string },
  ): Promise<string>;
  /** Probar la clave de la cuenta: cuántos NIF tiene. */
  probar(): Promise<{ readonly nifs: number }>;
  comprobarNif(nif: string, nombre: string | null): Promise<ElNifEnHacienda>;
  /** Un número de IVA de otro país, en el censo europeo: lo que Hacienda exige para aceptarlo. */
  comprobarIva(codigoPais: string, iva: string): Promise<'si' | 'no' | 'no_se_sabe'>;
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

/** Un registro tal como lo cuenta Verifacti (su status o un aviso), leído sin fiarse de su forma. */
export function leerElRegistro(cuerpo: unknown): ElRegistroEnVerifacti | null {
  const c = (cuerpo ?? {}) as Record<string, unknown>;
  const uuid = texto(c.uuid);
  const estado = texto(c.estado);
  if (estado === '') return null;
  return {
    uuid,
    // «Duplicado» con cómo lo tiene Hacienda: uno anulado no se da por bueno (0140).
    estado: elEstadoConSuDuplicado(estado, textoONulo(c.estado_registro_duplicado)),
    url: textoONulo(c.url),
    qr: textoONulo(c.qr),
    codigoError: textoONulo(
      typeof c.codigo_error === 'number' ? String(c.codigo_error) : c.codigo_error,
    ),
    mensajeError: textoONulo(c.mensaje_error),
    operacion: textoONulo(c.operacion),
    serie: textoONulo(c.serie),
    numero: textoONulo(c.numero),
  };
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
    metodo: 'GET' | 'POST' | 'PUT',
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

  async function conClave(
    metodo: 'GET' | 'POST',
    camino: string,
    clave: string,
    cuerpo: unknown,
    idempotencia?: string,
  ): Promise<Response> {
    try {
      return await fetch(`${RAIZ}${camino}`, {
        method: metodo,
        headers: {
          Authorization: `Bearer ${clave}`,
          ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(idempotencia === undefined ? {} : { 'Idempotency-Key': idempotencia }),
        },
        ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
        signal: AbortSignal.timeout(ESPERA_PARA_EMITIR_MS),
      });
    } catch (fallo) {
      throw new VerifactiNoContesta(null, fallo instanceof Error ? fallo.name : 'sin respuesta');
    }
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

  /** Lo que se le manda con la clave de un NIF: dar de alta o anular. Contestan igual. */
  async function mandarAlRegistro(
    camino: string,
    nif: string,
    entorno: EntornoDeVerifacti,
    cuerpo: unknown,
    idempotencia: string,
  ): Promise<LoQuePasoAlEmitir> {
    let clave: string;
    try {
      clave = await laClaveDelNif(entorno, nif);
    } catch (fallo) {
      return {
        resultado: 'sin_respuesta',
        codigoHttp: fallo instanceof VerifactiNoContesta ? fallo.estado : null,
        mensaje: 'Sin la clave del NIF',
      };
    }
    let respuesta: Response;
    try {
      respuesta = await conClave('POST', camino, clave, cuerpo, idempotencia);
    } catch (fallo) {
      return {
        resultado: 'sin_respuesta',
        codigoHttp: null,
        mensaje: fallo instanceof VerifactiNoContesta ? fallo.detalle : 'sin respuesta',
      };
    }
    const leido = ((await respuesta.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    if (respuesta.status === 200) {
      return {
        resultado: 'aceptado',
        uuid: texto(leido.uuid),
        estado: texto(leido.estado) || 'Pendiente',
        url: textoONulo(leido.url),
        qr: textoONulo(leido.qr),
        huella: textoONulo(leido.huella),
      };
    }
    if (respuesta.status === 400) {
      return {
        resultado: 'rechazado_por_datos',
        codigoHttp: 400,
        codigo: textoONulo(leido.codigo),
        mensaje: texto(leido.error).slice(0, 500),
      };
    }
    if (respuesta.status === 409) return { resultado: 'en_curso', codigoHttp: 409 };
    return {
      resultado: 'sin_respuesta',
      codigoHttp: respuesta.status,
      mensaje: (texto(leido.error) || texto(leido.message)).slice(0, 500),
    };
  }

  return {
    quien: 'verifacti',

    emitir(nif, entorno, cuerpo, idempotencia) {
      return mandarAlRegistro('/verifactu/create', nif, entorno, cuerpo, idempotencia);
    },

    anular(nif, entorno, cuerpo, idempotencia) {
      return mandarAlRegistro('/verifactu/cancel', nif, entorno, cuerpo, idempotencia);
    },

    async elRegistro(nif, entorno, uuid) {
      const clave = await laClaveDelNif(entorno, nif);
      const respuesta = await conClave(
        'GET',
        `/verifactu/status?uuid=${encodeURIComponent(uuid)}`,
        clave,
        undefined,
      );
      if (respuesta.status === 404) return null;
      return leerElRegistro(await enJson(respuesta));
    },

    async buscarEnHacienda(nif, entorno, factura) {
      const clave = await laClaveDelNif(entorno, nif);
      const respuesta = await conClave('POST', '/verifactu/status', clave, {
        serie: factura.serie,
        numero: factura.numero,
        fecha_expedicion: factura.fecha,
        ...(factura.fechaOperacion === undefined
          ? {}
          : { fecha_operacion: factura.fechaOperacion }),
      });
      if (respuesta.status === 404) return null;
      const c = ((await enJson(respuesta)) ?? {}) as Record<string, unknown>;
      return textoONulo(c.uuid);
    },

    async escucharElNif(entorno, nif, aviso) {
      if (aviso.id !== null) {
        const r = await pedir(
          'POST',
          `/webhooks/${encodeURIComponent(aviso.id)}/nifs/${encodeURIComponent(nif)}`,
        );
        // Si el aviso ya no existe (lo borraron en su panel), se crea otro.
        if (r.status !== 404) {
          await enJson(r, [409]);
          return aviso.id;
        }
      }
      const alCrear = await pedir('POST', '/webhooks', {
        cuerpo: { url: aviso.url, entorno, secret: aviso.secreto, nifs: [nif] },
      });
      if (alCrear.status === 409) {
        // Ya hay uno con esa dirección, puesto a mano en su panel o de una vez anterior: se usa ese,
        // con este secreto y encendido. Sin esto, los avisos no se pedirían nunca.
        const lista = await enJson(
          await pedir('GET', `/webhooks?entorno=${encodeURIComponent(entorno)}`),
        );
        const elQueHay = (Array.isArray(lista) ? (lista as Record<string, unknown>[]) : []).find(
          (w) => texto(w.url) === aviso.url,
        );
        const id = texto(elQueHay?.id);
        if (id === '') throw new VerifactiNoContesta(409, 'el aviso existe y no sale en la lista');
        await enJson(
          await pedir('PUT', `/webhooks/${encodeURIComponent(id)}`, {
            cuerpo: { secret: aviso.secreto, activo: true },
          }),
        );
        await enJson(
          await pedir(
            'POST',
            `/webhooks/${encodeURIComponent(id)}/nifs/${encodeURIComponent(nif)}`,
          ),
          [409],
        );
        return id;
      }
      const creado = ((await enJson(alCrear)) ?? {}) as Record<string, unknown>;
      const id = texto(creado.id);
      if (id === '') throw new VerifactiNoContesta(200, 'sin id del aviso');
      return id;
    },

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

    async comprobarIva(codigoPais, iva) {
      const cuerpo = (await enJson(
        await pedir('POST', '/nifs/validar/vies', { cuerpo: { codigo_pais: codigoPais, iva } }),
      )) as Record<string, unknown> | null;
      const resultado = texto(cuerpo?.resultado).trim().toUpperCase();
      if (resultado === 'IDENTIFICADO') return 'si';
      if (resultado === 'NO IDENTIFICADO') return 'no';
      // ERROR API VIES: el censo de ese país no contesta. No dice nada del número.
      return 'no_se_sabe';
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
