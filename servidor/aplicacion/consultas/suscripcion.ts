import { z } from 'zod';
import {
  cuandoAcabaLaPausa,
  elPlanPorLosLocales,
  laCuota,
  porQueNoSePausaEnLetra,
  porQueNoSePuedePausar,
  type CodigoDePlan,
  type ComoEstaLaCuenta,
  type EstadoDeSuscripcion,
  type Intervalo,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { comoEstaAhora, elDescuentoDe, hoyEnMadrid, laSuscripcionDe } from '../pago.ts';

/**
 * La suscripción de tu organización (entrega E2 · decisión 0048): lo que enseñan
 * Elegir plan y Ajustes → Suscripción. «Que la vea desde ahí, todos los datos:
 * cuánto queda, renovación, cancelación» (Richi, 25-sep).
 */
export interface MiSuscripcion {
  readonly como: ComoEstaLaCuenta;
  /** En impago, los días que quedan hasta solo lectura. */
  readonly diasQuedan: number | null;
  readonly estado: EstadoDeSuscripcion;
  readonly deLaCasa: boolean;
  readonly plan: CodigoDePlan | null;
  readonly intervalo: Intervalo | null;
  /** Los locales por los que se paga, y los que hay. */
  readonly locales: number;
  readonly localesActivos: number;
  /** Lo que se paga cada periodo, en céntimos y **sin IVA**: el IVA va aparte (0135). */
  readonly cuota: number | null;
  readonly pruebaHasta: string | null;
  /** Cuándo se renueva, o cuándo acaba si está cancelada. */
  readonly periodoHasta: string | null;
  readonly cancelaAlAcabar: boolean;
  readonly tarjeta: string | null;
  /** Los días de prueba que tiene para empezar, si nunca ha pagado. */
  readonly diasDePrueba: number | null;
  readonly conStripe: boolean;
  /** Si el pago con tarjeta está abierto (hay clave de Stripe). */
  readonly pagoAbierto: boolean;
  /** Lo que pasará con un local más: el plan y la cuota nuevos. */
  readonly conUnLocalMas: { readonly plan: CodigoDePlan; readonly cuota: number | null } | null;
  /**
   * El descuento del primer mes del código con que llegó (A3 · 0076), mientras no se
   * haya cobrado ese primer mes: antes de pagar, o en la prueba. Solo en el mensual.
   */
  readonly descuento: { readonly codigo: string; readonly porcentaje: number } | null;
  /**
   * En Pausa (0135): desde cuándo, el día que vuelve sola (a los seis meses) y a qué plan.
   * Nulo si no está en Pausa.
   */
  readonly pausa: {
    readonly desde: string;
    readonly vuelveSola: string;
    readonly vuelveA: CodigoDePlan;
    readonly vuelveAIntervalo: Intervalo;
  } | null;
  /** Por qué no puede pausar hoy, en una frase. Nulo: puede. */
  readonly noPuedePausar: string | null;
}

export const miSuscripcion = consulta<Record<string, never>, MiSuscripcion>({
  nombre: 'mi_suscripcion',
  entrada: z.object({}).strict(),
  exige: 'dato.facturacion',
  sinPagar: true,

  async ejecutar(contexto) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const fila = await laSuscripcionDe(contexto, organizacionId);
    if (fila === null) throw new FalloDeAplicacion('no_existe');

    const ahora = comoEstaAhora(fila, contexto.ahora);
    const conStripe =
      fila.stripeSuscripcion !== null &&
      (contexto.pagos === null || fila.stripeModo === contexto.pagos.modo);
    const locales = Math.max(1, fila.localesPagados ?? fila.localesActivos);
    const intervalo = fila.intervalo ?? 'mes';
    const siguiente =
      fila.plan === null || fila.plan === 'pausa' || fila.deLaCasa
        ? null
        : elPlanPorLosLocales(fila.plan, fila.localesActivos + 1);
    const todaviaSinCobrar =
      !fila.deLaCasa &&
      (fila.stripeSuscripcion === null || (ahora.como === 'prueba' && fila.intervalo !== 'ano'));
    const descuento = todaviaSinCobrar ? await elDescuentoDe(contexto, organizacionId) : null;
    const noPausa = porQueNoSePuedePausar(fila, fila.pausaEmpezo, hoyEnMadrid(contexto.ahora));

    return {
      como: ahora.como,
      diasQuedan: ahora.diasQuedan,
      estado: fila.estado,
      deLaCasa: fila.deLaCasa || fila.esEjemplo,
      plan: fila.plan,
      intervalo: fila.intervalo,
      locales,
      localesActivos: fila.localesActivos,
      cuota: fila.plan === null ? null : laCuota(fila.plan, intervalo, locales),
      pruebaHasta: fila.pruebaHasta,
      periodoHasta: fila.periodoHasta,
      cancelaAlAcabar: fila.cancelaAlAcabar,
      tarjeta: fila.tarjeta,
      diasDePrueba: fila.stripeSuscripcion === null ? fila.diasDePrueba : null,
      conStripe,
      pagoAbierto: contexto.pagos !== null,
      conUnLocalMas:
        siguiente === null
          ? null
          : { plan: siguiente, cuota: laCuota(siguiente, intervalo, fila.localesActivos + 1) },
      descuento:
        descuento === null ? null : { codigo: descuento.codigo, porcentaje: descuento.porcentaje },
      pausa:
        fila.plan === 'pausa' && fila.pausaEmpezo !== null && fila.vuelveAPlan !== null
          ? {
              desde: fila.pausaEmpezo,
              vuelveSola: cuandoAcabaLaPausa(fila.pausaEmpezo),
              vuelveA: fila.vuelveAPlan,
              vuelveAIntervalo: fila.vuelveAIntervalo ?? 'mes',
            }
          : null,
      noPuedePausar: noPausa === null ? null : porQueNoSePausaEnLetra(noPausa),
    };
  },
});
