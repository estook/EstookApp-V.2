import { centimos, conSimbolo } from './dinero.ts';
import { planPorCodigo, type CodigoDePlan } from './registro.ts';
import { fechaEnLetra, plural } from './textos.ts';
import type { FechaOperativa } from './tiempo.ts';

/**
 * El pago y lo que deja hacer (entrega E2 · decisión 0048).
 *
 * «Sin pago no hay app» (Richi, 25-sep). Aquí vive **la regla**, sin leer nada: cómo
 * está una cuenta con lo que guarda su suscripción y la hora de ahora, y qué deja
 * hacer cada forma de estar. La cumple la API en cada petición (la quinta puerta del
 * despachador) y la pinta la app; ninguna de las dos la decide por su cuenta.
 */

/** Los estados que guarda la base (0018, 0038). */
export type EstadoDeSuscripcion =
  'prueba' | 'activa' | 'impago' | 'solo_lectura' | 'archivada' | 'pendiente_de_pago';

export type Intervalo = 'mes' | 'ano';

/** Los siete días de gracia desde el primer cobro fallido (Richi: «hay IA y gastos»). */
export const DIAS_DE_GRACIA = 7;

/**
 * Cuántos días antes de cobrar avisa la prueba. Siete: lo piden las normas de las
 * tarjetas para las pruebas gratis más largas de una semana, y es lo honrado.
 */
export const DIAS_DE_AVISO_ANTES_DE_COBRAR = 7;

/** Cómo está una cuenta, que es lo que decide qué se puede hacer. */
export type ComoEstaLaCuenta = 'al_dia' | 'prueba' | 'impago' | 'solo_lectura' | 'sin_pagar';

/** Lo que hace falta saber de la suscripción, como lo guarda la base. */
export interface LaSuscripcion {
  readonly estado: EstadoDeSuscripcion;
  readonly plan: CodigoDePlan | null;
  /** «2026-10-07». */
  readonly pruebaHasta: FechaOperativa | null;
  /** El primer cobro fallido sin resolver. */
  readonly impagoDesde: Date | null;
  readonly deLaCasa: boolean;
  readonly esEjemplo: boolean;
  /** Si Stripe lleva esta cuenta. Una prueba sin Stripe es de antes de la 0048. */
  readonly conStripe: boolean;
}

export interface LaCuentaAhora {
  readonly como: ComoEstaLaCuenta;
  /** En impago, los días que quedan hasta solo lectura (7 el primer día, 1 el último). */
  readonly diasQuedan: number | null;
}

const UN_DIA = 86_400_000;

/**
 * Cómo está la cuenta ahora.
 *
 *   · **De la casa** (`ikatz`, los ejemplos): al día, siempre.
 *   · **Pausa**: solo lectura, aunque el cobro esté al día (es lo que se paga).
 *   · **Impago**: los siete primeros días se trabaja con el aviso; del octavo, solo
 *     lectura. No hace falta que el reloj lo cambie: lo cuenta la hora.
 *   · **Una prueba sin Stripe que ya acabó** es de antes de la 0048 (`burger-king`):
 *     tiene que elegir plan. Con Stripe manda lo que diga Stripe, que al acabar la
 *     prueba cobra y avisa.
 */
export function comoEstaLaCuenta(
  s: LaSuscripcion,
  ahora: Date,
  hoy: FechaOperativa,
): LaCuentaAhora {
  if (s.deLaCasa || s.esEjemplo) return { como: 'al_dia', diasQuedan: null };

  switch (s.estado) {
    case 'activa':
      return { como: s.plan === 'pausa' ? 'solo_lectura' : 'al_dia', diasQuedan: null };
    case 'prueba':
      if (s.conStripe || (s.pruebaHasta !== null && s.pruebaHasta >= hoy)) {
        return { como: 'prueba', diasQuedan: null };
      }
      return { como: 'sin_pagar', diasQuedan: null };
    case 'impago': {
      const desde = s.impagoDesde ?? ahora;
      const pasados = Math.max(0, Math.floor((ahora.getTime() - desde.getTime()) / UN_DIA));
      const quedan = DIAS_DE_GRACIA - pasados;
      return quedan > 0
        ? { como: 'impago', diasQuedan: quedan }
        : { como: 'solo_lectura', diasQuedan: 0 };
    }
    case 'solo_lectura':
      return { como: 'solo_lectura', diasQuedan: null };
    case 'archivada':
    case 'pendiente_de_pago':
      return { como: 'sin_pagar', diasQuedan: null };
  }
}

/** Si se puede escribir: apuntar, crear, cambiar. */
export function dejaEscribir(como: ComoEstaLaCuenta): boolean {
  return como === 'al_dia' || como === 'prueba' || como === 'impago';
}

/** Si se puede mirar. En solo lectura, sí: los datos son suyos y se pueden llevar. */
export function dejaMirar(como: ComoEstaLaCuenta): boolean {
  return como !== 'sin_pagar';
}

// ── El plan y lo que cuesta ──────────────────────────────────────────────────

/**
 * El plan que toca por los locales que hay.
 *
 * **Pro con dos locales o más pasa a Cadena**, que es Pro para grupos y más barato
 * por local (69 € frente a 79 €): nadie paga más por crecer. Y al revés, Cadena con
 * un local vuelve a Pro. Esencial y Pausa no dependen de los locales.
 */
export function elPlanPorLosLocales(plan: CodigoDePlan, locales: number): CodigoDePlan {
  if (plan === 'pro' && locales >= 2) return 'cadena';
  if (plan === 'cadena' && locales < 2) return 'pro';
  return plan;
}

/** El nombre del precio en Stripe. Con `v1`: un precio de Stripe no se cambia, se sustituye. */
export function claveDelPrecio(plan: CodigoDePlan, intervalo: Intervalo): string {
  return `estook-${plan}-${intervalo}-v1`;
}

/** Lo que se paga por periodo, en céntimos. Nulo si ese plan no tiene ese intervalo. */
export function laCuota(plan: CodigoDePlan, intervalo: Intervalo, locales: number): number | null {
  const elPlan = planPorCodigo(plan);
  if (elPlan === undefined) return null;
  const porLocal = intervalo === 'mes' ? elPlan.alMesPorLocal : elPlan.alAnoPorLocal;
  return porLocal === null ? null : porLocal * Math.max(1, locales);
}

/** Los estados de Stripe, traducidos a los de Estook (tabla de la 0048). */
export function elEstadoDeStripe(status: string): EstadoDeSuscripcion {
  switch (status) {
    case 'trialing':
      return 'prueba';
    case 'active':
      return 'activa';
    case 'past_due':
    case 'unpaid':
      return 'impago';
    case 'canceled':
    case 'paused':
      return 'solo_lectura';
    default:
      // `incomplete` e `incomplete_expired`: el primer pago no se hizo.
      return 'pendiente_de_pago';
  }
}

// ── Los correos de la cuenta ─────────────────────────────────────────────────

export interface CorreoDeLaCuenta {
  /** Qué correo es, para no mandarlo dos veces el mismo día. */
  readonly tipo: 'impago' | 'solo_lectura' | 'fin_de_prueba';
  readonly clave: string;
  readonly asunto: string;
  /** Párrafos. El que manda el correo los pinta. */
  readonly parrafos: readonly string[];
}

export interface LoQueSabeElReloj {
  readonly nombre: string;
  readonly suscripcion: LaSuscripcion;
  readonly cuota: number | null;
}

const A_SUSCRIPCION = 'Lo tienes todo en Estook, en Ajustes → Suscripción.';

/**
 * El correo de hoy para esta cuenta, si le toca alguno. Lo llama el reloj una vez al
 * día; si ya se mandó (misma `tipo` y `clave`), no se vuelve a mandar.
 *
 *   · **Impago**: uno cada día de los siete, con los días que quedan y que no se
 *     pierde nada (Richi, 25-sep).
 *   · **Solo lectura**: el día que pasa, uno.
 *   · **Fin de la prueba**: siete días antes de cobrar, con la fecha y el importe.
 */
export function elCorreoDeHoy(
  cuenta: LoQueSabeElReloj,
  ahora: Date,
  hoy: FechaOperativa,
): CorreoDeLaCuenta | null {
  const { suscripcion: s, nombre } = cuenta;
  if (s.deLaCasa || s.esEjemplo) return null;
  const ahoraEsta = comoEstaLaCuenta(s, ahora, hoy);

  if (s.estado === 'impago' && ahoraEsta.como === 'impago') {
    const quedan = ahoraEsta.diasQuedan ?? DIAS_DE_GRACIA;
    return {
      tipo: 'impago',
      clave: hoy,
      asunto:
        quedan === 1
          ? `${nombre}: hoy es el último día para pagar tu suscripción`
          : `${nombre}: no hemos podido cobrar tu suscripción · te quedan ${String(quedan)} días`,
      parrafos: [
        'No hemos podido cobrar la cuota de Estook con tu tarjeta. Puede que haya caducado, que no tenga saldo o que el banco la haya parado.',
        `Te ${quedan === 1 ? 'queda 1 día' : `quedan ${plural(quedan, 'día', 'días')}`} para arreglarlo. Si no, tu cuenta pasará a solo lectura: podrás verlo todo y llevarte tus datos, pero no apuntar nada. **No se pierde nada**, y en cuanto se cobre vuelve todo como estaba.`,
        `Para pagar o cambiar la tarjeta: ${A_SUSCRIPCION}`,
      ],
    };
  }

  if (s.estado === 'impago' && ahoraEsta.como === 'solo_lectura') {
    return {
      tipo: 'solo_lectura',
      clave: s.impagoDesde?.toISOString().slice(0, 10) ?? hoy,
      asunto: `${nombre}: tu cuenta está en solo lectura`,
      parrafos: [
        'Han pasado siete días sin poder cobrar la cuota, así que tu cuenta está en solo lectura: puedes verlo todo y llevarte tus datos, pero no apuntar nada.',
        '**No se ha perdido nada.** En cuanto pagues, vuelve todo tal cual estaba.',
        `Para pagar o cambiar la tarjeta: ${A_SUSCRIPCION}`,
      ],
    };
  }

  if (s.estado === 'prueba' && s.conStripe && s.pruebaHasta !== null) {
    const faltan = diasEntre(hoy, s.pruebaHasta);
    if (faltan >= 1 && faltan <= DIAS_DE_AVISO_ANTES_DE_COBRAR) {
      const cuanto =
        cuenta.cuota === null ? 'la cuota de tu plan' : conSimbolo(centimos(cuenta.cuota));
      return {
        tipo: 'fin_de_prueba',
        clave: s.pruebaHasta,
        asunto: `${nombre}: tu prueba de Estook acaba el ${fechaEnLetra(s.pruebaHasta)}`,
        parrafos: [
          `Tu prueba acaba el ${fechaEnLetra(s.pruebaHasta)}. Ese día se cobrará ${cuanto} en tu tarjeta y la suscripción seguirá sola.`,
          'Si no quieres seguir, cancélala antes de esa fecha y **no se te cobrará nada**.',
          A_SUSCRIPCION,
        ],
      };
    }
  }

  return null;
}

/** Días de calendario de una fecha a otra (las dos, «2026-09-25»). */
function diasEntre(desde: FechaOperativa, hasta: FechaOperativa): number {
  // Las dos a mediodía en UTC: la resta es siempre un múltiplo exacto de un día.
  return (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / UN_DIA;
}
