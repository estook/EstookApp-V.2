import type { Alineacion, PapelCompuesto, PiezaDelPapel, TamanoDeLetra } from '@estook/dominio';

/**
 * **El traductor del formato intermedio a ESC/POS** (T5 · 1, decisión 0119; Anexo 6.5).
 *
 * ESC/POS es el idioma de casi todas las impresoras de tickets de hostelería (Epson, Star,
 * Bixolon, las genéricas y las de impacto de cocina): unas pocas órdenes de bytes para el
 * tamaño, la negrita, el negro invertido, el corte y el cajón. **Ninguna marca aquí**: lo que
 * cambia de una a otra es el ancho del papel, y eso se le dice.
 *
 * Las letras van en **la página de códigos 858** (la 850 con el €), que tienen todas y que
 * lleva las tildes, la ñ, la ç y el «·». Lo que no está en ella se cambia por su parecido
 * (las comillas curvas por rectas) o por «?», nunca se manda roto.
 */

export interface ComoEsLaImpresora {
  /** 48 en las de 80 mm, 32 en las de 58 mm, con la letra normal. */
  readonly columnas: number;
}

export const IMPRESORA_DE_80_MM: ComoEsLaImpresora = { columnas: 48 };
export const IMPRESORA_DE_58_MM: ComoEsLaImpresora = { columnas: 32 };

/**
 * **Puntos por milímetro** de una impresora de tickets: 203 ppp, que son 8 por milímetro en las
 * de 80 y en las de 58 mm. Con esto se calcula el tamaño de cada módulo del QR.
 */
export const PUNTOS_POR_MM = 8;

/**
 * Cuántos caracteres caben en un QR de cada versión, en modo de bytes y con corrección de
 * errores M (ISO/IEC 18004, tabla 7). La versión 1 es 21 × 21 módulos, y cada una suma 4.
 */
const CABEN_CON_M = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412];

/** La versión más pequeña en la que cabe, y sus módulos de lado. */
export function laVersionDelQr(caracteres: number): { version: number; modulos: number } {
  const i = CABEN_CON_M.findIndex((caben) => caben >= caracteres);
  const version = i < 0 ? CABEN_CON_M.length : i + 1;
  return { version, modulos: 17 + 4 * version };
}

/**
 * **El tamaño de cada módulo**, en puntos, para que el QR mida lo más cerca posible de los
 * milímetros pedidos **sin salirse de 30 a 40 mm** (Orden HAC/1177/2024, art. 21). La impresora
 * admite de 1 a 16.
 */
export function elModuloDelQr(caracteres: number, milimetros: number): number {
  const { modulos } = laVersionDelQr(caracteres);
  const mide = (modulo: number) => (modulo * modulos) / PUNTOS_POR_MM;
  let modulo = Math.max(1, Math.min(16, Math.round((milimetros * PUNTOS_POR_MM) / modulos)));
  while (modulo < 16 && mide(modulo) < 30) modulo += 1;
  while (modulo > 1 && mide(modulo) > 40) modulo -= 1;
  return modulo;
}

/**
 * **El QR, con la orden propia de la impresora** (`GS ( k`, modelo 2): el tamaño del módulo, la
 * corrección de errores M, los datos y que lo imprima, centrado. Lo que lleva dentro es la
 * dirección de cotejo de la AEAT, que es ASCII: va tal cual, sin la página 858.
 */
export function elQrEnEscPos(contenido: string, milimetros: number): number[] {
  const datos = Array.from(contenido, (letra) => {
    const codigo = letra.charCodeAt(0);
    return codigo < 0x20 || codigo > 0x7e ? 0x3f : codigo;
  });
  const largo = datos.length + 3;
  return [
    ESC,
    0x61,
    1,
    // Modelo 2.
    GS,
    0x28,
    0x6b,
    4,
    0,
    0x31,
    0x41,
    0x32,
    0,
    // El módulo, en puntos.
    GS,
    0x28,
    0x6b,
    3,
    0,
    0x31,
    0x43,
    elModuloDelQr(datos.length, milimetros),
    // Corrección de errores M (Anexo 4.7).
    GS,
    0x28,
    0x6b,
    3,
    0,
    0x31,
    0x45,
    0x31,
    // Los datos.
    GS,
    0x28,
    0x6b,
    largo % 256,
    Math.floor(largo / 256),
    0x31,
    0x50,
    0x30,
    ...datos,
    // Imprimirlo.
    GS,
    0x28,
    0x6b,
    3,
    0,
    0x31,
    0x51,
    0x30,
    LF,
    ESC,
    0x61,
    0,
  ];
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** ESC @: empezar de cero. ESC t 19: la página 858. */
const EMPEZAR = [ESC, 0x40, ESC, 0x74, 19];
/** Avanzar lo que hay entre la cabeza y la cuchilla, y cortar dejando una lengüeta. */
const CORTAR = [ESC, 0x64, 4, GS, 0x56, 0x42, 0x00];
/** ESC p 0: un pulso al pin 2 del conector del cajón, el de casi todos. */
const CAJON = [ESC, 0x70, 0x00, 0x19, 0xfa];

const ALINEAR: Record<Alineacion, number> = { izquierda: 0, centro: 1, derecha: 2 };
/** GS ! n: el ancho y el alto, de 1 a 8 veces cada uno. */
const TAMANO: Record<TamanoDeLetra, number> = { normal: 0x00, doble: 0x11, grande: 0x22 };
const VECES: Record<TamanoDeLetra, number> = { normal: 1, doble: 2, grande: 3 };

// ── Las letras ──────────────────────────────────────────────────────────────

/** Lo que no es ASCII, en la página 858. */
const PAGINA_858: Readonly<Record<string, number>> = {
  Ç: 0x80,
  ü: 0x81,
  é: 0x82,
  â: 0x83,
  ä: 0x84,
  à: 0x85,
  å: 0x86,
  ç: 0x87,
  ê: 0x88,
  ë: 0x89,
  è: 0x8a,
  ï: 0x8b,
  î: 0x8c,
  ì: 0x8d,
  Ä: 0x8e,
  Å: 0x8f,
  É: 0x90,
  æ: 0x91,
  Æ: 0x92,
  ô: 0x93,
  ö: 0x94,
  ò: 0x95,
  û: 0x96,
  ù: 0x97,
  ÿ: 0x98,
  Ö: 0x99,
  Ü: 0x9a,
  ø: 0x9b,
  '£': 0x9c,
  Ø: 0x9d,
  '×': 0x9e,
  á: 0xa0,
  í: 0xa1,
  ó: 0xa2,
  ú: 0xa3,
  ñ: 0xa4,
  Ñ: 0xa5,
  ª: 0xa6,
  º: 0xa7,
  '¿': 0xa8,
  '®': 0xa9,
  '½': 0xab,
  '¼': 0xac,
  '¡': 0xad,
  '«': 0xae,
  '»': 0xaf,
  Á: 0xb5,
  Â: 0xb6,
  À: 0xb7,
  '©': 0xb8,
  ã: 0xc6,
  Ã: 0xc7,
  Ê: 0xd2,
  Ë: 0xd3,
  È: 0xd4,
  '€': 0xd5,
  Í: 0xd6,
  Î: 0xd7,
  Ï: 0xd8,
  Ì: 0xde,
  Ó: 0xe0,
  ß: 0xe1,
  Ô: 0xe2,
  Ò: 0xe3,
  õ: 0xe4,
  Õ: 0xe5,
  Ú: 0xe9,
  Û: 0xea,
  Ù: 0xeb,
  '°': 0xf8,
  '·': 0xfa,
};

/** Lo que no está en la página, por su parecido. */
const PARECIDO: Readonly<Record<string, string>> = {
  '‘': "'",
  '’': "'",
  '‚': "'",
  '“': '"',
  '”': '"',
  '„': '"',
  '–': '-',
  '—': '-',
  '…': '...',
  ' ': ' ',
  ' ': ' ',
  '•': '·',
  '✓': 'v',
};

/** Un texto, en los bytes de la página 858. */
export function enLaPagina858(texto: string): number[] {
  const bytes: number[] = [];
  for (const letra of texto.normalize('NFC')) {
    const cambiada = PARECIDO[letra] ?? letra;
    for (const l of cambiada) {
      const codigo = l.codePointAt(0) ?? 0x3f;
      if (codigo >= 0x20 && codigo < 0x7f) bytes.push(codigo);
      else bytes.push(PAGINA_858[l] ?? 0x3f);
    }
  }
  return bytes;
}

// ── Partir en líneas ─────────────────────────────────────────────────────────

/** Parte un texto en líneas de `ancho` letras, por los espacios; una palabra larga, a trozos. */
export function enLineas(texto: string, ancho: number): string[] {
  const limpio = texto.replace(/\s+/g, ' ').trimEnd();
  if (ancho < 1) return [limpio];
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of limpio.split(' ')) {
    let resto = palabra;
    while (resto.length > ancho) {
      if (actual !== '') {
        lineas.push(actual);
        actual = '';
      }
      lineas.push(resto.slice(0, ancho));
      resto = resto.slice(ancho);
    }
    if (actual === '') actual = resto;
    else if (actual.length + 1 + resto.length <= ancho) actual = `${actual} ${resto}`;
    else {
      lineas.push(actual);
      actual = resto;
    }
  }
  if (actual !== '' || lineas.length === 0) lineas.push(actual);
  return lineas;
}

/**
 * Un nombre a la izquierda y su importe a la derecha. Si no caben, el nombre baja y el importe
 * se queda en su última línea, a la derecha.
 */
export function enDosColumnas(izquierda: string, derecha: string, ancho: number): string[] {
  const hueco = Math.max(1, ancho - derecha.length - 1);
  const partes = enLineas(izquierda, hueco);
  const ultima = partes.pop() ?? '';
  const relleno = Math.max(1, ancho - ultima.length - derecha.length);
  return [...partes, `${ultima}${' '.repeat(relleno)}${derecha}`];
}

// ── Traducir ─────────────────────────────────────────────────────────────────

function unaPieza(pieza: PiezaDelPapel, impresora: ComoEsLaImpresora): number[] {
  const columnas = impresora.columnas;
  switch (pieza.tipo) {
    case 'texto': {
      const tamano = pieza.tamano ?? 'normal';
      const ancho = Math.max(1, Math.floor(columnas / VECES[tamano]));
      const bytes: number[] = [ESC, 0x61, ALINEAR[pieza.alinear ?? 'izquierda']];
      bytes.push(GS, 0x21, TAMANO[tamano]);
      bytes.push(ESC, 0x45, pieza.negrita === true ? 1 : 0);
      bytes.push(GS, 0x42, pieza.negativo === true ? 1 : 0);
      for (const linea of enLineas(pieza.texto, ancho)) bytes.push(...enLaPagina858(linea), LF);
      // Lo de después empieza como siempre: un negro invertido no se queda puesto.
      bytes.push(GS, 0x42, 0, ESC, 0x45, 0, GS, 0x21, 0, ESC, 0x61, 0);
      return bytes;
    }
    case 'dos_columnas': {
      const bytes: number[] = [
        ESC,
        0x61,
        0,
        GS,
        0x21,
        0,
        ESC,
        0x45,
        pieza.negrita === true ? 1 : 0,
      ];
      for (const linea of enDosColumnas(pieza.izquierda, pieza.derecha, columnas)) {
        bytes.push(...enLaPagina858(linea), LF);
      }
      bytes.push(ESC, 0x45, 0);
      return bytes;
    }
    case 'raya':
      return [ESC, 0x61, 0, GS, 0x21, 0, ...enLaPagina858('-'.repeat(columnas)), LF];
    case 'hueco':
      return Array.from({ length: Math.max(0, Math.min(10, pieza.lineas)) }, () => LF);
    case 'cortar':
      return CORTAR;
    case 'cajon':
      return CAJON;
    case 'qr':
      return elQrEnEscPos(pieza.contenido, pieza.milimetros);
  }
}

/**
 * **El papel entero, en los bytes que se mandan a la impresora.** Empieza poniéndola de cero y
 * en la página 858; lo demás, pieza a pieza.
 */
export function aEscPos(
  papel: PapelCompuesto,
  impresora: ComoEsLaImpresora = IMPRESORA_DE_80_MM,
): Uint8Array {
  const bytes: number[] = [...EMPEZAR];
  for (const pieza of papel.piezas) bytes.push(...unaPieza(pieza, impresora));
  return Uint8Array.from(bytes);
}

// ── Cómo está ─────────────────────────────────────────────────────────────────

/** DLE EOT 4: «¿cómo está el papel?». La impresora contesta un byte, al momento. */
export const PREGUNTAR_POR_EL_PAPEL = Uint8Array.from([0x10, 0x04, 0x04]);

export type ComoEstaElPapel = 'bien' | 'poco_papel' | 'sin_papel';

/**
 * Lo que contesta a `PREGUNTAR_POR_EL_PAPEL`: los bits 2 y 3, que se acaba; los 5 y 6, que no
 * queda. Las que no lo saben contestan «bien».
 */
export function comoEstaElPapel(respuesta: number): ComoEstaElPapel {
  if ((respuesta & 0x60) !== 0) return 'sin_papel';
  if ((respuesta & 0x0c) !== 0) return 'poco_papel';
  return 'bien';
}
