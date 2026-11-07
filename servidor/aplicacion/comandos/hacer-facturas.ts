import { z } from 'zod';
import {
  comoEsElNif,
  fechaEnElLocal,
  juntarLasLineas,
  leerElResultado,
  porQueNoCabeLaSenal,
  sePuedeEntregar,
  type ElDestinatario,
  type FechaOperativa,
  type LineaVendida,
} from '@estook/dominio';
import { documentoDeLaFactura } from '@estook/documentos';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { correoConElDocumento } from '../correos.ts';
import { elRelojYElFisco, elTipoDeRestauracion } from '../desviacion.ts';
import { hacerElPdf, hechoEl, laMarcaDelLocal, type UnPdf } from '../documentos.ts';
import {
  comoEsta,
  fechaLegible,
  laFechaDeExpedicion,
  lasHistorias,
  lasReferencias,
  lasSenalesConSusLineas,
  losDocumentos,
  prepararUnDocumento,
  SIN_HISTORIA,
  type ElDocumento,
  type LaHistoria,
} from '../emitir.ts';
import { enLaBase } from '../facturacion.ts';

/**
 * **Hacer facturas** (T6 · 2 · 2 · 1, decisión 0137; Anexo 4.5 y 5.3; RD 1619/2012, art. 6).
 *
 *   comprobar_al_cliente       su NIF en Hacienda, o su IVA en el censo europeo, al escribirlo; y si
 *                              ya tiene una factura, lo demás sale de ella, sin hojear a nadie (0139)
 *   lo_que_se_puede_facturar   los platos de la carta y los tipos del local
 *   hacer_factura_de_tickets   el canje (F3): uno o varios tickets, con su importe exacto
 *   hacer_factura_a_mano       la factura (F1), con conceptos libres
 *   marcar_cobrada             lo que se hizo sin cobrar; no mueve la caja (T7)
 *   mandar_el_documento        por correo, con su PDF, si el cliente lo quiere (A8)
 *   el_documento_en_pdf        la factura en A4
 *   quien_hace_que             para la dirección: quién puede cada cosa, persona a persona
 *   dar_un_permiso             y cambiarlo con un interruptor
 *
 * **Todo sirve también en Estook TPV**: la operativa no pide acceso a la parte fiscal (Richi,
 * 6-nov). Lo que hace falta lo mira la API y lo vuelve a mirar la base.
 */

export const elCliente = z
  .object({
    clase: z.enum(['empresa', 'particular', 'de_fuera']),
    nombre: z.string().trim().max(120),
    identificador: z.string().trim().min(1).max(20),
    id_tipo: z.enum(['02', '03']).nullable().optional(),
    codigo_pais: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/)
      .nullable()
      .optional(),
    domicilio: z.string().trim().min(5).max(300),
  })
  .strict();

export type ElClienteQueLlega = z.infer<typeof elCliente>;

export interface ElClienteComprobado {
  readonly vale: boolean;
  /** Lo que se le dice a quien escribe, en llano. */
  readonly dice: string | null;
  /** El nombre que tiene Hacienda: es el que vale, o rechazan la factura. */
  readonly nombre: string | null;
  /** Lo de su última factura, si ya tiene alguna. */
  readonly domicilio: string | null;
  readonly correo: string | null;
}

const limpiar = (identificador: string) => identificador.replace(/\s+/g, '').toUpperCase();

/**
 * **Lo que Hacienda rechazaría, antes de numerar** (Anexo 5.3): un rechazo de Verifacti gasta un
 * número (0136). Sin conexión con Verifacti no se para: la factura sale igual y lo termina el reloj.
 */
export async function comprobarElCliente(
  contexto: Contexto,
  c: Pick<ElClienteQueLlega, 'clase' | 'nombre' | 'identificador' | 'id_tipo' | 'codigo_pais'>,
): Promise<{
  readonly vale: boolean;
  readonly dice: string | null;
  readonly nombre: string | null;
}> {
  const verifacti = contexto.facturacion ?? null;
  const numero = limpiar(c.identificador);
  if (c.clase === 'de_fuera') {
    if (c.id_tipo !== '02' || verifacti === null) return { vale: true, dice: null, nombre: null };
    try {
      const censo = await verifacti.comprobarIva((c.codigo_pais ?? '').toUpperCase(), numero);
      if (censo === 'no') {
        return {
          vale: false,
          dice: 'Ese número de IVA no está en el censo europeo.',
          nombre: null,
        };
      }
      return {
        vale: true,
        dice:
          censo === 'si'
            ? 'Está en el censo europeo.'
            : 'El censo de ese país no contesta ahora: se hará igual.',
        nombre: null,
      };
    } catch {
      return { vale: true, dice: null, nombre: null };
    }
  }
  const forma = comoEsElNif(numero);
  if (!forma.valido) return { vale: false, dice: forma.porque, nombre: null };
  if (forma.persona === 'fisica' && c.nombre.trim() === '') {
    return {
      vale: false,
      dice: 'Para una persona, Hacienda pide sus apellidos y su nombre.',
      nombre: null,
    };
  }
  if (verifacti === null) return { vale: true, dice: null, nombre: null };
  try {
    const dice = await verifacti.comprobarNif(
      forma.nif,
      c.nombre.trim() === '' ? null : c.nombre.trim(),
    );
    const enHacienda = leerElResultado(dice.resultado);
    if (enHacienda === 'identificado' || enHacienda === 'parecido') {
      return { vale: true, dice: `En Hacienda: ${dice.nombre ?? forma.nif}`, nombre: dice.nombre };
    }
    return {
      vale: false,
      dice:
        enHacienda === 'de_baja' || enHacienda === 'revocado'
          ? 'Ese NIF está de baja en Hacienda.'
          : 'Hacienda no conoce ese NIF con ese nombre.',
      nombre: null,
    };
  } catch {
    return { vale: true, dice: null, nombre: null };
  }
}

/** El cliente que se manda a emitir: comprobado, y con el nombre que tiene Hacienda. */
export async function elDestinatarioComprobado(
  contexto: Contexto,
  c: ElClienteQueLlega,
): Promise<ElDestinatario> {
  const comprobado = await comprobarElCliente(contexto, c);
  if (!comprobado.vale) {
    throw new FalloDeAplicacion('nif_no_vale', {
      porque: comprobado.dice ?? 'Revisa los datos del cliente.',
    });
  }
  const nombre = comprobado.nombre ?? c.nombre.trim();
  if (nombre === '') {
    throw new FalloDeAplicacion('faltan_datos', { porque: 'Falta el nombre del cliente.' });
  }
  return {
    clase: c.clase,
    nombre,
    identificador: limpiar(c.identificador),
    id_tipo: c.clase === 'de_fuera' ? (c.id_tipo ?? '03') : null,
    codigo_pais: c.clase === 'de_fuera' ? (c.codigo_pais ?? '').toUpperCase() : null,
    domicilio: c.domicilio.trim(),
  };
}

export const comprobarAlCliente = comando<
  {
    clase: 'empresa' | 'particular' | 'de_fuera';
    identificador: string;
    nombre?: string | undefined;
    id_tipo?: '02' | '03' | null | undefined;
    codigo_pais?: string | null | undefined;
  },
  ElClienteComprobado
>({
  nombre: 'comprobar_al_cliente',
  entrada: z
    .object({
      clase: z.enum(['empresa', 'particular', 'de_fuera']),
      identificador: z.string().trim().min(1).max(20),
      nombre: z.string().trim().max(120).optional(),
      id_tipo: z.enum(['02', '03']).nullable().optional(),
      codigo_pais: z.string().trim().max(2).nullable().optional(),
    })
    .strict(),
  exige: 'accion.factura_de_un_ticket',
  enElTpv: 'tambien',
  // Se puede repetir sin miedo: no cambia nada.
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const [suUltima] = await enLaBase(
      () => contexto.sql<{ domicilio: string; correo: string | null; nombre: string }[]>`
        select domicilio, correo, nombre
          from estook.el_cliente_por_su_numero(${localId}::uuid, ${entrada.identificador})
      `,
    );
    const escrito = entrada.nombre?.trim() ?? '';
    const nombre = escrito === '' ? (suUltima?.nombre ?? '') : escrito;
    const lo = { domicilio: suUltima?.domicilio ?? null, correo: suUltima?.correo ?? null };
    // Una persona sin nombre todavía: no es un error, es que lo va a escribir ahora. Hacienda no
    // puede mirarla sin él, y se comprueba al salir de ese campo.
    const forma = entrada.clase === 'de_fuera' ? null : comoEsElNif(limpiar(entrada.identificador));
    if (forma?.valido === true && forma.persona === 'fisica' && nombre === '') {
      return { vale: true, dice: null, nombre: null, ...lo };
    }
    const comprobado = await comprobarElCliente(contexto, { ...entrada, nombre });
    return {
      ...comprobado,
      // Lo que dice Hacienda es lo que vale. Lo de su última factura, solo si no ha escrito nada.
      nombre: comprobado.nombre ?? (escrito === '' ? (suUltima?.nombre ?? null) : null),
      ...lo,
    };
  },
});

// ── Lo que se puede facturar ──────────────────────────────────────────────────────

export interface LoQueSePuedeFacturar {
  readonly hoy: FechaOperativa;
  /** Los tipos del impuesto del local, de sus reglas vigentes: «0,10». */
  readonly tipos: readonly number[];
  readonly tipoDeLaCarta: number | null;
  readonly impuesto: string;
  readonly platos: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly precio: number;
  }[];
}

export async function losTiposDelLocal(
  contexto: Contexto,
  fisco: Awaited<ReturnType<typeof elRelojYElFisco>>,
  hoy: FechaOperativa,
): Promise<number[]> {
  const filas = await contexto.sql<{ tipo: string }[]>`
    select distinct tipo::text as tipo from estook.regla_fiscal
     where territorio::text = ${fisco.territorio} and regimen::text = ${fisco.regimen}
       and activa and vigente_desde <= ${hoy}::date
       and (vigente_hasta is null or vigente_hasta >= ${hoy}::date)
     order by 1
  `;
  return filas.map((f) => Number(f.tipo)).filter((t) => Number.isFinite(t) && t > 0);
}

export const loQueSePuedeFacturar = consulta<Record<string, never>, LoQueSePuedeFacturar>({
  nombre: 'lo_que_se_puede_facturar',
  entrada: z.object({}).strict(),
  exige: 'accion.factura_a_mano',
  enElTpv: 'tambien',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const fisco = await elRelojYElFisco(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, fisco.zonaHoraria);
    const platos = await contexto.sql<{ id: string; nombre: string; precio_centimos: number }[]>`
      select id::text as id, nombre, precio_centimos from estook.plato
       where local_id = ${localId}::uuid and activo and precio_centimos is not null
       order by nombre
       limit 500
    `;
    return {
      hoy,
      tipos: await losTiposDelLocal(contexto, fisco, hoy),
      tipoDeLaCarta: await elTipoDeRestauracion(contexto, fisco, hoy),
      impuesto: fisco.regimen.toUpperCase(),
      platos: platos.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio_centimos })),
    };
  },
});

// ── La factura de uno o varios tickets (F3) ───────────────────────────────────────

export interface FacturaHecha {
  readonly documentoId: string;
  readonly numero: string;
}

/**
 * **El canje** (Anexo 4.5 y 5.3; prueba 11). **El importe es el de los tickets**, al céntimo, y lo
 * vuelve a mirar la base; los tickets no se tocan; cada uno, una vez, también si dos aparatos
 * lo intentan a la vez. No mueve la caja ni el almacén: la venta ya se registró.
 */
export const hacerFacturaDeTickets = comando<
  { ticket_ids: string[]; cliente: ElClienteQueLlega },
  FacturaHecha
>({
  nombre: 'hacer_factura_de_tickets',
  entrada: z
    .object({
      ticket_ids: z.array(z.string().uuid()).min(1).max(200),
      cliente: elCliente,
    })
    .strict(),
  exige: 'accion.factura_de_un_ticket',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const ids = [...new Set(entrada.ticket_ids)];
    const tickets = await losDocumentos(contexto, ids);
    if (tickets.length !== ids.length || tickets.some((t) => t.localId !== localId)) {
      throw new FalloDeAplicacion('no_existe');
    }
    const destinatario = await elDestinatarioComprobado(contexto, entrada.cliente);
    return elCanjeDeLosTickets(contexto, localId, tickets, destinatario, 'canje');
  },
});

/**
 * **La F3 de esos tickets**, la haga el equipo o la pida el cliente en su móvil (0141): prepara la
 * factura con su número y apunta el canje, que lo vuelve a mirar todo con el candado de cada ticket.
 */
export async function elCanjeDeLosTickets(
  contexto: Contexto,
  localId: string,
  tickets: readonly ElDocumento[],
  destinatario: ElDestinatario,
  origen: 'canje' | 'pedida',
): Promise<FacturaHecha> {
  const ids = tickets.map((t) => t.id);
  const fisco = await elRelojYElFisco(contexto, localId);
  const lineas: LineaVendida[] = juntarLasLineas(tickets.flatMap((t) => [...t.lineas]));
  const unoSolo = tickets.length === 1 ? tickets[0] : undefined;
  // La última de las operaciones: con varias del mismo cliente, va una sola fecha (art. 13).
  const fechaOperacion = tickets.map((t) => t.fechaOperacion).reduce((a, b) => (a > b ? a : b));
  const hecho = await prepararUnDocumento(contexto, {
    localId,
    tipo: 'F3',
    descripcion:
      unoSolo === undefined
        ? `Factura de ${String(tickets.length)} tickets`
        : `Factura del ticket ${unoSolo.serie}${String(unoSolo.numero).padStart(6, '0')}`,
    lineas,
    regimenDelLocal: fisco.regimen as LineaVendida['regimen'],
    zonaHoraria: fisco.zonaHoraria,
    donde: unoSolo?.donde ?? null,
    origen,
    fechaOperacion,
    destinatario,
  });
  const total = tickets.reduce((s, t) => s + t.total, 0);
  await enLaBase(
    () => contexto.sql`
      select facturacion.apuntar_el_canje(
        ${localId}::uuid, ${hecho.id}::uuid, ${ids}::uuid[], ${total}::integer,
        ${contexto.ahora.toISOString()}::timestamptz
      )
    `,
  );
  return { documentoId: hecho.id, numero: hecho.numero };
}

// ── La factura a mano (F1) ────────────────────────────────────────────────────────

const unConcepto = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    cantidad: z.number().int().min(1).max(100_000),
    /** Lo que se cobra por todos, en céntimos y con el impuesto dentro. */
    importe: z.number().int().min(1).max(100_000_000),
    tipo: z.number().min(0).max(1),
  })
  .strict();

/**
 * **La factura a mano** (0125, 1, A): un evento o una comida de empresa. Con su cliente, sus
 * conceptos y **la fecha de la comida** si fue antes. Sale F1, con su QR y en A4. Quien la hace
 * queda escrito. Los tipos son los de las reglas vigentes del local: no se escribe cualquiera.
 */
export const hacerFacturaAMano = comando<
  {
    cliente: ElClienteQueLlega;
    lineas: z.infer<typeof unConcepto>[];
    fecha_operacion?: string | undefined;
    cobrada: boolean;
    vencimiento?: string | undefined;
    senales?: string[] | undefined;
  },
  FacturaHecha
>({
  nombre: 'hacer_factura_a_mano',
  entrada: z
    .object({
      cliente: elCliente,
      lineas: z.array(unConcepto).min(1).max(200),
      // `date()` rechaza también las que no existen, como el 31 de febrero.
      fecha_operacion: z.string().date().optional(),
      cobrada: z.boolean(),
      vencimiento: z.string().date().optional(),
      // Las señales que descuenta (maqueta de T6 · 2 · 2, 4): lo vuelve a mirar la base.
      senales: z.array(z.string().uuid()).min(1).max(20).optional(),
    })
    .strict(),
  exige: 'accion.factura_a_mano',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const fisco = await elRelojYElFisco(contexto, localId);
    const hoy = fechaEnElLocal(contexto.ahora, fisco.zonaHoraria);
    const tipos = await losTiposDelLocal(contexto, fisco, hoy);
    if (entrada.lineas.some((l) => !tipos.includes(l.tipo))) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Uno de los conceptos lleva un impuesto que tu local no tiene.',
      });
    }
    if (!entrada.cobrada && entrada.vencimiento === undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Si está por cobrar, di cuándo vence.',
      });
    }
    const destinatario = await elDestinatarioComprobado(contexto, entrada.cliente);
    const regimen = fisco.regimen as LineaVendida['regimen'];
    const conceptos: LineaVendida[] = entrada.lineas.map((l) => ({ ...l, regimen }));
    // **Lo que resta la señal**: lo que le queda, en su mismo tipo. Si otro aparato la descuenta a la
    // vez, lo para la base con su candado.
    const lasSenales = [...new Set(entrada.senales ?? [])];
    const filas =
      lasSenales.length === 0
        ? []
        : await contexto.sql<{ id: string; queda: number }[]>`
            select id::text as id, facturacion.lo_que_queda(id) as queda
              from unnest(${lasSenales}::uuid[]) as id
          `;
    const senales = await lasSenalesConSusLineas(
      contexto,
      filas.map((f) => ({ id: f.id, fecha: hoy, queda: f.queda })),
    );
    if (senales.length !== lasSenales.length) throw new FalloDeAplicacion('no_existe');
    const lineas: LineaVendida[] = [...conceptos, ...senales.flatMap((s) => [...s.lineas])];
    const noCabe = porQueNoCabeLaSenal(lineas);
    if (noCabe !== null) throw new FalloDeAplicacion('faltan_datos', { porque: noCabe });
    const hecho = await prepararUnDocumento(contexto, {
      localId,
      tipo: 'F1',
      descripcion: conceptos
        .map((l) => l.nombre)
        .join(', ')
        .slice(0, 500),
      lineas,
      regimenDelLocal: regimen,
      zonaHoraria: fisco.zonaHoraria,
      donde: null,
      origen: 'a_mano',
      fechaOperacion: (entrada.fecha_operacion ?? hoy) as FechaOperativa,
      destinatario,
      vencimiento: entrada.cobrada ? null : (entrada.vencimiento as FechaOperativa),
    });
    if (lasSenales.length > 0) {
      await enLaBase(
        () => contexto.sql`
          select facturacion.apuntar_los_descuentos(
            ${localId}::uuid, ${hecho.id}::uuid, ${lasSenales}::uuid[],
            ${contexto.ahora.toISOString()}::timestamptz
          )
        `,
      );
    }
    if (entrada.cobrada) {
      await enLaBase(
        () => contexto.sql`
          select facturacion.marcar_cobrada(
            ${hecho.id}::uuid, ${contexto.ahora.toISOString()}::timestamptz
          )
        `,
      );
    }
    return { documentoId: hecho.id, numero: hecho.numero };
  },
});

export const marcarCobrada = comando<{ documento_id: string }, { readonly cobrada: true }>({
  nombre: 'marcar_cobrada',
  entrada: z.object({ documento_id: z.string().uuid() }).strict(),
  exige: 'accion.factura_a_mano',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    await enLaBase(
      () => contexto.sql`
        select facturacion.marcar_cobrada(
          ${entrada.documento_id}::uuid, ${contexto.ahora.toISOString()}::timestamptz
        )
      `,
    );
    return { cobrada: true };
  },
});

// ── El PDF y el correo ────────────────────────────────────────────────────────────

/** El documento en A4, listo para descargar o para mandar. */
async function elPdfDelDocumento(contexto: Contexto, documentoId: string): Promise<UnPdf> {
  const localId = elLocalDeLaSesion(contexto);
  const [doc] = await losDocumentos(contexto, [documentoId]);
  if (doc === undefined || doc.localId !== localId) throw new FalloDeAplicacion('no_existe');
  const h = (await lasHistorias(contexto, [doc.id])).get(doc.id) ?? SIN_HISTORIA;
  return elPdfDeEsteDocumento(contexto, doc, h);
}

/** Sin mirar de qué local es: quien llama ya lo sabe. Lo usa también «Pide tu factura» (0141). */
export async function elPdfDeEsteDocumento(
  contexto: Contexto,
  doc: ElDocumento,
  h: LaHistoria,
): Promise<UnPdf> {
  // Con la imagen del QR: un PDF de VERI*FACTU sin su QR no vale (0138). Sale del alta o de una
  // consulta, y las dos la traen.
  const registrado = h.registros.find((r) => r.qr !== null);
  if (doc.modalidad !== 'fuera_sii' && registrado === undefined) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque:
        comoEsta(doc, h) === 'rechazado_por_datos'
          ? 'No se ha emitido: Verifacti no lo mandó a Hacienda. Mira qué dice arriba.'
          : 'Todavía se está enviando: en un momento se podrá descargar.',
    });
  }
  const marca = await laMarcaDelLocal(contexto, doc.localId);
  const numero = `${doc.serie}${String(doc.numero).padStart(6, '0')}`;
  const expedicion = laFechaDeExpedicion(doc, h);
  const html = documentoDeLaFactura(
    {
      tipo: doc.tipo,
      numero,
      empresa: doc.empresa,
      destinatario: doc.destinatario,
      // La fecha que tiene Hacienda, la de su QR.
      fecha: fechaLegible(expedicion),
      fechaOperacion: doc.fechaOperacion === expedicion ? null : fechaLegible(doc.fechaOperacion),
      vence: doc.vencimiento === null ? null : fechaLegible(doc.vencimiento),
      sustituye: h.sustituye.map((t) => t.numero),
      ...lasReferencias(h),
      lineas: doc.lineas,
      desglose: doc.desglose,
      qrEnBase64: doc.modalidad === 'fuera_sii' ? null : (registrado?.qr ?? null),
      pruebas: doc.entorno === 'pruebas',
    },
    marca,
    hechoEl(contexto.ahora, doc.zonaHoraria),
  );
  return hacerElPdf(contexto, html, {
    nombre: `${numero}.pdf`,
    pie: `${numero} · ${doc.empresa.nombre}`,
  });
}

/** Descargar: quien puede mirarlo. La gestoría, también. */
export const elDocumentoEnPdf = consulta<{ documento_id: string }, UnPdf>({
  nombre: 'el_documento_en_pdf',
  entrada: z.object({ documento_id: z.string().uuid() }).strict(),
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    return elPdfDelDocumento(contexto, entrada.documento_id);
  },
});

/**
 * **Mandarlo por correo** (A8: si el cliente lo elige). Queda a quién, cuándo y quién lo mandó, en
 * su historia. La gestoría solo mira: no manda nada.
 */
export const mandarElDocumento = comando<
  { documento_id: string; para: string },
  { readonly mandado: true }
>({
  nombre: 'mandar_el_documento',
  entrada: z
    .object({ documento_id: z.string().uuid(), para: z.string().trim().email().max(254) })
    .strict(),
  exige: 'accion.factura_de_un_ticket',
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const correo = contexto.correo;
    if (correo === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'El correo no está encendido todavía. Puedes descargarla y mandarla tú.',
      });
    }
    const [doc] = await losDocumentos(contexto, [entrada.documento_id]);
    if (doc === undefined) throw new FalloDeAplicacion('no_existe');
    const h = (await lasHistorias(contexto, [doc.id])).get(doc.id) ?? SIN_HISTORIA;
    if (!sePuedeEntregar(comoEsta(doc, h))) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Hacienda no lo tiene: hay que corregirlo antes de mandárselo a nadie.',
      });
    }
    const pdf = await elPdfDelDocumento(contexto, entrada.documento_id);
    await correo.mandar(
      correoConElDocumento(entrada.para, doc.empresa.local, pdf.nombre.replace(/\.pdf$/, ''), {
        nombre: pdf.nombre,
        base64: pdf.base64,
      }),
    );
    await enLaBase(
      () => contexto.sql`
        select facturacion.apuntar_la_copia(
          ${entrada.documento_id}::uuid, ${entrada.para},
          ${contexto.ahora.toISOString()}::timestamptz
        )
      `,
    );
    return { mandado: true };
  },
});

// ── Quién hace qué ────────────────────────────────────────────────────────────────

export interface QuienHaceQue {
  readonly personaId: string;
  readonly nombre: string;
  readonly rol: string;
  readonly siempre: boolean;
  readonly deUnTicket: boolean;
  readonly aMano: boolean;
  readonly consultar: boolean;
  readonly devolver: boolean;
  readonly corregir: boolean;
  readonly anular: boolean;
  readonly cambiados: readonly string[];
}

export const quienHaceQue = consulta<Record<string, never>, readonly QuienHaceQue[]>({
  nombre: 'quien_hace_que',
  entrada: z.object({}).strict(),
  enElTpv: 'tambien',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const filas = await enLaBase(
      () => contexto.sql<
        {
          persona_id: string;
          nombre: string;
          rol: string;
          siempre: boolean;
          de_un_ticket: boolean;
          a_mano: boolean;
          consultar: boolean;
          devolver: boolean;
          corregir: boolean;
          anular: boolean;
          cambiados: string[];
        }[]
      >`
        select persona_id::text as persona_id, nombre, rol, siempre, de_un_ticket, a_mano, consultar,
               devolver, corregir, anular, cambiados
          from estook.quien_hace_que(${localId}::uuid)
      `,
    );
    return filas.map((f) => ({
      personaId: f.persona_id,
      nombre: f.nombre,
      rol: f.rol,
      siempre: f.siempre,
      deUnTicket: f.de_un_ticket,
      aMano: f.a_mano,
      consultar: f.consultar,
      devolver: f.devolver,
      corregir: f.corregir,
      anular: f.anular,
      cambiados: f.cambiados,
    }));
  },
});

export const darUnPermiso = comando<
  {
    persona_id: string;
    permiso:
      | 'accion.factura_de_un_ticket'
      | 'accion.factura_a_mano'
      | 'accion.ver_documentos'
      | 'accion.devolver'
      | 'accion.corregir_datos'
      | 'accion.anular';
    tiene: boolean;
  },
  { readonly hecho: true }
>({
  nombre: 'dar_un_permiso',
  entrada: z
    .object({
      persona_id: z.string().uuid(),
      permiso: z.enum([
        'accion.factura_de_un_ticket',
        'accion.factura_a_mano',
        'accion.ver_documentos',
        'accion.devolver',
        'accion.corregir_datos',
        'accion.anular',
      ]),
      tiene: z.boolean(),
    })
    .strict(),
  enElTpv: 'tambien',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    await enLaBase(
      () => contexto.sql`
        select estook.dar_un_permiso_de_los_documentos(
          ${localId}::uuid, ${entrada.persona_id}::uuid, ${entrada.permiso}, ${entrada.tiene}
        )
      `,
    );
    return { hecho: true };
  },
});
