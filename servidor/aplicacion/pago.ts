import {
  PLANES,
  centimos,
  claveDelPrecio,
  porFraccion,
  comoEstaLaCuenta,
  dejaEscribir,
  dejaMirar,
  elEstadoDeStripe,
  laCuotaSinIva,
  type CodigoDePlan,
  type CodigoDeError,
  type EstadoDeSuscripcion,
  type FechaOperativa,
  type Intervalo,
  type LaCuentaAhora,
  type LaSuscripcion,
} from '@estook/dominio';
import { variable } from '@estook/utiles';
import {
  AVISOS_QUE_SE_PIDEN,
  StripeNoContesta,
  traducirCobro,
  traducirDevolucion,
  type CatalogoDeStripe,
  type CobroDeStripe,
  type PrecioQueHaceFalta,
  type SuscripcionDeStripe,
} from '../infraestructura/stripe.ts';
import { FalloDeAplicacion, type Contexto, type Puertas } from './contrato.ts';
import { comoLista } from './listas.ts';
import { apuntarUnFallo } from '../infraestructura/fallos.ts';

/**
 * El pago (entrega E2 · decisión 0048): la puerta, el catálogo de Stripe y lo que
 * pasa cuando Stripe avisa. Las operaciones que lo usan están en `comandos/pago.ts`
 * y `consultas/suscripcion.ts`.
 */

// ── Dónde vive cada cosa ─────────────────────────────────────────────────────

/** La API, vista desde fuera: donde Stripe manda sus avisos. La sabe el código (0036). */
export function laApiPublica(): string {
  return (
    variable('API_PUBLICA') ?? 'https://efgtzujwjztihyiwgpwg.supabase.co/functions/v1/api'
  ).replace(/\/+$/, '');
}

/** La app, vista desde fuera: a donde vuelve quien paga. */
export function laAppPublica(): string {
  const url = variable('APP_URL') ?? 'https://estook.com/app/';
  return url.endsWith('/') ? url : `${url}/`;
}

/** El día de hoy en Madrid, que es el de las fechas de la suscripción. */
export function hoyEnMadrid(ahora: Date): FechaOperativa {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(
    ahora,
  ) as FechaOperativa;
}

// ── El sistema ───────────────────────────────────────────────────────────────

/**
 * Lo que hace Estook y no una persona: preparar Stripe, recibir sus avisos y el
 * reloj. Las tablas de `plataforma` que guardan lo de Stripe solo las lee quien lo
 * declara así (`estook.es_el_sistema()`, 0047), dentro de la misma transacción y
 * solo mientras dura esto.
 */
export async function enNombreDelSistema<T>(
  contexto: Contexto,
  hacer: () => Promise<T>,
): Promise<T> {
  // **Se puede anidar** (0052): el reloj, ya como sistema, manda los correos de los
  // avisos, que también lo piden. Al salir se deja como estaba, no apagado: si no,
  // la llamada de dentro le quitaría el sistema a la de fuera a medio camino.
  const antes = await contexto.sql<{ valor: string }[]>`
    select coalesce(current_setting('estook.sistema', true), '') as valor
  `;
  const estaba = antes[0]?.valor === 'si' ? 'si' : 'no';
  await contexto.sql`select set_config('estook.sistema', 'si', true)`;
  try {
    return await hacer();
  } finally {
    await contexto.sql`select set_config('estook.sistema', ${estaba}, true)`;
  }
}

// ── La suscripción de una organización ───────────────────────────────────────

export interface FilaDeSuscripcion {
  readonly estado: EstadoDeSuscripcion;
  readonly plan: CodigoDePlan | null;
  readonly intervalo: Intervalo | null;
  readonly localesPagados: number | null;
  readonly localesActivos: number;
  readonly pruebaHasta: FechaOperativa | null;
  readonly periodoHasta: string | null;
  readonly cancelaAlAcabar: boolean;
  readonly impagoDesde: Date | null;
  readonly diasDePrueba: number | null;
  readonly deLaCasa: boolean;
  readonly esEjemplo: boolean;
  readonly stripeModo: 'prueba' | 'real' | null;
  readonly stripeCliente: string | null;
  readonly stripeSuscripcion: string | null;
  readonly tarjeta: string | null;
}

/** La lee quien ve la organización (la política de la 0018). */
export async function laSuscripcionDe(
  contexto: Contexto,
  organizacionId: string,
): Promise<FilaDeSuscripcion | null> {
  const filas = await contexto.sql<
    {
      estado: string;
      plan: string | null;
      intervalo: string | null;
      locales_pagados: number | null;
      locales_activos: number;
      prueba_hasta: string | null;
      periodo_hasta: string | null;
      cancela_al_acabar: boolean;
      impago_desde: string | null;
      dias_de_prueba: number | null;
      de_la_casa: boolean;
      es_ejemplo: boolean;
      stripe_modo: string | null;
      stripe_cliente: string | null;
      stripe_suscripcion: string | null;
      tarjeta: string | null;
    }[]
  >`
    select s.estado::text as estado, s.plan, s.intervalo, s.locales_pagados,
           (select count(*)::int from estook.local l where l.organizacion_id = o.id and l.activo) as locales_activos,
           to_char(s.prueba_hasta, 'YYYY-MM-DD') as prueba_hasta,
           s.periodo_hasta::text as periodo_hasta, s.cancela_al_acabar,
           s.impago_desde::text as impago_desde, s.dias_de_prueba, s.de_la_casa, o.es_ejemplo,
           s.stripe_modo, s.stripe_cliente, s.stripe_suscripcion, s.tarjeta
      from estook.suscripcion s
      join estook.organizacion o on o.id = s.organizacion_id
     where s.organizacion_id = ${organizacionId}
  `;
  const f = filas[0];
  if (f === undefined) return null;
  return {
    estado: f.estado as EstadoDeSuscripcion,
    plan: f.plan as CodigoDePlan | null,
    intervalo: f.intervalo as Intervalo | null,
    localesPagados: f.locales_pagados,
    localesActivos: f.locales_activos,
    pruebaHasta: f.prueba_hasta as FechaOperativa | null,
    periodoHasta: f.periodo_hasta === null ? null : new Date(f.periodo_hasta).toISOString(),
    cancelaAlAcabar: f.cancela_al_acabar,
    impagoDesde: f.impago_desde === null ? null : new Date(f.impago_desde),
    diasDePrueba: f.dias_de_prueba,
    deLaCasa: f.de_la_casa,
    esEjemplo: f.es_ejemplo,
    stripeModo: f.stripe_modo as 'prueba' | 'real' | null,
    stripeCliente: f.stripe_cliente,
    stripeSuscripcion: f.stripe_suscripcion,
    tarjeta: f.tarjeta,
  };
}

export function paraElDominio(f: FilaDeSuscripcion): LaSuscripcion {
  return {
    estado: f.estado,
    plan: f.plan,
    pruebaHasta: f.pruebaHasta,
    impagoDesde: f.impagoDesde,
    deLaCasa: f.deLaCasa,
    esEjemplo: f.esEjemplo,
    conStripe: f.stripeSuscripcion !== null,
  };
}

export function comoEstaAhora(f: FilaDeSuscripcion, ahora: Date): LaCuentaAhora {
  return comoEstaLaCuenta(paraElDominio(f), ahora, hoyEnMadrid(ahora));
}

// ── La quinta puerta ─────────────────────────────────────────────────────────

/**
 * La puerta del pago, detrás de las de la sesión y la del admin (0048).
 *
 * «Sin pago no hay app»: sin pagar no pasa nada, en solo lectura no pasa ningún
 * comando, y lo que tiene que pasar para pagar o irse lo declara la operación
 * (`sinPagar`). Se mira **en la base y en cada petición**, con la organización de
 * la sesión: la pantalla no puede saltársela, y llamar a la API a pelo tampoco.
 *
 * No aplica sin sesión (entrar, la carta), a las sesiones del admin ni a las
 * visitas de demostración, que ya no escriben.
 */
export async function porQueNoPasaElPago(
  contexto: Contexto,
  puertas: Puertas,
  para: 'consultar' | 'ejecutar',
): Promise<CodigoDeError | null> {
  const { sesion } = contexto;
  if (sesion === null || sesion.paraAdmin || sesion.esDemostracion || puertas.sinPagar) return null;
  if (sesion.organizacionId === null) return null;

  const fila = await laSuscripcionDe(contexto, sesion.organizacionId);
  // Sin fila no hay de qué juzgar: la 0018 le pone una a toda organización al nacer.
  if (fila === null) return null;

  const { como } = comoEstaAhora(fila, contexto.ahora);
  if (!dejaMirar(como)) return 'cuenta_sin_pagar';
  if (para === 'ejecutar' && !dejaEscribir(como)) return 'cuenta_en_solo_lectura';
  return null;
}

// ── El catálogo de Stripe ────────────────────────────────────────────────────

/** Lo que Estook vende, sacado de `PLANES`: un precio por plan y por intervalo. */
export function losPreciosDeEstook(): readonly PrecioQueHaceFalta[] {
  return PLANES.flatMap((plan) => {
    const precios: PrecioQueHaceFalta[] = [
      {
        clave: claveDelPrecio(plan.codigo, 'mes'),
        producto: `estook-${plan.codigo}`,
        nombreDelProducto: `Estook ${plan.nombre}`,
        centimos: plan.alMesPorLocal,
        intervalo: 'month',
      },
    ];
    if (plan.alAnoPorLocal !== null) {
      precios.push({
        clave: claveDelPrecio(plan.codigo, 'ano'),
        producto: `estook-${plan.codigo}`,
        nombreDelProducto: `Estook ${plan.nombre}`,
        centimos: plan.alAnoPorLocal,
        intervalo: 'year',
      });
    }
    return precios;
  });
}

export function lasDirecciones() {
  return {
    aviso: `${laApiPublica()}/stripe/aviso`,
    privacidad: 'https://estook.com/privacidad/',
    condiciones: 'https://estook.com/condiciones/',
    vuelta: `${laAppPublica()}#/ajustes/suscripcion`,
  };
}

/** Los pagos, o que no están abiertos. */
export function losPagos(contexto: Contexto) {
  if (contexto.pagos === null) throw new FalloDeAplicacion('pago_sin_abrir');
  return contexto.pagos;
}

/** Stripe se traduce a una frase nuestra: lo que contestó va al registro, no a la pantalla. */
export async function conStripe<T>(contexto: Contexto, hacer: () => Promise<T>): Promise<T> {
  try {
    return await hacer();
  } catch (fallo) {
    if (fallo instanceof StripeNoContesta) {
      await apuntarUnFallo(new Error(fallo.motivo), {
        mensaje: 'Stripe no ha contestado bien',
        correlacionId: contexto.correlacionId,
        extra: { estado: fallo.estado },
      });
      throw new FalloDeAplicacion('pago_no_disponible');
    }
    throw fallo;
  }
}

/**
 * El catálogo de Stripe de este modo: lo guardado, completado con lo que falte.
 * Se prepara la primera vez que hace falta y se reutiliza siempre.
 */
export async function elCatalogo(contexto: Contexto): Promise<CatalogoDeStripe> {
  const pagos = losPagos(contexto);
  return enNombreDelSistema(contexto, async () => {
    const filas = await contexto.sql<
      {
        precios: Record<string, string>;
        iva: string | null;
        portal: string | null;
        aviso: string | null;
        aviso_secreto: string | null;
        avisos: string[];
      }[]
    >`
      select precios, iva, portal, aviso, aviso_secreto, avisos from plataforma.stripe
       where modo = ${pagos.modo}
      for update
    `;
    const hay = filas[0];
    const preciosQueHacenFalta = losPreciosDeEstook();
    // Los avisos pedidos, también (0076): si el código pide uno más, se vuelve a
    // preparar, y preparar le cambia los avisos al de Stripe sin hacer otro.
    const completo =
      hay !== undefined &&
      hay.iva !== null &&
      hay.portal !== null &&
      hay.aviso !== null &&
      hay.aviso_secreto !== null &&
      preciosQueHacenFalta.every((p) => hay.precios[p.clave] !== undefined) &&
      AVISOS_QUE_SE_PIDEN.every((uno) => hay.avisos.includes(uno));
    if (completo) {
      return {
        precios: hay.precios,
        iva: hay.iva ?? '',
        portal: hay.portal ?? '',
        aviso: hay.aviso ?? '',
        avisoSecreto: hay.aviso_secreto ?? '',
      };
    }

    const catalogo = await conStripe(contexto, () =>
      pagos.prepararCatalogo(
        hay === undefined
          ? null
          : {
              precios: hay.precios,
              ...(hay.iva === null ? {} : { iva: hay.iva }),
              ...(hay.portal === null ? {} : { portal: hay.portal }),
              ...(hay.aviso === null ? {} : { aviso: hay.aviso }),
              ...(hay.aviso_secreto === null ? {} : { avisoSecreto: hay.aviso_secreto }),
            },
        lasDirecciones(),
        preciosQueHacenFalta,
      ),
    );
    await contexto.sql`
      insert into plataforma.stripe (
        modo, precios, iva, portal, aviso, aviso_secreto, avisos, preparado_en
      )
      values (${pagos.modo}, ${JSON.stringify(catalogo.precios)}::text::jsonb, ${catalogo.iva},
              ${catalogo.portal}, ${catalogo.aviso}, ${catalogo.avisoSecreto},
              ${comoLista([...AVISOS_QUE_SE_PIDEN])}::text::text[], now())
      on conflict (modo) do update
         set precios = excluded.precios, iva = excluded.iva, portal = excluded.portal,
             aviso = excluded.aviso, aviso_secreto = excluded.aviso_secreto,
             avisos = excluded.avisos, preparado_en = excluded.preparado_en
    `;
    return catalogo;
  });
}

// ── El descuento del primer mes (A3 · 0076) ──────────────────────────────────

/**
 * El cupón de Stripe de un tanto por ciento: el guardado, o se crea y se guarda. Uno
 * por tanto por ciento y modo, para todos los códigos que den lo mismo.
 */
export async function elCuponDe(contexto: Contexto, porcentaje: number): Promise<string> {
  const pagos = losPagos(contexto);
  // La fila de este modo tiene que existir para guardar el cupón en ella.
  await elCatalogo(contexto);
  return enNombreDelSistema(contexto, async () => {
    const filas = await contexto.sql<{ cupon: string | null }[]>`
      select cupones ->> ${String(porcentaje)} as cupon from plataforma.stripe
       where modo = ${pagos.modo}
    `;
    const guardado = filas[0]?.cupon ?? null;
    if (guardado !== null) return guardado;
    const cupon = await conStripe(contexto, () => pagos.prepararElCupon(porcentaje));
    await contexto.sql`
      update plataforma.stripe
         set cupones = cupones || jsonb_build_object(${String(porcentaje)}::text, ${cupon}::text)
       where modo = ${pagos.modo}
    `;
    return cupon;
  });
}

export interface DescuentoDeLaLlegada {
  /** El código con que llegó. */
  readonly codigo: string;
  /** El tanto por ciento del primer cobro mensual. */
  readonly porcentaje: number;
  /** Si ya se puso en Stripe, al acabar la prueba. */
  readonly puestoEn: string | null;
}

/**
 * El descuento del código con que llegó una organización, si lo hay. **Aunque el
 * código se haya cerrado después**: lo prometido a quien se registró con él se
 * cumple (0076). Lo lee el sistema: quien paga no ve nada de los vendedores.
 */
export async function elDescuentoDe(
  contexto: Contexto,
  organizacionId: string,
): Promise<DescuentoDeLaLlegada | null> {
  return enNombreDelSistema(contexto, async () => {
    const filas = await contexto.sql<
      { codigo: string; descuento: number; puesto_en: string | null }[]
    >`
      select c.codigo, c.descuento, l.descuento_puesto_en::text as puesto_en
        from plataforma.llegada l
        join plataforma.codigo_de_vendedor c on c.id = l.codigo_id
       where l.organizacion_id = ${organizacionId} and c.descuento > 0
    `;
    const fila = filas[0];
    return fila === undefined
      ? null
      : { codigo: fila.codigo, porcentaje: fila.descuento, puestoEn: fila.puesto_en };
  });
}

/**
 * Con prueba, el descuento se pone **cuando Stripe avisa de que la prueba acaba**:
 * así cae en el primer cobro de verdad y no en la factura de cero euros del principio,
 * que se lo gastaría. Una sola vez, y solo en el pago mensual: alargar la prueba
 * después no lo pone dos veces.
 */
async function ponerElDescuentoAlAcabarLaPrueba(
  contexto: Contexto,
  organizacionId: string,
  suscripcion: SuscripcionDeStripe,
): Promise<boolean> {
  if (suscripcion.estadoDeStripe !== 'trialing') return false;
  if (delNombreDelPrecio(suscripcion.clave)?.intervalo !== 'mes') return false;
  const descuento = await elDescuentoDe(contexto, organizacionId);
  if (descuento === null || descuento.puestoEn !== null) return false;

  const pagos = losPagos(contexto);
  const cupon = await elCuponDe(contexto, descuento.porcentaje);
  await conStripe(contexto, () =>
    pagos.cambiarSuscripcion(suscripcion.id, { linea: suscripcion.linea, cupon }),
  );
  await contexto.sql`
    update plataforma.llegada set descuento_puesto_en = now()
     where organizacion_id = ${organizacionId}
  `;
  return true;
}

// ── Lo que dice Stripe, guardado ─────────────────────────────────────────────

/** El plan y el intervalo, de su nombre en Stripe (`estook-pro-mes-v1`). */
export function delNombreDelPrecio(
  clave: string | null,
): { plan: CodigoDePlan; intervalo: Intervalo } | null {
  const partes = /^estook-(esencial|pro|cadena|pausa)-(mes|ano)-v\d+$/.exec(clave ?? '');
  if (partes === null) return null;
  return { plan: partes[1] as CodigoDePlan, intervalo: partes[2] as Intervalo };
}

/**
 * Guarda en la suscripción lo que dice Stripe, **leído de Stripe** y no del aviso.
 * El estado lo traduce el dominio; el impago cuenta desde el primer fallo.
 */
export async function aplicarLoDeStripe(
  contexto: Contexto,
  organizacionId: string,
  s: SuscripcionDeStripe,
  modo: 'prueba' | 'real',
  quien: string,
  porque: string,
): Promise<void> {
  const estado = elEstadoDeStripe(s.estadoDeStripe);
  const delPrecio = delNombreDelPrecio(s.clave);
  const cambios = {
    estado,
    ...(delPrecio === null ? {} : { plan: delPrecio.plan, intervalo: delPrecio.intervalo }),
    locales_pagados: Math.max(1, s.cantidad),
    prueba_hasta: s.pruebaHasta,
    periodo_hasta: s.periodoHasta,
    cancela_al_acabar: s.cancelaAlAcabar,
    impago: estado === 'impago',
    stripe_modo: modo,
    stripe_cliente: s.cliente,
    stripe_suscripcion: s.id,
    tarjeta: s.tarjeta,
  };
  await contexto.sql`
    select estook.cambiar_la_suscripcion(
      ${organizacionId}::uuid, ${JSON.stringify(cambios)}::text::jsonb, ${quien}, ${porque}
    )
  `;
  // Y lo que le cobra de verdad, con el precio con el que se apuntó (A4 · 0077): quien
  // entró en Pro a 79 € sigue pagando 79 €, aunque hoy cueste 99 €.
  if (s.importe !== null) {
    await contexto.sql`
      select plataforma.apuntar_la_cuota_de_stripe(${organizacionId}::uuid, ${s.importe}::integer, ${modo})
    `;
  }
}

// ── Lo cobrado y lo devuelto (A4 · 0077) ─────────────────────────────────────

/** De quién es un cliente de Stripe. Nulo si no es de nadie que conozcamos. */
async function laOrganizacionDelCliente(
  contexto: Contexto,
  cliente: string,
): Promise<string | null> {
  const filas = await contexto.sql<{ organizacion_id: string }[]>`
    select organizacion_id from estook.los_clientes() where stripe_cliente = ${cliente} limit 1
  `;
  return filas[0]?.organizacion_id ?? null;
}

/**
 * Lo que es sin IVA de lo cobrado, como lo dice la factura. Lo normal es que se pague
 * entera; si no (un saldo a favor que pagó una parte), la parte que le toca.
 */
export function loCobradoSinIva(cobro: CobroDeStripe): number {
  const sinIva =
    cobro.total === cobro.importe || cobro.total <= 0
      ? cobro.totalSinIva
      : porFraccion(centimos(cobro.totalSinIva), cobro.importe / cobro.total);
  return Math.min(Math.max(0, sinIva), cobro.importe);
}

/**
 * Apunta un cobro, **una vez** (la factura es la clave). Ya dentro del sistema.
 * Devuelve si era nuevo.
 */
export async function apuntarElCobro(
  contexto: Contexto,
  cobro: CobroDeStripe,
  modo: 'prueba' | 'real',
): Promise<boolean> {
  const organizacionId = await laOrganizacionDelCliente(contexto, cobro.cliente);
  if (organizacionId === null) return false;
  const nuevo = await contexto.sql<{ id: string }[]>`
    insert into plataforma.cobro (id, organizacion_id, modo, cobrado_en, importe, sin_iva, motivo)
    values (${cobro.id}, ${organizacionId}::uuid, ${modo}, ${cobro.cobradoEn}::timestamptz,
            ${cobro.importe}, ${loCobradoSinIva(cobro)}, ${cobro.motivo})
    on conflict (id) do nothing
    returning id
  `;
  return nuevo.length > 0;
}

/**
 * Apunta lo devuelto de un cargo **desde la última vez**: Stripe dice lo devuelto en
 * total, y aquí se resta lo que ya estaba. Repetir el aviso no suma nada.
 */
export async function apuntarLaDevolucion(
  contexto: Contexto,
  devolucion: { readonly cargo: string; readonly cliente: string; readonly devuelto: number },
  modo: 'prueba' | 'real',
): Promise<boolean> {
  const organizacionId = await laOrganizacionDelCliente(contexto, devolucion.cliente);
  if (organizacionId === null) return false;
  const [ya] = await contexto.sql<{ suma: number }[]>`
    select coalesce(sum(importe), 0)::integer as suma from plataforma.devolucion where cargo = ${devolucion.cargo}
  `;
  const ahora = devolucion.devuelto - (ya?.suma ?? 0);
  if (ahora <= 0) return false;
  await contexto.sql`
    insert into plataforma.devolucion (cargo, organizacion_id, modo, devuelto_en, importe, sin_iva)
    values (${devolucion.cargo}, ${organizacionId}::uuid, ${modo}, ${contexto.ahora.toISOString()}::timestamptz,
            ${ahora}, ${laCuotaSinIva(ahora)})
  `;
  return true;
}

/** Cambia la suscripción con lo que diga el código (no Stripe): el cliente nuevo, los días de prueba. */
export async function cambiarLaSuscripcion(
  contexto: Contexto,
  organizacionId: string,
  cambios: Record<string, unknown>,
  quien: string,
  porque: string,
): Promise<void> {
  await contexto.sql`
    select estook.cambiar_la_suscripcion(
      ${organizacionId}::uuid, ${JSON.stringify(cambios)}::text::jsonb, ${quien}, ${porque}
    )
  `;
}

// ── El aviso de Stripe ───────────────────────────────────────────────────────

/** De qué suscripción habla un aviso, sea cual sea su tipo. */
export function laSuscripcionDelAviso(objeto: Record<string, unknown>): string | null {
  if (objeto['object'] === 'subscription')
    return typeof objeto['id'] === 'string' ? objeto['id'] : null;
  if (typeof objeto['subscription'] === 'string') return objeto['subscription'];
  // Desde 2025, la factura dice su suscripción dentro de `parent`.
  const padre = objeto['parent'] as
    { subscription_details?: { subscription?: unknown } } | undefined;
  const suya = padre?.subscription_details?.subscription;
  return typeof suya === 'string' ? suya : null;
}

/**
 * Un aviso de Stripe, ya con la firma comprobada: se apunta una vez, se vuelve a
 * leer la suscripción a Stripe y se guarda. Devuelve qué ha hecho, para el registro.
 */
export async function aplicarElAviso(
  contexto: Contexto,
  evento: {
    readonly id: string;
    readonly type: string;
    readonly data: { readonly object: Record<string, unknown> };
  },
): Promise<'repetido' | 'aplicado' | 'sin_suscripcion' | 'sin_organizacion'> {
  const pagos = losPagos(contexto);
  return enNombreDelSistema(contexto, async () => {
    const nuevo = await contexto.sql<{ id: string }[]>`
      insert into plataforma.aviso_de_stripe (id, tipo) values (${evento.id}, ${evento.type})
      on conflict (id) do nothing
      returning id
    `;
    if (nuevo.length === 0) return 'repetido';

    // Lo devuelto (A4 · 0077) no habla de ninguna suscripción: es de un cargo.
    if (evento.type === 'charge.refunded') {
      const devolucion = traducirDevolucion(evento.data.object);
      if (devolucion === null) return 'sin_organizacion';
      return (await apuntarLaDevolucion(contexto, devolucion, pagos.modo))
        ? 'aplicado'
        : 'sin_organizacion';
    }
    // Lo cobrado (A4 · 0077), con lo que dice la factura firmada; y después, como
    // siempre, el estado de la suscripción leído de Stripe.
    if (evento.type === 'invoice.paid') {
      const cobro = traducirCobro(evento.data.object);
      if (cobro !== null) await apuntarElCobro(contexto, cobro, pagos.modo);
    }

    const id = laSuscripcionDelAviso(evento.data.object);
    if (id === null) return 'sin_suscripcion';

    const suscripcion = await conStripe(contexto, () => pagos.leerSuscripcion(id));
    const organizacionId =
      suscripcion.organizacionId ??
      (typeof evento.data.object['client_reference_id'] === 'string'
        ? evento.data.object['client_reference_id']
        : null);
    if (organizacionId === null) return 'sin_organizacion';

    await aplicarLoDeStripe(
      contexto,
      organizacionId,
      suscripcion,
      pagos.modo,
      'stripe',
      evento.type,
    );
    if (evento.type === 'customer.subscription.trial_will_end') {
      await ponerElDescuentoAlAcabarLaPrueba(contexto, organizacionId, suscripcion);
    }
    return 'aplicado';
  });
}
