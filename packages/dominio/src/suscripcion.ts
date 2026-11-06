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

/**
 * **Estook TPV es de Pro** (0120; Richi, 28-oct: «TPV es únicamente Pro»). Cadena es Pro en
 * cada local, y durante la prueba vale el plan elegido. Esencial y Pausa, no. La casa (IKATZ,
 * «prueba en modo Pro») y los locales de ejemplo, donde se practica, lo tienen todo. Lo mira la
 * API en cada petición de un aparato; la pantalla solo lo pinta.
 */
export function llevaEstookTpv(s: Pick<LaSuscripcion, 'plan' | 'deLaCasa' | 'esEjemplo'>): boolean {
  if (s.deLaCasa || s.esEjemplo) return true;
  return s.plan === 'pro' || s.plan === 'cadena';
}

// ── El plan y lo que cuesta ──────────────────────────────────────────────────

/**
 * El plan que toca por los locales que hay.
 *
 * **Pro con dos locales o más pasa a Cadena**, que es Pro para grupos y más barato
 * por local (89 € frente a 99 €): nadie paga más por crecer. Y al revés, Cadena con
 * un local vuelve a Pro. Esencial y Pausa no dependen de los locales.
 */
export function elPlanPorLosLocales(plan: CodigoDePlan, locales: number): CodigoDePlan {
  if (plan === 'pro' && locales >= 2) return 'cadena';
  if (plan === 'cadena' && locales < 2) return 'pro';
  return plan;
}

/**
 * Por qué versión va el precio de cada plan. **Un precio de Stripe no se cambia, se
 * sustituye**: subir un plan es subirle aquí la versión, y el catálogo crea el precio
 * nuevo la primera vez que hace falta. Desde la 0135 (6-nov-2026) todos son **sin IVA**,
 * con el IVA aparte (`tax_behavior: exclusive`): Esencial va por la 2, Pro y Cadena por
 * la 3 y Pausa por la 2. Quien pagaba con un precio de antes sigue con él hasta que
 * cambie de plan; nadie paga todavía de verdad (solo hay pagos de prueba).
 */
const VERSION_DEL_PRECIO: Readonly<Record<CodigoDePlan, number>> = {
  esencial: 2,
  pro: 3,
  cadena: 3,
  pausa: 2,
};

/** El nombre del precio en Stripe (`estook-pro-mes-v2`). */
export function claveDelPrecio(plan: CodigoDePlan, intervalo: Intervalo): string {
  return `estook-${plan}-${intervalo}-v${String(VERSION_DEL_PRECIO[plan])}`;
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
  readonly tipo: 'impago' | 'solo_lectura' | 'fin_de_prueba' | 'fin_de_pausa';
  readonly clave: string;
  readonly asunto: string;
  /** Párrafos. El que manda el correo los pinta. */
  readonly parrafos: readonly string[];
}

export interface LoQueSabeElReloj {
  readonly nombre: string;
  readonly suscripcion: LaSuscripcion;
  /** Lo que se paga cada periodo, en céntimos y **sin IVA**. */
  readonly cuota: number | null;
  /** Si está en Pausa: cuándo empezó y a qué plan vuelve (0135). */
  readonly pausa?: LaPausa | null;
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
        cuenta.cuota === null
          ? 'la cuota de tu plan'
          : `${conSimbolo(centimos(cuenta.cuota))} más IVA`;
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

  const pausa = cuenta.pausa ?? null;
  if (s.plan === 'pausa' && pausa !== null) {
    const acaba = cuandoAcabaLaPausa(pausa.empezo);
    const faltan = diasEntre(hoy, acaba);
    if (faltan >= 1 && faltan <= DIAS_DE_AVISO_ANTES_DE_VOLVER) {
      const vuelveA = planPorCodigo(pausa.vuelveA)?.nombre ?? 'tu plan';
      return {
        tipo: 'fin_de_pausa',
        clave: acaba,
        asunto: `${nombre}: tu Pausa acaba el ${fechaEnLetra(acaba)}`,
        parrafos: [
          `Tu Pausa llega a los seis meses el ${fechaEnLetra(acaba)}. Ese día vuelves solo a ${vuelveA}, como tenías antes, y todo se abre otra vez para apuntar.`,
          'Si reabres antes, vuelve cuando quieras desde Ajustes → Suscripción: se cobra solo la parte del mes que quede.',
          'Si no vas a seguir, cancela antes de esa fecha y no se te cobrará nada más.',
        ],
      };
    }
  }

  return null;
}

// ── La Pausa (0135) ──────────────────────────────────────────────────────────

/**
 * La Pausa, con las reglas que dijo Richi (0130 y 6-nov-2026, 0135): para el chiringuito
 * que cierra en invierno o el local en obras. **La cuenta queda en solo lectura por 9 € al
 * mes**, empieza **al instante**, se vuelve **cuando se quiera y sin penalización** —se
 * cobra solo la parte del mes que queda, como hacen todas— y **dura hasta seis meses**: si
 * llega, vuelve sola al plan de antes, con un correo siete días antes. **Una vez cada doce
 * meses**, contados desde que empezó la anterior. No se elige cuándo se vuelve: «que vuelva
 * cuando pueda volver, más libre y justo» (Richi).
 */
export const MESES_DE_PAUSA = 6;
export const MESES_ENTRE_PAUSAS = 12;
export const DIAS_DE_AVISO_ANTES_DE_VOLVER = 7;

export interface LaPausa {
  /** El día que empezó, en Madrid. */
  readonly empezo: FechaOperativa;
  /** El plan al que vuelve: el que tenía al pausar. */
  readonly vuelveA: CodigoDePlan;
}

/** Un día y unos meses más tarde; si ese mes es más corto, su último día (31-ago + 6 = 28-feb). */
export function masMeses(fecha: FechaOperativa, meses: number): FechaOperativa {
  const [anio, mes, dia] = fecha.split('-').map(Number) as [number, number, number];
  const total = anio * 12 + (mes - 1) + meses;
  const nuevoAnio = Math.floor(total / 12);
  const nuevoMes = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(nuevoAnio, nuevoMes, 0)).getUTCDate();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${String(nuevoAnio)}-${dos(nuevoMes)}-${dos(Math.min(dia, ultimo))}` as FechaOperativa;
}

/** El día que la Pausa llega a los seis meses: ese día vuelve sola. */
export function cuandoAcabaLaPausa(empezo: FechaOperativa): FechaOperativa {
  return masMeses(empezo, MESES_DE_PAUSA);
}

/** Desde qué día se puede volver a pausar: doce meses después de la anterior. */
export function cuandoSePuedeOtraPausa(empezoLaAnterior: FechaOperativa): FechaOperativa {
  return masMeses(empezoLaAnterior, MESES_ENTRE_PAUSAS);
}

/** Si toca volver hoy al plan de antes: la Pausa ha llegado a sus seis meses. */
export function tocaVolverDeLaPausa(empezo: FechaOperativa, hoy: FechaOperativa): boolean {
  return hoy >= cuandoAcabaLaPausa(empezo);
}

export type PorQueNoSePausa = 'ya_en_pausa' | 'en_prueba' | 'sin_pagar' | 'una_al_ano';

/**
 * Si se puede pausar hoy, o por qué no. La pantalla lo enseña y la API lo cumple.
 *
 *   · **En la prueba no hace falta**: no se paga nada, y quien cierra cancela.
 *   · **Con un cobro pendiente o en solo lectura, no**: primero se paga lo que se debe.
 *   · **Una al año**: doce meses desde que empezó la anterior.
 */
export function porQueNoSePuedePausar(
  s: { readonly estado: EstadoDeSuscripcion; readonly plan: CodigoDePlan | null },
  ultimaPausa: FechaOperativa | null,
  hoy: FechaOperativa,
): { readonly porque: PorQueNoSePausa; readonly desde: FechaOperativa | null } | null {
  if (s.plan === 'pausa') return { porque: 'ya_en_pausa', desde: null };
  if (s.estado === 'prueba') return { porque: 'en_prueba', desde: null };
  if (s.estado !== 'activa' || s.plan === null) return { porque: 'sin_pagar', desde: null };
  if (ultimaPausa !== null) {
    const desde = cuandoSePuedeOtraPausa(ultimaPausa);
    if (hoy < desde) return { porque: 'una_al_ano', desde };
  }
  return null;
}

/** Lo que se le dice a quien no puede pausar. Corto, y con qué hacer. */
export function porQueNoSePausaEnLetra(no: {
  readonly porque: PorQueNoSePausa;
  readonly desde: FechaOperativa | null;
}): string {
  switch (no.porque) {
    case 'ya_en_pausa':
      return 'Tu cuenta ya está en Pausa.';
    case 'en_prueba':
      return 'En la prueba no se paga nada: si cierras, cancela y no se te cobrará.';
    case 'sin_pagar':
      return 'Para pausar, la suscripción tiene que estar al día.';
    case 'una_al_ano':
      return `La Pausa se puede una vez al año: la siguiente, desde el ${fechaEnLetra(no.desde ?? ('' as FechaOperativa))}.`;
  }
}

/** Días de calendario de una fecha a otra (las dos, «2026-09-25»). */
function diasEntre(desde: FechaOperativa, hasta: FechaOperativa): number {
  // Las dos a mediodía en UTC: la resta es siempre un múltiplo exacto de un día.
  return (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / UN_DIA;
}
