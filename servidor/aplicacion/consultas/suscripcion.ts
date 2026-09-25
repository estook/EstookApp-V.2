import { z } from 'zod';
import {
  comoEstaLaCuenta,
  elPlanPorLosLocales,
  laCuota,
  type CodigoDePlan,
  type ComoEstaLaCuenta,
  type EstadoDeSuscripcion,
  type FechaOperativa,
  type Intervalo,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { comoEstaAhora, hoyEnMadrid, laSuscripcionDe } from '../pago.ts';

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
  /** Lo que se paga cada periodo, en céntimos, con el IVA incluido. */
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
    };
  },
});

// ── El admin: quién ha pagado ────────────────────────────────────────────────

export interface CuentaParaElAdmin {
  readonly organizacionId: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly como: ComoEstaLaCuenta;
  readonly diasQuedan: number | null;
  readonly estado: string;
  readonly plan: string | null;
  readonly intervalo: string | null;
  readonly locales: number;
  readonly cuota: number | null;
  readonly pruebaHasta: string | null;
  readonly periodoHasta: string | null;
  readonly cancelaAlAcabar: boolean;
  readonly deLaCasa: boolean;
  readonly esEjemplo: boolean;
}

/**
 * Todas las cuentas, con cómo están y lo que pagan: lo que el admin necesitaba saber
 * —quién ha pagado— hasta que A2 traiga la ficha de cada cliente.
 */
export const adminLasCuentas = consulta<Record<string, never>, readonly CuentaParaElAdmin[]>({
  nombre: 'admin_las_cuentas',
  entrada: z.object({}).strict(),
  soloAdmin: true,

  async ejecutar(contexto) {
    const filas = await contexto.sql<
      {
        organizacion_id: string;
        codigo: string;
        nombre: string;
        es_ejemplo: boolean;
        estado: string;
        plan: string | null;
        intervalo: string | null;
        locales_pagados: number | null;
        locales_activos: number;
        prueba_hasta: string | null;
        periodo_hasta: string | null;
        cancela_al_acabar: boolean;
        impago_desde: string | null;
        de_la_casa: boolean;
        stripe_suscripcion: string | null;
      }[]
    >`
      select organizacion_id, codigo, nombre, es_ejemplo, estado, plan, intervalo,
             locales_pagados, locales_activos, to_char(prueba_hasta, 'YYYY-MM-DD') as prueba_hasta,
             periodo_hasta::text as periodo_hasta, cancela_al_acabar, impago_desde::text as impago_desde,
             de_la_casa, stripe_suscripcion
        from estook.las_cuentas()
    `;
    const hoy = hoyEnMadrid(contexto.ahora);
    return filas.map((f) => {
      const plan = f.plan as CodigoDePlan | null;
      const locales = Math.max(1, f.locales_pagados ?? f.locales_activos);
      const ahora = comoEstaLaCuenta(
        {
          estado: f.estado as EstadoDeSuscripcion,
          plan,
          pruebaHasta: f.prueba_hasta as FechaOperativa | null,
          impagoDesde: f.impago_desde === null ? null : new Date(f.impago_desde),
          deLaCasa: f.de_la_casa,
          esEjemplo: f.es_ejemplo,
          conStripe: f.stripe_suscripcion !== null,
        },
        contexto.ahora,
        hoy,
      );
      return {
        organizacionId: f.organizacion_id,
        codigo: f.codigo,
        nombre: f.nombre,
        como: ahora.como,
        diasQuedan: ahora.diasQuedan,
        estado: f.estado,
        plan: f.plan,
        intervalo: f.intervalo,
        locales,
        cuota: plan === null ? null : laCuota(plan, (f.intervalo ?? 'mes') as Intervalo, locales),
        pruebaHasta: f.prueba_hasta,
        periodoHasta: f.periodo_hasta === null ? null : new Date(f.periodo_hasta).toISOString(),
        cancelaAlAcabar: f.cancela_al_acabar,
        deLaCasa: f.de_la_casa,
        esEjemplo: f.es_ejemplo,
      };
    });
  },
});
