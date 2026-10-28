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
  | { readonly tipo: 'cajon' };

export interface PapelCompuesto {
  readonly version: typeof VERSION_DEL_PAPEL;
  readonly piezas: readonly PiezaDelPapel[];
}

function papel(piezas: readonly PiezaDelPapel[]): PapelCompuesto {
  return { version: VERSION_DEL_PAPEL, piezas };
}

const texto = (
  t: string,
  como: Omit<Extract<PiezaDelPapel, { tipo: 'texto' }>, 'tipo' | 'texto'> = {},
): PiezaDelPapel => ({ tipo: 'texto', texto: t, ...como });

const RAYA: PiezaDelPapel = { tipo: 'raya' };
const CORTAR: PiezaDelPapel = { tipo: 'cortar' };

// ═══ La comanda ═════════════════════════════════════════════════════════════════

/** Por qué sale este papel en cocina o en la barra. */
export type QueSaleEnLaComanda = 'nueva' | 'marcha' | 'anulado' | 'vuelve';

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
  /** Por qué se anula o por qué vuelve. */
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
    piezas.push(texto(`Motivo: ${c.motivo.trim()}`));
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
  return v.version === VERSION_DEL_PAPEL && Array.isArray(v.piezas);
}
