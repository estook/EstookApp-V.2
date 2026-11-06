import type {
  CodigoDePlan,
  ComoEstaLaCuenta,
  EstadoDeSuscripcion,
  Intervalo,
} from '@estook/dominio';

/**
 * Lo que devuelve `mi_suscripcion` (entrega E2 · decisión 0048). Escrito aquí porque
 * la app no importa del servidor; lo que dice cada campo, en
 * `servidor/aplicacion/consultas/suscripcion.ts`.
 */
export interface MiSuscripcion {
  readonly como: ComoEstaLaCuenta;
  readonly diasQuedan: number | null;
  readonly estado: EstadoDeSuscripcion;
  readonly deLaCasa: boolean;
  readonly plan: CodigoDePlan | null;
  readonly intervalo: Intervalo | null;
  readonly locales: number;
  readonly localesActivos: number;
  /** Sin IVA (0135). */
  readonly cuota: number | null;
  readonly pruebaHasta: string | null;
  readonly periodoHasta: string | null;
  readonly cancelaAlAcabar: boolean;
  readonly tarjeta: string | null;
  readonly diasDePrueba: number | null;
  readonly conStripe: boolean;
  readonly pagoAbierto: boolean;
  readonly conUnLocalMas: { readonly plan: CodigoDePlan; readonly cuota: number | null } | null;
  /** El descuento del primer mes del código con que llegó (A3), si todavía no se ha cobrado. */
  readonly descuento: { readonly codigo: string; readonly porcentaje: number } | null;
  /** En Pausa (0135): desde cuándo, el día que vuelve sola y a qué plan. */
  readonly pausa: {
    readonly desde: string;
    readonly vuelveSola: string;
    readonly vuelveA: CodigoDePlan;
    readonly vuelveAIntervalo: Intervalo;
  } | null;
  /** Por qué no puede pausar hoy, en una frase. Nulo: puede. */
  readonly noPuedePausar: string | null;
}
