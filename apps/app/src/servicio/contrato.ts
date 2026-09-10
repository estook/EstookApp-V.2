/**
 * Lo que Servicio recibe del servidor sobre el cierre de caja (M6½).
 *
 * Copia de lo que devuelven `mis_cierres` y `un_cierre`. Y con la misma regla de
 * siempre: **el consumo llega opcional**, porque valorar lo que se ha gastado de
 * género es dinero y un rol sin costes no lo recibe. Un jefe de sala ve lo que ha
 * facturado su turno y no ve lo que costó la comida.
 */

export interface UnCierre {
  readonly cierreId: string;
  readonly fecha: string;
  readonly totalCentimos: number;
  readonly efectivoCentimos: number | null;
  readonly tarjetaCentimos: number | null;
  readonly otrosCentimos: number | null;
  readonly comensales: number | null;
  readonly tickets: number | null;
  readonly origen: string;
  readonly notas: string | null;
  readonly quien: string | null;
  readonly cerradoEn: string;
  readonly cuantasLineas: number;
  readonly consumoCentimos?: number | null;
}

export interface MisCierres {
  readonly cierres: readonly UnCierre[];
  readonly jornada: string;
  readonly comoSeCierra: string;
  readonly tpv: string | null;
  readonly desde: string;
  readonly hasta: string;
  readonly hoyEstaCerrado: boolean;
  readonly totalDelPeriodoCentimos: number;
  readonly diasConVentas: number;
  readonly puedeCerrar: boolean;
  readonly puedeVerCostes: boolean;
  readonly consumoDelPeriodoCentimos?: number | null;
  /** Lo que se va en género de cada cien euros que entran. Nulo si no se sabe. */
  readonly foodCost?: number | null;
}

/**
 * El día de un cierre, como se dice: «miércoles, 3 de septiembre».
 *
 * La fecha llega del servidor como `2026-09-03`, que es como se guarda y no como
 * se lee. Un título que dice «Caja cerrada · 2026-09-03» obliga a traducir de
 * cabeza; con el día de la semana, además, se ve de un vistazo si es el de ayer.
 * Se lee a mediodía UTC para que ningún huso horario lo mueva al día de al lado.
 */
export function comoSeLeeElDia(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export interface ElCierreDeUnDia {
  readonly cierre: UnCierre | null;
  readonly lineas: readonly {
    readonly concepto: string;
    readonly unidades: number;
    readonly importeCentimos: number | null;
  }[];
  readonly fecha: string;
  readonly comoSeCierra: string;
  readonly puedeCerrar: boolean;
  /**
   * Lo que costó cada plato la última vez que se apuntó, para proponer el
   * importe. Cuando exista la carta (M10) el precio saldrá de ella.
   */
  readonly platosConocidos: readonly {
    readonly clave: string;
    readonly concepto: string;
    readonly precioUnidadCentimos: number;
  }[];
}
