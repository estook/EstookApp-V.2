import { estaVigente, type FechaOperativa } from '../tiempo.ts';
import type {
  Actividad,
  CategoriaFiscal,
  ModoDeConsumo,
  Naturaleza,
  Regimen,
  Territorio,
} from './vocabulario.ts';

/**
 * Elegir la regla que corresponde (M2).
 *
 * Dos fases y ninguna cadena de condiciones encadenadas: primero se descarta lo
 * incompatible, y despues gana la regla mas especifica de las que quedan.
 *
 * Y una garantia: **si dos empatan, no se elige ninguna**. Elegir la primera de
 * la lista convertiria un error de configuracion en un cobro mal calculado que
 * nadie veria.
 */

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
