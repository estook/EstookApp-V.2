import { variable } from '@estook/utiles';

/**
 * El pago, con Stripe (entrega E2 · decisión 0048).
 *
 * Un puerto, como el correo y Google: la capa de aplicación sabe cobrar y no sabe
 * que detrás está Stripe. **Se enciende al poner `STRIPE_SECRET_KEY`** en los
 * secretos de Supabase; sin ella es nulo, y pagar dice que el pago no está abierto
 * en vez de romperse (0022). En las pruebas va uno de mentira
 * (`pagos-de-mentira.ts`), que hace lo mismo sin salir de la máquina.
 *
 * ── Sin librería ─────────────────────────────────────────────────────────────
 *
 * Como con Resend y Google: unas pocas llamadas `fetch`, con los campos que dice la
 * documentación de Stripe y ninguno más (regla 7), y **la versión de su API fija**.
 * Sin fijarla, un cambio de Stripe en su versión por defecto movería campos debajo
 * del código: en 2025 sacó el fin del periodo de la suscripción a sus líneas.
 */

export const VERSION_DE_STRIPE = '2026-08-26.dahlia';

const RAIZ = 'https://api.stripe.com/v1';

export type ModoDeStripe = 'prueba' | 'real';

/** Lo que el código ha creado en Stripe, y se guarda en `plataforma.stripe`. */
export interface CatalogoDeStripe {
  /** De `claveDelPrecio` al identificador del precio. */
  readonly precios: Readonly<Record<string, string>>;
  readonly iva: string;
  readonly portal: string;
  readonly aviso: string;
  /** El secreto con el que Stripe firma sus avisos. Solo lo da al crear el aviso. */
  readonly avisoSecreto: string;
}

/** Lo que Estook necesita saber de una suscripción de Stripe, ya traducido. */
export interface SuscripcionDeStripe {
  readonly id: string;
  readonly estadoDeStripe: string;
  readonly cliente: string;
  readonly organizacionId: string | null;
  /** La línea de la suscripción: se cambia por su identificador. */
  readonly linea: string;
  /** El nombre del precio (`estook-pro-mes-v1`), de donde salen el plan y el intervalo. */
  readonly clave: string | null;
  readonly cantidad: number;
  /** «2026-10-07», en hora de Madrid. */
  readonly pruebaHasta: string | null;
  /** Cuándo acaba el periodo pagado, o la prueba. */
  readonly periodoHasta: string | null;
  readonly cancelaAlAcabar: boolean;
  /** «Visa ···· 4242». */
  readonly tarjeta: string | null;
}

export interface DatosDelPago {
  readonly cliente: string;
  readonly precio: string;
  readonly cantidad: number;
  readonly diasDePrueba: number | null;
  readonly organizacionId: string;
  readonly iva: string;
  /** A dónde vuelve al pagar. Lleva `{CHECKOUT_SESSION_ID}`, que pone Stripe. */
  readonly exito: string;
  /** A dónde vuelve si se echa atrás. */
  readonly cancelar: string;
  /** El texto junto al botón de pagar: la renovación y cómo cancelar. */
  readonly aviso: string;
}

export interface DireccionesDeEstook {
  /** Donde Stripe manda sus avisos. */
  readonly aviso: string;
  readonly privacidad: string;
  readonly condiciones: string;
  /** A donde vuelve el portal: Ajustes → Suscripción. */
  readonly vuelta: string;
}

export interface Pagos {
  readonly modo: ModoDeStripe;
  /** Crea lo que falte en Stripe y lo devuelve todo. Se puede llamar las veces que haga falta. */
  prepararCatalogo(
    hay: Partial<CatalogoDeStripe> | null,
    en: DireccionesDeEstook,
    precios: readonly PrecioQueHaceFalta[],
  ): Promise<CatalogoDeStripe>;
  crearCliente(datos: {
    readonly correo: string;
    readonly nombre: string;
    readonly organizacionId: string;
  }): Promise<string>;
  /** La página de pago de Stripe (Checkout). */
  crearPago(datos: DatosDelPago): Promise<{ readonly id: string; readonly url: string }>;
  /** El portal: la tarjeta, las facturas y los datos de facturación. */
  crearPortal(cliente: string, configuracion: string, vuelta: string): Promise<string>;
  leerSuscripcion(id: string): Promise<SuscripcionDeStripe>;
  /** Lo que dejó una página de pago: la suscripción y el cliente, si se pagó. */
  leerPago(id: string): Promise<{
    readonly suscripcion: string | null;
    readonly cliente: string | null;
    readonly organizacionId: string | null;
  }>;
  cambiarSuscripcion(
    id: string,
    cambios: {
      readonly linea: string;
      readonly precio?: string;
      readonly cantidad?: number;
      readonly cancelarAlAcabar?: boolean;
    },
  ): Promise<SuscripcionDeStripe>;
}

/** Stripe no ha contestado bien. Lleva lo que dijo, para el registro y no para la pantalla. */
export class StripeNoContesta extends Error {
  readonly estado: number;
  readonly motivo: string;

  constructor(estado: number, motivo = '') {
    super(`Stripe ha contestado ${estado}${motivo === '' ? '' : `: ${motivo}`}`);
    this.name = 'StripeNoContesta';
    this.estado = estado;
    this.motivo = motivo;
  }
}

// ── El formulario de Stripe ──────────────────────────────────────────────────

type Valor = string | number | boolean | null | undefined | Valor[] | { [clave: string]: Valor };

/**
 * Stripe no recibe JSON: recibe un formulario con los objetos aplanados
 * (`line_items[0][price]`). Lo nulo o sin definir no se manda.
 */
export function aFormulario(datos: Record<string, Valor>): URLSearchParams {
  const pares = new URLSearchParams();
  const meter = (clave: string, valor: Valor) => {
    if (valor === null || valor === undefined) return;
    if (Array.isArray(valor)) {
      valor.forEach((uno, i) => {
        meter(`${clave}[${String(i)}]`, uno);
      });
    } else if (typeof valor === 'object') {
      for (const [dentro, uno] of Object.entries(valor)) meter(`${clave}[${dentro}]`, uno);
    } else {
      pares.append(clave, String(valor));
    }
  };
  for (const [clave, valor] of Object.entries(datos)) meter(clave, valor);
  return pares;
}

// ── La firma de los avisos ───────────────────────────────────────────────────

/** Cinco minutos, lo mismo que las librerías de Stripe. Nunca cero. */
export const MARGEN_DE_LA_FIRMA_S = 300;

function aHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Igual o no, sin decir por el tiempo en qué letra se ha parado. */
function igualesSinPrisa(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distinto = 0;
  for (let i = 0; i < a.length; i += 1) distinto |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return distinto === 0;
}

/**
 * Si un aviso lo manda Stripe de verdad.
 *
 * La cabecera `Stripe-Signature` trae `t=<segundos>` y una o más `v1=<hex>`; lo
 * firmado es `<t>.<cuerpo tal cual>` con HMAC-SHA256 y el secreto del aviso. Se
 * ignora todo lo que no sea `v1` (el `v0` de pruebas incluido, que es el camino de
 * un ataque de degradación) y lo que llegue con más de cinco minutos.
 */
export async function laFirmaEsDeStripe(
  cuerpo: string,
  cabecera: string | null,
  secreto: string,
  ahoraS: number,
): Promise<boolean> {
  if (cabecera === null || secreto === '') return false;
  let momento: number | null = null;
  const firmas: string[] = [];
  for (const trozo of cabecera.split(',')) {
    const [clave, valor] = trozo.split('=', 2).map((x) => x.trim());
    if (clave === 't' && valor !== undefined && /^\d+$/.test(valor)) momento = Number(valor);
    if (clave === 'v1' && valor !== undefined) firmas.push(valor);
  }
  if (momento === null || firmas.length === 0) return false;
  if (Math.abs(ahoraS - momento) > MARGEN_DE_LA_FIRMA_S) return false;

  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const esperada = aHex(
    await crypto.subtle.sign(
      'HMAC',
      clave,
      new TextEncoder().encode(`${String(momento)}.${cuerpo}`),
    ),
  );
  return firmas.some((firma) => igualesSinPrisa(firma, esperada));
}

/** Firma un aviso como lo firma Stripe. Solo para las pruebas y el Stripe de mentira. */
export async function firmarComoStripe(
  cuerpo: string,
  secreto: string,
  ahoraS: number,
): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = aHex(
    await crypto.subtle.sign(
      'HMAC',
      clave,
      new TextEncoder().encode(`${String(ahoraS)}.${cuerpo}`),
    ),
  );
  return `t=${String(ahoraS)},v1=${firma}`;
}

// ── Lo que se crea en Stripe ─────────────────────────────────────────────────

/** Los avisos que se piden a Stripe: los que cambian el estado de una cuenta. */
export const AVISOS_QUE_SE_PIDEN = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
] as const;

/** Cada plan, su producto; cada precio, su nombre. Los importes, del dominio (`PLANES`). */
export interface PrecioQueHaceFalta {
  readonly clave: string;
  readonly producto: string;
  readonly nombreDelProducto: string;
  readonly centimos: number;
  readonly intervalo: 'month' | 'year';
}

/** La fecha de Madrid de un instante de Stripe (segundos). */
export function fechaDeMadrid(segundos: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(
    new Date(segundos * 1000),
  );
}

function laMarca(marca: string): string {
  const conocidas: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };
  return conocidas[marca] ?? marca.charAt(0).toUpperCase() + marca.slice(1);
}

/** Lo que devuelve Stripe de una suscripción, a lo que Estook entiende. */
export function traducirSuscripcion(s: Record<string, unknown>): SuscripcionDeStripe {
  const lineas = (s['items'] as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];
  const linea = lineas[0] ?? {};
  const precio = (linea['price'] ?? {}) as Record<string, unknown>;
  const metadatos = (s['metadata'] ?? {}) as Record<string, string>;
  const pago = s['default_payment_method'];
  const tarjeta =
    typeof pago === 'object' && pago !== null
      ? ((pago as Record<string, unknown>)['card'] as
          { brand?: string; last4?: string } | undefined)
      : undefined;
  const finDelPeriodo =
    (linea['current_period_end'] as number | undefined) ??
    (s['current_period_end'] as number | undefined) ??
    null;
  const estado = typeof s['status'] === 'string' ? s['status'] : '';
  const finDePrueba = s['trial_end'] as number | null | undefined;

  return {
    id: String(s['id']),
    estadoDeStripe: estado,
    cliente: String(s['customer']),
    organizacionId: metadatos['organizacion_id'] ?? null,
    linea: typeof linea['id'] === 'string' ? linea['id'] : '',
    clave: (precio['lookup_key'] as string | null | undefined) ?? null,
    cantidad: Number(linea['quantity'] ?? 1),
    pruebaHasta:
      estado === 'trialing' && typeof finDePrueba === 'number' ? fechaDeMadrid(finDePrueba) : null,
    periodoHasta: finDelPeriodo === null ? null : new Date(finDelPeriodo * 1000).toISOString(),
    cancelaAlAcabar:
      estado !== 'canceled' &&
      (s['cancel_at_period_end'] === true || typeof s['cancel_at'] === 'number'),
    tarjeta:
      tarjeta?.brand !== undefined && tarjeta.last4 !== undefined
        ? `${laMarca(tarjeta.brand)} ···· ${tarjeta.last4}`
        : null,
  };
}

/**
 * El Stripe de verdad. Nulo sin clave, y el modo lo dice la clave: `sk_test_` o
 * `rk_test_` es de prueba; `sk_live_` o `rk_live_`, real.
 */
export function pagosDeStripe(
  clave: string | undefined = variable('STRIPE_SECRET_KEY'),
): Pagos | null {
  if (clave === undefined || clave.trim() === '') return null;
  const laClave = clave.trim();
  const modo: ModoDeStripe = /^(sk|rk)_live_/.test(laClave) ? 'real' : 'prueba';

  async function pedir<T>(
    metodo: 'GET' | 'POST' | 'DELETE',
    camino: string,
    datos: Record<string, Valor> = {},
    idempotencia?: string,
  ): Promise<T> {
    const formulario = aFormulario(datos).toString();
    const conCuerpo = metodo === 'POST';
    const respuesta = await fetch(
      `${RAIZ}${camino}${!conCuerpo && formulario !== '' ? `?${formulario}` : ''}`,
      {
        method: metodo,
        headers: {
          Authorization: `Bearer ${laClave}`,
          'Stripe-Version': VERSION_DE_STRIPE,
          ...(conCuerpo ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          ...(idempotencia === undefined ? {} : { 'Idempotency-Key': idempotencia }),
        },
        ...(conCuerpo ? { body: formulario } : {}),
      },
    );
    const leido = (await respuesta.json().catch(() => null)) as
      (T & { error?: { message?: string } }) | null;
    if (!respuesta.ok || leido === null) {
      throw new StripeNoContesta(respuesta.status, leido?.error?.message?.slice(0, 400) ?? '');
    }
    return leido;
  }

  async function losPrecios(
    hay: Readonly<Record<string, string>>,
    hacenFalta: readonly PrecioQueHaceFalta[],
  ): Promise<Record<string, string>> {
    const faltan = hacenFalta.filter((p) => hay[p.clave] === undefined);
    const resultado: Record<string, string> = { ...hay };
    if (faltan.length === 0) return resultado;

    // Los que ya existan en Stripe (de otra vez) se encuentran por su nombre.
    const encontrados = await pedir<{ data: { id: string; lookup_key: string | null }[] }>(
      'GET',
      '/prices',
      { active: true, limit: 100, lookup_keys: faltan.map((p) => p.clave) },
    );
    for (const precio of encontrados.data) {
      if (precio.lookup_key !== null) resultado[precio.lookup_key] = precio.id;
    }

    for (const falta of faltan) {
      if (resultado[falta.clave] !== undefined) continue;
      // El producto, con su identificador fijo: si ya existe, Stripe lo dice y se sigue.
      await pedir('POST', '/products', {
        id: falta.producto,
        name: falta.nombreDelProducto,
        metadata: { estook: falta.producto },
      }).catch((fallo: unknown) => {
        if (!(fallo instanceof StripeNoContesta) || fallo.estado !== 400) throw fallo;
      });
      const creado = await pedir<{ id: string }>(
        'POST',
        '/prices',
        {
          product: falta.producto,
          currency: 'eur',
          unit_amount: falta.centimos,
          recurring: { interval: falta.intervalo },
          lookup_key: falta.clave,
          tax_behavior: 'inclusive',
          nickname: falta.clave,
        },
        `precio-${falta.clave}`,
      );
      resultado[falta.clave] = creado.id;
    }
    return resultado;
  }

  async function elIva(hay: string | undefined): Promise<string> {
    if (hay !== undefined) return hay;
    const lista = await pedir<{ data: { id: string; metadata: Record<string, string> }[] }>(
      'GET',
      '/tax_rates',
      { active: true, inclusive: true, limit: 100 },
    );
    const suyo = lista.data.find((t) => t.metadata['estook'] === 'iva-21');
    if (suyo !== undefined) return suyo.id;
    const creado = await pedir<{ id: string }>(
      'POST',
      '/tax_rates',
      {
        display_name: 'IVA',
        description: 'IVA general, incluido en el precio',
        percentage: 21,
        inclusive: true,
        country: 'ES',
        tax_type: 'vat',
        metadata: { estook: 'iva-21' },
      },
      'iva-21',
    );
    return creado.id;
  }

  async function elPortal(hay: string | undefined, en: DireccionesDeEstook): Promise<string> {
    if (hay !== undefined) return hay;
    const creado = await pedir<{ id: string }>('POST', '/billing_portal/configurations', {
      business_profile: {
        headline: 'Estook · tu suscripción',
        privacy_policy_url: en.privacidad,
        terms_of_service_url: en.condiciones,
      },
      default_return_url: en.vuelta,
      features: {
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
        customer_update: { enabled: true, allowed_updates: ['email', 'name', 'address', 'tax_id'] },
        // Cancelar y cambiar de plan, en Ajustes → Suscripción (Richi, 25-sep).
        subscription_cancel: { enabled: false },
        subscription_update: { enabled: false },
      },
    });
    return creado.id;
  }

  async function elAviso(
    hay: { aviso?: string; avisoSecreto?: string },
    url: string,
  ): Promise<{ aviso: string; avisoSecreto: string }> {
    if (hay.aviso !== undefined && hay.avisoSecreto !== undefined) {
      const sigue = await pedir<{ id: string; url: string }>(
        'GET',
        `/webhook_endpoints/${hay.aviso}`,
      ).catch((fallo: unknown) => {
        if (fallo instanceof StripeNoContesta && fallo.estado === 404) return null;
        throw fallo;
      });
      if (sigue !== null && sigue.url === url)
        return { aviso: hay.aviso, avisoSecreto: hay.avisoSecreto };
    }
    // El secreto solo lo da al crearlo: uno que ya exista sin su secreto no sirve, y
    // se sustituye.
    const todos = await pedir<{ data: { id: string; url: string }[] }>(
      'GET',
      '/webhook_endpoints',
      {
        limit: 100,
      },
    );
    for (const viejo of todos.data.filter((a) => a.url === url)) {
      await pedir('DELETE', `/webhook_endpoints/${viejo.id}`);
    }
    const creado = await pedir<{ id: string; secret: string }>('POST', '/webhook_endpoints', {
      url,
      enabled_events: [...AVISOS_QUE_SE_PIDEN],
      api_version: VERSION_DE_STRIPE,
      description: 'Estook · el estado de cada cuenta (0048)',
    });
    return { aviso: creado.id, avisoSecreto: creado.secret };
  }

  return {
    modo,

    async prepararCatalogo(hay, en, hacenFalta) {
      const precios = await losPrecios(hay?.precios ?? {}, hacenFalta);
      const iva = await elIva(hay?.iva);
      const portal = await elPortal(hay?.portal, en);
      const aviso = await elAviso(
        {
          ...(hay?.aviso === undefined ? {} : { aviso: hay.aviso }),
          ...(hay?.avisoSecreto === undefined ? {} : { avisoSecreto: hay.avisoSecreto }),
        },
        en.aviso,
      );
      return { precios, iva, portal, ...aviso };
    },

    async crearCliente({ correo, nombre, organizacionId }) {
      const creado = await pedir<{ id: string }>(
        'POST',
        '/customers',
        {
          email: correo,
          name: nombre,
          preferred_locales: ['es'],
          metadata: { organizacion_id: organizacionId },
        },
        `cliente-${organizacionId}`,
      );
      return creado.id;
    },

    async crearPago(d) {
      const creado = await pedir<{ id: string; url: string }>('POST', '/checkout/sessions', {
        mode: 'subscription',
        customer: d.cliente,
        client_reference_id: d.organizacionId,
        locale: 'es',
        line_items: [{ price: d.precio, quantity: d.cantidad }],
        subscription_data: {
          default_tax_rates: [d.iva],
          metadata: { organizacion_id: d.organizacionId },
          ...(d.diasDePrueba === null
            ? {}
            : {
                trial_period_days: d.diasDePrueba,
                trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
              }),
        },
        payment_method_collection: 'always',
        billing_address_collection: 'required',
        tax_id_collection: { enabled: true },
        customer_update: { address: 'auto', name: 'auto' },
        allow_promotion_codes: true,
        success_url: d.exito,
        cancel_url: d.cancelar,
        custom_text: { submit: { message: d.aviso } },
        metadata: { organizacion_id: d.organizacionId },
      });
      return { id: creado.id, url: creado.url };
    },

    async crearPortal(cliente, configuracion, vuelta) {
      const creado = await pedir<{ url: string }>('POST', '/billing_portal/sessions', {
        customer: cliente,
        configuration: configuracion,
        return_url: vuelta,
        locale: 'es',
      });
      return creado.url;
    },

    async leerSuscripcion(id) {
      return traducirSuscripcion(
        await pedir<Record<string, unknown>>('GET', `/subscriptions/${id}`, {
          expand: ['default_payment_method'],
        }),
      );
    },

    async leerPago(id) {
      const sesion = await pedir<Record<string, unknown>>('GET', `/checkout/sessions/${id}`);
      return {
        suscripcion: (sesion['subscription'] as string | null) ?? null,
        cliente: (sesion['customer'] as string | null) ?? null,
        organizacionId: (sesion['client_reference_id'] as string | null) ?? null,
      };
    },

    async cambiarSuscripcion(id, cambios) {
      return traducirSuscripcion(
        await pedir<Record<string, unknown>>('POST', `/subscriptions/${id}`, {
          ...(cambios.precio === undefined && cambios.cantidad === undefined
            ? {}
            : {
                items: [{ id: cambios.linea, price: cambios.precio, quantity: cambios.cantidad }],
                proration_behavior: 'create_prorations',
              }),
          cancel_at_period_end: cambios.cancelarAlAcabar,
          expand: ['default_payment_method'],
        }),
      );
    },
  };
}
