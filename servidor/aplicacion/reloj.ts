import {
  elCorreoDeHoy,
  elPlanPorLosLocales,
  laCuota,
  claveDelPrecio,
  type CodigoDePlan,
  type EstadoDeSuscripcion,
  type FechaOperativa,
  type Intervalo,
} from '@estook/dominio';
import type { Contexto } from './contrato.ts';
import { correoDeLaCuenta } from './correos.ts';
import {
  aplicarLoDeStripe,
  conStripe,
  elCatalogo,
  enNombreDelSistema,
  hoyEnMadrid,
} from './pago.ts';

/**
 * El reloj (0016, montado en la 0048).
 *
 * `pg_cron` llama cada hora a `POST /tareas/latir` con el secreto que generó la
 * migración 0047. El latido apunta que ha latido —`bd:comprobar-api` lo mira— y,
 * **una vez al día a partir de las ocho de la mañana de Madrid**, hace lo del día:
 *
 *   1 · El correo de cada cuenta que le toque: el de cada día de impago, el de solo
 *       lectura y el de fin de prueba. Cada uno una vez (`plataforma.correo_de_la_cuenta`).
 *   2 · Cuadrar los locales con Stripe, por si al crear uno no se pudo.
 *
 * Si algo falla a medias, el día no se da por hecho y el latido de la hora siguiente
 * lo vuelve a intentar; lo que ya salió no se repite.
 */

const HORA_DEL_DIARIO = 8;

export interface LoQueHizoElReloj {
  readonly diario: boolean;
  readonly correos: number;
  readonly cuadrados: number;
  readonly fallos: number;
}

/** El secreto del reloj, comparado por su huella: la base no guarda el secreto. */
async function huellaDe(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function laHoraEnMadrid(ahora: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      hour12: false,
    }).format(ahora),
  );
}

interface Cuenta {
  organizacion_id: string;
  nombre: string;
  es_ejemplo: boolean;
  estado: string;
  plan: string | null;
  intervalo: string | null;
  locales_pagados: number | null;
  locales_activos: number;
  prueba_hasta: string | null;
  impago_desde: string | null;
  de_la_casa: boolean;
  stripe_modo: string | null;
  stripe_suscripcion: string | null;
  correos: string[];
}

/** Nulo si el secreto no vale: quien no es el reloj no provoca un latido. */
export async function latir(
  contexto: Contexto,
  secreto: string | null,
): Promise<LoQueHizoElReloj | null> {
  if (secreto === null || secreto === '') return null;
  const huella = await huellaDe(secreto);

  return enNombreDelSistema(contexto, async () => {
    const reloj = await contexto.sql<{ ultimo_diario: string | null }[]>`
      update plataforma.reloj set ultimo_latido = now()
       where unica and huella = ${huella}
      returning to_char(ultimo_diario, 'YYYY-MM-DD') as ultimo_diario
    `;
    const fila = reloj[0];
    if (fila === undefined) return null;

    const hoy = hoyEnMadrid(contexto.ahora);
    if (fila.ultimo_diario === hoy || laHoraEnMadrid(contexto.ahora) < HORA_DEL_DIARIO) {
      return { diario: false, correos: 0, cuadrados: 0, fallos: 0 };
    }

    const hecho = await elDiario(contexto, hoy);
    if (hecho.fallos === 0) {
      await contexto.sql`update plataforma.reloj set ultimo_diario = ${hoy}::date where unica`;
    }
    return { diario: true, ...hecho };
  });
}

/** Lo del día, cuenta a cuenta. Ya dentro del sistema. */
async function elDiario(
  contexto: Contexto,
  hoy: FechaOperativa,
): Promise<{ correos: number; cuadrados: number; fallos: number }> {
  const cuentas = await contexto.sql<Cuenta[]>`
    select organizacion_id, nombre, es_ejemplo, estado, plan, intervalo, locales_pagados,
           locales_activos, to_char(prueba_hasta, 'YYYY-MM-DD') as prueba_hasta,
           impago_desde::text as impago_desde, de_la_casa, stripe_modo, stripe_suscripcion, correos
      from estook.las_cuentas()
  `;

  let correos = 0;
  let cuadrados = 0;
  let fallos = 0;

  for (const cuenta of cuentas) {
    const plan = cuenta.plan as CodigoDePlan | null;
    const intervalo = (cuenta.intervalo ?? 'mes') as Intervalo;

    // 1 · El correo de hoy.
    const correo = elCorreoDeHoy(
      {
        nombre: cuenta.nombre,
        suscripcion: {
          estado: cuenta.estado as EstadoDeSuscripcion,
          plan,
          pruebaHasta: cuenta.prueba_hasta as FechaOperativa | null,
          impagoDesde: cuenta.impago_desde === null ? null : new Date(cuenta.impago_desde),
          deLaCasa: cuenta.de_la_casa,
          esEjemplo: cuenta.es_ejemplo,
          conStripe: cuenta.stripe_suscripcion !== null,
        },
        cuota: plan === null ? null : laCuota(plan, intervalo, cuenta.locales_pagados ?? 1),
      },
      contexto.ahora,
      hoy,
    );
    if (correo !== null && contexto.correo !== null && cuenta.correos.length > 0) {
      const nuevo = await contexto.sql<{ tipo: string }[]>`
        insert into plataforma.correo_de_la_cuenta (organizacion_id, tipo, clave)
        values (${cuenta.organizacion_id}, ${correo.tipo}, ${correo.clave})
        on conflict do nothing
        returning tipo
      `;
      if (nuevo.length > 0) {
        try {
          for (const para of cuenta.correos) {
            await contexto.correo.mandar(correoDeLaCuenta(para, correo));
          }
          correos += 1;
        } catch (fallo) {
          fallos += 1;
          // Se deja sin apuntar, para que lo intente el latido siguiente.
          await contexto.sql`
            delete from plataforma.correo_de_la_cuenta
             where organizacion_id = ${cuenta.organizacion_id} and tipo = ${correo.tipo} and clave = ${correo.clave}
          `;
          console.error(
            JSON.stringify({
              nivel: 'error',
              mensaje: 'el correo de la cuenta no ha salido',
              correlacion_id: contexto.correlacionId,
              detalle: fallo instanceof Error ? fallo.message : String(fallo),
            }),
          );
        }
      }
    }

    // 2 · Los locales, cuadrados con Stripe.
    const pagos = contexto.pagos;
    const cobraEsto =
      pagos !== null &&
      cuenta.stripe_suscripcion !== null &&
      cuenta.stripe_modo === pagos.modo &&
      !cuenta.de_la_casa &&
      plan !== null &&
      plan !== 'pausa' &&
      (cuenta.estado === 'activa' || cuenta.estado === 'prueba') &&
      cuenta.locales_activos > 0 &&
      (cuenta.locales_activos !== cuenta.locales_pagados ||
        elPlanPorLosLocales(plan, cuenta.locales_activos) !== plan);
    if (cobraEsto) {
      const idDeStripe = cuenta.stripe_suscripcion ?? '';
      try {
        const catalogo = await elCatalogo(contexto);
        const elQueToca = elPlanPorLosLocales(plan, cuenta.locales_activos);
        const actual = await conStripe(contexto, () => pagos.leerSuscripcion(idDeStripe));
        const nueva = await conStripe(contexto, () =>
          pagos.cambiarSuscripcion(idDeStripe, {
            linea: actual.linea,
            cantidad: cuenta.locales_activos,
            ...(elQueToca === plan
              ? {}
              : { precio: catalogo.precios[claveDelPrecio(elQueToca, intervalo)] ?? '' }),
          }),
        );
        await aplicarLoDeStripe(
          contexto,
          cuenta.organizacion_id,
          nueva,
          pagos.modo,
          'reloj',
          'los locales, cuadrados',
        );
        cuadrados += 1;
      } catch (fallo) {
        fallos += 1;
        console.error(
          JSON.stringify({
            nivel: 'error',
            mensaje: 'no se han podido cuadrar los locales con Stripe',
            correlacion_id: contexto.correlacionId,
            detalle: fallo instanceof Error ? fallo.message : String(fallo),
          }),
        );
      }
    }
  }

  return { correos, cuadrados, fallos };
}
