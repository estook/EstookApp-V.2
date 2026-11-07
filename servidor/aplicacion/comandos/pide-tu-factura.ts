import { z } from 'zod';
import {
  comoEsElNif,
  elCodigoEscrito,
  fechaDelTicket,
  INTENTOS_DE_LA_PAGINA,
  queDiceLaPagina,
  seDescargaElTicket,
  type ClaseDeIntento,
  type LoQueDiceLaPagina,
} from '@estook/dominio';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import type { UnPdf } from '../documentos.ts';
import {
  comoEsta,
  laAnulacionEnCurso,
  lasHistorias,
  losDocumentos,
  SIN_HISTORIA,
  type ElDocumento,
  type LaHistoria,
} from '../emitir.ts';
import { enLaBase } from '../facturacion.ts';
import {
  comprobarElCliente,
  elCanjeDeLosTickets,
  elCliente,
  elDestinatarioComprobado,
  elPdfDeEsteDocumento,
} from './hacer-facturas.ts';

/**
 * **Pide tu factura** (T6 · 2 · 3, decisiones 0125 y 0141; Anexo 5.3 y 4.11): lo que hace la página del
 * cliente, **sin sesión**. Quien abre el enlace no ha entrado en ningún sitio: lo que le abre la puerta
 * es **el código de su ticket**, que no se adivina y es de ese ticket.
 *
 *   abrir_pide_tu_factura        qué enseña la página
 *   comprobar_en_pide_tu_factura su NIF en Hacienda, al escribirlo
 *   pedir_mi_factura             la F3. La pide él, y el importe es el del ticket
 *   mandar_otra_vez_mi_factura   al correo que se dio, nunca a uno nuevo
 *   descargar_mi_ticket          el ticket, que no lleva datos de nadie (4.11)
 *
 * **Son comandos, y no consultas**, porque cuentan los intentos, y porque así el código viaja en el
 * cuerpo y no en una dirección que se queda en los registros.
 *
 * **Nada se rellena solo** (no se usa `el_cliente_por_su_numero`): escribir un NIF ajeno no enseña los
 * datos de nadie. **La factura no se descarga**: solo llega al correo que se escribió.
 */

const EL_CODIGO = z.string().trim().min(1).max(40);

/**
 * Como el sistema hasta que acabe la transacción: **sin sesión, las filas no se ven**. No se usa
 * `enNombreDelSistema`, que deja las cosas como estaban al salir y eso ya no se puede hacer en una
 * transacción que ha fallado (el canje falla si dos piden a la vez).
 */
async function comoElSistema(contexto: Contexto): Promise<void> {
  await contexto.sql`select set_config('estook.sistema', 'si', true)`;
}

/** Si queda alguno, sin gastarlo. */
async function quedan(
  contexto: Contexto,
  clase: ClaseDeIntento,
  ticketId: string | null,
): Promise<boolean> {
  const tope = INTENTOS_DE_LA_PAGINA[clase];
  const [fila] = await contexto.sql<{ quedan: boolean }[]>`
    select facturacion.quedan_intentos(
      ${clase}, ${ticketId}::uuid, ${contexto.desde}, ${contexto.ahora.toISOString()}::timestamptz,
      ${tope.ticket}::integer, ${tope.direccion}::integer
    ) as quedan
  `;
  return fila?.quedan === true;
}

async function apuntar(
  contexto: Contexto,
  clase: ClaseDeIntento,
  ticketId: string | null,
): Promise<void> {
  await contexto.sql`
    select facturacion.apuntar_un_intento(
      ${clase}, ${ticketId}::uuid, ${contexto.desde}, ${contexto.ahora.toISOString()}::timestamptz
    )
  `;
}

/** Gasta uno, o dice que no quedan. **El intento queda aunque lo que venga después falle.** */
async function gastarUnIntento(
  contexto: Contexto,
  clase: ClaseDeIntento,
  ticketId: string,
): Promise<void> {
  if (!(await quedan(contexto, clase, ticketId))) {
    throw new FalloDeAplicacion('demasiados_intentos');
  }
  await apuntar(contexto, clase, ticketId);
}

interface ElTicketDelCodigo {
  readonly doc: ElDocumento;
  readonly h: LaHistoria;
  readonly dice: LoQueDiceLaPagina;
  readonly estado: ReturnType<typeof comoEsta>;
}

/**
 * **El ticket de ese código.** Antes de buscar se mira si le quedan intentos a esa dirección, y un
 * código que no es de nadie gasta uno: así no se pueden ir probando.
 */
async function elTicketDelCodigo(contexto: Contexto, escrito: string): Promise<ElTicketDelCodigo> {
  await comoElSistema(contexto);
  if (!(await quedan(contexto, 'codigo', null))) {
    throw new FalloDeAplicacion('demasiados_intentos');
  }
  const codigo = elCodigoEscrito(escrito);
  const [fila] =
    codigo === null
      ? []
      : await contexto.sql<{ id: string }[]>`
          select documento_id::text as id from facturacion.codigo_de_ticket where codigo = ${codigo}
          union all
          select documento_id::text as id from facturacion.justificante where codigo = ${codigo}
        `;
  const [doc] = fila === undefined ? [] : await losDocumentos(contexto, [fila.id]);
  if (doc === undefined || doc.tipo !== 'F2') {
    await apuntar(contexto, 'codigo', null);
    throw new FalloDeAplicacion('no_existe', undefined, { conservarLoHecho: true });
  }
  const h = (await lasHistorias(contexto, [doc.id])).get(doc.id) ?? SIN_HISTORIA;
  const [local] = await contexto.sql<{ pide_tu_factura: boolean }[]>`
    select pide_tu_factura from estook.local where id = ${doc.localId}::uuid
  `;
  const estado = comoEsta(doc, h);
  return {
    doc,
    h,
    estado,
    dice: queDiceLaPagina({
      estado,
      tieneFactura: h.factura !== null,
      tieneDevolucion: h.rectificaciones.some((r) => r.enPie),
      anulando: laAnulacionEnCurso(h) !== null,
      encendida: local?.pide_tu_factura === true,
    }),
  };
}

const noEsElMomento = () =>
  new FalloDeAplicacion('faltan_datos', {
    porque: 'Este ticket ya no se puede pedir así. Vuelve a abrir el enlace.',
  });

/** **El correo que se dio**: el de la página, o el último al que el equipo la mandó. Nunca se enseña. */
async function elCorreoDeSuFactura(contexto: Contexto, facturaId: string): Promise<string | null> {
  const [fila] = await contexto.sql<{ correo: string }[]>`
    select correo from (
      select p.correo, 1 as orden, p.en from facturacion.pedida p
       where p.factura_id = ${facturaId}::uuid
      union all
      select c.para, 2, c.en from facturacion.copia_mandada c
       where c.documento_id = ${facturaId}::uuid
    ) t
    order by orden, en desc
    limit 1
  `;
  return fila?.correo ?? null;
}

export interface LoQueEnsenaLaPagina {
  readonly dice: LoQueDiceLaPagina;
  /** El nombre del local, que es quien factura. */
  readonly local: string;
  readonly numero: string;
  readonly total: number;
  readonly fecha: string;
  readonly pruebas: boolean;
  readonly seDescarga: boolean;
  /** Si tiene factura, si hay a qué correo volver a mandarla. El correo no sale de la API. */
  readonly conCorreo: boolean;
  /** Si la última que se pidió la rechazó Hacienda: se escribe otra vez. */
  readonly rechazada: boolean;
}

export const abrirPideTuFactura = comando<{ codigo: string }, LoQueEnsenaLaPagina>({
  nombre: 'abrir_pide_tu_factura',
  entrada: z.object({ codigo: EL_CODIGO }).strict(),
  sinSesion: true,
  // Se repite cada medio minuto mientras se registra el ticket: no cambia nada que recordar.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const { doc, h, estado, dice } = await elTicketDelCodigo(contexto, entrada.codigo);
    const correo = h.factura === null ? null : await elCorreoDeSuFactura(contexto, h.factura.id);
    // Lo último que se hizo con este ticket: una factura anulada no es que los datos estén mal.
    const [rechazo] =
      dice === 'puede'
        ? await contexto.sql<{ hay: boolean }[]>`
            select not exists (
                     select 1 from facturacion.registro r
                      where r.documento_id = c.factura_id and lower(btrim(r.estado)) = 'anulado'
                   ) as hay
              from facturacion.canje c
             where c.ticket_id = ${doc.id}::uuid
             order by c.en desc
             limit 1
          `
        : [];
    return {
      dice,
      local: doc.empresa.local,
      numero: `${doc.serie}${String(doc.numero).padStart(6, '0')}`,
      total: doc.total,
      fecha: fechaDelTicket(doc.fechaOperacion),
      pruebas: doc.entorno === 'pruebas',
      seDescarga: seDescargaElTicket(dice, estado),
      conCorreo: correo !== null,
      rechazada: rechazo?.hay === true,
    };
  },
});

export interface LoQueDiceHacienda {
  readonly vale: boolean;
  readonly dice: string | null;
  readonly nombre: string | null;
}

export const comprobarEnPideTuFactura = comando<
  {
    codigo: string;
    clase: 'empresa' | 'particular' | 'de_fuera';
    identificador: string;
    nombre?: string | undefined;
    id_tipo?: '02' | '03' | null | undefined;
    codigo_pais?: string | null | undefined;
  },
  LoQueDiceHacienda
>({
  nombre: 'comprobar_en_pide_tu_factura',
  entrada: z
    .object({
      codigo: EL_CODIGO,
      clase: z.enum(['empresa', 'particular', 'de_fuera']),
      identificador: z.string().trim().min(1).max(20),
      nombre: z.string().trim().max(120).optional(),
      id_tipo: z.enum(['02', '03']).nullable().optional(),
      codigo_pais: z.string().trim().max(2).nullable().optional(),
    })
    .strict(),
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const { doc, dice } = await elTicketDelCodigo(contexto, entrada.codigo);
    if (dice !== 'puede') throw noEsElMomento();
    const nombre = entrada.nombre?.trim() ?? '';
    // Una persona sin nombre todavía: no es un error, y sin él Hacienda no puede mirarla.
    if (entrada.clase !== 'de_fuera') {
      const forma = comoEsElNif(entrada.identificador.replace(/\s+/g, '').toUpperCase());
      if (forma.valido && forma.persona === 'fisica' && nombre === '') {
        return { vale: true, dice: null, nombre: null };
      }
    }
    await gastarUnIntento(contexto, 'comprobar', doc.id);
    return comprobarElCliente(contexto, {
      clase: entrada.clase,
      identificador: entrada.identificador,
      nombre,
      id_tipo: entrada.id_tipo,
      codigo_pais: entrada.codigo_pais,
    });
  },
});

export const pedirMiFactura = comando<
  { codigo: string; cliente: z.infer<typeof elCliente>; correo: string },
  { readonly correo: string }
>({
  nombre: 'pedir_mi_factura',
  entrada: z
    .object({
      codigo: EL_CODIGO,
      cliente: elCliente,
      correo: z.string().trim().email().max(254),
    })
    .strict(),
  sinSesion: true,
  // Una segunda vez no hace otra: el canje lo para, y la página dice que ya tiene factura.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const { doc, dice } = await elTicketDelCodigo(contexto, entrada.codigo);
    if (dice !== 'puede') throw noEsElMomento();
    await gastarUnIntento(contexto, 'comprobar', doc.id);
    const destinatario = await elDestinatarioComprobado(contexto, entrada.cliente).catch(
      (fallo: unknown) => {
        // El intento tiene que quedar: si no, se podrían ir probando NIF por aquí sin límite.
        if (fallo instanceof FalloDeAplicacion) {
          throw new FalloDeAplicacion(fallo.codigo, fallo.detalle, { conservarLoHecho: true });
        }
        throw fallo;
      },
    );
    const hecha = await elCanjeDeLosTickets(contexto, doc.localId, [doc], destinatario, 'pedida');
    await enLaBase(
      () => contexto.sql`
        select facturacion.apuntar_lo_pedido(
          ${hecha.documentoId}::uuid, ${doc.id}::uuid, ${entrada.correo},
          ${contexto.ahora.toISOString()}::timestamptz
        )
      `,
    );
    return { correo: entrada.correo };
  },
});

export const mandarOtraVezMiFactura = comando<{ codigo: string }, { readonly mandada: true }>({
  nombre: 'mandar_otra_vez_mi_factura',
  entrada: z.object({ codigo: EL_CODIGO }).strict(),
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const { doc, h, dice } = await elTicketDelCodigo(contexto, entrada.codigo);
    if (dice !== 'ya_tiene' || h.factura === null) throw noEsElMomento();
    const correo = await elCorreoDeSuFactura(contexto, h.factura.id);
    if (correo === null) throw noEsElMomento();
    await gastarUnIntento(contexto, 'reenviar', doc.id);
    await contexto.sql`
      select facturacion.poner_el_correo(
        ${h.factura.id}::uuid, ${correo}, ${contexto.ahora.toISOString()}::timestamptz
      )
    `;
    return { mandada: true };
  },
});

export const descargarMiTicket = comando<{ codigo: string }, UnPdf>({
  nombre: 'descargar_mi_ticket',
  entrada: z.object({ codigo: EL_CODIGO }).strict(),
  sinSesion: true,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const { doc, h, estado, dice } = await elTicketDelCodigo(contexto, entrada.codigo);
    if (!seDescargaElTicket(dice, estado)) throw noEsElMomento();
    await gastarUnIntento(contexto, 'descargar', doc.id);
    return elPdfDeEsteDocumento(contexto, doc, h);
  },
});
