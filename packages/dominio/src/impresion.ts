import { centimos, enEuros } from './dinero.ts';
import { NOMBRE_CORTO_DEL_ALERGENO, type Alergeno } from './referencia.ts';

/**
 * **El formato intermedio de lo que se imprime** (T5 · 1, decisión 0119; Anexo 6.5).
 *
 * El servidor compone cada papel **una sola vez**, en piezas —un texto con su tamaño, una
 * raya, el corte, el cajón—, y no en las órdenes de una impresora. Quien imprime (la caja para
 * Windows, y mañana la app de Android o una impresora que pregunta sola) lo traduce a lo que
 * entiende la suya (`@estook/impresion`). Así una impresora nueva es un traductor nuevo, y
 * reimprimir da exactamente lo mismo.
 *
 * Aquí está también **qué lleva cada papel**: la comanda de cocina o de barra (al mandar, al
 * marchar, al anular y lo que vuelve), la cuenta antes de cobrar y el papel de prueba. Sin red
 * y sin hora propia: la hora llega ya escrita, en la del local.
 */

export const VERSION_DEL_PAPEL = 1;

/**
 * **La versión del papel que lleva el QR tributario** (T6 · 2 · 1, decisión 0136). Solo lo que
 * lleva un QR la usa: una caja para Windows de antes de la 1.3.0 no sabe imprimir un QR y
 * **dice que no sabe** (`esPapelCompuesto`) en vez de romperse a medias; las comandas y las
 * cuentas siguen en la 1 y le llegan como siempre.
 */
export const VERSION_DEL_PAPEL_CON_QR = 2;

export type VersionDelPapel = typeof VERSION_DEL_PAPEL | typeof VERSION_DEL_PAPEL_CON_QR;

export type Alineacion = 'izquierda' | 'centro' | 'derecha';

/** «doble» es el doble de alto y de ancho; «grande», el triple: la mesa en la comanda. */
export type TamanoDeLetra = 'normal' | 'doble' | 'grande';

export type PiezaDelPapel =
  | {
      readonly tipo: 'texto';
      readonly texto: string;
      readonly alinear?: Alineacion;
      readonly tamano?: TamanoDeLetra;
      readonly negrita?: boolean;
      /** Letras blancas sobre negro: lo único que salta a la vista en papel (la alergia). */
      readonly negativo?: boolean;
    }
  /** Un nombre a la izquierda y su importe a la derecha, en la misma línea. */
  | {
      readonly tipo: 'dos_columnas';
      readonly izquierda: string;
      readonly derecha: string;
      readonly negrita?: boolean;
    }
  | { readonly tipo: 'raya' }
  | { readonly tipo: 'hueco'; readonly lineas: number }
  | { readonly tipo: 'cortar' }
  /** Abrir el cajón enchufado a esa impresora (Anexo 10.6). */
  | { readonly tipo: 'cajon' }
  /**
   * **Un QR** con lo que lleva dentro (la dirección de cotejo de la AEAT), de `milimetros` de
   * lado: el tributario va **entre 30 y 40 mm** (Orden HAC/1177/2024, art. 21; Anexo 4.7). Lo
   * dibuja la impresora con su orden de QR, con corrección de errores M, centrado.
   */
  | { readonly tipo: 'qr'; readonly contenido: string; readonly milimetros: number };

export interface PapelCompuesto {
  readonly version: VersionDelPapel;
  readonly piezas: readonly PiezaDelPapel[];
}

function papel(piezas: readonly PiezaDelPapel[]): PapelCompuesto {
  // Con un QR, la versión que lo sabe imprimir; sin él, la de siempre.
  const conQr = piezas.some((p) => p.tipo === 'qr');
  return { version: conQr ? VERSION_DEL_PAPEL_CON_QR : VERSION_DEL_PAPEL, piezas };
}

const texto = (
  t: string,
  como: Omit<Extract<PiezaDelPapel, { tipo: 'texto' }>, 'tipo' | 'texto'> = {},
): PiezaDelPapel => ({ tipo: 'texto', texto: t, ...como });

const RAYA: PiezaDelPapel = { tipo: 'raya' };
const CORTAR: PiezaDelPapel = { tipo: 'cortar' };

// ═══ La comanda ═════════════════════════════════════════════════════════════════

/** Por qué sale este papel en cocina o en la barra. */
/** `cambio` (0132): el plato nuevo de un plato cambiado, con «En lugar de» lo de antes. */
export type QueSaleEnLaComanda = 'nueva' | 'marcha' | 'anulado' | 'vuelve' | 'cambio';

export interface LineaDeLaComanda {
  readonly cantidad: number;
  readonly nombre: string;
  readonly opciones: readonly string[];
  readonly nota: string | null;
  readonly pesoGramos: number | null;
  /** Lo que lleva el plato (0117): si coincide con la alergia de la mesa, sale marcado. */
  readonly alergenos: readonly string[];
}

export interface PaseDeLaComanda {
  /** Nulo en la barra y en lo que no va por pases. */
  readonly numero: number | null;
  /** Lo que espera a que la sala lo marche (el 2.º, mientras se come el 1.º). */
  readonly espera: boolean;
  readonly lineas: readonly LineaDeLaComanda[];
}

export interface LaComandaQueSeImprime {
  readonly sitio: 'cocina' | 'barra';
  readonly que: QueSaleEnLaComanda;
  /** Reimprimir: lo mismo, marcado «COPIA» (Anexo 6.7). */
  readonly copia: boolean;
  /** «Mesa 4», «Barra», «Para llevar · Laura». */
  readonly mesa: string;
  readonly personas: number | null;
  readonly camarero: string | null;
  /** «13:42», en la hora del local. */
  readonly hora: string;
  readonly alergiasDeLaMesa: readonly Alergeno[];
  readonly notaDeLaMesa: string | null;
  /** Lo de llevar programado (0121): «21:30», en la hora del local. */
  readonly paraLas?: string | null;
  readonly pases: readonly PaseDeLaComanda[];
  /** Por qué se anula o por qué vuelve; en un cambio, lo que había antes («1 Croquetas»). */
  readonly motivo: string | null;
  /** Quién lo quita y quién lo aprueba, en lo anulado. */
  readonly quien: string | null;
  /** El aparato desde el que se mandó, al pie. */
  readonly aparato: string;
}

/** «2.º», y del 4 en adelante «Postre», como en la sala. */
export function elNombreDelPase(numero: number): string {
  return numero >= 4 ? 'Postre' : `${numero}.º`;
}

/** Lo que sale arriba, en negro, cuando no es lo de siempre. */
const TITULO: Record<QueSaleEnLaComanda, string | null> = {
  nueva: null,
  marcha: null,
  anulado: 'ANULADO',
  vuelve: 'VUELVE',
  cambio: 'CAMBIO',
};

function nombreDeLaAlergia(a: Alergeno): string {
  return NOMBRE_CORTO_DEL_ALERGENO[a].toUpperCase();
}

function lasLineas(
  lineas: readonly LineaDeLaComanda[],
  alergias: readonly Alergeno[],
): PiezaDelPapel[] {
  const piezas: PiezaDelPapel[] = [];
  for (const l of lineas) {
    const peso = l.pesoGramos === null ? '' : ` · ${String(l.pesoGramos)} g`;
    piezas.push(texto(`${String(l.cantidad)}  ${l.nombre}${peso}`, { tamano: 'doble' }));
    for (const opcion of l.opciones) piezas.push(texto(`   + ${opcion}`, { negrita: true }));
    if (l.nota !== null && l.nota.trim() !== '') {
      piezas.push(texto(`   » ${l.nota.trim()}`, { negrita: true }));
    }
    const lleva = alergias.filter((a) => l.alergenos.includes(a));
    if (lleva.length > 0) {
      piezas.push(texto(` LLEVA ${lleva.map(nombreDeLaAlergia).join(', ')} `, { negativo: true }));
    }
  }
  return piezas;
}

/**
 * **La comanda en papel** (Anexo 6.5, maquetas de T5): la mesa enorme, el pase, lo que espera,
 * la nota, la alergia de la mesa en negro invertido y quién la pidió. Lo mismo que ve la
 * pantalla de cocina (T4), para la cocina que trabaja en papel.
 */
export function laComandaEnPapel(c: LaComandaQueSeImprime): PapelCompuesto {
  const piezas: PiezaDelPapel[] = [];
  const cabeza = c.sitio === 'cocina' ? 'COCINA' : 'BARRA';
  piezas.push(texto(`${cabeza} · ${c.hora}${c.copia ? ' · COPIA' : ''}`, { negrita: true }));
  if (c.copia) piezas.push(texto(' COPIA ', { negativo: true, alinear: 'centro' }));
  const titulo = TITULO[c.que];
  if (c.que === 'marcha') {
    const numeros = c.pases.map((p) => p.numero).filter((n): n is number => n !== null);
    const cual = numeros.length === 0 ? '' : ` EL ${elNombreDelPase(Math.min(...numeros))}`;
    piezas.push(texto(`¡MARCHA${cual.toUpperCase()}!`, { tamano: 'doble', negrita: true }));
  } else if (titulo !== null) {
    piezas.push(texto(titulo, { tamano: 'doble', negrita: true, negativo: true }));
  }
  piezas.push(texto(c.mesa.toUpperCase(), { tamano: 'grande', negrita: true }));
  if (c.paraLas !== undefined && c.paraLas !== null) {
    piezas.push(
      texto(` PARA LAS ${c.paraLas} `, { tamano: 'doble', negrita: true, negativo: true }),
    );
  }
  const quienes = [
    c.personas === null
      ? null
      : `${String(c.personas)} ${c.personas === 1 ? 'comensal' : 'comensales'}`,
    c.camarero,
  ].filter((t): t is string => t !== null && t !== '');
  if (quienes.length > 0) piezas.push(texto(quienes.join(' · ')));

  if (c.alergiasDeLaMesa.length > 0) {
    piezas.push(RAYA);
    piezas.push(
      texto(` ALERGIA EN LA MESA: ${c.alergiasDeLaMesa.map(nombreDeLaAlergia).join(', ')} `, {
        negativo: true,
        negrita: true,
      }),
    );
  }
  if (c.notaDeLaMesa !== null && c.notaDeLaMesa.trim() !== '') {
    piezas.push(texto(`Nota: ${c.notaDeLaMesa.trim()}`, { negrita: true }));
  }

  for (const pase of c.pases) {
    if (pase.lineas.length === 0) continue;
    piezas.push(RAYA);
    if (pase.numero !== null) {
      const como = c.que === 'nueva' ? (pase.espera ? ' · EN ESPERA' : ' · YA') : '';
      piezas.push(texto(`${elNombreDelPase(pase.numero).toUpperCase()}${como}`, { negrita: true }));
    }
    piezas.push(...lasLineas(pase.lineas, c.alergiasDeLaMesa));
  }

  if (c.motivo !== null && c.motivo.trim() !== '') {
    piezas.push(RAYA);
    // En un cambio, lo de antes, bien grande: es lo que el cocinero tiene que dejar de hacer.
    if (c.que === 'cambio') {
      piezas.push(texto(`EN LUGAR DE: ${c.motivo.trim()}`, { tamano: 'doble', negrita: true }));
    } else {
      piezas.push(texto(`Motivo: ${c.motivo.trim()}`));
    }
  }
  if (c.quien !== null && c.quien.trim() !== '') piezas.push(texto(c.quien.trim()));
  piezas.push(RAYA);
  piezas.push(texto(`Estook TPV · ${c.aparato}`, { alinear: 'centro' }));
  piezas.push(CORTAR);
  return papel(piezas);
}

// ═══ La cuenta ═════════════════════════════════════════════════════════════════

export interface LineaDeLaCuenta {
  readonly cantidad: number;
  readonly nombre: string;
  readonly importeCentimos: number;
}

export interface LaCuentaQueSeImprime {
  readonly local: string;
  readonly mesa: string;
  readonly personas: number | null;
  readonly camarero: string | null;
  /** «27/10/2026 15:10», en la hora del local. */
  readonly cuando: string;
  readonly lineas: readonly LineaDeLaCuenta[];
  readonly totalCentimos: number;
  readonly copia: boolean;
}

/** 7890 → «78,90». Sin el símbolo: la columna ya es de euros. */
export function importeEnElPapel(importe: number): string {
  return enEuros(centimos(importe));
}

/**
 * **La cuenta** (la precuenta, Anexo 3.5): lo que se le da a la mesa antes de cobrar. **No es
 * un documento fiscal**: sin número de serie, sin QR y sin la leyenda, y con «Documento no
 * válido como factura» al pie. Se reimprime y cambia libremente hasta el cobro.
 */
export function laCuentaEnPapel(c: LaCuentaQueSeImprime): PapelCompuesto {
  const piezas: PiezaDelPapel[] = [
    texto(c.local, { alinear: 'centro', tamano: 'doble', negrita: true }),
    texto('PRECUENTA', { alinear: 'centro', negrita: true }),
  ];
  if (c.copia) piezas.push(texto(' COPIA ', { negativo: true, alinear: 'centro' }));
  const quienes = [
    c.mesa,
    c.personas === null
      ? null
      : `${String(c.personas)} ${c.personas === 1 ? 'comensal' : 'comensales'}`,
    c.camarero,
  ].filter((t): t is string => t !== null && t !== '');
  piezas.push(texto(quienes.join(' · ')));
  piezas.push(texto(c.cuando));
  piezas.push(RAYA);
  for (const l of c.lineas) {
    piezas.push({
      tipo: 'dos_columnas',
      izquierda: `${String(l.cantidad)} ${l.nombre}`,
      derecha: importeEnElPapel(l.importeCentimos),
    });
  }
  piezas.push(RAYA);
  piezas.push({
    tipo: 'dos_columnas',
    izquierda: 'TOTAL',
    derecha: `${importeEnElPapel(c.totalCentimos)} EUR`,
    negrita: true,
  });
  piezas.push(RAYA);
  piezas.push(texto('Documento no válido como factura', { alinear: 'centro' }));
  piezas.push(CORTAR);
  return papel(piezas);
}

// ═══ La prueba y el cajón ════════════════════════════════════════════════════════

export interface LaPruebaQueSeImprime {
  readonly local: string;
  readonly impresora: string;
  readonly cuando: string;
  /** Lo que va a imprimir: «Cocina», «Barra», «Caja». */
  readonly imprime: readonly string[];
}

/** **El papel de prueba** (Anexo 6.5): sin él, configurar una impresora es adivinar. */
export function laPruebaEnPapel(p: LaPruebaQueSeImprime): PapelCompuesto {
  return papel([
    texto('ESTOOK TPV', { alinear: 'centro', tamano: 'doble', negrita: true }),
    texto('Papel de prueba', { alinear: 'centro' }),
    RAYA,
    texto(p.impresora, { tamano: 'doble', negrita: true }),
    texto(p.local),
    texto(p.cuando),
    ...(p.imprime.length === 0 ? [] : [texto(`Imprime: ${p.imprime.join(', ')}`)]),
    RAYA,
    texto('Grande', { tamano: 'grande', negrita: true }),
    texto('Doble', { tamano: 'doble' }),
    texto('Normal: áéíóú ñ Ñ ¿? ¡! ç · 1,50'),
    texto(' Negativo ', { negativo: true }),
    { tipo: 'dos_columnas', izquierda: '1 Caña', derecha: '2,20' },
    RAYA,
    texto('Si lees esto, sale bien.', { alinear: 'centro', negrita: true }),
    CORTAR,
  ]);
}

/** Abrir el cajón, sin papel: solo la orden (Anexo 10.6). */
export function abrirElCajonEnPapel(): PapelCompuesto {
  return papel([{ tipo: 'cajon' }]);
}

/** Si lo que llega de la base es un papel que se sabe imprimir. */
export function esPapelCompuesto(valor: unknown): valor is PapelCompuesto {
  if (typeof valor !== 'object' || valor === null) return false;
  const v = valor as { version?: unknown; piezas?: unknown };
  return (
    (v.version === VERSION_DEL_PAPEL || v.version === VERSION_DEL_PAPEL_CON_QR) &&
    Array.isArray(v.piezas)
  );
}

// ═══ El ticket y el justificante (T6 · 2 · 1) ═════════════════════════════════════

/** El lado del QR tributario impreso: en medio de los 30 a 40 mm de la Orden (Anexo 4.7). */
export const MILIMETROS_DEL_QR = 35;

/** Lo que va arriba y abajo de un papel de pruebas (Anexo 4.12). */
export const PRUEBA_SIN_VALIDEZ = 'PRUEBA · SIN VALIDEZ';

export interface LaEmpresaEnElPapel {
  /** El nombre comercial del local, grande. */
  readonly local: string;
  /** El nombre o la razón social, como la tiene Hacienda. */
  readonly nombre: string;
  readonly nif: string;
  /** «Calle Mayor 12, 48001 Bilbao». */
  readonly domicilio: string;
}

export interface LineaDelTicket {
  readonly cantidad: number;
  readonly nombre: string;
  readonly importeCentimos: number;
}

export interface ImpuestoDelTicket {
  /** «IVA 10 %» o «IGIC 7 %». */
  readonly nombre: string;
  readonly baseCentimos: number;
  readonly cuotaCentimos: number;
}

export interface ElTicketQueSeImprime {
  readonly empresa: LaEmpresaEnElPapel;
  /** «T-IKA-2026-000037». */
  readonly numero: string;
  /** «06/11/2026 14:31», en la hora del local. */
  readonly cuando: string;
  /** «Mesa 6 · Sara», o nada. */
  readonly donde: string | null;
  readonly lineas: readonly LineaDelTicket[];
  readonly impuestos: readonly ImpuestoDelTicket[];
  readonly totalCentimos: number;
  /** Lo que lleva el QR tributario: la dirección de cotejo que devuelve Verifacti. */
  readonly qr: string | null;
  readonly pruebas: boolean;
  readonly copia: boolean;
  /** Si es una devolución (R5): qué ticket rectifica y por qué (maqueta de T6, 6). */
  readonly rectifica?: { readonly numero: string; readonly motivo: string } | undefined;
}

const MARCA_DE_PRUEBAS = texto(` ${PRUEBA_SIN_VALIDEZ} `, { alinear: 'centro', negativo: true });

function empresaEnPapel(e: LaEmpresaEnElPapel): PiezaDelPapel[] {
  return [
    texto(e.local, { alinear: 'centro', tamano: 'doble', negrita: true }),
    texto(e.nombre, { alinear: 'centro' }),
    texto(`NIF ${e.nif}`, { alinear: 'centro' }),
    texto(e.domicilio, { alinear: 'centro' }),
  ];
}

function lineasEnPapel(lineas: readonly LineaDelTicket[]): PiezaDelPapel[] {
  return lineas.map((l) => ({
    tipo: 'dos_columnas',
    izquierda: `${String(l.cantidad)} ${l.nombre}`,
    derecha: importeEnElPapel(l.importeCentimos),
  }));
}

/**
 * **El ticket** (factura simplificada, F2; Anexo 4.6 y 4.7): **el QR tributario primero**, con
 * «QR tributario:» encima y «VERI*FACTU» debajo (Orden HAC/1177/2024, art. 21); después quién lo
 * emite, el número, la fecha, lo vendido, el total y el impuesto incluido. Fuera de VERI*FACTU,
 * por el SII, sin QR ni leyenda (0127). En pruebas, «PRUEBA · SIN VALIDEZ» arriba y abajo.
 * Reimprimir pinta exactamente esto, con «COPIA».
 */
export function elTicketEnPapel(t: ElTicketQueSeImprime): PapelCompuesto {
  const piezas: PiezaDelPapel[] = [];
  if (t.pruebas) piezas.push(MARCA_DE_PRUEBAS);
  if (t.qr !== null) {
    piezas.push(texto('QR tributario:', { alinear: 'centro' }));
    piezas.push({ tipo: 'qr', contenido: t.qr, milimetros: MILIMETROS_DEL_QR });
    piezas.push(texto('VERI*FACTU', { alinear: 'centro', negrita: true }));
    piezas.push(RAYA);
  }
  piezas.push(...empresaEnPapel(t.empresa));
  piezas.push(RAYA);
  piezas.push(
    texto(
      t.rectifica === undefined ? 'Factura simplificada' : 'Factura rectificativa (devolución)',
      {
        alinear: 'centro',
        negrita: true,
      },
    ),
  );
  if (t.copia) piezas.push(texto(' COPIA ', { negativo: true, alinear: 'centro' }));
  piezas.push(texto(t.numero, { alinear: 'centro', negrita: true }));
  piezas.push(texto(t.cuando, { alinear: 'centro' }));
  if (t.donde !== null && t.donde !== '') piezas.push(texto(t.donde, { alinear: 'centro' }));
  if (t.rectifica !== undefined) {
    piezas.push(texto(`Rectifica: ${t.rectifica.numero}`, { alinear: 'centro' }));
    piezas.push(texto(`Motivo: ${t.rectifica.motivo}`, { alinear: 'centro' }));
  }
  piezas.push(RAYA);
  piezas.push(...lineasEnPapel(t.lineas));
  piezas.push(RAYA);
  piezas.push({
    tipo: 'dos_columnas',
    izquierda: 'TOTAL',
    derecha: `${importeEnElPapel(t.totalCentimos)} EUR`,
    negrita: true,
  });
  for (const i of t.impuestos) {
    piezas.push({
      tipo: 'dos_columnas',
      izquierda: `${i.nombre} incluido`,
      derecha: importeEnElPapel(i.cuotaCentimos),
    });
    piezas.push({
      tipo: 'dos_columnas',
      izquierda: 'Base',
      derecha: importeEnElPapel(i.baseCentimos),
    });
  }
  piezas.push(RAYA);
  // Una devolución no se canjea por una factura: no se invita a pedirla.
  if (t.rectifica === undefined) {
    piezas.push(texto('¿Quieres factura? Pídela en la barra.', { alinear: 'centro' }));
  }
  if (t.pruebas) piezas.push(MARCA_DE_PRUEBAS);
  piezas.push(CORTAR);
  return papel(piezas);
}

export interface LaFacturaQueSeImprime {
  readonly empresa: LaEmpresaEnElPapel;
  /** «Factura F-IKA-2026-000005». */
  readonly titulo: string;
  readonly cuando: string;
  /** La fecha de la comida, si es otra que la de expedición (art. 6.1.i). */
  readonly fechaDeLaOperacion: string | null;
  /** «T-IKA-2026-000037». */
  readonly sustituye: readonly string[];
  /** Si es una rectificativa: «F-IKA-2026-000007, del 14/11/2026». */
  readonly rectifica?: string | undefined;
  readonly motivo?: string | undefined;
  /** Las señales que descuenta. */
  readonly descuenta?: readonly string[] | undefined;
  readonly vence: string | null;
  readonly para: {
    readonly nombre: string;
    readonly identificador: string;
    readonly domicilio: string;
  };
  readonly lineas: readonly {
    readonly cantidad: number;
    readonly nombre: string;
    readonly precioSinImpuesto: string;
    readonly tipo: string;
    readonly baseCentimos: number;
  }[];
  readonly impuestos: readonly ImpuestoDelTicket[];
  readonly totalCentimos: number;
  readonly qr: string | null;
  readonly pruebas: boolean;
}

/**
 * **La factura en el papel de ticket** (0137): lo mismo que el A4, para dársela al cliente en el
 * momento desde el TPV. La ley no pide un tamaño de papel, sino lo que lleva (RD 1619/2012, art.
 * 6.1): por eso cada línea dice su precio sin impuesto y su tipo, y el impuesto va separado.
 */
export function laFacturaEnPapel(f: LaFacturaQueSeImprime): PapelCompuesto {
  const piezas: PiezaDelPapel[] = [];
  if (f.pruebas) piezas.push(MARCA_DE_PRUEBAS);
  if (f.qr !== null) {
    piezas.push(texto('QR tributario:', { alinear: 'centro' }));
    piezas.push({ tipo: 'qr', contenido: f.qr, milimetros: MILIMETROS_DEL_QR });
    piezas.push(texto('VERI*FACTU', { alinear: 'centro', negrita: true }));
    piezas.push(RAYA);
  }
  piezas.push(...empresaEnPapel(f.empresa));
  piezas.push(RAYA);
  piezas.push(texto(f.titulo, { negrita: true }));
  piezas.push(texto(f.cuando));
  if (f.fechaDeLaOperacion !== null) piezas.push(texto(`Operación: ${f.fechaDeLaOperacion}`));
  for (const s of f.sustituye) piezas.push(texto(`Sustituye a ${s}`));
  if (f.rectifica !== undefined) piezas.push(texto(`Rectifica: ${f.rectifica}`));
  if (f.motivo !== undefined) piezas.push(texto(`Motivo: ${f.motivo}`));
  for (const s of f.descuenta ?? []) piezas.push(texto(`Descuenta la señal ${s}`));
  if (f.vence !== null) piezas.push(texto(`Vence: ${f.vence}`));
  piezas.push(RAYA);
  piezas.push(texto('Para:', { negrita: true }));
  piezas.push(texto(f.para.nombre));
  piezas.push(texto(f.para.identificador));
  piezas.push(texto(f.para.domicilio));
  piezas.push(RAYA);
  for (const l of f.lineas) {
    piezas.push(texto(`${String(l.cantidad)} ${l.nombre}`));
    piezas.push({
      tipo: 'dos_columnas',
      izquierda: `  ${l.precioSinImpuesto} sin imp. · ${l.tipo}`,
      derecha: importeEnElPapel(l.baseCentimos),
    });
  }
  piezas.push(RAYA);
  for (const i of f.impuestos) {
    piezas.push({
      tipo: 'dos_columnas',
      izquierda: `Base ${i.nombre}`,
      derecha: importeEnElPapel(i.baseCentimos),
    });
    piezas.push({
      tipo: 'dos_columnas',
      izquierda: i.nombre,
      derecha: importeEnElPapel(i.cuotaCentimos),
    });
  }
  piezas.push({
    tipo: 'dos_columnas',
    izquierda: 'TOTAL',
    derecha: `${importeEnElPapel(f.totalCentimos)} EUR`,
    negrita: true,
  });
  if (f.pruebas) piezas.push(MARCA_DE_PRUEBAS);
  piezas.push(CORTAR);
  return papel(piezas);
}

export interface ElJustificanteQueSeImprime {
  readonly empresa: LaEmpresaEnElPapel;
  readonly cuando: string;
  readonly donde: string | null;
  readonly lineas: readonly LineaDelTicket[];
  readonly totalCentimos: number;
  /** El código con el que se recoge el ticket cuando se emita. */
  readonly codigo: string;
  readonly pruebas: boolean;
}

/**
 * **El justificante provisional de venta** (Anexo 4.11): lo que se da cuando no se llega a
 * Verifacti. Lleva lo mismo que el ticket, **dice claramente que no es una factura**, y no lleva
 * número de serie fiscal, ni QR tributario, ni la leyenda. Con su código se recoge el ticket
 * cuando se emita. **[VERIFICAR con el asesor el texto]**: sale como lo pide el Anexo.
 */
export function elJustificanteEnPapel(j: ElJustificanteQueSeImprime): PapelCompuesto {
  const piezas: PiezaDelPapel[] = [];
  if (j.pruebas) piezas.push(MARCA_DE_PRUEBAS);
  piezas.push(...empresaEnPapel(j.empresa));
  piezas.push(RAYA);
  piezas.push(texto('JUSTIFICANTE PROVISIONAL DE VENTA', { alinear: 'centro', negrita: true }));
  piezas.push(texto(' NO ES UNA FACTURA ', { alinear: 'centro', negativo: true }));
  piezas.push(texto(j.cuando, { alinear: 'centro' }));
  if (j.donde !== null && j.donde !== '') piezas.push(texto(j.donde, { alinear: 'centro' }));
  piezas.push(RAYA);
  piezas.push(...lineasEnPapel(j.lineas));
  piezas.push(RAYA);
  piezas.push({
    tipo: 'dos_columnas',
    izquierda: 'TOTAL',
    derecha: `${importeEnElPapel(j.totalCentimos)} EUR`,
    negrita: true,
  });
  piezas.push(RAYA);
  piezas.push(
    texto('Hacienda no responde ahora. Tu ticket se emite en cuanto vuelva, con este código:', {
      alinear: 'centro',
    }),
  );
  piezas.push(texto(j.codigo, { alinear: 'centro', tamano: 'doble', negrita: true }));
  // Sin esto el código no servía de nada: nadie sabía dónde usarlo (maqueta del 7-nov, 4).
  piezas.push(texto('Recógelo en estook.com/factura', { alinear: 'centro', negrita: true }));
  if (j.pruebas) piezas.push(MARCA_DE_PRUEBAS);
  piezas.push(CORTAR);
  return papel(piezas);
}
