import { centimos, enEuros, entreFactor } from './dinero.ts';
import { desglosar } from './fiscal/desglose.ts';
import type { Regimen } from './fiscal/vocabulario.ts';
import type { FechaOperativa } from './tiempo.ts';

/**
 * **Emitir un documento fiscal** (T6 · 2 · 1, decisión 0136; Anexo 4.4 a 4.11).
 *
 * Lo que no depende de la red ni de la base: el número, lo que se le manda a Verifacti, cómo
 * está un documento según lo que se le ha ido añadiendo y lo que dice Hacienda en llano. El
 * motor (`servidor/facturacion/emitir.ts`) lo usa, y la pantalla también: no pueden decir
 * cosas distintas.
 *
 * Los campos de Verifacti salen de su especificación OpenAPI (`verifactu.min.yaml`, leída
 * entera el 6-nov-2026): **ninguno se inventa** (Plan, regla 7).
 */

/** Los que hace T6 · 2. R2 y R3 no se programan (Anexo 4.5). */
export type TipoDeDocumento = 'F2' | 'F1' | 'F3' | 'R1' | 'R4' | 'R5';

/** Lo que es cada uno, dicho en una palabra para la lista. */
export const NOMBRE_DEL_DOCUMENTO: Readonly<Record<TipoDeDocumento, string>> = {
  F2: 'Ticket',
  F1: 'Factura',
  F3: 'Factura de un ticket',
  R1: 'Devolución',
  R4: 'Corrección',
  R5: 'Devolución',
};

/**
 * **El límite de la factura simplificada: 3.000 €, IVA incluido**, para hostelería y lo que
 * se consume en el acto (RD 1619/2012, art. 4.2.e; Anexo 4.6). Por encima, factura completa.
 */
export const LIMITE_DEL_TICKET = centimos(300_000);

/** Hacienda admite doce líneas de desglose como mucho (Verifacti, `lineas.maxItems`). */
export const LINEAS_DE_DESGLOSE = 12;

/** Lo que tarda Verifacti en contestar antes de dar el envío por perdido y preguntar. */
export const ESPERA_DE_VERIFACTI_MS = 8_000;

/** Un registro que lleva más de esto «Pendiente» se pregunta solo (Anexo 4.10, prueba 17). */
export const PENDIENTE_DEMASIADO_MS = 60 * 60 * 1000;

/** Lo que espera el trabajo antes de terminar un documento que se quedó a medias (4.9, paso 7). */
export const A_MEDIAS_DESDE_MS = 2 * 60 * 1000;

// ── El número ─────────────────────────────────────────────────────────────────────

/** El número, con seis cifras: 37 → «000037». Hacienda lo recibe como texto. */
export function numeroEnTexto(numero: number): string {
  if (!Number.isInteger(numero) || numero < 1) throw new Error(`«${numero}» no es un número.`);
  return String(numero).padStart(6, '0');
}

/** Cómo se lee entero, y cómo lo ve Hacienda: la serie y el número juntos. */
export function elNumeroEntero(serie: string, numero: number): string {
  return `${serie}${numeroEnTexto(numero)}`;
}

// ── Lo que se vende ───────────────────────────────────────────────────────────────

/** Una línea del documento: lo que se vendió, con el impuesto dentro, como en la carta. */
export interface LineaVendida {
  readonly nombre: string;
  readonly cantidad: number;
  /** Lo que se cobra por todas, en céntimos y con el impuesto dentro. */
  readonly importe: number;
  readonly regimen: Regimen;
  /** En fracción: 0,10 es el 10 %. */
  readonly tipo: number;
}

/** Una línea de desglose, por impuesto y tipo: lo que va a Hacienda (Anexo 4.9). */
export interface LineaDeDesglose {
  readonly regimen: Regimen;
  readonly tipo: number;
  readonly base: number;
  readonly cuota: number;
  readonly total: number;
}

export interface ElDesglose {
  readonly lineas: readonly LineaDeDesglose[];
  readonly base: number;
  readonly cuota: number;
  readonly total: number;
}

/**
 * El desglose de lo vendido: **una línea por impuesto y tipo**, no por plato, con el
 * impuesto calculado sobre el total de cada grupo y la suma cuadrando al céntimo con lo que
 * paga el cliente (el motor fiscal de M2, `desglosar`).
 */
export function elDesglose(lineas: readonly LineaVendida[]): ElDesglose {
  const d = desglosar(
    lineas.map((l) => ({ importe: centimos(l.importe), regimen: l.regimen, tipo: l.tipo })),
    'impuesto_incluido',
  );
  return {
    lineas: d.grupos.map((g) => ({
      regimen: g.regimen,
      tipo: g.tipo,
      base: g.base,
      cuota: g.cuota,
      total: g.total,
    })),
    base: d.base,
    cuota: d.cuota,
    total: d.total,
  };
}

export type PorQueNoSeEmite =
  'sin_lineas' | 'demasiadas_lineas' | 'pasa_del_limite' | 'otro_impuesto';

/**
 * Lo que se mira antes de numerar (Anexo 4.9, paso 2): que haya algo, que el desglose quepa
 * en doce líneas, que un ticket no pase de 3.000 € y que **cada línea lleve el impuesto del
 * local** (un local canario emite con IGIC y no con IVA, y al revés: prueba 22).
 */
export function porQueNoSeEmite(
  tipo: TipoDeDocumento,
  lineas: readonly LineaVendida[],
  regimenDelLocal: Regimen,
): PorQueNoSeEmite | null {
  if (lineas.length === 0) return 'sin_lineas';
  if (lineas.some((l) => l.regimen !== regimenDelLocal)) return 'otro_impuesto';
  const d = elDesglose(lineas);
  if (d.lineas.length > LINEAS_DE_DESGLOSE) return 'demasiadas_lineas';
  if ((tipo === 'F2' || tipo === 'R5') && Math.abs(d.total) > LIMITE_DEL_TICKET) {
    return 'pasa_del_limite';
  }
  return null;
}

export const POR_QUE_NO_SE_EMITE: Readonly<Record<PorQueNoSeEmite, string>> = {
  sin_lineas: 'No hay nada que cobrar.',
  demasiadas_lineas: 'Lleva más de doce tipos de impuesto distintos: Hacienda no lo admite.',
  pasa_del_limite:
    'Pasa de 3.000 €: hay que hacer una factura completa, con los datos del cliente.',
  otro_impuesto: 'Lleva un impuesto que no es el del local (IVA en Canarias, o IGIC fuera).',
};

// ── Lo que se le manda a Verifacti ────────────────────────────────────────────────

/** «2026-11-06» → «06-11-2026», que es como lo quiere Verifacti. */
export function fechaParaVerifacti(fecha: FechaOperativa): string {
  const [ano, mes, dia] = fecha.split('-');
  return `${dia ?? ''}-${mes ?? ''}-${ano ?? ''}`;
}

/** Céntimos → «12.34» o «-5.00»: punto decimal y dos decimales, siempre en euros (4.9). */
export function importeParaVerifacti(importe: number): string {
  const signo = importe < 0 ? '-' : '';
  // Céntimos enteros (regla 9): no hay nada que redondear.
  const absoluto = Math.abs(centimos(importe));
  return `${signo}${String(Math.floor(absoluto / 100))}.${String(absoluto % 100).padStart(2, '0')}`;
}

/** 0,10 → «10»; 0,075 → «7.5». */
export function tipoParaVerifacti(tipo: number): string {
  return String(Number((tipo * 100).toFixed(2)));
}

/** El impuesto, como lo cuenta Hacienda: 01 IVA, 02 IPSI, 03 IGIC. */
const CLAVE_DEL_IMPUESTO: Readonly<Record<Regimen, string>> = { iva: '01', ipsi: '02', igic: '03' };

/** Quién recibe una factura (RD 1619/2012, art. 6.1; lo investigado, A18). */
export type ClaseDeCliente = 'empresa' | 'particular' | 'de_fuera';

/** El destinatario, congelado en el documento: lo que sale impreso. */
export interface ElDestinatario {
  readonly clase: ClaseDeCliente;
  readonly nombre: string;
  /** El NIF, el número de IVA o el pasaporte, sin espacios y en mayúsculas. */
  readonly identificador: string;
  /** De fuera: 02, su IVA en el censo europeo; 03, su pasaporte (Verifacti, `id_otro`). */
  readonly id_tipo: '02' | '03' | null;
  readonly codigo_pais: string | null;
  /** No va a Verifacti, que no tiene ese campo: va en el papel, como pide el art. 6.1.e. */
  readonly domicilio: string;
}

/** Un ticket que sustituye una factura F3, con la fecha con la que Verifacti lo registró. */
export interface DocumentoSustituido {
  readonly serie: string;
  readonly numero: number;
  readonly fechaExpedicion: FechaOperativa;
}

/** Lo que guarda el documento de sí mismo al prepararse: no cambia nunca más. */
export interface DocumentoParaEmitir {
  readonly tipo: TipoDeDocumento;
  /** «T-IKA-2026-». */
  readonly serie: string;
  readonly numero: number;
  /** La fecha de la operación, en la del local. */
  readonly fechaOperacion: FechaOperativa;
  readonly descripcion: string;
  readonly desglose: ElDesglose;
  /** F1 y F3 lo llevan; un ticket, nunca (Verifacti, `destinatario_no_aplica`). */
  readonly destinatario?: ElDestinatario | null | undefined;
  /** Los tickets que sustituye una F3. */
  readonly sustituidas?: readonly DocumentoSustituido[] | undefined;
}

export interface CuerpoParaVerifacti {
  readonly serie: string;
  readonly numero: string;
  readonly fecha_expedicion: string;
  readonly fecha_operacion?: string;
  readonly tipo_factura: TipoDeDocumento;
  readonly descripcion: string;
  readonly lineas: readonly {
    readonly base_imponible: string;
    readonly tipo_impositivo: string;
    readonly cuota_repercutida: string;
    readonly impuesto?: string;
  }[];
  readonly importe_total: string;
  readonly incidencia?: 'S';
  readonly nombre?: string;
  readonly nif?: string;
  readonly id_otro?: {
    readonly codigo_pais: string;
    readonly id_type: '02' | '03';
    readonly id: string;
  };
  readonly facturas_sustituidas?: readonly {
    readonly serie: string;
    readonly numero: string;
    readonly fecha_expedicion: string;
  }[];
}

/**
 * **El cuerpo de `POST /verifactu/create`**: un ticket (F2) sin destinatario; una factura (F1 y
 * F3) con su nombre y su NIF, o su `id_otro` si es de fuera; y una F3 con los tickets que sustituye.
 *
 * La fecha de expedición **es la del día en que se manda** (Verifacti: «debe ser la fecha
 * actual»), y la de la operación solo va si es otra: un documento que se manda al día
 * siguiente, al volver la conexión, lleva las dos y la incidencia (Anexo 4.11). El IVA es el
 * impuesto de fábrica, así que solo se dice cuando es otro.
 */
export function elCuerpoParaVerifacti(
  doc: DocumentoParaEmitir,
  envio: { readonly fechaExpedicion: FechaOperativa; readonly incidencia: boolean },
): CuerpoParaVerifacti {
  return {
    serie: doc.serie,
    numero: numeroEnTexto(doc.numero),
    fecha_expedicion: fechaParaVerifacti(envio.fechaExpedicion),
    ...(doc.fechaOperacion === envio.fechaExpedicion
      ? {}
      : { fecha_operacion: fechaParaVerifacti(doc.fechaOperacion) }),
    tipo_factura: doc.tipo,
    descripcion: doc.descripcion.slice(0, 500),
    lineas: doc.desglose.lineas.map((l) => ({
      ...(l.regimen === 'iva' ? {} : { impuesto: CLAVE_DEL_IMPUESTO[l.regimen] }),
      base_imponible: importeParaVerifacti(l.base),
      tipo_impositivo: tipoParaVerifacti(l.tipo),
      cuota_repercutida: importeParaVerifacti(l.cuota),
    })),
    importe_total: importeParaVerifacti(doc.desglose.total),
    ...(envio.incidencia ? { incidencia: 'S' as const } : {}),
    ...elDestinatarioParaVerifacti(doc.destinatario ?? null),
    ...(doc.sustituidas === undefined || doc.sustituidas.length === 0
      ? {}
      : {
          facturas_sustituidas: doc.sustituidas.map((t) => ({
            serie: t.serie,
            numero: numeroEnTexto(t.numero),
            fecha_expedicion: fechaParaVerifacti(t.fechaExpedicion),
          })),
        }),
  };
}

function elDestinatarioParaVerifacti(d: ElDestinatario | null): Partial<CuerpoParaVerifacti> {
  if (d === null) return {};
  if (d.clase === 'de_fuera' && d.id_tipo !== null && d.codigo_pais !== null) {
    return {
      nombre: d.nombre,
      id_otro: { codigo_pais: d.codigo_pais, id_type: d.id_tipo, id: d.identificador },
    };
  }
  return { nombre: d.nombre, nif: d.identificador };
}

// ── Cómo está ─────────────────────────────────────────────────────────────────────

/**
 * Lo que se le va añadiendo a un documento, que **nunca cambia** (Anexo 7.6): cada envío y cada
 * estado que llega de Hacienda, con su hora. De ahí sale cómo está; no se guarda en ningún sitio.
 */
export type ApunteDelDocumento =
  | {
      readonly que: 'envio';
      readonly en: string;
      /** Lo que pasó con la llamada (4.9, paso 6). */
      readonly resultado: 'aceptado' | 'rechazado_por_datos' | 'en_curso' | 'sin_respuesta';
    }
  | {
      readonly que: 'registro';
      readonly en: string;
      /** El estado de Verifacti, tal cual: «Pendiente», «Correcto»… */
      readonly estado: string;
    };

export type EstadoDelDocumento =
  /** Numerado, sin mandar todavía. */
  | 'preparado'
  /** Mandado, sin respuesta: el trabajo lo termina. */
  | 'enviando'
  /** Verifacti lo aceptó y lo tiene en su cola: el QR ya vale. */
  | 'pendiente'
  | 'correcto'
  | 'aceptado_con_errores'
  /** Hacienda lo rechazó: **su número queda usado** y se corrige con otro documento. */
  | 'rechazado'
  /** Verifacti no lo aceptó por los datos: no llegó a Hacienda. */
  | 'rechazado_por_datos'
  /** Anulado ante Hacienda (T6 · 2 · 2). */
  | 'anulado';

const DE_VERIFACTI: Readonly<Record<string, EstadoDelDocumento>> = {
  pendiente: 'pendiente',
  correcto: 'correcto',
  'aceptado con errores': 'aceptado_con_errores',
  incorrecto: 'rechazado',
  'no registrado': 'rechazado',
  'factura inexistente': 'rechazado',
  anulado: 'anulado',
  // Hacienda tenía ya ese número con esa fecha: es este mismo (4.10), no se hace nada.
  duplicado: 'correcto',
  // Un fallo de Hacienda que Verifacti reintenta solo.
  'error servidor aeat': 'pendiente',
};

/** Un estado de Verifacti, al nuestro. Uno que no se conoce, «pendiente»: se volverá a mirar. */
export function elEstadoDeVerifacti(estado: string): EstadoDelDocumento {
  return DE_VERIFACTI[estado.trim().toLowerCase()] ?? 'pendiente';
}

/** Cómo está un documento, por lo último que se le añadió (Anexo 7.6). */
export function elEstadoDelDocumento(apuntes: readonly ApunteDelDocumento[]): EstadoDelDocumento {
  const ordenados = [...apuntes].sort((a, b) => a.en.localeCompare(b.en));
  let estado: EstadoDelDocumento = 'preparado';
  for (const a of ordenados) {
    if (a.que === 'registro') {
      estado = elEstadoDeVerifacti(a.estado);
      continue;
    }
    // Un envío no deshace lo que ya sabe Hacienda: llega antes que sus registros.
    if (a.resultado === 'aceptado') {
      if (estado === 'preparado' || estado === 'enviando') estado = 'pendiente';
    } else if (a.resultado === 'rechazado_por_datos') {
      estado = 'rechazado_por_datos';
    } else if (estado === 'preparado') {
      estado = 'enviando';
    }
  }
  return estado;
}

/** Si al documento todavía le queda algo que hacer por su cuenta. */
export function faltaAlgo(estado: EstadoDelDocumento): boolean {
  return estado === 'preparado' || estado === 'enviando' || estado === 'pendiente';
}

/** Si lo que pasa con él es para que alguien haga algo (arriba de la lista, 4.10). */
export function hayQueHacerAlgo(estado: EstadoDelDocumento): boolean {
  return (
    estado === 'rechazado' || estado === 'aceptado_con_errores' || estado === 'rechazado_por_datos'
  );
}

/** La chapa de la lista, como en la maqueta aprobada (0125). */
export const LA_CHAPA: Readonly<
  Record<
    EstadoDelDocumento,
    { readonly texto: string; readonly tono: 'bien' | 'info' | 'mal' | 'atencion' }
  >
> = {
  preparado: { texto: 'Enviando', tono: 'info' },
  enviando: { texto: 'Enviando', tono: 'info' },
  pendiente: { texto: 'En Hacienda', tono: 'info' },
  correcto: { texto: 'Correcto', tono: 'bien' },
  aceptado_con_errores: { texto: 'Aceptado con errores', tono: 'atencion' },
  rechazado: { texto: 'Rechazado', tono: 'mal' },
  rechazado_por_datos: { texto: 'No se ha emitido', tono: 'mal' },
  anulado: { texto: 'Anulado', tono: 'atencion' },
};

// ── Lo que dice Hacienda, en llano ────────────────────────────────────────────────

export interface LoQueDiceEnLlano {
  /** Qué ha pasado, en una frase. */
  readonly que: string;
  /** Qué hacer, en otra. */
  readonly hacer: string;
}

/**
 * Lo que dice Hacienda (o Verifacti), traducido a lo que significa y a qué hacer (Anexo
 * 4.10). **El original no se toca nunca**: todo se corrige con otro documento, y el número
 * de un documento rechazado queda usado.
 */
export function loQueDiceEnLlano(
  estado: EstadoDelDocumento,
  mensaje: string | null,
): LoQueDiceEnLlano | null {
  const dice = mensaje === null || mensaje.trim() === '' ? '' : ` Dice: «${mensaje.trim()}».`;
  switch (estado) {
    case 'rechazado':
      return {
        que: `Hacienda lo ha rechazado.${dice}`,
        hacer: 'Hay que corregirlo con otro documento. Este no se borra: su número queda usado.',
      };
    case 'aceptado_con_errores':
      return {
        que: `Hacienda lo ha aceptado, pero señala un error.${dice}`,
        hacer: 'Mira el dato que dice y corrígelo con otro documento si hace falta.',
      };
    case 'rechazado_por_datos':
      return {
        que: `Verifacti no lo ha mandado a Hacienda por los datos.${dice}`,
        hacer:
          'No ha llegado a Hacienda. Corrige el dato que dice y vuelve a hacerlo; su número queda usado.',
      };
    default:
      return null;
  }
}

// ── La factura ────────────────────────────────────────────────────────────────────

/**
 * **Lo que lleva cada línea de una factura completa** (RD 1619/2012, art. 6.1.f, g): el precio
 * unitario sin impuesto, el tipo y su base. Lo vendido viene con el impuesto dentro, como la carta.
 */
export interface LineaDeLaFactura {
  readonly nombre: string;
  readonly cantidad: number;
  /** «31,82», en euros. Con más decimales solo si hacen falta para no falsear el precio. */
  readonly precioSinImpuesto: string;
  /** «10 %». */
  readonly tipo: string;
  /** La base de la línea, en céntimos. */
  readonly base: number;
}

export function lineasDeLaFactura(lineas: readonly LineaVendida[]): LineaDeLaFactura[] {
  return lineas.map((l) => {
    const base: number = entreFactor(centimos(l.importe), 1 + l.tipo);
    const unidad = base / 100 / l.cantidad;
    const conDos = unidad.toFixed(2);
    const exacto = Math.abs(Number(conDos) * l.cantidad * 100 - base) < 0.5;
    return {
      nombre: l.nombre,
      cantidad: l.cantidad,
      precioSinImpuesto: (exacto ? conDos : unidad.toFixed(4)).replace('.', ','),
      tipo: `${String(Number((l.tipo * 100).toFixed(2))).replace('.', ',')} %`,
      base,
    };
  });
}

/**
 * **Juntar lo de varios tickets**: los platos iguales, al mismo precio y tipo, en una sola línea,
 * para que un mes de comidas quepa en una página. El total no cambia.
 */
export function juntarLasLineas(lineas: readonly LineaVendida[]): LineaVendida[] {
  const juntas = new Map<string, LineaVendida>();
  for (const l of lineas) {
    const clave = `${l.nombre}|${String(l.importe / l.cantidad)}|${l.regimen}|${String(l.tipo)}`;
    const ya = juntas.get(clave);
    juntas.set(
      clave,
      ya === undefined
        ? l
        : { ...ya, cantidad: ya.cantidad + l.cantidad, importe: ya.importe + l.importe },
    );
  }
  return [...juntas.values()];
}

/**
 * **El plazo de una factura a una empresa o un profesional**: antes del día 16 del mes siguiente
 * al de la operación (RD 1619/2012, art. 11; lo investigado, A21). Nulo si no hay que avisar: un
 * particular, o una operación de este mismo mes.
 */
export function elPlazoDeLaFactura(
  fechaOperacion: FechaOperativa,
  hoy: FechaOperativa,
  clase: ClaseDeCliente,
): { readonly hasta: FechaOperativa; readonly pasado: boolean } | null {
  if (clase === 'particular') return null;
  if (fechaOperacion.slice(0, 7) === hoy.slice(0, 7)) return null;
  const [ano = 0, mes = 1] = fechaOperacion.split('-').map(Number);
  const siguiente = mes === 12 ? { a: ano + 1, m: 1 } : { a: ano, m: mes + 1 };
  const hasta =
    `${String(siguiente.a)}-${String(siguiente.m).padStart(2, '0')}-15` as FechaOperativa;
  return { hasta, pasado: hoy > hasta };
}

export type PorQueNoSeCanjea = 'ya_tiene_factura' | 'no_es_un_ticket' | 'sin_registrar' | 'no_vale';

/** Si un documento se puede juntar en una factura (Anexo 5.3, prueba 11), y por qué no. */
export function porQueNoSeCanjea(
  tipo: TipoDeDocumento,
  estado: EstadoDelDocumento | 'fuera_sii',
  tieneFactura: boolean,
): PorQueNoSeCanjea | null {
  if (tipo !== 'F2') return 'no_es_un_ticket';
  if (tieneFactura) return 'ya_tiene_factura';
  if (estado === 'preparado' || estado === 'enviando') return 'sin_registrar';
  if (estado === 'rechazado' || estado === 'rechazado_por_datos' || estado === 'anulado') {
    return 'no_vale';
  }
  return null;
}

export const POR_QUE_NO_SE_CANJEA: Readonly<Record<PorQueNoSeCanjea, string>> = {
  ya_tiene_factura: 'ya tiene factura',
  no_es_un_ticket: 'no es un ticket',
  sin_registrar: 'todavía se está enviando',
  no_vale: 'Hacienda no lo tiene',
};

// ── Para la pantalla ──────────────────────────────────────────────────────────────

/** «12,30 €», con el signo de menos de verdad si es negativo. */
export function importeDelDocumento(importe: number): string {
  const texto = `${enEuros(centimos(Math.abs(importe)))} €`;
  return importe < 0 ? `−${texto}` : texto;
}
