/**
 * La facturación de un local, sus reglas puras (T6 · 1 · El alta, decisión 0126).
 *
 * Van aquí, y no en el servidor ni en la pantalla, porque **las tienen que decir igual los
 * dos** (regla 6): si el NIF vale, de qué provincia es un código postal, cuándo se para el
 * alta y por qué, y en qué paso va. La base de datos vuelve a mirar lo que decide (la forma
 * del NIF, las series, quién firma): esto es para decirlo bien, no para vigilar la puerta.
 */

// ── El NIF ─────────────────────────────────────────────────────────────────────

export type PersonaDelNif = 'fisica' | 'juridica';

export type ComoEsElNif =
  | {
      readonly valido: true;
      readonly nif: string;
      readonly tipo: 'dni' | 'nie' | 'cif' | 'especial';
      readonly persona: PersonaDelNif;
    }
  | { readonly valido: false; readonly nif: string; readonly porque: string };

const LETRAS_DEL_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

/** «b-12.345.678 » → «B12345678»: como lo escribe la gente, como lo quiere Hacienda. */
export function normalizarNif(texto: string): string {
  return texto.toUpperCase().replace(/[\s.\-_/]/g, '');
}

function letraDelNumero(numero: number): string {
  return LETRAS_DEL_DNI[numero % 23] ?? '';
}

/**
 * El dígito de control de un CIF: las cifras pares se suman, las impares se doblan y se
 * suman sus cifras. Devuelve el dígito; la letra equivalente es `JABCDEFGHI[dígito]`.
 */
function controlDelCif(siete: string): number {
  let suma = 0;
  for (let i = 0; i < siete.length; i += 1) {
    const cifra = Number(siete[i]);
    if (i % 2 === 1) {
      suma += cifra;
    } else {
      const doble = cifra * 2;
      suma += Math.floor(doble / 10) + (doble % 10);
    }
  }
  return (10 - (suma % 10)) % 10;
}

/** Las letras del CIF que llevan letra de control, y las que llevan número. */
const CIF_CON_LETRA = new Set(['N', 'P', 'Q', 'R', 'S', 'W']);
const CIF_CON_NUMERO = new Set(['A', 'B', 'E', 'H']);
const CIF_PRIMERA = /^[ABCDEFGHJNPQRSUVW]$/;

/**
 * Si un NIF tiene la forma y la letra que tocan, y si es de una persona o de una sociedad.
 *
 * **No dice si existe**: eso lo dice Hacienda, al escribirlo (`/nifs/validar`). Esto evita
 * preguntarle por algo mal tecleado, y decir en el momento qué se ha tecleado mal.
 */
export function comoEsElNif(texto: string): ComoEsElNif {
  const nif = normalizarNif(texto);
  if (nif.length !== 9) {
    return {
      valido: false,
      nif,
      porque: 'Un NIF tiene 9 caracteres: 8 números y una letra, o como el de una sociedad.',
    };
  }
  // DNI: ocho números y su letra.
  if (/^[0-9]{8}[A-Z]$/.test(nif)) {
    return nif[8] === letraDelNumero(Number(nif.slice(0, 8)))
      ? { valido: true, nif, tipo: 'dni', persona: 'fisica' }
      : { valido: false, nif, porque: 'La letra no cuadra con los números. Mira el DNI otra vez.' };
  }
  // NIE: X, Y o Z, siete números y su letra (la X vale 0, la Y 1 y la Z 2).
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(nif)) {
    const numero = Number(String('XYZ'.indexOf(nif[0] ?? '')) + nif.slice(1, 8));
    return nif[8] === letraDelNumero(numero)
      ? { valido: true, nif, tipo: 'nie', persona: 'fisica' }
      : { valido: false, nif, porque: 'La letra no cuadra con los números. Mira el NIE otra vez.' };
  }
  // K, L y M: personas sin DNI (menores, extranjeros sin NIE). Su letra, como el DNI.
  if (/^[KLM][0-9]{7}[A-Z]$/.test(nif)) {
    return nif[8] === letraDelNumero(Number(nif.slice(1, 8)))
      ? { valido: true, nif, tipo: 'especial', persona: 'fisica' }
      : { valido: false, nif, porque: 'La letra no cuadra con los números.' };
  }
  // CIF: la letra de la forma jurídica, siete números y su control.
  const primera = nif[0] ?? '';
  if (CIF_PRIMERA.test(primera) && /^[0-9]{7}$/.test(nif.slice(1, 8))) {
    const digito = controlDelCif(nif.slice(1, 8));
    const ultimo = nif[8] ?? '';
    const conNumero = ultimo === String(digito);
    const conLetra = ultimo === 'JABCDEFGHI'[digito];
    const vale = CIF_CON_LETRA.has(primera)
      ? conLetra
      : CIF_CON_NUMERO.has(primera)
        ? conNumero
        : conNumero || conLetra;
    return vale
      ? { valido: true, nif, tipo: 'cif', persona: 'juridica' }
      : {
          valido: false,
          nif,
          porque:
            'El último carácter no cuadra con el resto. Míralo en las escrituras o en una factura.',
        };
  }
  return { valido: false, nif, porque: 'No tiene la forma de un NIF español. Míralo otra vez.' };
}

/**
 * Lo que contesta Hacienda al comprobar un NIF (`resultado` de `/nifs/validar`, Verifacti,
 * mirado el 4-nov-2026), dicho para la pantalla. «IDENTIFICADO-SIMILAR» es una persona con
 * el nombre casi igual: Hacienda da el suyo, y es el que vale.
 */
export type NifEnHacienda =
  'identificado' | 'parecido' | 'de_baja' | 'revocado' | 'no_identificado';

export function leerElResultado(resultado: string): NifEnHacienda {
  const r = resultado.trim().toUpperCase().replace(/\s+/g, ' ');
  if (r === 'IDENTIFICADO') return 'identificado';
  if (r === 'NO IDENTIFICADO-SIMILAR') return 'parecido';
  if (r === 'IDENTIFICADO-BAJA') return 'de_baja';
  if (r === 'IDENTIFICADO-REVOCADO') return 'revocado';
  return 'no_identificado';
}

// ── Dónde está: la provincia sale del código postal ──────────────────────────────

/** Las 52 provincias por los dos primeros números de su código postal (INE). */
const PROVINCIAS: Readonly<Record<string, string>> = {
  '01': 'Álava',
  '02': 'Albacete',
  '03': 'Alicante',
  '04': 'Almería',
  '05': 'Ávila',
  '06': 'Badajoz',
  '07': 'Illes Balears',
  '08': 'Barcelona',
  '09': 'Burgos',
  '10': 'Cáceres',
  '11': 'Cádiz',
  '12': 'Castellón',
  '13': 'Ciudad Real',
  '14': 'Córdoba',
  '15': 'A Coruña',
  '16': 'Cuenca',
  '17': 'Girona',
  '18': 'Granada',
  '19': 'Guadalajara',
  '20': 'Gipuzkoa',
  '21': 'Huelva',
  '22': 'Huesca',
  '23': 'Jaén',
  '24': 'León',
  '25': 'Lleida',
  '26': 'La Rioja',
  '27': 'Lugo',
  '28': 'Madrid',
  '29': 'Málaga',
  '30': 'Murcia',
  '31': 'Navarra',
  '32': 'Ourense',
  '33': 'Asturias',
  '34': 'Palencia',
  '35': 'Las Palmas',
  '36': 'Pontevedra',
  '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife',
  '39': 'Cantabria',
  '40': 'Segovia',
  '41': 'Sevilla',
  '42': 'Soria',
  '43': 'Tarragona',
  '44': 'Teruel',
  '45': 'Toledo',
  '46': 'Valencia',
  '47': 'Valladolid',
  '48': 'Bizkaia',
  '49': 'Zamora',
  '50': 'Zaragoza',
  '51': 'Ceuta',
  '52': 'Melilla',
};

/** «48170» → «Bizkaia». Nulo si el código no es de España. */
export function provinciaDelCodigoPostal(codigo: string): string | null {
  const limpio = codigo.trim();
  if (!/^[0-9]{5}$/.test(limpio)) return null;
  return PROVINCIAS[limpio.slice(0, 2)] ?? null;
}

/** Las cuatro haciendas forales, por la provincia del domicilio fiscal (Anexo 1.4). */
export type HaciendaForal = 'alava' | 'gipuzkoa' | 'bizkaia' | 'navarra';

export function foralDelCodigoPostal(codigo: string): HaciendaForal | null {
  const dos = codigo.trim().slice(0, 2);
  if (dos === '01') return 'alava';
  if (dos === '20') return 'gipuzkoa';
  if (dos === '48') return 'bizkaia';
  if (dos === '31') return 'navarra';
  return null;
}

// ── Cuándo se para el alta, con su motivo verdadero (Anexo 1.4, 0043) ─────────────

export type MotivoDeParada = 'pais_vasco' | 'navarra' | 'sii' | 'ceuta_o_melilla';

export interface Parada {
  readonly motivo: MotivoDeParada;
  readonly titulo: string;
  readonly porque: string;
  /** Si es para siempre (no depende de Estook) o un «todavía no». */
  readonly todaviaNo: boolean;
}

/**
 * **Dos cosas distintas que no se mezclan** (Anexo 1.4): a quién deja fuera la ley y a quién
 * deja fuera Estook de momento. Decirle a un canario que «la ley no se lo permite» sería
 * mentirle; por eso Canarias no está aquí: sigue, con IGIC.
 */
export const PARADAS: Readonly<Record<MotivoDeParada, Parada>> = {
  pais_vasco: {
    motivo: 'pais_vasco',
    titulo: 'Todavía no, en el País Vasco',
    porque:
      'Con el domicilio fiscal en el País Vasco no se usa VERI*FACTU: allí rige TicketBAI, otro sistema de Hacienda. No es un fallo tuyo. Estook lo puede abrir más adelante con el mismo proveedor.',
    todaviaNo: true,
  },
  navarra: {
    motivo: 'navarra',
    titulo: 'Navarra tiene su propio sistema',
    porque:
      'Con el domicilio fiscal en Navarra no se usa VERI*FACTU: tiene su régimen foral propio, y el proveedor de Estook no lo ofrece. No es un fallo tuyo.',
    todaviaNo: false,
  },
  sii: {
    motivo: 'sii',
    titulo: 'Con el SII no hace falta',
    porque:
      'Quien lleva los libros por el SII queda fuera de VERI*FACTU: la ley los separa. Tu facturación sigue como la llevas, y Estook no te pide nada más.',
    todaviaNo: false,
  },
  ceuta_o_melilla: {
    motivo: 'ceuta_o_melilla',
    titulo: 'Todavía no, en Ceuta y Melilla',
    porque:
      'Allí se factura con el IPSI, y su tipo depende de la categoría del local. Estook todavía no lo hace; no es que no se pueda. Se abrirá cuando haya un local que lo pida.',
    todaviaNo: true,
  },
};

export type TerritorioDelLocal = 'peninsula_y_baleares' | 'canarias' | 'ceuta' | 'melilla';

/** La parada que toca, o nula si el alta sigue. El SII manda: excluye todo lo demás. */
export function laParada(datos: {
  readonly territorio: TerritorioDelLocal;
  readonly enSii: boolean | null;
  readonly foral: HaciendaForal | null;
}): Parada | null {
  if (datos.enSii === true) return PARADAS.sii;
  if (datos.foral === 'navarra') return PARADAS.navarra;
  if (datos.foral !== null) return PARADAS.pais_vasco;
  if (datos.territorio === 'ceuta' || datos.territorio === 'melilla')
    return PARADAS.ceuta_o_melilla;
  return null;
}

// ── Las series ─────────────────────────────────────────────────────────────────

export type TipoDeSerie = 'ticket' | 'factura' | 'rectificativa';

export const TIPOS_DE_SERIE: readonly TipoDeSerie[] = ['ticket', 'factura', 'rectificativa'];

const LETRA_DE_LA_SERIE: Readonly<Record<TipoDeSerie, string>> = {
  ticket: 'T',
  factura: 'F',
  rectificativa: 'R',
};

/**
 * El prefijo de una serie: letras y números en mayúscula, guiones en medio, de 1 a 20. Con
 * el año y seis cifras, como mucho 32 caracteres: **nunca pasa de los 60** de Hacienda.
 */
export const FORMA_DEL_PREFIJO = /^[A-Z0-9](?:[A-Z0-9-]{0,18}[A-Z0-9])?$/;

export function prefijoValido(prefijo: string): boolean {
  return FORMA_DEL_PREFIJO.test(prefijo) && !prefijo.includes('--');
}

/** Lo que va delante del número un año: «T-IKA» → «T-IKA-2026-». */
export function serieDelAno(prefijo: string, ano: number): string {
  return `${prefijo}-${String(ano)}-`;
}

/** Cómo se ve el primer número: «T-IKA-2026-000001». */
export function primerNumero(prefijo: string, ano: number): string {
  return `${serieDelAno(prefijo, ano)}000001`;
}

/** «Ikatz» → «IKA»; «El Fogón de Ana» → «FA»; «Bar Centro» → «BC»: las siglas del local. */
export function siglasDelLocal(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .trim();
  const palabras = limpio
    .split(/\s+/)
    .filter((p) => p !== '' && !['DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y'].includes(p));
  if (palabras.length === 0) return 'LOC';
  // Una palabra, sus tres primeras letras; varias, sus iniciales: «BC» vale, sin rellenar.
  if (palabras.length === 1) return (palabras[0] ?? 'LOC').slice(0, 3);
  return palabras
    .slice(0, 3)
    .map((p) => p[0] ?? '')
    .join('');
}

/** Las tres series que se proponen: `T-`, `F-` y `R-` con las siglas del local (Anexo 4.4). */
export function seriesPropuestas(nombreDelLocal: string): Readonly<Record<TipoDeSerie, string>> {
  const siglas = siglasDelLocal(nombreDelLocal);
  return {
    ticket: `${LETRA_DE_LA_SERIE.ticket}-${siglas}`,
    factura: `${LETRA_DE_LA_SERIE.factura}-${siglas}`,
    rectificativa: `${LETRA_DE_LA_SERIE.rectificativa}-${siglas}`,
  };
}

// ── La autorización ante Hacienda ─────────────────────────────────────────────────

/** Los seis estados de Verifacti (`/representacion/estado`), con nuestro nombre. */
export type EstadoDeLaAutorizacion =
  'sin_empezar' | 'pendiente' | 'correcta' | 'rechazada' | 'caducada' | 'cancelada';

export function laAutorizacionDe(estado: string): EstadoDeLaAutorizacion {
  switch (estado.trim().toLowerCase()) {
    case 'correcto':
      return 'correcta';
    case 'pendiente':
      return 'pendiente';
    case 'rechazado':
      return 'rechazada';
    case 'caducado':
      return 'caducada';
    case 'cancelado':
      return 'cancelada';
    default:
      return 'sin_empezar';
  }
}

/** Lo que se lee en la pantalla de cada estado, en una línea. */
export const LA_AUTORIZACION_EN_LLANO: Readonly<Record<EstadoDeLaAutorizacion, string>> = {
  sin_empezar: 'Sin empezar',
  pendiente: 'Esperando la firma',
  correcta: 'Firmada y aceptada',
  rechazada: 'Rechazada',
  caducada: 'Caducada sin firmar',
  cancelada: 'Cancelada',
};

/** Si se puede empezar otra firma: sin empezar, o la de antes ya no vale. */
export function sePuedeEmpezarOtra(estado: EstadoDeLaAutorizacion): boolean {
  return (
    estado === 'sin_empezar' ||
    estado === 'rechazada' ||
    estado === 'caducada' ||
    estado === 'cancelada'
  );
}

/** «Las series de…» → «las series de…»: solo la primera letra, que «Hacienda» sigue en mayúscula. */
export function enMinuscula(frase: string): string {
  return frase.charAt(0).toLowerCase() + frase.slice(1);
}

// ── En qué paso va el alta ─────────────────────────────────────────────────────────

export type PasoDeFacturacion = 1 | 2 | 3 | 4 | 5;

export interface LoQueSeSabeDeLaFacturacion {
  readonly territorio: TerritorioDelLocal;
  /** Nula si el local todavía no tiene empresa. */
  readonly empresa: {
    readonly comprobada: boolean;
    readonly enSii: boolean | null;
    /** Nulo sin contestar; `false` si no es foral. */
    readonly foral: HaciendaForal | false | null;
    readonly enVerifacti: boolean;
    readonly autorizacion: EstadoDeLaAutorizacion;
    readonly dePruebas: boolean;
  } | null;
  readonly seriesPuestas: number;
  readonly otroProgramaContestado: boolean;
}

export type ComoVaLaFacturacion =
  | { readonly estado: 'parada'; readonly parada: Parada; readonly paso: PasoDeFacturacion }
  | { readonly estado: 'en_marcha'; readonly paso: PasoDeFacturacion; readonly falta: string }
  | { readonly estado: 'lista' };

/**
 * En qué paso está, o por qué se para, o si está lista. **Un paso no se da por hecho sin lo
 * anterior**: con la empresa de pruebas (que pone el admin) el alta en Verifacti y la firma
 * ya vienen hechas, y por eso se saltan solas.
 */
export function comoVaLaFacturacion(datos: LoQueSeSabeDeLaFacturacion): ComoVaLaFacturacion {
  const e = datos.empresa;
  if (e === null || !e.comprobada) {
    return { estado: 'en_marcha', paso: 1, falta: 'Los datos de tu empresa' };
  }
  if (!e.dePruebas) {
    if (e.enSii === null || e.foral === null) {
      return { estado: 'en_marcha', paso: 2, falta: 'Dónde tributa tu empresa' };
    }
    const parada = laParada({
      territorio: datos.territorio,
      enSii: e.enSii,
      foral: e.foral === false ? null : e.foral,
    });
    if (parada !== null) return { estado: 'parada', parada, paso: 2 };
  } else if (datos.territorio === 'ceuta' || datos.territorio === 'melilla') {
    return { estado: 'parada', parada: PARADAS.ceuta_o_melilla, paso: 2 };
  }
  if (datos.seriesPuestas < TIPOS_DE_SERIE.length || !datos.otroProgramaContestado) {
    return { estado: 'en_marcha', paso: 3, falta: 'Las series de tus tickets y facturas' };
  }
  if (!e.enVerifacti) {
    return { estado: 'en_marcha', paso: 4, falta: 'El alta en Verifacti, que se hace sola' };
  }
  if (e.autorizacion !== 'correcta') {
    return {
      estado: 'en_marcha',
      paso: 5,
      falta:
        e.autorizacion === 'pendiente'
          ? 'La firma de la autorización ante Hacienda, que está esperando'
          : 'La autorización ante Hacienda',
    };
  }
  return { estado: 'lista' };
}
