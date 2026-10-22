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
  /** El food cost de ese día, sin IVA: lo calcula el servidor (auditoría del 20-oct). */
  readonly foodCost?: number | null;
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
  /** El estado del día (M16a, 0105). Abierto si no tiene cierre. */
  readonly jornada: {
    readonly estado: EstadoDeLaJornada;
    readonly esHoy: boolean;
    /** Las veces que se reabrió, la última primero, con su motivo. */
    readonly reaperturas: readonly {
      readonly motivo: string;
      readonly quien: string | null;
      readonly cuando: string;
    }[];
    /** Cuántos siguen fichados ahora, si es hoy. */
    readonly siguenDentro: number | null;
  };
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
  /**
   * Lo que se ha vendido apuntándolo en Almacén esa jornada (M7, repaso).
   *
   * **Es una propuesta, no un apunte.** El dinero de un día se cuenta aquí y en
   * ningún otro sitio; si una salida de cámara sumara por su cuenta y además se
   * metiera el papel de la caja, el día valdría el doble y nadie lo vería.
   */
  readonly vendidoEnCamara: readonly {
    readonly concepto: string;
    readonly unidades: number;
    /** Lo que costó la última vez que se cerró ese concepto, si se sabe. */
    readonly precioUnidadCentimos: number | null;
    readonly yaEstaPuesto: boolean;
  }[];
}

// ── M16a · La jornada (0105) ─────────────────────────────────────────────────

/**
 * Lo que llega de `un_cierre`, con la jornada puesta aunque la API sea la de antes.
 *
 * Entre fusionar y desplegar la API, la app nueva habla unos minutos con la de antes, que
 * no manda `jornada`. Sin esto, la pantalla del cierre se caería entera; así, un día con
 * cierre se ve cerrado y uno sin cierre, abierto, que es lo que la API de antes sabía.
 */
export function conLaJornada(
  datos: Omit<ElCierreDeUnDia, 'jornada'> & { readonly jornada?: ElCierreDeUnDia['jornada'] },
): ElCierreDeUnDia {
  return {
    ...datos,
    jornada: datos.jornada ?? {
      estado: datos.cierre === null ? 'abierta' : 'cerrada',
      esHoy: false,
      reaperturas: [],
      siguenDentro: null,
    },
  };
}

export type EstadoDeLaJornada = 'abierta' | 'cerrada' | 'reabierta';

/** Lo que devuelve `la_jornada`: el día de ahora, de corte a corte, sin un euro. */
export interface LaJornada {
  readonly fecha: string;
  readonly empiezaEn: string;
  readonly terminaEn: string;
  /** Lo que dura: 1440 casi siempre, 1500 o 1380 las noches del cambio de hora. */
  readonly minutos: number;
  readonly quedan: number;
  readonly horaDelLocal: string;
  readonly corte: string;
  readonly estado: EstadoDeLaJornada;
  readonly cerradaEn: string | null;
  readonly cerradaPor: string | null;
  readonly puedeCerrar: boolean;
  readonly ayerSinCerrar: string | null;
}

/** «a las 23:41»: la hora de un instante, en el reloj de quien mira. */
export function comoSeLeeLaHoraDe(instante: string): string {
  return new Date(instante).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Lo que dura el día, si no es lo de siempre: la noche del cambio de hora (M16a).
 * «Hoy dura 25 horas: esta noche se atrasa la hora.» Nulo un día normal.
 */
export function loQueDuraHoy(minutos: number): string | null {
  if (minutos === 24 * 60) return null;
  return minutos > 24 * 60
    ? `Hoy dura ${String(Math.trunc(minutos / 60))} horas: esta noche se atrasa la hora.`
    : `Hoy dura ${String(Math.trunc(minutos / 60))} horas: esta noche se adelanta la hora.`;
}
