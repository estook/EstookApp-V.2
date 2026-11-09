import type { ElRecuento, FormaDePago, MotivoDeLaDiferencia } from '@estook/dominio';

/**
 * **Lo que dice la API de la caja** (R3 · 1, decisión 0144): lo mismo que devuelven `la_caja`,
 * `como_va_la_caja`, `cobrar` y `cerrar_caja`, para que el TPV lo lea con su tipo.
 */

export interface AjustesDeLaCaja {
  readonly cajaLaAbren: 'encargados' | 'todos';
  readonly recuentoAlAbrir: boolean;
  readonly contarACiegas: boolean;
  readonly fondoDeSiempre: number | null;
  readonly conBizum: boolean;
  readonly conCheque: boolean;
}

export interface LaCajaDelAparato {
  readonly cajon: { readonly id: string; readonly nombre: string } | null;
  readonly abierta: {
    readonly turnoId: string;
    readonly desde: string;
    readonly abiertaPor: string;
    readonly fondo: number;
    readonly fecha: string;
    readonly deOtroDia: boolean;
  } | null;
  readonly loDeLaUltimaVez: number | null;
  readonly ajustes: AjustesDeLaCaja;
  readonly formas: readonly FormaDePago[];
  readonly puedoLlevarla: boolean;
  readonly puedoAbrirElCajon: boolean;
  readonly mesasAbiertas: number;
}

export interface UnMovimiento {
  readonly tipo: 'cambio' | 'sacar' | 'meter' | 'devolucion';
  readonly importe: number;
  readonly motivo: string | null;
  readonly nota: string | null;
  readonly quien: string;
  readonly aprobado: string | null;
  readonly en: string;
}

export interface ComoVaLaCaja {
  readonly turnoId: string;
  readonly cajon: string;
  readonly abiertaPor: string;
  readonly desde: string;
  readonly fondo: number;
  readonly efectivo: number;
  readonly tarjeta: number;
  readonly bizum: number;
  readonly cheque: number;
  readonly tickets: number;
  readonly deberiaHaber: number;
  readonly cajonSinVenta: number;
  readonly movimientos: readonly UnMovimiento[];
}

export interface CajaAbierta {
  readonly turnoId: string;
  readonly fondo: number;
  readonly frenteALaUltimaVez: number;
  readonly yaEstaba: boolean;
  readonly cajonAbierto: boolean;
}

export interface LaCajaCerrada {
  readonly turnoId: string;
  readonly deberiaHaber: number;
  readonly contado: number;
  readonly diferencia: number;
  readonly tarjeta: number;
  readonly datafono: number | null;
  readonly diferenciaDeTarjeta: number | null;
  readonly bizum: number;
  readonly cheque: number;
  readonly paraManana: number;
  readonly retiras: number;
  readonly diaCerrado: boolean;
  readonly quedanAbiertas: readonly string[];
}

export interface Cobrado {
  readonly cobroId: string;
  readonly documentoId: string;
  readonly numero: string;
  readonly cambio: number;
  readonly queda: number;
  readonly liberada: boolean;
  readonly cajonAbierto: boolean;
}

/** Lo ya cobrado de una cuenta, en `la_mesa`. Una API de antes no lo dice. */
export interface LoCobradoDeLaMesa {
  readonly importe: number;
  readonly lineas: readonly string[];
  readonly partes: { readonly de: number; readonly pagadas: readonly number[] } | null;
}

export type { ElRecuento, FormaDePago, MotivoDeLaDiferencia };
