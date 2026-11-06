import {
  A_MEDIAS_DESDE_MS,
  PENDIENTE_DEMASIADO_MS,
  POR_QUE_NO_SE_EMITE,
  elCuerpoParaVerifacti,
  elDesglose,
  elEstadoDelDocumento,
  elJustificanteEnPapel,
  elNumeroEntero,
  elTicketEnPapel,
  fechaEnElLocal,
  fechaParaVerifacti,
  numeroEnTexto,
  porQueNoSeEmite,
  type ApunteDelDocumento,
  type ElDesglose,
  type EstadoDelDocumento,
  type FechaOperativa,
  type LineaVendida,
  type PapelCompuesto,
  type TipoDeDocumento,
} from '@estook/dominio';
import { variable } from '@estook/utiles';
import type { EntornoDeVerifacti, LoQuePasoAlEmitir, Verifacti } from '../facturacion/verifacti.ts';
import { apuntarUnFallo } from '../infraestructura/fallos.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { enLaBase } from './facturacion.ts';
import { cuandoEnElLocal, dejarEnLaCola, laImpresoraDe } from './impresion.ts';
import { enNombreDelSistema, laApiPublica } from './pago.ts';

/**
 * **El motor de emitir** (T6 · 2 · 1, decisión 0136; Anexo 4.9).
 *
 *   1. **Preparar**, dentro del comando: lo que se mira, el número con el candado de su serie y
 *      el documento congelado (`facturacion.preparar_el_documento`). Milisegundos.
 *   2. **Mandar, con el comando ya guardado y sin ninguna transacción abierta**: a Verifacti con
 *      la clave de idempotencia del documento. Lo que contesta se apunta en otra transacción
 *      corta. Ningún aparato espera a Verifacti para numerar, y una respuesta perdida no deja
 *      un número libre (0059).
 *   3. **Repasar**, cada minuto con el reloj: lo que se quedó a medias se termina con la misma
 *      clave, y lo que lleva una hora «Pendiente» se pregunta solo.
 *
 * Lo que decide qué toca con cada documento es `elPlan`, sin red: así se prueba solo.
 */

// ── Lo que hay que mandar al acabar el comando ────────────────────────────────────

const porMandar = new Map<string, string[]>();

/** El comando ha preparado un documento: se manda en cuanto el comando quede guardado. */
export function dejarParaMandar(correlacionId: string, documentoId: string): void {
  porMandar.set(correlacionId, [...(porMandar.get(correlacionId) ?? []), documentoId]);
}

/** Lo que dejó esta petición para mandar. Pregunta y olvida. */
export function loQueHayQueMandar(correlacionId: string): readonly string[] {
  const hay = porMandar.get(correlacionId) ?? [];
  porMandar.delete(correlacionId);
  return hay;
}

// ── El documento ──────────────────────────────────────────────────────────────────

export interface LaEmpresaDelDocumento {
  readonly local: string;
  readonly nombre: string;
  readonly nif: string;
  readonly domicilio: string;
  readonly de_pruebas?: boolean;
}

export interface ElDocumento {
  readonly id: string;
  readonly localId: string;
  readonly entorno: 'pruebas' | 'real';
  readonly modalidad: 'verifactu' | 'fuera_sii';
  readonly tipo: TipoDeDocumento;
  readonly serie: string;
  readonly numero: number;
  readonly fechaOperacion: FechaOperativa;
  readonly descripcion: string;
  readonly lineas: readonly LineaVendida[];
  readonly desglose: ElDesglose;
  readonly total: number;
  readonly empresa: LaEmpresaDelDocumento;
  readonly donde: string | null;
  readonly origen: 'ticket_de_prueba' | 'cobro';
  readonly preparadoEn: string;
  readonly zonaHoraria: string;
}

export interface UnEnvio {
  readonly en: string;
  readonly fechaExpedicion: FechaOperativa;
  readonly incidencia: boolean;
  readonly idempotencia: string;
  readonly resultado: 'aceptado' | 'rechazado_por_datos' | 'en_curso' | 'sin_respuesta';
  readonly codigo: string | null;
  readonly mensaje: string | null;
}

export interface UnRegistro {
  readonly en: string;
  readonly uuid: string;
  readonly estado: string;
  readonly qr: string | null;
  readonly url: string | null;
  readonly codigoError: string | null;
  readonly mensajeError: string | null;
  readonly por: 'alta' | 'consulta' | 'aviso';
}

export interface LaHistoria {
  readonly envios: readonly UnEnvio[];
  readonly registros: readonly UnRegistro[];
  readonly justificante: string | null;
}

interface FilaDelDocumento {
  id: string;
  local_id: string;
  entorno: 'pruebas' | 'real';
  modalidad: 'verifactu' | 'fuera_sii';
  tipo: TipoDeDocumento;
  serie: string;
  numero: number;
  fecha_operacion: string;
  descripcion: string;
  lineas: LineaVendida[];
  desglose: ElDesglose['lineas'];
  base: number;
  cuota: number;
  total: number;
  empresa_copia: LaEmpresaDelDocumento;
  donde: string | null;
  origen: 'ticket_de_prueba' | 'cobro';
  preparado_en: string;
  zona_horaria: string;
}

function delaFila(f: FilaDelDocumento): ElDocumento {
  return {
    id: f.id,
    localId: f.local_id,
    entorno: f.entorno,
    modalidad: f.modalidad,
    tipo: f.tipo,
    serie: f.serie,
    numero: f.numero,
    fechaOperacion: f.fecha_operacion as FechaOperativa,
    descripcion: f.descripcion,
    lineas: f.lineas,
    desglose: { lineas: f.desglose, base: f.base, cuota: f.cuota, total: f.total },
    total: f.total,
    empresa: f.empresa_copia,
    donde: f.donde,
    origen: f.origen,
    preparadoEn: new Date(f.preparado_en).toISOString(),
    zonaHoraria: f.zona_horaria,
  };
}

/** Los documentos por su id, con la zona de su local. Los que no se ven, no salen. */
export async function losDocumentos(
  contexto: Contexto,
  ids: readonly string[],
): Promise<ElDocumento[]> {
  if (ids.length === 0) return [];
  const filas = await contexto.sql<FilaDelDocumento[]>`
    select d.id::text as id, d.local_id::text as local_id, d.entorno, d.modalidad, d.tipo, d.serie,
           d.numero, to_char(d.fecha_operacion, 'YYYY-MM-DD') as fecha_operacion, d.descripcion,
           d.lineas, d.desglose, d.base, d.cuota, d.total, d.empresa_copia, d.donde, d.origen,
           d.preparado_en::text as preparado_en, l.zona_horaria
      from facturacion.documento d
      join estook.local l on l.id = d.local_id
     where d.id = any (${ids as string[]}::uuid[])
  `;
  return filas.map(delaFila);
}

/** Lo que se le ha ido añadiendo a cada documento, en orden (Anexo 7.6). */
export async function lasHistorias(
  contexto: Contexto,
  ids: readonly string[],
): Promise<Map<string, LaHistoria>> {
  const historias = new Map<
    string,
    { envios: UnEnvio[]; registros: UnRegistro[]; justificante: string | null }
  >(ids.map((id) => [id, { envios: [], registros: [], justificante: null }]));
  if (ids.length === 0) return historias;
  const envios = await contexto.sql<
    {
      documento_id: string;
      en: string;
      fecha_expedicion: string;
      incidencia: boolean;
      idempotencia: string;
      resultado: UnEnvio['resultado'];
      codigo: string | null;
      mensaje: string | null;
    }[]
  >`
    select documento_id::text as documento_id, en::text as en,
           to_char(fecha_expedicion, 'YYYY-MM-DD') as fecha_expedicion, incidencia, idempotencia,
           resultado, codigo, mensaje
      from facturacion.envio
     where documento_id = any (${ids as string[]}::uuid[])
     order by en, id
  `;
  for (const e of envios) {
    historias.get(e.documento_id)?.envios.push({
      en: new Date(e.en).toISOString(),
      fechaExpedicion: e.fecha_expedicion as FechaOperativa,
      incidencia: e.incidencia,
      idempotencia: e.idempotencia,
      resultado: e.resultado,
      codigo: e.codigo,
      mensaje: e.mensaje,
    });
  }
  const registros = await contexto.sql<
    {
      documento_id: string;
      en: string;
      uuid: string;
      estado: string;
      qr: string | null;
      url: string | null;
      codigo_error: string | null;
      mensaje_error: string | null;
      por: UnRegistro['por'];
    }[]
  >`
    select documento_id::text as documento_id, en::text as en, uuid, estado, qr, url,
           codigo_error, mensaje_error, por
      from facturacion.registro
     where documento_id = any (${ids as string[]}::uuid[])
     order by en, id
  `;
  for (const r of registros) {
    historias.get(r.documento_id)?.registros.push({
      en: new Date(r.en).toISOString(),
      uuid: r.uuid,
      estado: r.estado,
      qr: r.qr,
      url: r.url,
      codigoError: r.codigo_error,
      mensajeError: r.mensaje_error,
      por: r.por,
    });
  }
  const justificantes = await contexto.sql<{ documento_id: string; codigo: string }[]>`
    select documento_id::text as documento_id, codigo from facturacion.justificante
     where documento_id = any (${ids as string[]}::uuid[])
  `;
  for (const j of justificantes) {
    const h = historias.get(j.documento_id);
    if (h !== undefined) h.justificante = j.codigo;
  }
  return historias;
}

/** Lo que se le ha ido añadiendo, como lo lee el dominio. */
export function losApuntes(h: LaHistoria): ApunteDelDocumento[] {
  return [
    ...h.envios.map((e): ApunteDelDocumento => ({
      que: 'envio',
      en: e.en,
      resultado: e.resultado,
    })),
    ...h.registros.map((r): ApunteDelDocumento => ({
      que: 'registro',
      en: r.en,
      estado: r.estado,
    })),
  ];
}

/** Cómo está. Fuera de VERI*FACTU, por el SII, no va a Verifacti y está emitido al prepararse. */
export function comoEsta(doc: ElDocumento, h: LaHistoria): EstadoDelDocumento | 'fuera_sii' {
  if (doc.modalidad === 'fuera_sii') return 'fuera_sii';
  return elEstadoDelDocumento(losApuntes(h));
}

// ── Preparar (Anexo 4.9, pasos 1 a 4) ─────────────────────────────────────────────

export interface LoQueSeEmite {
  readonly localId: string;
  readonly tipo: TipoDeDocumento;
  readonly descripcion: string;
  readonly lineas: readonly LineaVendida[];
  readonly regimenDelLocal: LineaVendida['regimen'];
  readonly zonaHoraria: string;
  readonly donde: string | null;
  readonly origen: 'ticket_de_prueba';
}

/**
 * **Prepara un documento con su número**, dentro del comando. Lo que no vale se dice antes de
 * numerar: un número no se gasta en algo que no se puede emitir.
 */
export async function prepararUnDocumento(
  contexto: Contexto,
  que: LoQueSeEmite,
): Promise<{ readonly id: string; readonly numero: string }> {
  const no = porQueNoSeEmite(que.tipo, que.lineas, que.regimenDelLocal);
  if (no !== null) throw new FalloDeAplicacion('faltan_datos', { porque: POR_QUE_NO_SE_EMITE[no] });
  const desglose = elDesglose(que.lineas);
  const fecha = fechaEnElLocal(contexto.ahora, que.zonaHoraria);
  const [fila] = await enLaBase(
    () => contexto.sql<{ id: string; serie: string; numero: number }[]>`
      select id::text as id, serie, numero
        from facturacion.preparar_el_documento(
          ${que.localId}::uuid, ${que.tipo}, ${fecha}::date, ${que.descripcion},
          ${JSON.stringify(que.lineas)}::text::jsonb, ${JSON.stringify(desglose.lineas)}::text::jsonb,
          ${desglose.base}::integer, ${desglose.cuota}::integer, ${desglose.total}::integer,
          ${que.donde}, ${que.origen}, ${contexto.sesion?.aparato?.terminalId ?? null}::uuid,
          ${contexto.ahora.toISOString()}::timestamptz
        )
    `,
  );
  if (fila === undefined) throw new Error('El documento no se preparó.');
  dejarParaMandar(contexto.correlacionId, fila.id);
  return { id: fila.id, numero: elNumeroEntero(fila.serie, fila.numero) };
}

// ── Qué toca con cada uno ─────────────────────────────────────────────────────────

/**
 * **Cuándo se pregunta por un registro «Pendiente»**, sin guardar cuándo se preguntó: una vez
 * en su minuto 2 (lo normal es que Hacienda ya haya contestado) y después **en cada hora en
 * punto de su edad** (Anexo 4.10, prueba 17). El reloj late cada minuto, así que cae una vez en
 * cada sitio. Lo normal es que llegue antes su aviso.
 */
export function tocaPreguntar(edadMs: number): boolean {
  const minutos = Math.floor(edadMs / 60_000);
  const primera = Math.floor(A_MEDIAS_DESDE_MS / 60_000);
  const cadaHora = Math.floor(PENDIENTE_DEMASIADO_MS / 60_000);
  return minutos === primera || (minutos >= cadaHora && minutos % cadaHora === 0);
}

export type ElPlan =
  | { readonly que: 'nada' }
  /** Preguntar a Verifacti cómo está su registro. */
  | { readonly que: 'consultar'; readonly uuid: string }
  /**
   * Mandarlo. Antes, si se mandó otro día sin saber qué pasó, **preguntar a Hacienda** con esas
   * fechas si ya lo tiene: así no se registra dos veces (4.9 y 4.11).
   */
  | {
      readonly que: 'mandar';
      readonly antesBuscar: readonly FechaOperativa[];
      readonly fechaExpedicion: FechaOperativa;
      readonly incidencia: boolean;
      readonly idempotencia: string;
    };

/**
 * **Qué toca con un documento ahora** (Anexo 4.9, pasos 6 y 7; 4.10 y 4.11). Sin red y sin base.
 *
 *   · Terminado (correcto, rechazado, con errores) o por el SII: nada.
 *   · Registrado y «Pendiente»: preguntar, a los dos minutos la primera vez y después cada
 *     hora (prueba 17). Lo normal es que llegue antes su aviso.
 *   · Sin registro: mandarlo. **El mismo día, con la misma clave y el mismo cuerpo** que la
 *     primera vez: si aquella llegó, Verifacti repite su respuesta y no registra otro (prueba 7).
 *     **Otro día**, Verifacti ya no acepta esa fecha: se pregunta a Hacienda si lo tiene y, si
 *     no, se manda con la fecha de hoy, una clave nueva y la incidencia (4.11).
 *   · Con prisa no (`alMomento`): lo que se mandó hace menos de dos minutos se deja al reloj.
 */
export function elPlan(
  doc: ElDocumento,
  h: LaHistoria,
  hoy: FechaOperativa,
  ahora: Date,
  alMomento: boolean,
): ElPlan {
  const estado = comoEsta(doc, h);
  if (estado === 'fuera_sii') return { que: 'nada' };
  if (estado !== 'preparado' && estado !== 'enviando' && estado !== 'pendiente') {
    return { que: 'nada' };
  }
  const hace = (en: string) => ahora.getTime() - new Date(en).getTime();
  const ultimoRegistro = h.registros.at(-1);
  if (ultimoRegistro !== undefined) {
    return tocaPreguntar(hace(ultimoRegistro.en))
      ? { que: 'consultar', uuid: ultimoRegistro.uuid }
      : { que: 'nada' };
  }
  const ultimo = h.envios.at(-1);
  if (ultimo === undefined) {
    return {
      que: 'mandar',
      antesBuscar: [],
      fechaExpedicion: hoy,
      incidencia: false,
      idempotencia: doc.id,
    };
  }
  if (!alMomento && hace(ultimo.en) < A_MEDIAS_DESDE_MS) return { que: 'nada' };
  if (ultimo.fechaExpedicion === hoy) {
    return {
      que: 'mandar',
      antesBuscar: [],
      fechaExpedicion: ultimo.fechaExpedicion,
      incidencia: ultimo.incidencia,
      idempotencia: ultimo.idempotencia,
    };
  }
  const fechas = [...new Set(h.envios.map((e) => e.fechaExpedicion))].filter((f) => f !== hoy);
  return {
    que: 'mandar',
    antesBuscar: fechas,
    fechaExpedicion: hoy,
    incidencia: true,
    idempotencia: `${doc.id}:${hoy}`,
  };
}

// ── Mandar, fuera de la transacción ───────────────────────────────────────────────

export type EnUnaTransaccion = <T>(hacer: (contexto: Contexto) => Promise<T>) => Promise<T>;

function elEntorno(doc: ElDocumento): EntornoDeVerifacti {
  return doc.entorno === 'real' ? 'prod' : 'test';
}

type LoQueSeSupo =
  | { readonly que: 'nada' }
  | { readonly que: 'registro'; readonly registro: Parameters<typeof apuntarElRegistro>[2] }
  | {
      readonly que: 'envio';
      readonly fechaExpedicion: FechaOperativa;
      readonly incidencia: boolean;
      readonly idempotencia: string;
      readonly paso: LoQuePasoAlEmitir;
    };

async function apuntarElEnvio(
  contexto: Contexto,
  documentoId: string,
  e: Extract<LoQueSeSupo, { que: 'envio' }>,
): Promise<void> {
  const p = e.paso;
  await contexto.sql`
    select facturacion.apuntar_el_envio(
      ${documentoId}::uuid, ${e.fechaExpedicion}::date, ${e.incidencia}, ${e.idempotencia},
      ${p.resultado}, ${'codigoHttp' in p ? p.codigoHttp : null}::integer,
      ${p.resultado === 'rechazado_por_datos' ? p.codigo : null},
      ${p.resultado === 'rechazado_por_datos' || p.resultado === 'sin_respuesta' ? p.mensaje : null},
      ${contexto.ahora.toISOString()}::timestamptz
    )
  `;
  if (p.resultado === 'aceptado') {
    await apuntarElRegistro(contexto, documentoId, {
      uuid: p.uuid,
      estado: p.estado,
      qr: p.qr,
      url: p.url,
      huella: p.huella,
      codigoError: null,
      mensajeError: null,
      operacion: 'Alta',
      por: 'alta',
    });
  }
}

/** Un estado de Hacienda; si es el mismo que el último, no se repite. Devuelve si era nuevo. */
export async function apuntarElRegistro(
  contexto: Contexto,
  documentoId: string,
  r: {
    readonly uuid: string;
    readonly estado: string;
    readonly qr: string | null;
    readonly url: string | null;
    readonly huella: string | null;
    readonly codigoError: string | null;
    readonly mensajeError: string | null;
    readonly operacion: string | null;
    readonly por: 'alta' | 'consulta' | 'aviso';
  },
): Promise<boolean> {
  const [fila] = await contexto.sql<{ nuevo: boolean }[]>`
    select facturacion.apuntar_el_registro(
      ${documentoId}::uuid, ${r.uuid}, ${r.estado}, ${r.qr}, ${r.url}, ${r.huella},
      ${r.codigoError}, ${r.mensajeError}, ${r.operacion}, ${r.por},
      ${contexto.ahora.toISOString()}::timestamptz
    ) as nuevo
  `;
  return fila?.nuevo === true;
}

/** Hace lo del plan con Verifacti. **Sin transacción abierta**: aquí no se toca la base. */
async function hacerElPlan(
  verifacti: Verifacti,
  doc: ElDocumento,
  plan: ElPlan,
): Promise<LoQueSeSupo> {
  const entorno = elEntorno(doc);
  const nif = doc.empresa.nif;
  if (plan.que === 'nada') return { que: 'nada' };
  if (plan.que === 'consultar') {
    const r = await verifacti.elRegistro(nif, entorno, plan.uuid);
    if (r === null) return { que: 'nada' };
    return {
      que: 'registro',
      registro: {
        uuid: r.uuid || plan.uuid,
        estado: r.estado,
        qr: r.qr,
        url: r.url,
        huella: null,
        codigoError: r.codigoError,
        mensajeError: r.mensajeError,
        operacion: r.operacion,
        por: 'consulta',
      },
    };
  }
  for (const fecha of plan.antesBuscar) {
    const uuid = await verifacti.buscarEnHacienda(nif, entorno, {
      serie: doc.serie,
      numero: numeroEnTexto(doc.numero),
      fecha: fechaParaVerifacti(fecha),
    });
    if (uuid !== null) {
      // Ya lo tenía: aquel envío llegó. Se lee su registro y no se manda otro.
      const r = await verifacti.elRegistro(nif, entorno, uuid);
      return {
        que: 'registro',
        registro: {
          uuid,
          estado: r?.estado ?? 'Correcto',
          qr: r?.qr ?? null,
          url: r?.url ?? null,
          huella: null,
          codigoError: r?.codigoError ?? null,
          mensajeError: r?.mensajeError ?? null,
          operacion: r?.operacion ?? null,
          por: 'consulta',
        },
      };
    }
  }
  const cuerpo = elCuerpoParaVerifacti(doc, {
    fechaExpedicion: plan.fechaExpedicion,
    incidencia: plan.incidencia,
  });
  const paso = await verifacti.emitir(nif, entorno, cuerpo, plan.idempotencia);
  return {
    que: 'envio',
    fechaExpedicion: plan.fechaExpedicion,
    incidencia: plan.incidencia,
    idempotencia: plan.idempotencia,
    paso,
  };
}

export interface ComoQuedo {
  readonly id: string;
  readonly estado: EstadoDelDocumento | 'fuera_sii';
}

/**
 * **Manda los documentos de la lista** (4.9, paso 6): para cada uno, una transacción corta
 * para leerlo, la llamada a Verifacti **sin ninguna abierta**, y otra corta para apuntar lo que
 * pasó. Si es un ticket de prueba recién preparado, imprime el ticket con su QR o, si no se ha
 * llegado a Verifacti, el justificante (4.11). **Nunca lanza**: lo que falla se apunta y lo
 * termina el reloj.
 */
export async function mandarLosDocumentos(
  enTransaccion: EnUnaTransaccion,
  ids: readonly string[],
  como: { readonly alMomento: boolean; readonly imprimir: boolean },
): Promise<ComoQuedo[]> {
  const quedaron: ComoQuedo[] = [];
  for (const id of ids) {
    try {
      const leido = await enTransaccion((contexto) =>
        enNombreDelSistema(contexto, async () => {
          const [doc] = await losDocumentos(contexto, [id]);
          if (doc === undefined) return null;
          const h = (await lasHistorias(contexto, [id])).get(id) ?? {
            envios: [],
            registros: [],
            justificante: null,
          };
          const hoy = fechaEnElLocal(contexto.ahora, doc.zonaHoraria);
          return {
            doc,
            plan: elPlan(doc, h, hoy, contexto.ahora, como.alMomento),
            verifacti: contexto.facturacion ?? null,
            primeraVez: h.envios.length === 0,
          };
        }),
      );
      if (leido === null) continue;
      const { doc, plan, verifacti, primeraVez } = leido;
      const supo =
        verifacti === null || plan.que === 'nada'
          ? ({ que: 'nada' } as const)
          : await hacerElPlan(verifacti, doc, plan);

      const estado = await enTransaccion((contexto) =>
        enNombreDelSistema(contexto, async () => {
          if (supo.que === 'envio') await apuntarElEnvio(contexto, id, supo);
          if (supo.que === 'registro') await apuntarElRegistro(contexto, id, supo.registro);
          const h = (await lasHistorias(contexto, [id])).get(id);
          if (h === undefined) return 'preparado' as const;
          const ahora = comoEsta(doc, h);
          // El papel del ticket de prueba, la primera vez: con su QR si Verifacti lo aceptó,
          // y el justificante si no se llegó (4.11). Lo rechazado por los datos no se imprime.
          if (como.imprimir && primeraVez && doc.origen === 'ticket_de_prueba') {
            if (ahora === 'pendiente' || ahora === 'correcto' || ahora === 'fuera_sii') {
              await imprimirElDocumento(contexto, doc, h, false);
            } else if (ahora === 'enviando' || ahora === 'preparado') {
              const [j] = await contexto.sql<{ codigo: string }[]>`
                select facturacion.dar_el_justificante(${id}::uuid) as codigo
              `;
              await imprimirElDocumento(
                contexto,
                doc,
                { ...h, justificante: j?.codigo ?? null },
                false,
              );
            }
          }
          return ahora;
        }),
      );
      quedaron.push({ id, estado });
    } catch (fallo) {
      await apuntarUnFallo(fallo, {
        mensaje: 'un documento no se ha podido mandar a Verifacti',
        correlacionId: null,
      });
    }
  }
  return quedaron;
}

/**
 * **Lo que se quedó a medias** (4.9, paso 7; prueba 8 y 17): los documentos de los últimos
 * treinta días que no han terminado. Lo llama el reloj cada minuto, como el sistema.
 */
export async function repasarLosDocumentos(enTransaccion: EnUnaTransaccion): Promise<ComoQuedo[]> {
  const ids = await enTransaccion((contexto) =>
    enNombreDelSistema(contexto, async () => {
      const filas = await contexto.sql<{ id: string }[]>`
        select d.id::text as id
          from facturacion.documento d
         where d.modalidad = 'verifactu'
           and d.preparado_en > ${contexto.ahora.toISOString()}::timestamptz - interval '30 days'
           and not exists (
             select 1 from facturacion.registro r
              where r.documento_id = d.id
                and lower(r.estado) not in ('pendiente', 'error servidor aeat')
           )
           and not exists (
             select 1 from facturacion.envio e
              where e.documento_id = d.id and e.resultado = 'rechazado_por_datos'
           )
         order by d.preparado_en
         limit 50
      `;
      return filas.map((f) => f.id);
    }),
  );
  const hechos = await mandarLosDocumentos(enTransaccion, ids, {
    alMomento: false,
    imprimir: false,
  });
  await escucharLosAvisos(enTransaccion);
  return hechos;
}

// ── Los avisos de Verifacti (4.10) ────────────────────────────────────────────────

/** El secreto con el que Verifacti firma sus avisos. Sin él, no se piden ni se aceptan. */
export function elSecretoDeLosAvisos(): string | null {
  const s = variable('VERIFACTI_SECRETO_DE_LOS_AVISOS')?.trim() ?? '';
  return s === '' ? null : s;
}

/** Dónde llegan: la API pública, fuera de `/v1`, como el de Stripe. */
export function dondeLleganLosAvisos(): string {
  return `${laApiPublica()}/avisos/verifacti`;
}

/** La firma de un aviso: HMAC-SHA256 del cuerpo exacto, en hexadecimal (`X-Webhook-Signature`). */
export async function laFirmaDelAviso(cuerpo: string, secreto: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function igualesSinPrisa(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distinto = 0;
  for (let i = 0; i < a.length; i += 1) distinto |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return distinto === 0;
}

export async function laFirmaEsDeVerifacti(
  cuerpo: string,
  firma: string | null,
  secreto: string | null,
): Promise<boolean> {
  if (secreto === null || firma === null || firma.trim() === '') return false;
  return igualesSinPrisa(
    (await laFirmaDelAviso(cuerpo, secreto)).toLowerCase(),
    firma.trim().toLowerCase(),
  );
}

/**
 * **Un aviso de Verifacti** (4.10): firmado con el secreto, **una sola vez** por su
 * `X-Webhook-Id` (prueba 16), y cada registro que trae, a su documento por su uuid. Devuelve
 * cuántos estados nuevos ha apuntado.
 */
export async function aplicarElAvisoDeVerifacti(
  contexto: Contexto,
  idDelAviso: string,
  cuerpo: unknown,
): Promise<number> {
  return enNombreDelSistema(contexto, async () => {
    const [nuevo] = await contexto.sql<{ nuevo: boolean }[]>`
      select facturacion.apuntar_el_aviso(${idDelAviso}, ${JSON.stringify(cuerpo)}::text::jsonb) as nuevo
    `;
    if (nuevo?.nuevo !== true) return 0;
    const lista = Array.isArray(cuerpo) ? cuerpo : [];
    let apuntados = 0;
    for (const item of lista) {
      const c = (item ?? {}) as Record<string, unknown>;
      const uuid = typeof c.uuid === 'string' ? c.uuid : '';
      const estado = typeof c.estado === 'string' ? c.estado : '';
      if (uuid === '' || estado === '') continue;
      const [doc] = await contexto.sql<{ documento_id: string }[]>`
        select documento_id::text as documento_id from facturacion.registro
         where uuid = ${uuid} order by en limit 1
      `;
      if (doc === undefined) continue;
      const nuevoEstado = await apuntarElRegistro(contexto, doc.documento_id, {
        uuid,
        estado,
        qr: null,
        url: typeof c.url === 'string' ? c.url : null,
        huella: null,
        codigoError:
          typeof c.codigo_error === 'string' || typeof c.codigo_error === 'number'
            ? String(c.codigo_error)
            : null,
        mensajeError: typeof c.mensaje_error === 'string' ? c.mensaje_error : null,
        operacion: typeof c.operacion === 'string' ? c.operacion : null,
        por: 'aviso',
      });
      if (nuevoEstado) apuntados += 1;
    }
    return apuntados;
  });
}

/**
 * Que los avisos de cada NIF que emite lleguen (4.10): con el secreto puesto, el reloj da de
 * alta el aviso del entorno en Verifacti y le añade los NIF que falten. **No es una garantía**:
 * el repaso pregunta igual lo que lleve una hora pendiente.
 */
async function escucharLosAvisos(enTransaccion: EnUnaTransaccion): Promise<void> {
  const secreto = elSecretoDeLosAvisos();
  if (secreto === null) return;
  try {
    const faltan = await enTransaccion((contexto) =>
      enNombreDelSistema(contexto, async () => {
        const filas = await contexto.sql<
          { entorno: 'pruebas' | 'real'; nif: string; aviso: string | null }[]
        >`
          select distinct d.entorno, d.empresa_copia ->> 'nif' as nif, a.aviso
            from facturacion.documento d
            left join plataforma.aviso_de_verifacti a
              on a.entorno = case d.entorno when 'real' then 'prod' else 'test' end
           where d.modalidad = 'verifactu'
             and d.preparado_en > ${contexto.ahora.toISOString()}::timestamptz - interval '30 days'
             and (a.entorno is null or not ((d.empresa_copia ->> 'nif') = any (a.nifs)))
        `;
        return { filas, verifacti: contexto.facturacion ?? null };
      }),
    );
    if (faltan.verifacti === null) return;
    for (const f of faltan.filas) {
      const entorno: EntornoDeVerifacti = f.entorno === 'real' ? 'prod' : 'test';
      const aviso = await faltan.verifacti.escucharElNif(entorno, f.nif, {
        id: f.aviso,
        url: dondeLleganLosAvisos(),
        secreto,
      });
      await enTransaccion((contexto) =>
        enNombreDelSistema(
          contexto,
          () => contexto.sql`
            insert into plataforma.aviso_de_verifacti (entorno, aviso, nifs)
            values (${entorno}, ${aviso}, array[${f.nif}]::text[])
            on conflict (entorno) do update
               set aviso = excluded.aviso,
                   nifs = (select array_agg(distinct x) from unnest(plataforma.aviso_de_verifacti.nifs || excluded.nifs) x),
                   puesto_en = now()
          `,
        ),
      );
    }
  } catch (fallo) {
    await apuntarUnFallo(fallo, {
      mensaje: 'los avisos de Verifacti no se han podido pedir',
      correlacionId: null,
    });
  }
}

// ── El papel ──────────────────────────────────────────────────────────────────────

const NOMBRE_DEL_IMPUESTO = { iva: 'IVA', igic: 'IGIC', ipsi: 'IPSI' } as const;

function porciento(tipo: number): string {
  return `${String(Number((tipo * 100).toFixed(2))).replace('.', ',')} %`;
}

/**
 * **El papel de un documento**, igual que salió: el ticket con su QR cuando Verifacti lo ha
 * aceptado, o el justificante si se dio uno y todavía no está registrado. Nulo si no hay nada
 * que imprimir todavía.
 */
export function elPapelDelDocumento(
  doc: ElDocumento,
  h: LaHistoria,
  copia: boolean,
): PapelCompuesto | null {
  const cuando = cuandoEnElLocal(new Date(doc.preparadoEn), doc.zonaHoraria);
  const empresa = {
    local: doc.empresa.local,
    nombre: doc.empresa.nombre,
    nif: doc.empresa.nif,
    domicilio: doc.empresa.domicilio,
  };
  const lineas = doc.lineas.map((l) => ({
    cantidad: l.cantidad,
    nombre: l.nombre,
    importeCentimos: l.importe,
  }));
  const conQr = h.registros.find((r) => r.url !== null);
  if (doc.modalidad === 'fuera_sii' || conQr !== undefined) {
    return elTicketEnPapel({
      empresa,
      numero: elNumeroEntero(doc.serie, doc.numero),
      cuando,
      donde: doc.donde,
      lineas,
      impuestos: doc.desglose.lineas.map((l) => ({
        nombre: `${NOMBRE_DEL_IMPUESTO[l.regimen]} ${porciento(l.tipo)}`,
        baseCentimos: l.base,
        cuotaCentimos: l.cuota,
      })),
      totalCentimos: doc.total,
      qr: doc.modalidad === 'fuera_sii' ? null : (conQr?.url ?? null),
      pruebas: doc.entorno === 'pruebas',
      copia,
    });
  }
  if (h.justificante !== null) {
    return elJustificanteEnPapel({
      empresa,
      cuando,
      donde: doc.donde,
      lineas,
      totalCentimos: doc.total,
      codigo: h.justificante,
      pruebas: doc.entorno === 'pruebas',
    });
  }
  return null;
}

/**
 * Lo deja en la cola de la impresora de la caja. Devuelve si se dejó: sin impresora de caja,
 * el documento sigue emitido igual y se puede reimprimir (prueba 18).
 */
export async function imprimirElDocumento(
  contexto: Contexto,
  doc: ElDocumento,
  h: LaHistoria,
  copia: boolean,
): Promise<boolean> {
  const papel = elPapelDelDocumento(doc, h, copia);
  if (papel === null) return false;
  const impresora = await laImpresoraDe(contexto, doc.localId, 'caja');
  if (impresora === null) return false;
  const tipo =
    papel.piezas.some((p) => p.tipo === 'qr') || doc.modalidad === 'fuera_sii'
      ? 'ticket'
      : 'justificante';
  await dejarEnLaCola(contexto, doc.localId, impresora, tipo, papel, null);
  return true;
}
