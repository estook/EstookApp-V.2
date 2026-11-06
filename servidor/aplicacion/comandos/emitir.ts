import { z } from 'zod';
import {
  LA_CHAPA,
  NOMBRE_DEL_DOCUMENTO,
  elNumeroEntero,
  fechaEnElLocal,
  hayQueHacerAlgo,
  horaEnElLocal,
  loQueDiceEnLlano,
  masDias,
  type EstadoDelDocumento,
  type FechaOperativa,
  type LineaVendida,
  type PapelCompuesto,
  type TipoDeDocumento,
} from '@estook/dominio';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { elRelojYElFisco, elTipoDeRestauracion } from '../desviacion.ts';
import {
  comoEsta,
  elPapelDelDocumento,
  imprimirElDocumento,
  lasHistorias,
  losDocumentos,
  prepararUnDocumento,
  type LaHistoria,
} from '../emitir.ts';
import { laImpresoraDe } from '../impresion.ts';

/**
 * **Emitir y mirar lo emitido** (T6 · 2 · 1, decisión 0136; maquetas de T6 aprobadas el 2-nov).
 *
 *   imprimir_un_ticket_de_prueba   Ajustes › Facturación: un ticket de verdad en el entorno de
 *                                  pruebas, por la impresora de la caja, con su QR y «PRUEBA ·
 *                                  SIN VALIDEZ». No cuenta en ventas
 *   reimprimir_el_documento        sale como copia y no crea nada en Hacienda
 *   tickets_y_facturas             Servicio › Ventas › Tickets y facturas: lo de un día, con su
 *                                  estado ante Hacienda y lo que falla arriba
 *   un_documento                   como se imprimió y su historia
 *
 * Todo lo ve quien lleva la facturación del local (0128): el gerente y la dirección, y a quien
 * ella se la dé. **Nada se edita**: lo que está mal se corrige con otro documento (T6 · 2 · 2).
 */

const EXIGE = 'accion.alta_de_facturacion' as const;

export type EstadoEnLaLista = EstadoDelDocumento | 'fuera_sii';

/** La chapa de cada estado, y la de lo que va por el SII (0127). */
function laChapa(estado: EstadoEnLaLista): {
  texto: string;
  tono: 'bien' | 'info' | 'mal' | 'atencion';
} {
  return estado === 'fuera_sii' ? { texto: 'Por el SII', tono: 'info' } : LA_CHAPA[estado];
}

// ── Imprimir un ticket de prueba ──────────────────────────────────────────────────

export interface TicketDePrueba {
  readonly documentoId: string;
  /** «T-IKA-2026-000001». */
  readonly numero: string;
}

/**
 * **Un ticket de prueba** (Ajustes › Facturación, maqueta de T6): sirve para ver el QR en la
 * impresora de verdad antes de cobrar (prueba 24 del Anexo). **Solo en pruebas**: emite contra el
 * entorno de pruebas de Verifacti, sale con «PRUEBA · SIN VALIDEZ» y no cuenta en las ventas. En
 * real no se imprime nada de mentira (Anexo 4.12).
 *
 * Lleva un café y un agua al tipo de restauración del local, que pone el motor fiscal (10 % de
 * IVA en la península, 7 % de IGIC en Canarias). El papel sale con el comando ya guardado, al
 * contestar Verifacti; si no contesta, sale el justificante.
 */
export const imprimirUnTicketDePrueba = comando<Record<string, never>, TicketDePrueba>({
  nombre: 'imprimir_un_ticket_de_prueba',
  entrada: z.object({}).strict(),
  exige: EXIGE,

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const fisco = await elRelojYElFisco(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, fisco.zonaHoraria);
    const tipo = await elTipoDeRestauracion(contexto, fisco, hoy);
    if (tipo === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Estook no sabe todavía el impuesto de tu local. Escríbenos y lo miramos.',
      });
    }
    const regimen = fisco.regimen as LineaVendida['regimen'];
    const lineas: LineaVendida[] = [
      { nombre: 'Café solo', cantidad: 1, importe: 150, regimen, tipo },
      { nombre: 'Agua', cantidad: 1, importe: 120, regimen, tipo },
    ];
    const hecho = await prepararUnDocumento(contexto, {
      localId,
      tipo: 'F2',
      descripcion: 'Ticket de prueba',
      lineas,
      regimenDelLocal: regimen,
      zonaHoraria: fisco.zonaHoraria,
      donde: 'Ticket de prueba',
      origen: 'ticket_de_prueba',
    });
    return { documentoId: hecho.id, numero: hecho.numero };
  },
});

// ── Reimprimir ────────────────────────────────────────────────────────────────────

export const reimprimirElDocumento = comando<
  { documento_id: string },
  { readonly impreso: boolean }
>({
  nombre: 'reimprimir_el_documento',
  entrada: z.object({ documento_id: z.string().uuid() }).strict(),
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const [doc] = await losDocumentos(contexto, [entrada.documento_id]);
    if (doc === undefined || doc.localId !== localId) throw new FalloDeAplicacion('no_existe');
    const h = (await lasHistorias(contexto, [doc.id])).get(doc.id);
    if (h === undefined || elPapelDelDocumento(doc, h, true) === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Todavía no hay nada que imprimir: está esperando a Hacienda.',
      });
    }
    if ((await laImpresoraDe(contexto, localId, 'caja')) === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Tu local no tiene impresora de caja. Se pone en Ajustes del TPV › Impresoras.',
      });
    }
    return { impreso: await imprimirElDocumento(contexto, doc, h, true) };
  },
});

// ── La lista ──────────────────────────────────────────────────────────────────────

export interface UnoDeLaLista {
  readonly id: string;
  /** «14:31», en la hora del local. */
  readonly hora: string;
  readonly numero: string;
  readonly tipo: TipoDeDocumento;
  /** «Ticket», «Factura de un ticket»… */
  readonly que: string;
  readonly donde: string | null;
  readonly total: number;
  readonly estado: EstadoEnLaLista;
  readonly chapa: { readonly texto: string; readonly tono: 'bien' | 'info' | 'mal' | 'atencion' };
  readonly pruebas: boolean;
  /** El código del justificante, si se dio uno y todavía no está registrado. */
  readonly justificante: string | null;
}

export interface LoQueFalla {
  readonly id: string;
  readonly numero: string;
  readonly que: string;
  readonly hacer: string;
}

export interface TicketsYFacturas {
  readonly dia: string;
  readonly documentos: readonly UnoDeLaLista[];
  /** Lo que alguien tiene que mirar, arriba y en llano (Anexo 4.10). */
  readonly loQueFalla: readonly LoQueFalla[];
  readonly cuantos: number;
  readonly total: number;
  readonly correctos: number;
  /** Si la facturación del local está en pruebas: todo lleva «PRUEBA · SIN VALIDEZ». */
  readonly enPruebas: boolean;
}

function laLinea(
  doc: Awaited<ReturnType<typeof losDocumentos>>[number],
  h: LaHistoria,
): UnoDeLaLista {
  const estado = comoEsta(doc, h);
  return {
    id: doc.id,
    hora: horaEnElLocal(new Date(doc.preparadoEn), doc.zonaHoraria),
    numero: elNumeroEntero(doc.serie, doc.numero),
    tipo: doc.tipo,
    que: NOMBRE_DEL_DOCUMENTO[doc.tipo],
    donde: doc.donde,
    total: doc.total,
    estado,
    chapa:
      h.justificante !== null && (estado === 'preparado' || estado === 'enviando')
        ? { texto: 'Se emite al volver', tono: 'atencion' }
        : laChapa(estado),
    pruebas: doc.entorno === 'pruebas',
    justificante: h.justificante,
  };
}

function loQueFallaDe(linea: UnoDeLaLista, h: LaHistoria): LoQueFalla | null {
  if (linea.estado === 'fuera_sii' || !hayQueHacerAlgo(linea.estado)) return null;
  const ultimo = h.registros.at(-1);
  const rechazo = h.envios.findLast((e) => e.resultado === 'rechazado_por_datos');
  const mensaje =
    linea.estado === 'rechazado_por_datos'
      ? (rechazo?.mensaje ?? null)
      : (ultimo?.mensajeError ?? null);
  const dice = loQueDiceEnLlano(linea.estado, mensaje);
  return dice === null ? null : { id: linea.id, numero: linea.numero, ...dice };
}

/** El local de la sesión, con su zona: lo de cada día va en la hora del local. */
async function laZonaDelLocal(contexto: Contexto, localId: string): Promise<string> {
  const [l] = await contexto.sql<{ zona_horaria: string }[]>`
    select l.zona_horaria from estook.local l where l.id = ${localId}::uuid
  `;
  return l?.zona_horaria ?? 'Europe/Madrid';
}

export const ticketsYFacturas = consulta<{ dia?: 'hoy' | 'ayer' | undefined }, TicketsYFacturas>({
  nombre: 'tickets_y_facturas',
  entrada: z.object({ dia: z.enum(['hoy', 'ayer']).optional() }).strict(),
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const zona = await laZonaDelLocal(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, zona);
    const dia: FechaOperativa = entrada.dia === 'ayer' ? masDias(hoy, -1) : hoy;
    const filas = await contexto.sql<{ id: string }[]>`
      select d.id::text as id from facturacion.documento d
       where d.local_id = ${localId}::uuid
         and (d.preparado_en at time zone ${zona})::date = ${dia}::date
       order by d.preparado_en desc
       limit 500
    `;
    const ids = filas.map((f) => f.id);
    const docs = await losDocumentos(contexto, ids);
    const historias = await lasHistorias(contexto, ids);
    const porId = new Map(docs.map((d) => [d.id, d]));
    const documentos: UnoDeLaLista[] = [];
    const loQueFalla: LoQueFalla[] = [];
    for (const id of ids) {
      const doc = porId.get(id);
      const h = historias.get(id);
      if (doc === undefined || h === undefined) continue;
      const linea = laLinea(doc, h);
      documentos.push(linea);
      const falla = loQueFallaDe(linea, h);
      if (falla !== null) loQueFalla.push(falla);
    }
    const [empresa] = await contexto.sql<{ entorno: string }[]>`
      select e.entorno from estook.local l join estook.empresa e on e.id = l.empresa_id
       where l.id = ${localId}::uuid
    `;
    return {
      dia,
      documentos,
      loQueFalla,
      cuantos: documentos.length,
      total: documentos.reduce((s, d) => s + d.total, 0),
      correctos: documentos.filter((d) => d.estado === 'correcto' || d.estado === 'fuera_sii')
        .length,
      enPruebas: empresa === undefined || empresa.entorno === 'pruebas',
    };
  },
});

// ── Un documento ──────────────────────────────────────────────────────────────────

export interface UnPasoDeLaHistoria {
  /** «14:31:03», en la hora del local. */
  readonly hora: string;
  readonly que: string;
  readonly detalle: string | null;
}

export interface UnDocumento extends UnoDeLaLista {
  readonly historia: readonly UnPasoDeLaHistoria[];
  /** El papel igual que salió, para verlo en la pantalla. Nulo si aún no hay nada que imprimir. */
  readonly papel: PapelCompuesto | null;
  /** La dirección de cotejo de la AEAT, la del QR. */
  readonly url: string | null;
  readonly loQueFalla: LoQueFalla | null;
}

const EL_ENVIO_EN_LLANO = {
  aceptado: 'Mandado a Verifacti',
  rechazado_por_datos: 'Verifacti no lo aceptó por los datos',
  en_curso: 'Verifacti ya lo estaba recibiendo',
  sin_respuesta: 'Mandado a Verifacti, sin respuesta',
} as const;

const EL_REGISTRO_EN_LLANO: Readonly<Record<string, string>> = {
  pendiente: 'Registrado, con su QR',
  correcto: 'Hacienda: correcto',
  'aceptado con errores': 'Hacienda: aceptado con errores',
  incorrecto: 'Hacienda: rechazado',
  'no registrado': 'Hacienda: rechazado',
  duplicado: 'Hacienda ya lo tenía',
  anulado: 'Hacienda: anulado',
  'error servidor aeat': 'Hacienda no respondía; Verifacti lo reintenta',
};

export const unDocumento = consulta<{ documento_id: string }, UnDocumento>({
  nombre: 'un_documento',
  entrada: z.object({ documento_id: z.string().uuid() }).strict(),
  exige: EXIGE,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const [doc] = await losDocumentos(contexto, [entrada.documento_id]);
    if (doc === undefined || doc.localId !== localId) throw new FalloDeAplicacion('no_existe');
    const h = (await lasHistorias(contexto, [doc.id])).get(doc.id) ?? {
      envios: [],
      registros: [],
      justificante: null,
    };
    const hora = (en: string) =>
      new Intl.DateTimeFormat('es-ES', {
        timeZone: doc.zonaHoraria,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(en));
    const historia: UnPasoDeLaHistoria[] = [
      {
        hora: hora(doc.preparadoEn),
        que: 'Preparado con su número',
        detalle: doc.origen === 'ticket_de_prueba' ? 'El ticket de prueba de Ajustes' : null,
      },
      ...h.envios.map((e) => ({
        hora: hora(e.en),
        que: EL_ENVIO_EN_LLANO[e.resultado],
        detalle: e.incidencia ? 'Con la incidencia: se mandó al volver la conexión' : e.mensaje,
      })),
      ...h.registros.map((r) => ({
        hora: hora(r.en),
        que: EL_REGISTRO_EN_LLANO[r.estado.trim().toLowerCase()] ?? `Hacienda: ${r.estado}`,
        detalle: r.mensajeError,
      })),
    ].sort((a, b) => a.hora.localeCompare(b.hora));
    if (h.justificante !== null) {
      historia.push({
        hora: '',
        que: `Se dio el justificante ${h.justificante}`,
        detalle: 'Verifacti no contestaba: el ticket se emite en cuanto vuelva',
      });
    }
    const linea = laLinea(doc, h);
    return {
      ...linea,
      historia,
      papel: elPapelDelDocumento(doc, h, false),
      url: h.registros.find((r) => r.url !== null)?.url ?? null,
      loQueFalla: loQueFallaDe(linea, h),
    };
  },
});
