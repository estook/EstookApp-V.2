import {
  DIAS_QUE_SE_GUARDA_UN_AVISO,
  comoEstaLaCuenta,
  elCorreoDeHoy,
  elPlanPorLosLocales,
  laCuota,
  claveDelPrecio,
  type CodigoDePlan,
  type EstadoDeSuscripcion,
  type FechaOperativa,
  type Intervalo,
} from '@estook/dominio';
import {
  hacerLoProgramado,
  limpiarLoDelMovil,
  mandarLoDelMovil,
  programarLoDelMovil,
  type LoQueHizoElMovil,
} from './al-movil.ts';
import { mandarLosCorreosDeLosAvisos } from './avisos.ts';
import { hacerLaFotoDelUso } from './clientes.ts';
import { loQueAvisaElReloj } from './lo-que-avisa-el-reloj.ts';
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
 *   3 · La foto del uso de cada cliente, para el admin.
 *   4 · Borrar los avisos de hace más de un mes (0052).
 *   5 · Lo que avisa por su cuenta (R2 · 0053): mañana toca pedir, los informes, lo
 *       que está bajo mínimo y la nota en Google (`lo-que-avisa-el-reloj.ts`). Sus
 *       correos salen al acabar, en el mismo latido.
 *
 * Y **cada hora**, los correos de los avisos que no salieron al momento (0052), y lo
 * del móvil (0070): apuntar lo que toca en la hora siguiente —«entras en cinco
 * minutos», lo que caduca, el pedido que no llega— y reintentar lo que no salió.
 *
 * **Y cada minuto, solo si hace falta**, el latido del móvil (`latidoDelMovil`): la
 * base mira si hay algo que mandar y solo entonces llama (0054).
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
  /** Los avisos que ha dejado lo del día (R2): mañana toca pedir, informes… */
  readonly avisos: number;
  /** Las notas de Google puestas al día (R2). */
  readonly notas: number;
  /** Lo que se ha apuntado para mandar al móvil en la hora siguiente (0070). */
  readonly programados: number;
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

/**
 * **A quién se le avisa**: a las cuentas que pagan o están en prueba, y a las de la
 * casa. Ni a los ejemplos ni a quien está en impago o en solo lectura (R2).
 */
function seLeAvisa(cuenta: Cuenta, ahora: Date, hoy: FechaOperativa): boolean {
  const como = comoEstaLaCuenta(
    {
      estado: cuenta.estado as EstadoDeSuscripcion,
      plan: cuenta.plan as CodigoDePlan | null,
      pruebaHasta: cuenta.prueba_hasta as FechaOperativa | null,
      impagoDesde: cuenta.impago_desde === null ? null : new Date(cuenta.impago_desde),
      deLaCasa: cuenta.de_la_casa,
      esEjemplo: cuenta.es_ejemplo,
      conStripe: cuenta.stripe_suscripcion !== null,
    },
    ahora,
    hoy,
  ).como;
  return !cuenta.es_ejemplo && (como === 'al_dia' || como === 'prueba');
}

async function lasCuentas(contexto: Contexto): Promise<Cuenta[]> {
  return contexto.sql<Cuenta[]>`
    select organizacion_id, nombre, es_ejemplo, estado, plan, intervalo, locales_pagados,
           locales_activos, to_char(prueba_hasta, 'YYYY-MM-DD') as prueba_hasta,
           impago_desde::text as impago_desde, de_la_casa, stripe_modo, stripe_suscripcion, correos
      from estook.las_cuentas()
  `;
}

/** Algo del reloj que falla se apunta y no para lo demás. */
async function sinPararElReloj<T>(
  contexto: Contexto,
  que: string,
  hacer: () => Promise<T>,
): Promise<T | null> {
  try {
    return await hacer();
  } catch (fallo) {
    console.error(
      JSON.stringify({
        nivel: 'error',
        mensaje: `el reloj no ha podido ${que}`,
        correlacion_id: contexto.correlacionId,
        detalle: fallo instanceof Error ? fallo.message : String(fallo),
      }),
    );
    return null;
  }
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

    // Cada hora, los correos de avisos que no salieron al momento (0052). Un correo
    // que no sale se queda pendiente para la hora siguiente; no para el reloj.
    try {
      await mandarLosCorreosDeLosAvisos(contexto);
    } catch (fallo) {
      console.error(
        JSON.stringify({
          nivel: 'error',
          mensaje: 'el reloj no ha podido mandar los correos de los avisos',
          correlacion_id: contexto.correlacionId,
          detalle: fallo instanceof Error ? fallo.message : String(fallo),
        }),
      );
    }

    const hoy = hoyEnMadrid(contexto.ahora);

    // Cada hora, lo del móvil (0070): lo que toca en la hora siguiente, lo que no salió y
    // la limpieza. Sin claves VAPID se apunta igual: lo que avisa llega a la campana.
    const cuentas = await lasCuentas(contexto);
    const programados =
      (await sinPararElReloj(contexto, 'apuntar lo del móvil', () =>
        programarLoDelMovil(
          contexto,
          cuentas
            .filter((c) => seLeAvisa(c, contexto.ahora, hoy))
            .map((c) => ({ organizacionId: c.organizacion_id })),
        ),
      )) ?? 0;
    await sinPararElReloj(contexto, 'limpiar lo del móvil', () => limpiarLoDelMovil(contexto));
    await sinPararElReloj(contexto, 'mandar lo del móvil', () => mandarLoDelMovil(contexto));

    if (fila.ultimo_diario === hoy || laHoraEnMadrid(contexto.ahora) < HORA_DEL_DIARIO) {
      return {
        diario: false,
        correos: 0,
        cuadrados: 0,
        fallos: 0,
        avisos: 0,
        notas: 0,
        programados,
      };
    }

    const hecho = await elDiario(contexto, hoy);
    if (hecho.fallos === 0) {
      await contexto.sql`update plataforma.reloj set ultimo_diario = ${hoy}::date where unica`;
    }

    // Los correos de lo que acaba de avisar (los informes del lunes, sobre todo): no
    // esperan a la hora siguiente.
    try {
      await mandarLosCorreosDeLosAvisos(contexto);
    } catch (fallo) {
      console.error(
        JSON.stringify({
          nivel: 'error',
          mensaje: 'el reloj no ha podido mandar los correos de lo del día',
          correlacion_id: contexto.correlacionId,
          detalle: fallo instanceof Error ? fallo.message : String(fallo),
        }),
      );
    }
    return { diario: true, ...hecho, programados };
  });
}

/**
 * **El latido del móvil** (0070): `pg_cron` lo llama, con el mismo secreto que el de
 * cada hora, **solo el minuto en que hay algo que mandar** (lo mira la base, 0054).
 * Hace lo programado que ya toca, manda lo que espera y, si algo no llegó al móvil,
 * su correo. Nulo si el secreto no vale.
 */
export async function latidoDelMovil(
  contexto: Contexto,
  secreto: string | null,
): Promise<LoQueHizoElMovil | null> {
  if (secreto === null || secreto === '') return null;
  const huella = await huellaDe(secreto);

  return enNombreDelSistema(contexto, async () => {
    const reloj = await contexto.sql<{ unica: boolean }[]>`
      select unica from plataforma.reloj where unica and huella = ${huella}
    `;
    if (reloj[0] === undefined) return null;

    const hechos =
      (await sinPararElReloj(contexto, 'hacer lo programado del móvil', () =>
        hacerLoProgramado(contexto),
      )) ?? 0;
    const mandado = (await sinPararElReloj(contexto, 'mandar lo del móvil', () =>
      mandarLoDelMovil(contexto),
    )) ?? { mandados: 0, esperan: 0, alCorreo: 0 };
    // Lo que no llegó al móvil y lo quería por correo, sale ahora, no dentro de una hora.
    if (mandado.alCorreo > 0) {
      await sinPararElReloj(contexto, 'mandar los correos de repuesto', () =>
        mandarLosCorreosDeLosAvisos(contexto),
      );
    }
    return { ...mandado, programados: 0, hechos };
  });
}

/** Lo del día, cuenta a cuenta. Ya dentro del sistema. */
async function elDiario(
  contexto: Contexto,
  hoy: FechaOperativa,
): Promise<{ correos: number; cuadrados: number; fallos: number; avisos: number; notas: number }> {
  const cuentas = await lasCuentas(contexto);

  let correos = 0;
  let cuadrados = 0;
  let fallos = 0;

  // Las que pagan o están en prueba —y las de la casa—, para lo que avisa el reloj (R2).
  const queSeAvisan: { organizacionId: string }[] = [];

  for (const cuenta of cuentas) {
    const plan = cuenta.plan as CodigoDePlan | null;
    const intervalo = (cuenta.intervalo ?? 'mes') as Intervalo;
    const suscripcion = {
      estado: cuenta.estado as EstadoDeSuscripcion,
      plan,
      pruebaHasta: cuenta.prueba_hasta as FechaOperativa | null,
      impagoDesde: cuenta.impago_desde === null ? null : new Date(cuenta.impago_desde),
      deLaCasa: cuenta.de_la_casa,
      esEjemplo: cuenta.es_ejemplo,
      conStripe: cuenta.stripe_suscripcion !== null,
    };
    if (seLeAvisa(cuenta, contexto.ahora, hoy)) {
      queSeAvisan.push({ organizacionId: cuenta.organizacion_id });
    }

    // 1 · El correo de hoy.
    const correo = elCorreoDeHoy(
      {
        nombre: cuenta.nombre,
        suscripcion,
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

  // 3 · La foto del uso de cada cliente, para el admin (A2 · 0041): «la actividad se
  // calcula cada noche» (Richi, 25-sep). Si falla, el día se repite en el latido
  // siguiente, como los correos.
  try {
    await hacerLaFotoDelUso(contexto, hoy);
  } catch (fallo) {
    fallos += 1;
    console.error(
      JSON.stringify({
        nivel: 'error',
        mensaje: 'no se ha podido hacer la foto del uso de los clientes',
        correlacion_id: contexto.correlacionId,
        detalle: fallo instanceof Error ? fallo.message : String(fallo),
      }),
    );
  }

  // 4 · Los avisos de hace más de un mes: ya no avisan de nada (0052).
  await contexto.sql`
    delete from estook.aviso
     where actualizado_en < ${contexto.ahora.toISOString()}::timestamptz
                            - make_interval(days => ${DIAS_QUE_SE_GUARDA_UN_AVISO})
  `;

  // 5 · Lo que avisa el reloj (R2 · 0053), de las cuentas que pagan o están en
  // prueba. Sus fallos se apuntan y no hacen repetir el día: no cobran ni escriben
  // nada que no vuelva a salir mañana (`lo-que-avisa-el-reloj.ts`).
  const avisado = await loQueAvisaElReloj(contexto, queSeAvisan);

  return { correos, cuadrados, fallos, avisos: avisado.avisos, notas: avisado.notas };
}
