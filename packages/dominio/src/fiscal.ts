import { centimos, entreFactor, porFraccion, suma, type Centimos } from './dinero.ts';
import { estaVigente, type FechaOperativa } from './tiempo.ts';

/**
 * Motor fiscal (M2).
 *
 * ── El principio ─────────────────────────────────────────────────────────────
 *
 * **Un producto no tiene un tipo impositivo.** Lo tiene la operación. El mismo
 * botellín de cerveza lleva un impuesto si se sirve en barra y otro si se vende
 * en caja para llevar de una tienda, y ninguno de los dos está escrito en el
 * producto: sale de cruzar
 *
 *     territorio + regimen + naturaleza + modo de consumo + actividad
 *     + categoria fiscal del producto + fecha de devengo
 *
 * ── Lo que este motor NO hace, a proposito ───────────────────────────────────
 *
 * **No prorratea el impuesto de los ingredientes de una receta.** Una hamburguesa
 * no tributa por la media ponderada del pan, la carne y el queso: tributa como lo
 * que es, un servicio de restauracion. La fiscalidad de las COMPRAS y la de las
 * VENTAS son dos mundos separados, y mezclarlos es el error que este motor existe
 * para impedir.
 *
 * ── Las dos garantias ────────────────────────────────────────────────────────
 *
 * 1. **Ninguna regla se inventa.** Todas viven en la base de datos, con su
 *    vigencia y su referencia legal. Aqui solo esta la maquinaria de elegir.
 * 2. **El pasado no se recalcula.** La regla se elige por la fecha de devengo de
 *    la operacion, no por la de hoy.
 */

// ── El vocabulario ────────────────────────────────────────────────────────────

/** Cada uno con su impuesto propio. No son variantes del mismo. */
export const TERRITORIOS = ['peninsula_y_baleares', 'canarias', 'ceuta', 'melilla'] as const;
export type Territorio = (typeof TERRITORIOS)[number];

export const REGIMENES = ['iva', 'igic', 'ipsi'] as const;
export type Regimen = (typeof REGIMENES)[number];

export const REGIMEN_DEL_TERRITORIO: Readonly<Record<Territorio, Regimen>> = {
  peninsula_y_baleares: 'iva',
  canarias: 'igic',
  ceuta: 'ipsi',
  melilla: 'ipsi',
};

/**
 * La distincion juridica, y la que mas manda: ¿se presta un servicio o se entrega
 * un bien? Una cerveza en barra es lo primero; una caja de cervezas de una tienda,
 * lo segundo. El impuesto puede ser distinto aunque el producto sea el mismo.
 */
export const NATURALEZAS = ['prestacion_de_servicios', 'entrega_de_bienes'] as const;
export type Naturaleza = (typeof NATURALEZAS)[number];

/**
 * El hecho: donde se consume. Va aparte de la naturaleza a proposito, porque
 * «para llevar» **no determina por si solo** si hay servicio o entrega. Puede ser
 * cualquiera de las dos, y quien lo decide es la naturaleza.
 */
export const MODOS_DE_CONSUMO = ['en_el_local', 'para_llevar', 'reparto'] as const;
export type ModoDeConsumo = (typeof MODOS_DE_CONSUMO)[number];

/** Clasificacion fiscal del producto. Reutilizable, no un tipo pegado a la ficha. */
export const CATEGORIAS_FISCALES = [
  'alimento',
  'bebida_alcoholica',
  'bebida_refrescante',
  'bebida_refrescante_azucarada',
  'otros',
] as const;
export type CategoriaFiscal = (typeof CATEGORIAS_FISCALES)[number];

/**
 * La categoria de actividad del establecimiento. En Ceuta y en Melilla **decide
 * el tipo**: un restaurante de un tenedor y uno de tres no tributan igual.
 */
export const ACTIVIDADES = [
  'restaurante_un_tenedor',
  'restaurante_dos_o_mas_tenedores',
  'cafe_o_bar_categoria_especial',
  'demas_cafes_y_bares',
  'demas_hosteleria',
] as const;
export type Actividad = (typeof ACTIVIDADES)[number];

// ── Una regla ─────────────────────────────────────────────────────────────────

/**
 * Las casillas que puede concretar una regla. Cuantas mas llene, mas especifica
 * es, y antes gana. Un `null` significa «me da igual», no «vacio».
 */
export interface ReglaFiscal {
  readonly id: string;
  readonly version: number;
  readonly territorio: Territorio;
  readonly regimen: Regimen;
  readonly naturaleza: Naturaleza | null;
  readonly modoDeConsumo: ModoDeConsumo | null;
  readonly categoriaFiscal: CategoriaFiscal | null;
  readonly actividad: Actividad | null;
  readonly epigrafeIae: string | null;
  /** Fraccion con cuatro decimales: 0,10 es el 10 %. */
  readonly tipo: number;
  readonly vigenteDesde: FechaOperativa;
  readonly vigenteHasta: FechaOperativa | null;
  readonly referenciaLegal: string;
  readonly fuenteUrl: string | null;
  readonly activa: boolean;
}

/** Todo lo que hay que saber de una operacion para ponerle su impuesto. */
export interface ContextoFiscal {
  readonly territorio: Territorio;
  readonly regimen: Regimen;
  readonly naturaleza: Naturaleza;
  readonly modoDeConsumo: ModoDeConsumo;
  readonly categoriaFiscal: CategoriaFiscal;
  readonly actividad: Actividad | null;
  readonly epigrafeIae: string | null;
  /**
   * **La fecha del devengo, no la de la jornada.**
   *
   * Estook tiene dos fechas para el mismo instante: la del reloj y la de la
   * jornada, porque las copas de las 02:30 del sabado son de la jornada del
   * viernes. Para el impuesto manda **el instante real**: una cerveza servida a
   * las 02:00 del 1 de octubre tributa con el tipo del 1 de octubre, aunque el
   * cierre la agrupe en la jornada del 30 de septiembre.
   *
   * Se calcula con `fechaEnElLocal()`, **nunca** con `jornadaDe()`.
   */
  readonly fechaDeDevengo: FechaOperativa;
}

// ── El resultado ──────────────────────────────────────────────────────────────

export type Resolucion =
  | { readonly estado: 'resuelto'; readonly regla: ReglaFiscal; readonly especificidad: number }
  /** Dos reglas igual de especificas. **No se elige al azar**: se para y se dice. */
  | { readonly estado: 'ambiguo'; readonly candidatas: readonly ReglaFiscal[] }
  /** Ninguna regla cubre este caso. Tampoco se supone un cero. */
  | { readonly estado: 'sin_regla'; readonly contexto: ContextoFiscal };

/** Las casillas que cuentan para la especificidad, en orden de lectura. */
const DIMENSIONES = [
  'naturaleza',
  'modoDeConsumo',
  'categoriaFiscal',
  'actividad',
  'epigrafeIae',
] as const;

function encaja(regla: ReglaFiscal, contexto: ContextoFiscal): boolean {
  if (regla.territorio !== contexto.territorio) return false;
  if (regla.regimen !== contexto.regimen) return false;
  if (!regla.activa) return false;
  if (!estaVigente(contexto.fechaDeDevengo, regla.vigenteDesde, regla.vigenteHasta)) return false;

  return DIMENSIONES.every((dimension) => {
    const exigido = regla[dimension];
    return exigido === null || exigido === contexto[dimension];
  });
}

function especificidadDe(regla: ReglaFiscal): number {
  return DIMENSIONES.filter((dimension) => regla[dimension] !== null).length;
}

/**
 * Elige la regla que corresponde.
 *
 * Dos fases, sin una sola cadena de condiciones encadenadas:
 *
 *   1. **Descartar** lo incompatible: territorio, regimen, vigencia y las
 *      casillas que la regla exige.
 *   2. **Puntuar** por especificidad entre lo que queda. Gana la mas concreta.
 *
 * Si empatan, se devuelve `ambiguo` con las candidatas. Nunca se elige una por
 * ser la primera de la lista: eso convertiria un error de configuracion en un
 * cobro mal calculado que nadie veria.
 */
export function resolver(reglas: readonly ReglaFiscal[], contexto: ContextoFiscal): Resolucion {
  const compatibles = reglas.filter((regla) => encaja(regla, contexto));

  if (compatibles.length === 0) {
    return { estado: 'sin_regla', contexto };
  }

  const puntuadas = compatibles.map((regla) => ({
    regla,
    especificidad: especificidadDe(regla),
  }));
  const maxima = Math.max(...puntuadas.map((p) => p.especificidad));
  const ganadoras = puntuadas.filter((p) => p.especificidad === maxima);

  const primera = ganadoras[0];
  if (!primera) throw new Error('Un empate sin candidatas no deberia llegar hasta aqui.');

  if (ganadoras.length > 1) {
    return { estado: 'ambiguo', candidatas: ganadoras.map((g) => g.regla) };
  }

  return { estado: 'resuelto', regla: primera.regla, especificidad: primera.especificidad };
}

// ── La copia que se guarda en la venta ────────────────────────────────────────

/**
 * Lo que se graba en la linea de venta cuando se confirma.
 *
 * Con esto la operacion se puede reconstruir dentro de cinco anos aunque la regla
 * haya cambiado, se haya desactivado o ya no exista. **No se depende de volver a
 * consultar la tabla de reglas.**
 */
export interface CopiaFiscal {
  readonly reglaId: string;
  readonly reglaVersion: number;
  readonly regimen: Regimen;
  readonly tipo: number;
  readonly vigenteDesde: FechaOperativa;
  readonly referenciaLegal: string;
  readonly fechaDeDevengo: FechaOperativa;
}

export function copiaFiscalDe(regla: ReglaFiscal, contexto: ContextoFiscal): CopiaFiscal {
  return {
    reglaId: regla.id,
    reglaVersion: regla.version,
    regimen: regla.regimen,
    tipo: regla.tipo,
    vigenteDesde: regla.vigenteDesde,
    referenciaLegal: regla.referenciaLegal,
    fechaDeDevengo: contexto.fechaDeDevengo,
  };
}

// ── El desglose ───────────────────────────────────────────────────────────────

/**
 * Como viene el precio. En hosteleria los precios de carta llevan el impuesto
 * dentro; en una factura a otra empresa, aparte.
 */
export const MODOS_DE_PRECIO = ['impuesto_incluido', 'impuesto_aparte'] as const;
export type ModoDePrecio = (typeof MODOS_DE_PRECIO)[number];

export interface LineaAFacturar {
  /** Con impuesto dentro o sin el, segun el modo. */
  readonly importe: Centimos;
  readonly regimen: Regimen;
  readonly tipo: number;
}

export interface GrupoFiscal {
  readonly regimen: Regimen;
  readonly tipo: number;
  readonly base: Centimos;
  readonly cuota: Centimos;
  readonly total: Centimos;
}

export interface Desglose {
  readonly grupos: readonly GrupoFiscal[];
  readonly base: Centimos;
  readonly cuota: Centimos;
  readonly total: Centimos;
}

/**
 * Desglosa un ticket, una factura o un cierre. **Una sola capa para todos**: el
 * TPV, las facturas, los cierres y los informes llaman aqui, y por eso no pueden
 * dar cifras distintas.
 *
 * La politica, decidida el 1 de septiembre de 2026:
 *
 *   1. Agrupar las lineas por tratamiento fiscal (regimen + tipo).
 *   2. Sumar los importes de cada grupo, sin redondear nada por el camino.
 *   3. Calcular el impuesto **sobre el total del grupo**, no linea a linea.
 *   4. Redondear una sola vez, al final de cada grupo.
 *   5. Nunca mezclar tipos distintos.
 *
 * Y una garantia que el ejemplo de mano no suele contemplar: **con impuesto
 * incluido, base + cuota da exactamente lo que paga el cliente**. La cuota se
 * saca restando, no calculando aparte, para que no falte ni sobre un centimo en
 * el ticket.
 */
export function desglosar(lineas: readonly LineaAFacturar[], modo: ModoDePrecio): Desglose {
  const porTratamiento = new Map<string, { regimen: Regimen; tipo: number; importe: number }>();

  for (const linea of lineas) {
    if (!Number.isFinite(linea.tipo) || linea.tipo < 0) {
      throw new Error(`«${linea.tipo}» no es un tipo impositivo.`);
    }
    const clave = `${linea.regimen}|${linea.tipo}`;
    const grupo = porTratamiento.get(clave);
    if (grupo) grupo.importe += linea.importe;
    else
      porTratamiento.set(clave, {
        regimen: linea.regimen,
        tipo: linea.tipo,
        importe: linea.importe,
      });
  }

  // Orden estable: por regimen y luego por tipo. Dos ejecuciones dan lo mismo.
  const ordenados = [...porTratamiento.values()].sort(
    (uno, otro) => uno.regimen.localeCompare(otro.regimen) || uno.tipo - otro.tipo,
  );

  const grupos: GrupoFiscal[] = ordenados.map(({ regimen, tipo, importe }) => {
    const acumulado = centimos(importe);

    if (modo === 'impuesto_incluido') {
      const base = entreFactor(acumulado, 1 + tipo);
      // Restando, no calculando: asi base + cuota es exactamente lo que se cobro.
      const cuota = centimos(acumulado - base);
      return { regimen, tipo, base, cuota, total: acumulado };
    }

    const cuota = porFraccion(acumulado, tipo);
    return { regimen, tipo, base: acumulado, cuota, total: centimos(acumulado + cuota) };
  });

  return {
    grupos,
    base: suma(...grupos.map((g) => g.base)),
    cuota: suma(...grupos.map((g) => g.cuota)),
    total: suma(...grupos.map((g) => g.total)),
  };
}
