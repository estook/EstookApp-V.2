import { z } from 'zod';
import {
  LA_CHAPA,
  NOMBRE_DEL_DOCUMENTO,
  POR_QUE_NO_SE_CANJEA,
  elNumeroEntero,
  fechaEnElLocal,
  hayQueHacerAlgo,
  horaEnElLocal,
  loQueDiceEnLlano,
  masDias,
  porQueNoSeCanjea,
  type ElDestinatario,
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
  SIN_HISTORIA,
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
 * **Quién ve qué** (0137, Richi, 6-nov): quien consulta o lleva la facturación ve todo; quien hace
 * facturas ve lo de hoy y de ayer, y lo demás por su número exacto, sin poder hojear los datos de
 * los clientes. **Nada se edita**: lo que está mal se corrige con otro documento.
 */

const EXIGE = 'accion.alta_de_facturacion' as const;

export type EstadoEnLaLista = EstadoDelDocumento | 'fuera_sii';
export type TonoDeLaChapa = 'bien' | 'info' | 'mal' | 'atencion' | 'neutro';

/** La chapa de cada estado, y la de lo que va por el SII (0127). */
function laChapa(estado: EstadoEnLaLista): { texto: string; tono: TonoDeLaChapa } {
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
  exige: 'accion.factura_de_un_ticket',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const [doc] = await losDocumentos(contexto, [entrada.documento_id]);
    if (doc === undefined || doc.localId !== localId) throw new FalloDeAplicacion('no_existe');
    const h = (await lasHistorias(contexto, [doc.id])).get(doc.id);
    // Un ticket reimpreso es copia. Una factura se imprime cuando la pide el cliente: es la misma.
    const copia = doc.destinatario === null;
    if (h === undefined || elPapelDelDocumento(doc, h, copia) === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Todavía no hay nada que imprimir: está esperando a Hacienda.',
      });
    }
    if ((await laImpresoraDe(contexto, localId, 'caja')) === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Tu local no tiene impresora de caja. Se pone en Ajustes del TPV › Impresoras.',
      });
    }
    return { impreso: await imprimirElDocumento(contexto, doc, h, copia) };
  },
});

// ── Quién ve qué ──────────────────────────────────────────────────────────────────

interface LoQuePuede {
  /** Toda la historia del local, con cualquier fecha. */
  readonly todo: boolean;
  readonly deUnTicket: boolean;
  readonly aMano: boolean;
}

async function loQuePuede(contexto: Contexto, localId: string): Promise<LoQuePuede> {
  const [p] = await contexto.sql<
    { lleva: boolean; consulta: boolean; de_un_ticket: boolean; a_mano: boolean }[]
  >`
    select estook.puede_editar('accion.alta_de_facturacion', ${localId}::uuid) as lleva,
           estook.nivel_de_permiso(estook.persona_actual(), ${localId}::uuid, 'accion.ver_documentos') <> 'sin_acceso' as consulta,
           estook.puede_editar('accion.factura_de_un_ticket', ${localId}::uuid) as de_un_ticket,
           estook.puede_editar('accion.factura_a_mano', ${localId}::uuid) as a_mano
  `;
  if (p === undefined) throw new FalloDeAplicacion('sin_permiso');
  const todo = p.lleva || p.consulta;
  if (!todo && !p.de_un_ticket && !p.a_mano) throw new FalloDeAplicacion('sin_permiso');
  return { todo, deUnTicket: p.de_un_ticket, aMano: p.a_mano };
}

// ── La lista ──────────────────────────────────────────────────────────────────────

export interface UnoDeLaLista {
  readonly id: string;
  /** «14:31», en la hora del local. */
  readonly hora: string;
  /** «2026-11-06», el día en que se hizo. */
  readonly dia: string;
  readonly numero: string;
  readonly tipo: TipoDeDocumento;
  /** «Ticket», «Factura de un ticket»… */
  readonly que: string;
  readonly donde: string | null;
  /** El nombre del cliente, si es una factura. */
  readonly cliente: string | null;
  readonly total: number;
  readonly estado: EstadoEnLaLista;
  readonly chapa: { readonly texto: string; readonly tono: TonoDeLaChapa };
  readonly pruebas: boolean;
  /** El código del justificante, si se dio uno y todavía no está registrado. */
  readonly justificante: string | null;
  /** Si se hizo sin cobrar y todavía no se ha cobrado, cuándo vence. */
  readonly porCobrar: string | null;
  /** Por qué no se puede juntar en una factura, en llano. Nulo si se puede. */
  readonly porQueNoSeCanjea: string | null;
}

export interface LoQueFalla {
  readonly id: string;
  readonly numero: string;
  readonly que: string;
  readonly hacer: string;
}

export interface TicketsYFacturas {
  readonly desde: string;
  readonly hasta: string;
  readonly documentos: readonly UnoDeLaLista[];
  /** Lo que alguien tiene que mirar, arriba y en llano, **sea del día que sea** (Anexo 4.10). */
  readonly loQueFalla: readonly LoQueFalla[];
  readonly cuantos: number;
  readonly total: number;
  readonly correctos: number;
  /** Si la facturación del local está en pruebas: todo lleva «PRUEBA · SIN VALIDEZ». */
  readonly enPruebas: boolean;
  readonly puede: LoQuePuede;
}

function laLinea(
  doc: Awaited<ReturnType<typeof losDocumentos>>[number],
  h: LaHistoria,
): UnoDeLaLista {
  const estado = comoEsta(doc, h);
  const noSeCanjea = porQueNoSeCanjea(doc.tipo, estado, h.factura !== null);
  const porCobrar = doc.vencimiento !== null && h.cobradaEn === null ? doc.vencimiento : null;
  return {
    id: doc.id,
    hora: horaEnElLocal(new Date(doc.preparadoEn), doc.zonaHoraria),
    dia: fechaEnElLocal(new Date(doc.preparadoEn), doc.zonaHoraria),
    numero: elNumeroEntero(doc.serie, doc.numero),
    tipo: doc.tipo,
    que: NOMBRE_DEL_DOCUMENTO[doc.tipo],
    donde: doc.donde,
    cliente: doc.destinatario?.nombre ?? null,
    total: doc.total,
    estado,
    chapa:
      h.factura !== null
        ? { texto: 'Canjeado', tono: 'neutro' }
        : h.justificante !== null && (estado === 'preparado' || estado === 'enviando')
          ? { texto: 'Se emite al volver', tono: 'atencion' }
          : laChapa(estado),
    pruebas: doc.entorno === 'pruebas',
    justificante: h.justificante,
    porCobrar,
    porQueNoSeCanjea: noSeCanjea === null ? null : POR_QUE_NO_SE_CANJEA[noSeCanjea],
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

const unaFecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

/** Los documentos de la lista, ya leídos y en orden. */
async function leerLosDocumentos(contexto: Contexto, ids: readonly string[]) {
  const docs = await losDocumentos(contexto, ids);
  const historias = await lasHistorias(contexto, ids);
  const porId = new Map(docs.map((d) => [d.id, d]));
  return ids.flatMap((id) => {
    const doc = porId.get(id);
    const h = historias.get(id);
    return doc === undefined || h === undefined ? [] : [{ doc, h, linea: laLinea(doc, h) }];
  });
}

export const ticketsYFacturas = consulta<
  {
    dia?: 'hoy' | 'ayer' | undefined;
    desde?: string | undefined;
    hasta?: string | undefined;
    que?: 'todos' | 'tickets' | 'facturas' | 'por_cobrar' | 'pendiente' | undefined;
    buscar?: string | undefined;
  },
  TicketsYFacturas
>({
  nombre: 'tickets_y_facturas',
  entrada: z
    .object({
      dia: z.enum(['hoy', 'ayer']).optional(),
      desde: unaFecha,
      hasta: unaFecha,
      que: z.enum(['todos', 'tickets', 'facturas', 'por_cobrar', 'pendiente']).optional(),
      buscar: z.string().trim().max(60).optional(),
    })
    .strict(),
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const puede = await loQuePuede(contexto, localId);
    const zona = await laZonaDelLocal(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, zona);
    const ayer = masDias(hoy, -1);
    const elDia: FechaOperativa = entrada.dia === 'ayer' ? ayer : hoy;
    // Sin el permiso de consultar: hoy y ayer. Una fecha pedida a mano no pasa de ahí (0137).
    if (!puede.todo && (entrada.desde !== undefined || entrada.hasta !== undefined)) {
      throw new FalloDeAplicacion('sin_permiso');
    }
    const desde = (entrada.desde ?? elDia) as FechaOperativa;
    const hasta = (entrada.hasta ?? elDia) as FechaOperativa;
    const buscar = entrada.buscar?.trim() ?? '';
    const que = entrada.que ?? 'todos';
    const exacto = buscar.replace(/\s+/g, '').toUpperCase();
    const parecido = `%${buscar}%`;
    const filas = await contexto.sql<{ id: string }[]>`
      select d.id::text as id from facturacion.documento d
       where d.local_id = ${localId}::uuid
         and (
           ${buscar === ''}
             and (d.preparado_en at time zone ${zona})::date between ${desde}::date and ${hasta}::date
           or ${buscar !== ''} and (
             d.serie || lpad(d.numero::text, 6, '0') = ${exacto}
             or ${puede.todo} and (
               d.serie || lpad(d.numero::text, 6, '0') ilike ${parecido}
               or d.destinatario ->> 'nombre' ilike ${parecido}
               or d.destinatario ->> 'identificador' ilike ${parecido}
             )
           )
         )
         and (${que !== 'tickets'} or d.tipo = 'F2')
         and (${que !== 'facturas'} or d.tipo in ('F1', 'F3'))
         and (${que !== 'por_cobrar'} or (
           d.vencimiento is not null
           and not exists (select 1 from facturacion.cobro_de_factura c where c.documento_id = d.id)
         ))
       order by d.preparado_en desc
       limit 500
    `;
    const leidos = await leerLosDocumentos(
      contexto,
      filas.map((f) => f.id),
    );
    const documentos = leidos
      .map((l) => l.linea)
      .filter(
        (l) =>
          que !== 'pendiente' ||
          l.estado === 'preparado' ||
          l.estado === 'enviando' ||
          l.estado === 'pendiente' ||
          (l.estado !== 'fuera_sii' && hayQueHacerAlgo(l.estado)),
      );

    // Lo que falla, **sea del día que sea**: un rechazo de hace tres días sigue por corregir.
    const loQueFalla: LoQueFalla[] = [];
    if (puede.todo) {
      const conProblemas = await contexto.sql<{ id: string }[]>`
        select d.id::text as id from facturacion.documento d
         where d.local_id = ${localId}::uuid
           and d.modalidad = 'verifactu'
           and d.preparado_en > ${contexto.ahora.toISOString()}::timestamptz - interval '90 days'
           and (
             exists (
               select 1 from facturacion.envio e
                where e.documento_id = d.id and e.resultado = 'rechazado_por_datos'
             )
             or (
               select lower(r.estado) from facturacion.registro r
                where r.documento_id = d.id order by r.en desc, r.id desc limit 1
             ) in ('incorrecto', 'no registrado', 'factura inexistente', 'aceptado con errores')
           )
         order by d.preparado_en desc
         limit 50
      `;
      for (const { linea, h } of await leerLosDocumentos(
        contexto,
        conProblemas.map((f) => f.id),
      )) {
        const falla = loQueFallaDe(linea, h);
        if (falla !== null) loQueFalla.push(falla);
      }
    }
    const [empresa] = await contexto.sql<{ entorno: string }[]>`
      select e.entorno from estook.local l join estook.empresa e on e.id = l.empresa_id
       where l.id = ${localId}::uuid
    `;
    return {
      desde,
      hasta,
      documentos,
      loQueFalla,
      cuantos: documentos.length,
      total: documentos.reduce((s, d) => s + d.total, 0),
      correctos: documentos.filter((d) => d.estado === 'correcto' || d.estado === 'fuera_sii')
        .length,
      enPruebas: empresa === undefined || empresa.entorno === 'pruebas',
      puede,
    };
  },
});

// ── Un documento ──────────────────────────────────────────────────────────────────

export interface UnPasoDeLaHistoria {
  /** «14:31:03», en la hora del local, con el día si fue otro que el del documento. */
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
  readonly destinatario: ElDestinatario | null;
  readonly factura: { readonly id: string; readonly numero: string } | null;
  readonly sustituye: readonly { readonly id: string; readonly numero: string }[];
  readonly puede: LoQuePuede;
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

const DE_DONDE_VIENE = {
  ticket_de_prueba: 'El ticket de prueba de Ajustes',
  cobro: null,
  a_mano: 'Hecha a mano',
  canje: null,
} as const;

export const unDocumento = consulta<{ documento_id: string }, UnDocumento>({
  nombre: 'un_documento',
  entrada: z.object({ documento_id: z.string().uuid() }).strict(),
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const puede = await loQuePuede(contexto, localId);
    const [doc] = await losDocumentos(contexto, [entrada.documento_id]);
    if (doc === undefined || doc.localId !== localId) throw new FalloDeAplicacion('no_existe');
    const h = (await lasHistorias(contexto, [doc.id])).get(doc.id) ?? SIN_HISTORIA;
    const suDia = fechaEnElLocal(new Date(doc.preparadoEn), doc.zonaHoraria);
    const hora = (en: string) => {
      const texto = new Intl.DateTimeFormat('es-ES', {
        timeZone: doc.zonaHoraria,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(en));
      const dia = fechaEnElLocal(new Date(en), doc.zonaHoraria);
      return dia === suDia ? texto : `${dia.slice(8, 10)}/${dia.slice(5, 7)} ${texto}`;
    };
    // **Por su momento, no por su hora**: lo de pasada la medianoche va después (0137).
    const pasos: (UnPasoDeLaHistoria & { readonly en: string })[] = [
      {
        en: doc.preparadoEn,
        hora: hora(doc.preparadoEn),
        que: 'Preparado con su número',
        detalle: DE_DONDE_VIENE[doc.origen],
      },
      ...h.envios.map((e) => ({
        en: e.en,
        hora: hora(e.en),
        que: EL_ENVIO_EN_LLANO[e.resultado],
        detalle: e.incidencia ? 'Con la incidencia: se mandó al volver la conexión' : e.mensaje,
      })),
      ...h.registros.map((r) => ({
        en: r.en,
        hora: hora(r.en),
        que: EL_REGISTRO_EN_LLANO[r.estado.trim().toLowerCase()] ?? `Hacienda: ${r.estado}`,
        detalle: r.mensajeError,
      })),
      ...(h.factura === null
        ? []
        : [
            {
              en: h.factura.en,
              hora: hora(h.factura.en),
              que: `Canjeado por la factura ${h.factura.numero}`,
              detalle: null,
            },
          ]),
      ...(h.cobradaEn === null
        ? []
        : [{ en: h.cobradaEn, hora: hora(h.cobradaEn), que: 'Cobrada', detalle: null }]),
      ...h.copias.map((c) => ({
        en: c.en,
        hora: hora(c.en),
        que: `Mandada por correo a ${c.para}`,
        detalle: null,
      })),
    ];
    const historia: UnPasoDeLaHistoria[] = pasos
      .map((p, i) => ({ p, i }))
      .sort((a, b) => a.p.en.localeCompare(b.p.en) || a.i - b.i)
      .map(({ p }) => ({ hora: p.hora, que: p.que, detalle: p.detalle }));
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
      destinatario: doc.destinatario,
      factura: h.factura === null ? null : { id: h.factura.id, numero: h.factura.numero },
      sustituye: h.sustituye,
      puede,
    };
  },
});
