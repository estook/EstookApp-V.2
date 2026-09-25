import {
  aDondeEntra,
  comoEstaLaCuenta,
  type CodigoDePlan,
  type EstadoDeSuscripcion,
  type FechaOperativa,
  type QuienAcabaDeEntrar,
  type ResolucionDeDestino,
} from '@estook/dominio';
import type { Contexto } from './contrato.ts';
import type { Sql } from '../infraestructura/postgres.ts';

/**
 * Lo que comparten entrar, saber a donde, y cambiar de contexto (M4).
 *
 * Vive aparte por la regla 6: las seis comprobaciones se hacen **en un sitio**.
 * Si `entrar` resolviera el destino por su cuenta y `donde_entro` lo resolviera
 * por la suya, un dia dirian cosas distintas y nadie sabria cual de las dos
 * miente.
 *
 * Aqui solo se **lee y se prepara**. La decision la toma `aDondeEntra`, que es
 * calculo puro y vive en `@estook/dominio` con su prueba al lado.
 */

/**
 * Todo lo que hace falta saber de quien acaba de entrar.
 *
 * Se lee **con la identidad ya declarada**, asi que las politicas de M1 aplican:
 * `locales_visibles` no devuelve un local que no sea suyo por mucho que la
 * consulta lo pida. No se comprueba a quien pertenece nada; se pregunta, y lo
 * que no vuelve es que no se puede ver.
 */
export async function reunirParaDecidir(
  sql: Sql,
  sesion: { readonly organizacionId: string | null; readonly localId: string | null } | null,
): Promise<QuienAcabaDeEntrar> {
  const organizaciones = await sql<
    {
      id: string;
      nombre: string;
      estado: string;
      plan: string | null;
      prueba_hasta: string | null;
      impago_desde: string | null;
      de_la_casa: boolean;
      es_ejemplo: boolean;
      con_stripe: boolean;
      // Nulo cuando la membresia ya no esta vigente: la organizacion se sigue
      // viendo un rato por `organizaciones_visibles`, pero ya no es suya.
      alcance: string | null;
    }[]
  >`
    select o.id,
           o.nombre,
           coalesce(s.estado::text, 'prueba') as estado,
           -- Lo que hace falta para saber cómo está de verdad (0048): una prueba
           -- vieja que ya acabó, un impago de más de siete días, lo de la casa.
           s.plan, to_char(s.prueba_hasta, 'YYYY-MM-DD') as prueba_hasta,
           s.impago_desde::text as impago_desde, coalesce(s.de_la_casa, false) as de_la_casa,
           o.es_ejemplo, s.stripe_suscripcion is not null as con_stripe,
           -- El alcance mas amplio que tiene aqui. El orden importa: quien es
           -- gerente de un local y ademas area manager de la zona entra por lo
           -- segundo, que es lo que dice «gana el mas amplio».
           (
             select m.alcance::text
               from estook.membresia m
              where m.organizacion_id = o.id
                and m.persona_id = estook.persona_actual()
                and m.desde <= current_date
                and (m.hasta is null or m.hasta >= current_date)
                and (m.revocada_en is null or m.revocada_en > now())
              order by case m.alcance
                         when 'organizacion' then 1
                         when 'area' then 2
                         else 3
                       end
              limit 1
           ) as alcance
      from estook.organizacion o
      left join estook.suscripcion s on s.organizacion_id = o.id
     where o.activa
       and o.id in (select organizacion_id from estook.organizaciones_visibles())
     order by o.nombre
  `;

  const locales = await sql<
    {
      id: string;
      nombre: string;
      organizacion_id: string;
      onboarding_terminado: boolean;
    }[]
  >`
    select l.id, l.nombre, l.organizacion_id, l.onboarding_terminado
      from estook.local l
     where l.id in (select local_id from estook.locales_visibles())
     order by l.nombre
  `;

  return {
    organizaciones: organizaciones
      // Una membresia caducada deja la organizacion sin alcance: entonces ya no
      // es suya y no cuenta. Pasa entre que caduca y que alguien la borra.
      .filter((o) => o.alcance !== null)
      .map((o) => ({
        id: o.id,
        nombre: o.nombre,
        estado: comoEntra(o),
        alcance: o.alcance as 'organizacion' | 'area' | 'local',
      })),
    locales: locales.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      organizacionId: l.organizacion_id,
      onboardingTerminado: l.onboarding_terminado,
    })),
    organizacionElegida: sesion?.organizacionId ?? null,
    localElegido: sesion?.localId ?? null,
  };
}

/** Las seis comprobaciones, con lo que hace falta para pintar la pantalla. */
export interface Destino extends ResolucionDeDestino {
  /** Para pintar «¿en que empresa?» sin otra consulta. */
  readonly organizaciones: QuienAcabaDeEntrar['organizaciones'];
  /** Para pintar «¿donde estas hoy?» sin otra consulta. */
  readonly locales: QuienAcabaDeEntrar['locales'];
}

export async function decidirDestino(
  sql: Sql,
  sesion: { readonly organizacionId: string | null; readonly localId: string | null } | null,
): Promise<Destino> {
  const quien = await reunirParaDecidir(sql, sesion);
  return { ...aDondeEntra(quien), organizaciones: quien.organizaciones, locales: quien.locales };
}

/**
 * Guarda el contexto en la sesion.
 *
 * «Cambiar de local **no cierra la sesion**: cambia el contexto» (Manifiesto 28).
 * Se escribe aqui y no en el navegador, porque el navegador no puede decidir a
 * que local mira: eso lo decide el servidor con lo que las politicas le dejan ver.
 */
export async function guardarContexto(
  contexto: Contexto,
  organizacionId: string | null,
  localId: string | null,
): Promise<void> {
  if (contexto.sesion === null) return;

  await contexto.sql`
    update estook.sesion
       set organizacion_id = ${organizacionId},
           local_id = ${localId}
     where id = ${contexto.sesion.id}
  `;
}

/**
 * Con qué estado se decide a dónde entra (0048): el de la base, **leído con la
 * fecha**. Una prueba vieja sin tarjeta que ya acabó entra a elegir plan, igual que
 * una pendiente de pago; un impago de más de siete días entra en solo lectura; y lo
 * que trabaja (al día, en prueba, en los siete días de un impago) entra normal.
 */
function comoEntra(o: {
  estado: string;
  plan: string | null;
  prueba_hasta: string | null;
  impago_desde: string | null;
  de_la_casa: boolean;
  es_ejemplo: boolean;
  con_stripe: boolean;
}): QuienAcabaDeEntrar['organizaciones'][number]['estado'] {
  const ahora = new Date(Date.now());
  const { como } = comoEstaLaCuenta(
    {
      estado: o.estado as EstadoDeSuscripcion,
      plan: o.plan as CodigoDePlan | null,
      pruebaHasta: o.prueba_hasta as FechaOperativa | null,
      impagoDesde: o.impago_desde === null ? null : new Date(o.impago_desde),
      deLaCasa: o.de_la_casa,
      esEjemplo: o.es_ejemplo,
      conStripe: o.con_stripe,
    },
    ahora,
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(ahora) as FechaOperativa,
  );
  if (como === 'sin_pagar') return 'pendiente_de_pago';
  if (como === 'solo_lectura') return 'solo_lectura';
  return 'activa';
}
