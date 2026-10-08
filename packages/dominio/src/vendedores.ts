import { DIRECCION_DE_ESTOOK } from './carta.ts';
import { esDeLosQuePagan, estaEnLaPestana, type ActividadDeCliente } from './clientes.ts';
import type { ComoEstaLaCuenta } from './suscripcion.ts';

/**
 * Los vendedores (entrega A3 · decisión 0076).
 *
 * «El vendedor no se ocupa de nada, solo trae el cliente; nosotros vemos con qué
 * vendedor ha venido» (Richi, 7-oct). Aquí, lo que no depende de nadie: cómo se
 * escribe un código, por dónde llegó cada cliente y las cifras de cada vendedor.
 */

// ── El código ────────────────────────────────────────────────────────────────

/**
 * De 3 a 20 letras, números o guiones, sin guion al principio ni al final. **Lo mismo
 * que comprueba la base** (`codigo_con_forma`, 0058): sin letras con tilde ni eñes,
 * porque viaja en un enlace y se dicta por teléfono.
 */
export const FORMA_DEL_CODIGO_DE_VENDEDOR = /^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$/;

/**
 * El código como se guarda: sin espacios y en mayúsculas (`juan 26` es `JUAN26`).
 * Nulo si no tiene la forma: así una casilla vacía o mal escrita no llega a la base.
 */
export function comoCodigoDeVendedor(texto: string | null | undefined): string | null {
  if (texto === null || texto === undefined) return null;
  const limpio = texto.normalize('NFKC').replace(/\s+/g, '').toUpperCase();
  return FORMA_DEL_CODIGO_DE_VENDEDOR.test(limpio) ? limpio : null;
}

/**
 * El enlace de un código, el que lleva su QR: **siempre el de producción** y a la
 * portada, que enseña qué es Estook antes de pedir nada. Como el QR de la carta: un
 * folleto impreso con `localhost` no lo abre nadie.
 */
export function elEnlaceDelCodigo(codigo: string): string {
  return `${DIRECCION_DE_ESTOOK}/?ref=${encodeURIComponent(codigo)}`;
}

/** El descuento del primer mes, en tanto por ciento. Cero: sin descuento. */
export const DESCUENTO_MAXIMO = 100;

export function esDescuentoValido(descuento: number): boolean {
  return Number.isInteger(descuento) && descuento >= 0 && descuento <= DESCUENTO_MAXIMO;
}

/** «50 % el primer mes», o nulo si el código no da nada. */
export function elDescuentoEnPalabras(descuento: number): string | null {
  if (descuento <= 0) return null;
  if (descuento >= DESCUENTO_MAXIMO) return 'El primer mes, gratis';
  return `${String(descuento)} % el primer mes`;
}

// ── Por dónde llegó ──────────────────────────────────────────────────────────

export type OrigenDeLlegada =
  'vendedor' | 'anuncios' | 'buscadores' | 'otra_web' | 'directo' | 'sin_saber';

export const NOMBRE_DEL_ORIGEN: Readonly<Record<OrigenDeLlegada, string>> = {
  vendedor: 'Con un vendedor',
  anuncios: 'Anuncios',
  buscadores: 'Buscadores',
  otra_web: 'Otra web',
  directo: 'Directo',
  sin_saber: 'Sin saber',
};

/** Lo que trae el enlace por el que se llega, y la web de la que se venía. */
export interface MarcasDeLaLlegada {
  /** `utm_source`. */
  readonly fuente?: string | null | undefined;
  /** `utm_medium`. */
  readonly medio?: string | null | undefined;
  /** `utm_campaign`. */
  readonly campana?: string | null | undefined;
  /** Solo el nombre de la web de la que se venía (`google.com`). */
  readonly web?: string | null | undefined;
}

/** Los medios que se pagan: lo que ponen los anuncios en su enlace. */
const MEDIOS_DE_PAGO = new Set([
  'cpc',
  'ppc',
  'cpm',
  'cpa',
  'paid',
  'paidsocial',
  'paid-social',
  'paid_social',
  'ads',
  'ad',
  'display',
  'sem',
  'retargeting',
]);

/** Los buscadores, por su nombre: `google.es`, `www.bing.com`… */
const BUSCADORES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|yandex|qwant|baidu|startpage)\./;

/** Nuestras propias webs no son «otra web»: ir de la portada a crear cuenta es directo. */
const NUESTRAS = /(^|\.)estook\.com$/;

/**
 * Por dónde llegó, **sin contar el vendedor**, que lo decide la base al ver si el
 * código vale (`apuntar_la_llegada`). En este orden: un anuncio lo dice su enlace;
 * un buscador o cualquier otra web, de dónde se venía; lo demás, directo.
 */
export function porDondeLlego(
  marcas: MarcasDeLaLlegada,
): Exclude<OrigenDeLlegada, 'vendedor' | 'sin_saber'> {
  const medio = (marcas.medio ?? '').trim().toLowerCase();
  if (MEDIOS_DE_PAGO.has(medio)) return 'anuncios';
  const web = elNombreDeLaWeb(marcas.web);
  if (web !== null && BUSCADORES.test(web)) return 'buscadores';
  if (web !== null) return 'otra_web';
  if ((marcas.fuente ?? '').trim() !== '') return 'otra_web';
  return 'directo';
}

/**
 * Solo el nombre de una web, sin `www.`: de `https://www.google.es/search?q=…` sale
 * `google.es`. **Nunca la dirección entera**, que puede llevar lo que alguien buscó.
 * Nulo si no es una dirección, o si es una de las nuestras.
 */
export function elNombreDeLaWeb(direccion: string | null | undefined): string | null {
  if (direccion === null || direccion === undefined || direccion.trim() === '') return null;
  let nombre: string;
  try {
    nombre = direccion.includes('://')
      ? new URL(direccion).hostname
      : new URL(`https://${direccion.trim()}`).hostname;
  } catch {
    return null;
  }
  nombre = nombre.toLowerCase().replace(/^www\./, '');
  if (nombre === '' || !nombre.includes('.') || NUESTRAS.test(nombre)) return null;
  return nombre.slice(0, 253);
}

// ── Lo que trae el enlace, de la portada a crear cuenta ──────────────────────

/** Lo que trae el enlace por el que se llega: solo lo que viene, sin vacíos. */
export interface LlegadaDelEnlace {
  readonly codigo?: string;
  readonly fuente?: string;
  readonly medio?: string;
  readonly campana?: string;
  readonly web?: string;
}

/**
 * Lo que trae la dirección por la que se llega (`?ref=JUAN26&utm_medium=cpc`), y de
 * qué web se venía: la que dice la propia dirección (`de=`, que pone la portada al
 * pasar a crear cuenta) o, si no, la del navegador. **No se guarda en ningún sitio**
 * (0076, tres): viaja en la dirección, de la portada a crear cuenta.
 */
export function laLlegadaDelEnlace(busqueda: string, deDondeViene: string): LlegadaDelEnlace {
  const p = new URLSearchParams(busqueda);
  const corto = (valor: string | null, largo: number) => {
    const limpio = (valor ?? '').trim().slice(0, largo);
    return limpio === '' ? undefined : limpio;
  };
  const codigo = corto(p.get('ref'), 40);
  const fuente = corto(p.get('utm_source'), 100);
  const medio = corto(p.get('utm_medium'), 100);
  const campana = corto(p.get('utm_campaign'), 100);
  const web = elNombreDeLaWeb(p.get('de')) ?? elNombreDeLaWeb(deDondeViene) ?? undefined;
  return {
    ...(codigo === undefined ? {} : { codigo }),
    ...(fuente === undefined ? {} : { fuente }),
    ...(medio === undefined ? {} : { medio }),
    ...(campana === undefined ? {} : { campana }),
    ...(web === undefined ? {} : { web }),
  };
}

/**
 * Un enlace de la web con lo que trae la llegada, **antes de la almohadilla**:
 * `app/#/crear-cuenta` pasa a `app/?ref=JUAN26#/crear-cuenta`. Sin nada, igual.
 */
export function conLaLlegada(enlace: string, llegada: LlegadaDelEnlace): string {
  const p = new URLSearchParams();
  if (llegada.codigo !== undefined) p.set('ref', llegada.codigo);
  if (llegada.fuente !== undefined) p.set('utm_source', llegada.fuente);
  if (llegada.medio !== undefined) p.set('utm_medium', llegada.medio);
  if (llegada.campana !== undefined) p.set('utm_campaign', llegada.campana);
  if (llegada.web !== undefined) p.set('de', llegada.web);
  const parametros = p.toString();
  if (parametros === '') return enlace;
  const almohadilla = enlace.indexOf('#');
  const antes = almohadilla === -1 ? enlace : enlace.slice(0, almohadilla);
  const despues = almohadilla === -1 ? '' : enlace.slice(almohadilla);
  return `${antes}${antes.includes('?') ? '&' : '?'}${parametros}${despues}`;
}

// ── Las cifras de un vendedor ────────────────────────────────────────────────

/** Lo que hace falta de cada cliente que trajo, como lo da la lista de clientes. */
export interface ClienteDeUnVendedor {
  readonly como: ComoEstaLaCuenta;
  readonly actividad: ActividadDeCliente | null;
  readonly cancelaAlAcabar: boolean;
  /** En el plan Pausa y pagándolo (A4 · 0077): cuenta como que paga. */
  readonly enPausa?: boolean;
  readonly deLaCasa: boolean;
  readonly esEjemplo: boolean;
  /** Lo que deja al mes, en céntimos. Nulo sin plan o de la casa. */
  readonly cuotaAlMes: number | null;
  readonly diasDeCliente: number;
  /** Cuándo llegó, `AAAA-MM-DD`. */
  readonly llegoEl: string;
}

export interface CifrasDeUnVendedor {
  readonly traidos: number;
  readonly esteMes: number;
  readonly pagando: number;
  readonly enPrueba: number;
  readonly seVan: number;
  readonly sinPagar: number;
  /** Los que lo usan de verdad: entran y apuntan. */
  readonly loUsan: number;
  readonly dormidos: number;
  /** Lo que dejan al mes los que pagan, en céntimos. */
  readonly alMes: number;
  /** Los días que llevan con Estook, de media. Nulo si no ha traído a nadie. */
  readonly diasDeMedia: number | null;
}

/**
 * Las cifras de un vendedor, con **la misma cuenta que la lista de Clientes**: las
 * pestañas salen de `estaEnLaPestana`, y lo que deja al mes, de los que pagan. Los de
 * ejemplo no cuentan nunca. «Este mes» es el mes de `hoy`, en Madrid.
 */
export function lasCifrasDelVendedor(
  clientes: readonly ClienteDeUnVendedor[],
  hoy: string,
): CifrasDeUnVendedor {
  const suyos = clientes.filter((c) => !c.esEjemplo);
  const enLa = (pestana: Parameters<typeof estaEnLaPestana>[0]) =>
    suyos.filter((c) => estaEnLaPestana(pestana, c)).length;
  const mes = hoy.slice(0, 7);
  return {
    traidos: suyos.length,
    esteMes: suyos.filter((c) => c.llegoEl.slice(0, 7) === mes).length,
    pagando: enLa('pagando'),
    enPrueba: enLa('prueba'),
    seVan: enLa('se_van'),
    sinPagar: enLa('baja'),
    loUsan: suyos.filter((c) => c.actividad === 'activo').length,
    dormidos: suyos.filter((c) => c.actividad === 'dormido').length,
    alMes: suyos
      .filter((c) => !c.deLaCasa && esDeLosQuePagan(c))
      .reduce((suma, c) => suma + (c.cuotaAlMes ?? 0), 0),
    diasDeMedia:
      suyos.length === 0
        ? null
        : // Días cumplidos, no redondeados: no es dinero, y «37 días» es de media lo que llevan.
          Math.trunc(suyos.reduce((suma, c) => suma + c.diasDeCliente, 0) / suyos.length),
  };
}
