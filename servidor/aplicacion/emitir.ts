import {
  A_MEDIAS_DESDE_MS,
  PENDIENTE_DEMASIADO_MS,
  POR_QUE_NO_SE_EMITE,
  comoQuedaLaAnulacion,
  elCuerpoParaVerifacti,
  elDesglose,
  elEstadoConSuDuplicado,
  elEstadoDeVerifacti,
  elEstadoDelDocumento,
  elJustificanteEnPapel,
  elNumeroEntero,
  elTicketEnPapel,
  direccionParaPedirLaFactura,
  elCodigoParaEnsenar,
  fechaEnElLocal,
  fechaParaVerifacti,
  laFacturaEnPapel,
  lasLineasDeLaSenal,
  lineasDeLaFactura,
  loQueQuedaDeCadaLinea,
  numeroEnTexto,
  porQueNoSeEmite,
  type ApunteDelDocumento,
  type ComoQuedaLaAnulacion,
  type DocumentoSustituido,
  type ElDesglose,
  type ElDestinatario,
  type EstadoDelDocumento,
  type FechaOperativa,
  type LineaVendida,
  type LoDevueltoDeUnaLinea,
  type LoQueRectifica,
  type PapelCompuesto,
  type TipoDeDocumento,
} from '@estook/dominio';
import { variable } from '@estook/utiles';
import type { EntornoDeVerifacti, LoQuePasoAlEmitir, Verifacti } from '../facturacion/verifacti.ts';
import { apuntarUnFallo } from '../infraestructura/fallos.ts';
import { avisar, losQueLoQuieren, quienesPuedenRecibir } from './avisos.ts';
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
 *   3. **Repasar**, con su propio reloj (`estook-documentos`, 0138): `pg_cron` mira cada minuto si
 *      hay algo en `facturacion.por_repasar` y llama a `/tareas/documentos`. Lo que se quedó a medias
 *      se termina con la misma clave, y lo que sigue «Pendiente» se pregunta solo.
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

export type OrigenDelDocumento =
  | 'ticket_de_prueba'
  | 'cobro'
  | 'a_mano'
  | 'canje'
  | 'devolucion'
  | 'correccion'
  | 'senal'
  /** La pidió el cliente, en su móvil (0141). */
  | 'pedida';

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
  readonly origen: OrigenDelDocumento;
  readonly preparadoEn: string;
  readonly zonaHoraria: string;
  readonly destinatario: ElDestinatario | null;
  readonly vencimiento: FechaOperativa | null;
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

/** Lo que va pasando con una anulación ante Hacienda (0140). */
export interface UnPasoDeAnular {
  readonly en: string;
  readonly uuid: string | null;
  readonly estado: string;
  readonly mensaje: string | null;
  readonly queda: ComoQuedaLaAnulacion;
}

export interface UnaAnulacion {
  readonly id: string;
  readonly motivo: string;
  readonly en: string;
  readonly quien: string | null;
  readonly pasos: readonly UnPasoDeAnular[];
}

/** Una rectificativa de este documento. */
export interface UnaRectificacion {
  readonly id: string;
  readonly numero: string;
  readonly clase: 'devolucion' | 'datos';
  readonly motivo: string;
  readonly en: string;
  readonly quien: string | null;
  readonly total: number;
  readonly lineas: readonly LoDevueltoDeUnaLinea[];
  /** Si Hacienda la tiene: la rechazada no cuenta y lo devuelto vuelve a quedar. */
  readonly enPie: boolean;
}

/** Lo que rectifica este documento, si es una rectificativa. */
export interface LoQueRectificaEste {
  readonly id: string;
  readonly numero: string;
  readonly clase: 'devolucion' | 'datos';
  readonly motivo: string;
  readonly fecha: FechaOperativa;
  readonly deSenal: boolean;
}

export interface LaHistoria {
  readonly envios: readonly UnEnvio[];
  readonly registros: readonly UnRegistro[];
  readonly justificante: string | null;
  /** Los tickets que sustituye esta factura. */
  readonly sustituye: readonly { readonly id: string; readonly numero: string }[];
  /** La factura que sustituye a este ticket, si la tiene. */
  readonly factura: { readonly id: string; readonly numero: string; readonly en: string } | null;
  /** Cuándo se cobró, si se hizo a mano sin cobrar. */
  readonly cobradaEn: string | null;
  /** A quién se le ha mandado por correo. */
  readonly copias: readonly { readonly para: string; readonly en: string }[];
  /** Si es una rectificativa, lo que rectifica. */
  readonly rectifica: LoQueRectificaEste | null;
  /** Las rectificativas que tiene encima, en pie o no. */
  readonly rectificaciones: readonly UnaRectificacion[];
  readonly anulaciones: readonly UnaAnulacion[];
  /** Lo que lo corrige si lo rechazó Hacienda, y lo que corrige él. */
  readonly rehechoPor: { readonly id: string; readonly numero: string; readonly en: string } | null;
  readonly rehaceA: { readonly id: string; readonly numero: string } | null;
  /** Las señales que descuenta esta factura. */
  readonly descuenta: readonly {
    readonly id: string;
    readonly numero: string;
    readonly importe: number;
  }[];
  /** La factura que descuenta esta señal, si sigue en pie y le queda algo. */
  readonly descontadaEn: {
    readonly id: string;
    readonly numero: string;
    readonly en: string;
  } | null;
}

/** La historia de un documento al que todavía no se le ha añadido nada. */
export const SIN_HISTORIA: LaHistoria = {
  envios: [],
  registros: [],
  justificante: null,
  sustituye: [],
  factura: null,
  cobradaEn: null,
  copias: [],
  rectifica: null,
  rectificaciones: [],
  anulaciones: [],
  rehechoPor: null,
  rehaceA: null,
  descuenta: [],
  descontadaEn: null,
};

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
  origen: OrigenDelDocumento;
  preparado_en: string;
  zona_horaria: string;
  destinatario: ElDestinatario | null;
  vencimiento: string | null;
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
    destinatario: f.destinatario,
    vencimiento: f.vencimiento as FechaOperativa | null,
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
           d.preparado_en::text as preparado_en, l.zona_horaria, d.destinatario,
           to_char(d.vencimiento, 'YYYY-MM-DD') as vencimiento
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
    {
      envios: UnEnvio[];
      registros: UnRegistro[];
      justificante: string | null;
      sustituye: { id: string; numero: string }[];
      factura: { id: string; numero: string; en: string } | null;
      cobradaEn: string | null;
      copias: { para: string; en: string }[];
      rectifica: LoQueRectificaEste | null;
      rectificaciones: UnaRectificacion[];
      anulaciones: UnaAnulacion[];
      rehechoPor: { id: string; numero: string; en: string } | null;
      rehaceA: { id: string; numero: string } | null;
      descuenta: { id: string; numero: string; importe: number }[];
      descontadaEn: { id: string; numero: string; en: string } | null;
    }
  >(
    ids.map((id) => [
      id,
      {
        envios: [],
        registros: [],
        justificante: null,
        sustituye: [],
        factura: null,
        cobradaEn: null,
        copias: [],
        rectifica: null,
        rectificaciones: [],
        anulaciones: [],
        rehechoPor: null,
        rehaceA: null,
        descuenta: [],
        descontadaEn: null,
      },
    ]),
  );
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
  const canjes = await contexto.sql<
    {
      ticket_id: string;
      factura_id: string;
      en: string;
      del_ticket: string;
      de_la_factura: string;
      sigue_en_pie: boolean;
    }[]
  >`
    select c.ticket_id::text as ticket_id, c.factura_id::text as factura_id, c.en::text as en,
           t.serie || lpad(t.numero::text, 6, '0') as del_ticket,
           f.serie || lpad(f.numero::text, 6, '0') as de_la_factura,
           facturacion.sigue_en_pie(c.factura_id) as sigue_en_pie
      from facturacion.canje c
      join facturacion.documento t on t.id = c.ticket_id
      join facturacion.documento f on f.id = c.factura_id
     where c.ticket_id = any (${ids as string[]}::uuid[])
        or c.factura_id = any (${ids as string[]}::uuid[])
     order by c.en
  `;
  for (const c of canjes) {
    const delTicket = historias.get(c.ticket_id);
    // Una factura que Hacienda no tiene no canjea nada: el ticket se puede volver a facturar (0138).
    if (delTicket !== undefined && c.sigue_en_pie) {
      delTicket.factura = {
        id: c.factura_id,
        numero: c.de_la_factura,
        en: new Date(c.en).toISOString(),
      };
    }
    historias.get(c.factura_id)?.sustituye.push({ id: c.ticket_id, numero: c.del_ticket });
  }
  const cobros = await contexto.sql<{ documento_id: string; en: string }[]>`
    select documento_id::text as documento_id, en::text as en from facturacion.cobro_de_factura
     where documento_id = any (${ids as string[]}::uuid[])
  `;
  for (const c of cobros) {
    const h = historias.get(c.documento_id);
    if (h !== undefined) h.cobradaEn = new Date(c.en).toISOString();
  }
  const copias = await contexto.sql<{ documento_id: string; para: string; en: string }[]>`
    select documento_id::text as documento_id, para, en::text as en from facturacion.copia_mandada
     where documento_id = any (${ids as string[]}::uuid[])
     order by en, id
  `;
  for (const c of copias) {
    historias.get(c.documento_id)?.copias.push({ para: c.para, en: new Date(c.en).toISOString() });
  }
  const rectificaciones = await contexto.sql<
    {
      rectificativa_id: string;
      documento_id: string;
      clase: 'devolucion' | 'datos';
      motivo: string;
      lineas: LoDevueltoDeUnaLinea[];
      de_senal: boolean;
      en: string;
      quien: string | null;
      total: number;
      de_la_rectificativa: string;
      del_documento: string;
      fecha: string;
      en_pie: boolean;
    }[]
  >`
    select r.rectificativa_id::text as rectificativa_id, r.documento_id::text as documento_id,
           r.clase, r.motivo, r.lineas, r.de_senal, r.en::text as en,
           btrim(p.nombre || ' ' || coalesce(p.apellidos, '')) as quien, d.total,
           d.serie || lpad(d.numero::text, 6, '0') as de_la_rectificativa,
           o.serie || lpad(o.numero::text, 6, '0') as del_documento,
           coalesce(
             (select to_char(e.fecha_expedicion, 'YYYY-MM-DD') from facturacion.envio e
               where e.documento_id = o.id and e.resultado = 'aceptado'
               order by e.en desc, e.id desc limit 1),
             to_char(o.fecha_operacion, 'YYYY-MM-DD')
           ) as fecha,
           facturacion.sigue_en_pie(r.rectificativa_id) as en_pie
      from facturacion.rectificacion r
      join facturacion.documento d on d.id = r.rectificativa_id
      join facturacion.documento o on o.id = r.documento_id
      left join estook.persona p on p.id = r.por
     where r.rectificativa_id = any (${ids as string[]}::uuid[])
        or r.documento_id = any (${ids as string[]}::uuid[])
     order by r.en
  `;
  for (const r of rectificaciones) {
    const laRectificativa = historias.get(r.rectificativa_id);
    if (laRectificativa !== undefined) {
      laRectificativa.rectifica = {
        id: r.documento_id,
        numero: r.del_documento,
        clase: r.clase,
        motivo: r.motivo,
        fecha: r.fecha as FechaOperativa,
        deSenal: r.de_senal,
      };
    }
    historias.get(r.documento_id)?.rectificaciones.push({
      id: r.rectificativa_id,
      numero: r.de_la_rectificativa,
      clase: r.clase,
      motivo: r.motivo,
      en: new Date(r.en).toISOString(),
      quien: r.quien,
      total: r.total,
      lineas: r.lineas,
      enPie: r.en_pie,
    });
  }
  const anulaciones = await contexto.sql<
    {
      id: string;
      documento_id: string;
      motivo: string;
      en: string;
      quien: string | null;
    }[]
  >`
    select a.id::text as id, a.documento_id::text as documento_id, a.motivo, a.en::text as en,
           btrim(p.nombre || ' ' || coalesce(p.apellidos, '')) as quien
      from facturacion.anulacion a
      left join estook.persona p on p.id = a.por
     where a.documento_id = any (${ids as string[]}::uuid[])
     order by a.en
  `;
  if (anulaciones.length > 0) {
    const pasos = await contexto.sql<
      {
        anulacion_id: string;
        en: string;
        uuid: string | null;
        estado: string;
        mensaje: string | null;
        queda: ComoQuedaLaAnulacion;
      }[]
    >`
      select anulacion_id::text as anulacion_id, en::text as en, uuid, estado, mensaje, queda
        from facturacion.paso_de_anulacion
       where anulacion_id = any (${anulaciones.map((a) => a.id)}::uuid[])
       order by en, id
    `;
    for (const a of anulaciones) {
      historias.get(a.documento_id)?.anulaciones.push({
        id: a.id,
        motivo: a.motivo,
        en: new Date(a.en).toISOString(),
        quien: a.quien,
        pasos: pasos
          .filter((p) => p.anulacion_id === a.id)
          .map((p) => ({
            en: new Date(p.en).toISOString(),
            uuid: p.uuid,
            estado: p.estado,
            mensaje: p.mensaje,
            queda: p.queda,
          })),
      });
    }
  }
  const rehechos = await contexto.sql<
    { original_id: string; nuevo_id: string; en: string; del_original: string; del_nuevo: string }[]
  >`
    select h.original_id::text as original_id, h.nuevo_id::text as nuevo_id, h.en::text as en,
           o.serie || lpad(o.numero::text, 6, '0') as del_original,
           n.serie || lpad(n.numero::text, 6, '0') as del_nuevo
      from facturacion.rehecho h
      join facturacion.documento o on o.id = h.original_id
      join facturacion.documento n on n.id = h.nuevo_id
     where h.original_id = any (${ids as string[]}::uuid[])
        or h.nuevo_id = any (${ids as string[]}::uuid[])
  `;
  for (const r of rehechos) {
    const original = historias.get(r.original_id);
    if (original !== undefined) {
      original.rehechoPor = {
        id: r.nuevo_id,
        numero: r.del_nuevo,
        en: new Date(r.en).toISOString(),
      };
    }
    const nuevo = historias.get(r.nuevo_id);
    if (nuevo !== undefined) nuevo.rehaceA = { id: r.original_id, numero: r.del_original };
  }
  const descuentos = await contexto.sql<
    {
      senal_id: string;
      factura_id: string;
      importe: number;
      en: string;
      de_la_senal: string;
      de_la_factura: string;
      cuenta: boolean;
    }[]
  >`
    select d.senal_id::text as senal_id, d.factura_id::text as factura_id, d.importe, d.en::text as en,
           s.serie || lpad(s.numero::text, 6, '0') as de_la_senal,
           f.serie || lpad(f.numero::text, 6, '0') as de_la_factura,
           (facturacion.sigue_en_pie(d.factura_id) and facturacion.lo_que_queda(d.factura_id) <> 0) as cuenta
      from facturacion.descuento_de_senal d
      join facturacion.documento s on s.id = d.senal_id
      join facturacion.documento f on f.id = d.factura_id
     where d.senal_id = any (${ids as string[]}::uuid[])
        or d.factura_id = any (${ids as string[]}::uuid[])
     order by d.en
  `;
  for (const d of descuentos) {
    historias
      .get(d.factura_id)
      ?.descuenta.push({ id: d.senal_id, numero: d.de_la_senal, importe: d.importe });
    const laSenal = historias.get(d.senal_id);
    if (laSenal !== undefined && d.cuenta) {
      laSenal.descontadaEn = {
        id: d.factura_id,
        numero: d.de_la_factura,
        en: new Date(d.en).toISOString(),
      };
    }
  }
  return historias;
}

/** La anulación que todavía no ha terminado, si la hay: mientras, Hacienda tiene la palabra. */
export function laAnulacionEnCurso(h: LaHistoria): UnaAnulacion | null {
  return (
    h.anulaciones.find(
      (a) => !a.pasos.some((p) => p.queda === 'anulada' || p.queda === 'no_salio'),
    ) ?? null
  );
}

/** Lo que ya se ha devuelto de cada línea, sin lo que Hacienda no tiene. */
export function loDevuelto(h: LaHistoria): LoDevueltoDeUnaLinea[] {
  return h.rectificaciones
    .filter((r) => r.enPie && r.clase === 'devolucion')
    .flatMap((r) => r.lineas);
}

/** Lo que le queda a un documento: lo que vale menos lo devuelto. */
export function loQueLeQueda(doc: ElDocumento, h: LaHistoria): number {
  return (
    doc.total +
    h.rectificaciones
      .filter((r) => r.enPie && r.clase === 'devolucion')
      .reduce((s, r) => s + r.total, 0)
  );
}

/** La corrección de datos en vigor, si tiene una: es la que vale y la anterior queda «Corregida». */
export function suCorreccion(h: LaHistoria): UnaRectificacion | null {
  return h.rectificaciones.find((r) => r.enPie && r.clase === 'datos') ?? null;
}

export function esUnaSenal(doc: ElDocumento, h: LaHistoria): boolean {
  return doc.origen === 'senal' || h.rectifica?.deSenal === true;
}

export interface UnaSenal {
  readonly id: string;
  readonly numero: string;
  /** El día que se cobró. */
  readonly fecha: FechaOperativa;
  /** Lo que resta de la factura final: lo que le queda, en positivo. */
  readonly importe: number;
  /** Lo que la final le pone, en negativo y en su mismo tipo. */
  readonly lineas: readonly LineaVendida[];
}

/** Cada señal con lo que le queda, en líneas: para enseñarla y para la factura final. */
export async function lasSenalesConSusLineas(
  contexto: Contexto,
  senales: readonly {
    readonly id: string;
    readonly fecha: FechaOperativa;
    readonly queda: number;
  }[],
): Promise<UnaSenal[]> {
  const ids = senales.map((s) => s.id);
  const docs = await losDocumentos(contexto, ids);
  const historias = await lasHistorias(contexto, ids);
  return senales.flatMap((s) => {
    const doc = docs.find((d) => d.id === s.id);
    const h = historias.get(s.id);
    if (doc === undefined || h === undefined) return [];
    return [
      {
        id: s.id,
        numero: elNumeroEntero(doc.serie, doc.numero),
        fecha: s.fecha,
        importe: s.queda,
        lineas: lasLineasDeLaSenal(loQueQuedaDeCadaLinea(doc.lineas, loDevuelto(h))),
      },
    ];
  });
}

/**
 * **Lo que rectifica una rectificativa, para Verifacti** (0140): por diferencias si es una devolución y
 * por sustitución si corrige datos, cada documento con la fecha que tiene Hacienda.
 */
export async function laRectificacionParaVerifacti(
  contexto: Contexto,
  rectificativaId: string,
): Promise<LoQueRectifica | undefined> {
  const [r] = await contexto.sql<
    {
      clase: 'devolucion' | 'datos';
      documento_id: string;
      tambien: string[];
      base_rectificada: number | null;
      cuota_rectificada: number | null;
    }[]
  >`
    select clase, documento_id::text as documento_id, tambien::text[] as tambien,
           base_rectificada, cuota_rectificada
      from facturacion.rectificacion where rectificativa_id = ${rectificativaId}::uuid
  `;
  if (r === undefined) return undefined;
  const ids = [r.documento_id, ...r.tambien];
  const filas = await contexto.sql<
    { id: string; serie: string; numero: number; fecha: string; expedicion: string | null }[]
  >`
    select d.id::text as id, d.serie, d.numero, to_char(d.fecha_operacion, 'YYYY-MM-DD') as fecha,
           (select to_char(e.fecha_expedicion, 'YYYY-MM-DD') from facturacion.envio e
             where e.documento_id = d.id and e.resultado = 'aceptado'
             order by e.en desc, e.id desc limit 1) as expedicion
      from facturacion.documento d
     where d.id = any (${ids}::uuid[])
     order by d.preparado_en
  `;
  return {
    tipo: r.clase === 'datos' ? 'S' : 'I',
    facturas: filas.map((f) => ({
      serie: f.serie,
      numero: f.numero,
      fechaExpedicion: (f.expedicion ?? f.fecha) as FechaOperativa,
    })),
    ...(r.base_rectificada === null || r.cuota_rectificada === null
      ? {}
      : { importe: { base: r.base_rectificada, cuota: r.cuota_rectificada } }),
  };
}

/**
 * Los tickets que sustituye una factura, **con la fecha con la que Verifacti los registró**: es la
 * que tiene Hacienda, y puede no ser la de la venta si se mandó otro día (Anexo 4.11).
 */
export async function lasSustituidas(
  contexto: Contexto,
  facturaId: string,
): Promise<DocumentoSustituido[]> {
  const filas = await contexto.sql<
    { serie: string; numero: number; fecha: string; expedicion: string | null }[]
  >`
    select t.serie, t.numero, to_char(t.fecha_operacion, 'YYYY-MM-DD') as fecha,
           (select to_char(e.fecha_expedicion, 'YYYY-MM-DD') from facturacion.envio e
             where e.documento_id = t.id and e.resultado = 'aceptado'
             order by e.en desc, e.id desc limit 1) as expedicion
      from facturacion.canje c
      join facturacion.documento t on t.id = c.ticket_id
     where c.factura_id = ${facturaId}::uuid
     order by t.preparado_en
  `;
  return filas.map((f) => ({
    serie: f.serie,
    numero: f.numero,
    fechaExpedicion: (f.expedicion ?? f.fecha) as FechaOperativa,
  }));
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
  if (doc.modalidad === 'fuera_sii') {
    return h.registros.some((r) => r.estado.trim().toLowerCase() === 'anulado')
      ? 'anulado'
      : 'fuera_sii';
  }
  return elEstadoDelDocumento(losApuntes(h));
}

/**
 * **La fecha que tiene Hacienda** (la del envío aceptado): es la del documento, la de su QR. Solo es
 * otra que la de prepararlo si se mandó otro día, al volver la conexión (Anexo 4.11).
 */
export function laFechaDeExpedicion(doc: ElDocumento, h: LaHistoria): FechaOperativa {
  return (
    h.envios.findLast((e) => e.resultado === 'aceptado')?.fechaExpedicion ??
    fechaEnElLocal(new Date(doc.preparadoEn), doc.zonaHoraria)
  );
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
  /** El cobro llega con T7: hoy solo vuelve a salir al corregir uno rechazado, y lo mira la base. */
  readonly origen: OrigenDelDocumento;
  /** La fecha de la comida, si fue antes. Sin ella, hoy. */
  readonly fechaOperacion?: FechaOperativa | undefined;
  readonly destinatario?: ElDestinatario | undefined;
  readonly vencimiento?: FechaOperativa | null | undefined;
  /** El documento rechazado que corrige (0140): lo prepara quien corrige, sea el origen que sea. */
  readonly rehace?: string | undefined;
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
  const fecha = que.fechaOperacion ?? fechaEnElLocal(contexto.ahora, que.zonaHoraria);
  const [fila] = await enLaBase(
    () => contexto.sql<{ id: string; serie: string; numero: number }[]>`
      select id::text as id, serie, numero
        from facturacion.preparar_el_documento(
          ${que.localId}::uuid, ${que.tipo}, ${fecha}::date, ${que.descripcion},
          ${JSON.stringify(que.lineas)}::text::jsonb, ${JSON.stringify(desglose.lineas)}::text::jsonb,
          ${desglose.base}::integer, ${desglose.cuota}::integer, ${desglose.total}::integer,
          ${que.donde}, ${que.origen}, ${contexto.sesion?.aparato?.terminalId ?? null}::uuid,
          ${contexto.ahora.toISOString()}::timestamptz,
          ${que.destinatario === undefined ? null : JSON.stringify(que.destinatario)}::text::jsonb,
          ${que.vencimiento ?? null}::date, ${que.rehace ?? null}::uuid
        )
    `,
  );
  if (fila === undefined) throw new Error('El documento no se preparó.');
  dejarParaMandar(contexto.correlacionId, fila.id);
  return { id: fila.id, numero: elNumeroEntero(fila.serie, fila.numero) };
}

// ── Qué toca con cada uno ─────────────────────────────────────────────────────────

/**
 * **Cuándo se pregunta por un registro «Pendiente»**, sin guardar cuándo se preguntó: **en cada
 * latido hasta los cinco minutos** (lo normal es que Hacienda conteste en ese rato), luego **cada
 * cinco** hasta la hora, y después **cada hora en punto de su edad** (Anexo 4.10, prueba 17).
 *
 * Con una sola pregunta en el minuto 2, un ticket que Hacienda aceptaba en el minuto 3 se quedaba
 * una hora en «En Hacienda» si no llegaba el aviso, que no es una garantía de entrega (lo vio Richi
 * en IKATZ el 6-nov). En cada hora se dejan dos latidos: uno que se retrase no se la salta.
 */
export function tocaPreguntar(edadMs: number): boolean {
  const minutos = Math.floor(edadMs / 60_000);
  if (minutos < Math.floor(A_MEDIAS_DESDE_MS / 60_000)) return false;
  if (minutos <= 5) return true;
  const cadaHora = Math.floor(PENDIENTE_DEMASIADO_MS / 60_000);
  if (minutos < cadaHora) return minutos % 5 === 0;
  return minutos % cadaHora <= 1;
}

/** Lo de la cola, con lo que hace falta para saber si toca esta vez. */
export interface PorRepasar {
  readonly id: string;
  readonly preparadoEn: string;
  readonly primerEnvio: string | null;
  readonly ultimoRegistro: string | null;
}

/**
 * **Qué toca repasar en este latido** (0138): cada uno cuando le toca, y los que todavía no están
 * registrados, primero. Lo que no toca no ocupa sitio: cincuenta atascados no tapan a los demás. Y
 * lo que no llega a Verifacti se reintenta cada vez menos, porque cada intento queda apuntado para
 * siempre (solo inserción): con Verifacti caído una tarde no se llena la tabla.
 */
export function loQueTocaRepasar(
  filas: readonly PorRepasar[],
  ahora: Date,
  deUnaVez = 50,
): readonly string[] {
  const edad = (en: string) => ahora.getTime() - new Date(en).getTime();
  const tocan = filas.filter((f) =>
    tocaPreguntar(edad(f.ultimoRegistro ?? f.primerEnvio ?? f.preparadoEn)),
  );
  return [
    ...tocan.filter((f) => f.ultimoRegistro === null),
    ...tocan.filter((f) => f.ultimoRegistro !== null),
  ]
    .slice(0, deUnaVez)
    .map((f) => f.id);
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
    }
  /** Pedirle a Hacienda que lo anule (0140). Con la fecha que tiene, la de su registro. */
  | {
      readonly que: 'anular';
      readonly anulacionId: string;
      readonly fechaExpedicion: FechaOperativa;
      readonly idempotencia: string;
    }
  /** Preguntar cómo va la anulación, por **su** uuid, que es otro que el del alta. */
  | { readonly que: 'consultar_la_anulacion'; readonly anulacionId: string; readonly uuid: string };

/**
 * **Qué toca con un documento ahora** (Anexo 4.9, pasos 6 y 7; 4.10 y 4.11). Sin red y sin base.
 *
 *   · Terminado (correcto, rechazado, con errores) o por el SII: nada.
 *   · Registrado y «Pendiente»: preguntar, como dice `tocaPreguntar` (prueba 17). Lo normal es
 *     que llegue antes su aviso.
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
  const hace = (en: string) => ahora.getTime() - new Date(en).getTime();
  // Lo que se está anulando manda sobre lo demás: su alta ya terminó (0140).
  const anulando = laAnulacionEnCurso(h);
  if (anulando !== null) {
    const elUltimo = anulando.pasos.at(-1);
    const suUuid = anulando.pasos.findLast((p) => p.uuid !== null)?.uuid ?? null;
    if (suUuid !== null) {
      return tocaPreguntar(hace(elUltimo?.en ?? anulando.en))
        ? { que: 'consultar_la_anulacion', anulacionId: anulando.id, uuid: suUuid }
        : { que: 'nada' };
    }
    if (!alMomento && hace(elUltimo?.en ?? anulando.en) < A_MEDIAS_DESDE_MS) return { que: 'nada' };
    return {
      que: 'anular',
      anulacionId: anulando.id,
      fechaExpedicion: laFechaDeExpedicion(doc, h),
      idempotencia: anulando.id,
    };
  }
  if (estado !== 'preparado' && estado !== 'enviando' && estado !== 'pendiente') {
    return { que: 'nada' };
  }
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
    }
  | { readonly que: 'paso_de_anular'; readonly anulacionId: string; readonly paso: ElPasoDeAnular };

/** Lo que se sabe de una anulación, para apuntarlo. */
export interface ElPasoDeAnular {
  readonly uuid: string | null;
  readonly estado: string;
  readonly codigo: string | null;
  readonly mensaje: string | null;
  readonly queda: ComoQuedaLaAnulacion;
  readonly por: 'alta' | 'consulta' | 'aviso';
}

/** Lo que pasó al pedirla, como un paso: un 400 no llega a Hacienda y el documento sigue valiendo. */
function elPasoAlPedirla(p: LoQuePasoAlEmitir): ElPasoDeAnular {
  switch (p.resultado) {
    case 'aceptado':
      return {
        uuid: p.uuid,
        estado: p.estado,
        codigo: null,
        mensaje: null,
        queda: comoQuedaLaAnulacion(p.estado),
        por: 'alta',
      };
    case 'rechazado_por_datos':
      return {
        uuid: null,
        estado: 'No aceptada por Verifacti',
        codigo: p.codigo,
        mensaje: p.mensaje,
        queda: 'no_salio',
        por: 'alta',
      };
    case 'en_curso':
      return {
        uuid: null,
        estado: 'En curso',
        codigo: null,
        mensaje: null,
        queda: 'sigue',
        por: 'alta',
      };
    case 'sin_respuesta':
      return {
        uuid: null,
        estado: 'Sin respuesta',
        codigo: null,
        mensaje: p.mensaje,
        queda: 'sigue',
        por: 'alta',
      };
  }
}

/** Lo apunta y, si no ha salido, se lo dice a quien lleva la facturación. Devuelve si era nuevo. */
export async function apuntarElPasoDeAnular(
  contexto: Contexto,
  doc: ElDocumento,
  anulacionId: string,
  p: ElPasoDeAnular,
): Promise<boolean> {
  const [fila] = await contexto.sql<{ nuevo: boolean }[]>`
    select facturacion.apuntar_el_paso_de_anular(
      ${anulacionId}::uuid, ${p.uuid}, ${p.estado}, ${p.codigo}, ${p.mensaje}, ${p.queda}, ${p.por},
      ${contexto.ahora.toISOString()}::timestamptz
    ) as nuevo
  `;
  const nuevo = fila?.nuevo === true;
  if (nuevo && p.queda === 'no_salio') await avisarDeLaAnulacion(contexto, doc, anulacionId);
  return nuevo;
}

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
  sustituidas: readonly DocumentoSustituido[],
  rectifica: LoQueRectifica | undefined,
): Promise<LoQueSeSupo> {
  const entorno = elEntorno(doc);
  const nif = doc.empresa.nif;
  if (plan.que === 'nada') return { que: 'nada' };
  if (plan.que === 'anular') {
    const paso = await verifacti.anular(
      nif,
      entorno,
      {
        serie: doc.serie,
        numero: numeroEnTexto(doc.numero),
        fecha_expedicion: fechaParaVerifacti(plan.fechaExpedicion),
      },
      plan.idempotencia,
    );
    return { que: 'paso_de_anular', anulacionId: plan.anulacionId, paso: elPasoAlPedirla(paso) };
  }
  if (plan.que === 'consultar_la_anulacion') {
    const r = await verifacti.elRegistro(nif, entorno, plan.uuid);
    if (r === null) return { que: 'nada' };
    return {
      que: 'paso_de_anular',
      anulacionId: plan.anulacionId,
      paso: {
        uuid: plan.uuid,
        estado: r.estado,
        codigo: r.codigoError,
        mensaje: r.mensajeError,
        queda: comoQuedaLaAnulacion(r.estado),
        por: 'consulta',
      },
    };
  }
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
      // Verifacti la exige si fue en el registro original, y va cuando es otra (0138): sin ella no
      // lo encontraría y se registraría dos veces.
      ...(doc.fechaOperacion === fecha
        ? {}
        : { fechaOperacion: fechaParaVerifacti(doc.fechaOperacion) }),
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
  const cuerpo = elCuerpoParaVerifacti(
    { ...doc, sustituidas, rectifica },
    {
      fechaExpedicion: plan.fechaExpedicion,
      incidencia: plan.incidencia,
    },
  );
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
  como: {
    readonly alMomento: boolean;
    readonly imprimir: boolean;
    /** Pasado esto no se empieza otro: lo que quede va en el latido siguiente. */
    readonly plazoMs?: number;
  },
): Promise<ComoQuedo[]> {
  const quedaron: ComoQuedo[] = [];
  const empezo = Date.now();
  for (const id of ids) {
    if (como.plazoMs !== undefined && Date.now() - empezo > como.plazoMs) break;
    try {
      const leido = await enTransaccion((contexto) =>
        enNombreDelSistema(contexto, async () => {
          const [doc] = await losDocumentos(contexto, [id]);
          if (doc === undefined) return null;
          const h = (await lasHistorias(contexto, [id])).get(id) ?? SIN_HISTORIA;
          const hoy = fechaEnElLocal(contexto.ahora, doc.zonaHoraria);
          return {
            doc,
            antes: comoEsta(doc, h),
            sustituidas: doc.tipo === 'F3' ? await lasSustituidas(contexto, id) : [],
            rectifica:
              doc.tipo === 'R1' || doc.tipo === 'R4' || doc.tipo === 'R5'
                ? await laRectificacionParaVerifacti(contexto, id)
                : undefined,
            plan: elPlan(doc, h, hoy, contexto.ahora, como.alMomento),
            verifacti: contexto.facturacion ?? null,
            primeraVez: h.envios.length === 0,
          };
        }),
      );
      if (leido === null) continue;
      const { doc, antes, sustituidas, rectifica, plan, verifacti, primeraVez } = leido;
      const supo =
        verifacti === null || plan.que === 'nada'
          ? ({ que: 'nada' } as const)
          : await hacerElPlan(verifacti, doc, plan, sustituidas, rectifica);

      const estado = await enTransaccion((contexto) =>
        enNombreDelSistema(contexto, async () => {
          if (supo.que === 'envio') await apuntarElEnvio(contexto, id, supo);
          if (supo.que === 'registro') await apuntarElRegistro(contexto, id, supo.registro);
          if (supo.que === 'paso_de_anular') {
            await apuntarElPasoDeAnular(contexto, doc, supo.anulacionId, supo.paso);
          }
          const h = (await lasHistorias(contexto, [id])).get(id);
          if (h === undefined) return 'preparado' as const;
          const ahora = comoEsta(doc, h);
          if (ahora !== antes) await avisarSiHayQueHacerAlgo(contexto, doc, ahora);
          // El papel del ticket de prueba y el de un cobro (0144), la primera vez: con su QR si
          // Verifacti lo aceptó, y el justificante si no se llegó (4.11). Lo rechazado por los datos
          // no se imprime.
          if (
            como.imprimir &&
            primeraVez &&
            (doc.origen === 'ticket_de_prueba' || doc.origen === 'cobro')
          ) {
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
 * **Lo que se quedó a medias** (4.9, paso 7; pruebas 8 y 17): lo que hay en la cola de los últimos
 * treinta días, cuando le toca. Lo llama su propio reloj (`estook-documentos`, 0138), como el sistema,
 * y **tiene menos de un minuto**: pasado el plazo, lo que falta espera al latido siguiente.
 */
const PLAZO_DEL_REPASO_MS = 40_000;

export async function repasarLosDocumentos(enTransaccion: EnUnaTransaccion): Promise<ComoQuedo[]> {
  const ids = await enTransaccion((contexto) =>
    enNombreDelSistema(contexto, async () => {
      const filas = await contexto.sql<
        {
          id: string;
          desde: string;
          primer_envio: string | null;
          ultimo_registro: string | null;
        }[]
      >`
        select p.documento_id::text as id, p.desde::text as desde,
               (select min(e.en)::text from facturacion.envio e
                 where e.documento_id = p.documento_id) as primer_envio,
               greatest(
                 (select max(r.en) from facturacion.registro r
                   where r.documento_id = p.documento_id),
                 -- Lo que se está anulando se mira por la anulación, no por su alta de hace días.
                 (select max(a.en) from facturacion.anulacion a
                   where a.documento_id = p.documento_id),
                 (select max(pa.en) from facturacion.paso_de_anulacion pa
                    join facturacion.anulacion a on a.id = pa.anulacion_id
                   where a.documento_id = p.documento_id)
               )::text as ultimo_registro
          from facturacion.por_repasar p
         where p.desde > ${contexto.ahora.toISOString()}::timestamptz - interval '30 days'
         order by p.desde
         limit 2000
      `;
      return loQueTocaRepasar(
        filas.map((f) => ({
          id: f.id,
          preparadoEn: f.desde,
          primerEnvio: f.primer_envio,
          ultimoRegistro: f.ultimo_registro,
        })),
        contexto.ahora,
      );
    }),
  );
  const hechos = await mandarLosDocumentos(enTransaccion, ids, {
    alMomento: false,
    imprimir: false,
    plazoMs: PLAZO_DEL_REPASO_MS,
  });
  await escucharLosAvisos(enTransaccion);
  return hechos;
}

/**
 * **Lo que lleva demasiado sin terminar**, de cualquier cuenta. Lo mira el latido de cada hora, que
 * no depende de este reloj: si el repaso se para otra vez, se sabe por Sentry y no porque lo vea un
 * cliente (lección 257).
 */
export async function losQueLlevanDemasiado(contexto: Contexto): Promise<number> {
  const [fila] = await contexto.sql<{ cuantos: number }[]>`
    select count(*)::int as cuantos from facturacion.por_repasar p
     where p.desde < ${contexto.ahora.toISOString()}::timestamptz - interval '2 hours'
       and p.desde > ${contexto.ahora.toISOString()}::timestamptz - interval '30 days'
  `;
  return fila?.cuantos ?? 0;
}

// ── La campana ────────────────────────────────────────────────────────────────────

/**
 * **Lo que rechaza Hacienda llega a la campana** de quien lleva la facturación (maqueta de T6, 3;
 * Anexo 4.10). Una vez por documento. Lo de pruebas también: es para ver cómo funciona. **Nunca
 * rompe nada**: un aviso que no sale no puede tirar lo que se ha apuntado.
 */
async function avisarSiHayQueHacerAlgo(
  contexto: Contexto,
  doc: ElDocumento,
  estado: EstadoDelDocumento | 'fuera_sii',
): Promise<void> {
  if (estado !== 'rechazado' && estado !== 'rechazado_por_datos') return;
  try {
    const [local] = await contexto.sql<{ organizacion_id: string }[]>`
      select organizacion_id::text as organizacion_id from estook.local where id = ${doc.localId}::uuid
    `;
    if (local === undefined) return;
    const numero = elNumeroEntero(doc.serie, doc.numero);
    await avisar(
      contexto,
      {
        tipo: 'documento.rechazado',
        organizacionId: local.organizacion_id,
        localId: doc.localId,
        clave: doc.id,
        texto: () => ({
          titulo: `${numero} no ha llegado a Hacienda`,
          detalle: 'Mira en Tickets y facturas qué dice y qué hacer.',
        }),
        ir: '/servicio/ventas/tickets-y-facturas',
        quien: null,
      },
      await losQueLoQuieren(
        contexto,
        'documento.rechazado',
        await quienesPuedenRecibir(contexto, doc.localId, 'documento.rechazado'),
      ),
    );
  } catch (fallo) {
    await apuntarUnFallo(fallo, {
      mensaje: 'no se ha podido avisar de un documento rechazado',
      correlacionId: contexto.correlacionId,
    });
  }
}

/** Una anulación que Hacienda no aceptó: el documento sigue valiendo, y alguien tiene que saberlo. */
async function avisarDeLaAnulacion(
  contexto: Contexto,
  doc: ElDocumento,
  anulacionId: string,
): Promise<void> {
  try {
    const [local] = await contexto.sql<{ organizacion_id: string }[]>`
      select organizacion_id::text as organizacion_id from estook.local where id = ${doc.localId}::uuid
    `;
    if (local === undefined) return;
    const numero = elNumeroEntero(doc.serie, doc.numero);
    await avisar(
      contexto,
      {
        tipo: 'documento.rechazado',
        organizacionId: local.organizacion_id,
        localId: doc.localId,
        clave: anulacionId,
        texto: () => ({
          titulo: `La anulación de ${numero} no ha salido`,
          detalle: 'Sigue valiendo. Mira en Tickets y facturas qué dice Hacienda.',
        }),
        ir: '/servicio/ventas/tickets-y-facturas',
        quien: null,
      },
      await losQueLoQuieren(
        contexto,
        'documento.rechazado',
        await quienesPuedenRecibir(contexto, doc.localId, 'documento.rechazado'),
      ),
    );
  } catch (fallo) {
    await apuntarUnFallo(fallo, {
      mensaje: 'no se ha podido avisar de una anulación que no ha salido',
      correlacionId: contexto.correlacionId,
    });
  }
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
      const estado = elEstadoConSuDuplicado(
        typeof c.estado === 'string' ? c.estado : '',
        typeof c.estado_registro_duplicado === 'string' ? c.estado_registro_duplicado : null,
      );
      if (uuid === '' || estado === '') continue;
      // **El de una anulación es otro registro** (0140): no dice nada de su alta, y si no sale, el
      // documento sigue valiendo. Por eso se mira primero.
      const [deAnular] = await contexto.sql<{ anulacion_id: string; documento_id: string }[]>`
        select pa.anulacion_id::text as anulacion_id, a.documento_id::text as documento_id
          from facturacion.paso_de_anulacion pa
          join facturacion.anulacion a on a.id = pa.anulacion_id
         where pa.uuid = ${uuid}
         order by pa.en limit 1
      `;
      if (deAnular !== undefined) {
        const [elDoc] = await losDocumentos(contexto, [deAnular.documento_id]);
        if (elDoc === undefined) continue;
        const nuevo = await apuntarElPasoDeAnular(contexto, elDoc, deAnular.anulacion_id, {
          uuid,
          estado,
          codigo:
            typeof c.codigo_error === 'string' || typeof c.codigo_error === 'number'
              ? String(c.codigo_error)
              : null,
          mensaje: typeof c.mensaje_error === 'string' ? c.mensaje_error : null,
          queda: comoQuedaLaAnulacion(estado),
          por: 'aviso',
        });
        if (nuevo) apuntados += 1;
        continue;
      }
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
      if (nuevoEstado) {
        apuntados += 1;
        const [elDoc] = await losDocumentos(contexto, [doc.documento_id]);
        if (elDoc !== undefined) {
          await avisarSiHayQueHacerAlgo(contexto, elDoc, elEstadoDeVerifacti(estado));
        }
      }
    }
    return apuntados;
  });
}

/**
 * Que los avisos de cada NIF que emite lleguen (4.10): con el secreto puesto, el reloj da de
 * alta el aviso del entorno en Verifacti y le añade los NIF que falten. **No es una garantía**:
 * el repaso pregunta igual lo que siga pendiente.
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
    // El aviso que se acaba de crear vale para el NIF siguiente: dos NIF, un solo aviso.
    const yaCreados = new Map<EntornoDeVerifacti, string>();
    for (const f of faltan.filas) {
      const entorno: EntornoDeVerifacti = f.entorno === 'real' ? 'prod' : 'test';
      const aviso = await faltan.verifacti.escucharElNif(entorno, f.nif, {
        id: yaCreados.get(entorno) ?? f.aviso,
        url: dondeLleganLosAvisos(),
        secreto,
      });
      yaCreados.set(entorno, aviso);
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

/** «2026-11-14» → «14/11/2026». */
export function fechaLegible(fecha: FechaOperativa): string {
  const [ano, mes, dia] = fecha.split('-');
  return `${dia ?? ''}/${mes ?? ''}/${ano ?? ''}`;
}

function porciento(tipo: number): string {
  return `${String(Number((tipo * 100).toFixed(2))).replace('.', ',')} %`;
}

/** Lo que dice el papel de lo que rectifica y de las señales que descuenta. Igual en A4 y en ticket. */
export function lasReferencias(h: LaHistoria): {
  readonly rectifica?: string;
  readonly motivo?: string;
  readonly descuenta?: readonly string[];
} {
  return {
    ...(h.rectifica === null
      ? {}
      : {
          rectifica: `${h.rectifica.numero}, del ${fechaLegible(h.rectifica.fecha)}`,
          motivo: h.rectifica.motivo,
        }),
    ...(h.descuenta.length === 0 ? {} : { descuenta: h.descuenta.map((s) => s.numero) }),
  };
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
  /** «Pide tu factura» (0141): en el papel del ticket desde que el TPV cobra (0144). */
  pideTuFactura?: { readonly direccion: string; readonly codigo: string },
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
  const losImpuestos = doc.desglose.lineas.map((l) => ({
    nombre: `${NOMBRE_DEL_IMPUESTO[l.regimen]} ${porciento(l.tipo)}`,
    baseCentimos: l.base,
    cuotaCentimos: l.cuota,
  }));
  if (doc.destinatario !== null) {
    if (doc.modalidad !== 'fuera_sii' && conQr === undefined) return null;
    const expedicion = laFechaDeExpedicion(doc, h);
    return laFacturaEnPapel({
      empresa,
      titulo: `${doc.tipo === 'R1' || doc.tipo === 'R4' ? 'Factura rectificativa' : 'Factura'} ${elNumeroEntero(doc.serie, doc.numero)}`,
      // La fecha que tiene Hacienda: si se mandó otro día, la hora de prepararla ya no es su fecha.
      cuando:
        expedicion === fechaEnElLocal(new Date(doc.preparadoEn), doc.zonaHoraria)
          ? cuando
          : fechaLegible(expedicion),
      fechaDeLaOperacion:
        doc.fechaOperacion === expedicion ? null : fechaLegible(doc.fechaOperacion),
      sustituye: h.sustituye.map((t) => t.numero),
      ...lasReferencias(h),
      vence: doc.vencimiento === null ? null : fechaLegible(doc.vencimiento),
      para: {
        nombre: doc.destinatario.nombre,
        identificador: doc.destinatario.identificador,
        domicilio: doc.destinatario.domicilio,
      },
      lineas: lineasDeLaFactura(doc.lineas).map((l) => ({
        cantidad: l.cantidad,
        nombre: l.nombre,
        precioSinImpuesto: l.precioSinImpuesto,
        tipo: l.tipo,
        baseCentimos: l.base,
      })),
      impuestos: losImpuestos,
      totalCentimos: doc.total,
      qr: doc.modalidad === 'fuera_sii' ? null : (conQr?.url ?? null),
      pruebas: doc.entorno === 'pruebas',
    });
  }
  if (doc.modalidad === 'fuera_sii' || conQr !== undefined) {
    return elTicketEnPapel({
      empresa,
      numero: elNumeroEntero(doc.serie, doc.numero),
      cuando,
      donde: doc.donde,
      lineas,
      impuestos: losImpuestos,
      totalCentimos: doc.total,
      qr: doc.modalidad === 'fuera_sii' ? null : (conQr?.url ?? null),
      pruebas: doc.entorno === 'pruebas',
      copia,
      ...(h.rectifica === null
        ? {}
        : { rectifica: { numero: h.rectifica.numero, motivo: h.rectifica.motivo } }),
      ...(pideTuFactura === undefined || h.rectifica !== null ? {} : { pideTuFactura }),
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
  const papel = elPapelDelDocumento(doc, h, copia, await laFacturaQueSePide(contexto, doc));
  if (papel === null) return false;
  // **Por la impresora del aparato que lo hizo** (0145): un comandero con la suya saca allí sus
  // tickets. Sin ella, o sin aparato (Estook, el reloj), la de la caja.
  const delAparato = await enNombreDelSistema(
    contexto,
    () => contexto.sql<{ id: string }[]>`
      select i.id::text as id
        from facturacion.documento d
        join estook.terminal t on t.id = d.desde_terminal
        join estook.impresora i on i.id = t.imprime_en
       where d.id = ${doc.id}::uuid and i.retirada_en is null and i.local_id = ${doc.localId}::uuid
    `,
  );
  const impresora = delAparato[0]?.id ?? (await laImpresoraDe(contexto, doc.localId, 'caja'));
  if (impresora === null) return false;
  const tipo =
    papel.piezas.some((p) => p.tipo === 'qr') || doc.modalidad === 'fuera_sii'
      ? 'ticket'
      : 'justificante';
  await dejarEnLaCola(contexto, doc.localId, impresora, tipo, papel, null);
  return true;
}

/**
 * **El QR de «Pide tu factura»** de un ticket (0141, en el papel desde 0144): su dirección y su código,
 * si el local la tiene encendida. Sin código (antes de la 0111) o apagada, nada.
 */
async function laFacturaQueSePide(
  contexto: Contexto,
  doc: ElDocumento,
): Promise<{ readonly direccion: string; readonly codigo: string } | undefined> {
  if (doc.tipo !== 'F2') return undefined;
  const filas = await contexto.sql<{ codigo: string; encendida: boolean }[]>`
    select c.codigo, l.pide_tu_factura as encendida
      from facturacion.codigo_de_ticket c
      join facturacion.documento d on d.id = c.documento_id
      join estook.local l on l.id = d.local_id
     where c.documento_id = ${doc.id}::uuid
  `;
  const fila = filas[0];
  if (fila === undefined || !fila.encendida) return undefined;
  return {
    direccion: direccionParaPedirLaFactura(fila.codigo),
    codigo: elCodigoParaEnsenar(fila.codigo),
  };
}
