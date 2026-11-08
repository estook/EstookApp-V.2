import { z } from 'zod';
import {
  claveDelPrecio,
  elPlanPorLosLocales,
  porQueNoSePausaEnLetra,
  porQueNoSePuedePausar,
  type CodigoDePlan,
  type Intervalo,
} from '@estook/dominio';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { decidirDestino, guardarContexto } from '../acceso.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import {
  aplicarLoDeStripe,
  cambiarLaSuscripcion,
  conStripe,
  elCatalogo,
  elCuponDe,
  elDescuentoDe,
  hoyEnMadrid,
  laAppPublica,
  laSuscripcionDe,
  losPagos,
  volverDeLaPausa,
  type FilaDeSuscripcion,
} from '../pago.ts';

/**
 * Pagar y llevar la suscripción (entrega E2 · decisión 0048).
 *
 * Todas piden «Plan y facturación» (`dato.facturacion`), que tienen quien dirige la
 * organización y su administrador de cuenta, y todas pasan **aunque la cuenta no
 * esté pagada** (`sinPagar`): son justo lo que hace falta para pagar.
 */

const PLANES_QUE_SE_ELIGEN = ['esencial', 'pro', 'cadena', 'pausa'] as const;

/**
 * El texto junto al botón de pagar de Stripe: la renovación y cómo cancelar (0048,
 * ocho). Con prueba y un descuento de código, se dice que el descuento va en el primer
 * cobro: la página de Stripe no puede enseñarlo, porque se pone al acabar la prueba.
 */
function elAvisoDelPago(diasDePrueba: number | null, descuentoAlAcabar: number | null): string {
  const renovacion =
    'La suscripción se renueva sola al final de cada periodo, al precio de tu plan más IVA. La cancelas cuando quieras en Estook, en Ajustes → Suscripción, y sigue hasta el final de lo pagado.';
  const conDescuento =
    descuentoAlAcabar === null
      ? ''
      : ` Con tu código, ese primer cobro lleva un ${String(descuentoAlAcabar)} % de descuento.`;
  return diasDePrueba === null
    ? renovacion
    : `Hoy no se cobra nada: tu prueba dura ${String(diasDePrueba)} días y el primer cobro es al acabar.${conDescuento} Si cancelas antes, no se te cobra nada. ${renovacion}`;
}

async function laMia(
  contexto: Contexto,
): Promise<{ organizacionId: string; fila: FilaDeSuscripcion }> {
  const organizacionId = laOrganizacionDeLaSesion(contexto);
  const fila = await laSuscripcionDe(contexto, organizacionId);
  if (fila === null) throw new FalloDeAplicacion('no_existe');
  return { organizacionId, fila };
}

/** Si la suscripción de Stripe es de este modo (una de prueba no vale con la clave real). */
function tieneStripe(
  fila: FilaDeSuscripcion,
  modo: string,
): fila is FilaDeSuscripcion & { stripeSuscripcion: string } {
  return fila.stripeSuscripcion !== null && fila.stripeModo === modo;
}

// ── Empezar a pagar ──────────────────────────────────────────────────────────

export const entradaEmpezarAPagar = z
  .object({
    plan: z.enum(['esencial', 'pro', 'cadena']),
    intervalo: z.enum(['mes', 'ano']),
    /**
     * Cuántos locales se pagan (la pausa del 8-nov, 0142): se dice al pagar, y en el alta solo
     * se les pone nombre. Nunca menos de los que ya hay. Cadena llega hasta diez.
     */
    locales: z.number().int().min(1).max(10).optional(),
  })
  .strict();

/**
 * La página de pago de Stripe, para la organización de la sesión.
 *
 * El plan se ajusta a los locales (Pro con dos o más es Cadena) y la cantidad son los
 * locales que dice al pagar, nunca menos de los activos (0142). Los días de prueba son los que se guardaron al crear la cuenta, y
 * solo la primera vez: quien ya tuvo una suscripción no vuelve a probar gratis.
 */
export const empezarAPagar = comando<z.infer<typeof entradaEmpezarAPagar>, { url: string }>({
  nombre: 'empezar_a_pagar',
  entrada: entradaEmpezarAPagar,
  exige: 'dato.facturacion',
  sinPagar: true,

  async ejecutar(contexto, entrada) {
    const pagos = losPagos(contexto);
    const { organizacionId, fila } = await laMia(contexto);
    if (fila.deLaCasa)
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Esta cuenta es de la casa: no se cobra.',
      });
    if (
      tieneStripe(fila, pagos.modo) &&
      (fila.estado === 'activa' || fila.estado === 'prueba' || fila.estado === 'impago')
    ) {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Ya tienes una suscripción. La llevas desde Ajustes → Suscripción.',
      });
    }

    const catalogo = await elCatalogo(contexto);
    const locales = Math.max(1, fila.localesActivos, entrada.locales ?? 1);
    const plan = elPlanPorLosLocales(entrada.plan, locales);
    const precio = catalogo.precios[claveDelPrecio(plan, entrada.intervalo)];
    if (precio === undefined)
      throw new FalloDeAplicacion('faltan_datos', { campos: ['intervalo'] });

    // El cliente de Stripe, uno por organización y modo.
    let cliente = fila.stripeModo === pagos.modo ? fila.stripeCliente : null;
    if (cliente === null) {
      const quien = await contexto.sql<{ correo: string; organizacion: string }[]>`
        select p.correo, o.nombre as organizacion
          from estook.persona p, estook.organizacion o
         where p.id = ${contexto.personaId} and o.id = ${organizacionId}
      `;
      const datos = quien[0];
      if (datos === undefined) throw new FalloDeAplicacion('sin_sesion');
      const nuevo = await conStripe(contexto, () =>
        pagos.crearCliente({ correo: datos.correo, nombre: datos.organizacion, organizacionId }),
      );
      cliente = nuevo;
      await cambiarLaSuscripcion(
        contexto,
        organizacionId,
        { stripe_cliente: nuevo, stripe_modo: pagos.modo, stripe_suscripcion: null },
        `persona:${contexto.personaId ?? ''}`,
        'el cliente de Stripe',
      );
    }

    const primeraVez = fila.stripeSuscripcion === null;
    const diasDePrueba = primeraVez ? fila.diasDePrueba : null;
    // El descuento del código con que llegó (0076): la primera vez y en el pago
    // mensual. Sin prueba, va en esta página; con prueba, se pone al acabarla.
    const descuento =
      primeraVez && entrada.intervalo === 'mes'
        ? await elDescuentoDe(contexto, organizacionId)
        : null;
    const cupon =
      descuento !== null && diasDePrueba === null
        ? await elCuponDe(contexto, descuento.porcentaje)
        : null;
    const app = laAppPublica();
    const pago = await conStripe(contexto, () =>
      pagos.crearPago({
        cliente,
        precio,
        cantidad: locales,
        diasDePrueba,
        organizacionId,
        iva: catalogo.iva,
        exito: `${app}?pago=hecho&sesion={CHECKOUT_SESSION_ID}`,
        cancelar: `${app}?pago=cancelado`,
        aviso: elAvisoDelPago(
          diasDePrueba,
          descuento !== null && diasDePrueba !== null ? descuento.porcentaje : null,
        ),
        cupon,
      }),
    );
    return { url: pago.url };
  },
});

// ── Volver de pagar ──────────────────────────────────────────────────────────

export const entradaVolverDelPago = z
  .object({
    sesion: z
      .string()
      .trim()
      .min(1)
      .max(300)
      .regex(/^[A-Za-z0-9_]+$/),
  })
  .strict();

/**
 * Al volver de Stripe, se pregunta a Stripe cómo ha ido, sin esperar a su aviso: así
 * quien acaba de pagar entra en el momento. El aviso llega después y no cambia nada.
 */
export const volverDelPago = comando<z.infer<typeof entradaVolverDelPago>, { como: string }>({
  nombre: 'volver_del_pago',
  entrada: entradaVolverDelPago,
  exige: 'dato.facturacion',
  sinPagar: true,

  async ejecutar(contexto, entrada) {
    const pagos = losPagos(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const pago = await conStripe(contexto, () => pagos.leerPago(entrada.sesion));
    // Una página de pago de otra organización no se aplica aquí, diga lo que diga la dirección.
    if (pago.organizacionId !== organizacionId || pago.suscripcion === null) {
      return { como: 'sin_pagar' };
    }
    const idDeStripe = pago.suscripcion;
    const suscripcion = await conStripe(contexto, () => pagos.leerSuscripcion(idDeStripe));
    await aplicarLoDeStripe(
      contexto,
      organizacionId,
      suscripcion,
      pagos.modo,
      `persona:${contexto.personaId ?? ''}`,
      'vuelve de pagar',
    );
    // Y la sesión, a su local: entró sin él, porque sin pagar no había a dónde ir.
    const destino = await decidirDestino(contexto.sql, contexto.sesion);
    if (destino.organizacionId === organizacionId) {
      await guardarContexto(contexto, destino.organizacionId, destino.localId);
    }
    return { como: suscripcion.estadoDeStripe };
  },
});

// ── El portal: la tarjeta y las facturas ─────────────────────────────────────

export const abrirElPortal = comando<Record<string, never>, { url: string }>({
  nombre: 'abrir_el_portal',
  entrada: z.object({}).strict(),
  exige: 'dato.facturacion',
  sinPagar: true,

  async ejecutar(contexto) {
    const pagos = losPagos(contexto);
    const { fila } = await laMia(contexto);
    if (fila.stripeCliente === null || fila.stripeModo !== pagos.modo) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Todavía no hay ninguna tarjeta ni factura.',
      });
    }
    const cliente = fila.stripeCliente;
    const catalogo = await elCatalogo(contexto);
    const url = await conStripe(contexto, () =>
      pagos.crearPortal(cliente, catalogo.portal, `${laAppPublica()}#/ajustes/suscripcion`),
    );
    return { url };
  },
});

// ── Cambiar de plan ──────────────────────────────────────────────────────────

export const entradaCambiarDePlan = z
  .object({
    plan: z.enum(PLANES_QUE_SE_ELIGEN),
    intervalo: z.enum(['mes', 'ano']),
  })
  .strict();

/**
 * Cambia el plan, o de mensual a anual. Se prorratea en la siguiente factura, y a
 * anual lo cobra Stripe al momento, que es lo que hace al cambiar de periodo. Pausa
 * solo es mensual.
 *
 * **La Pausa** (0135): empieza al instante y se prorratea; se puede **una vez cada doce
 * meses** y no en la prueba ni debiendo (`porQueNoSePuedePausar`). Se guarda cuándo
 * empezó y a qué plan vuelve: a él se vuelve cuando se quiera, sin penalización, y solo el
 * día que llega a los seis meses (el reloj).
 */
export const cambiarDePlan = comando<
  z.infer<typeof entradaCambiarDePlan>,
  { plan: CodigoDePlan; intervalo: Intervalo }
>({
  nombre: 'cambiar_de_plan',
  entrada: entradaCambiarDePlan,
  exige: 'dato.facturacion',
  sinPagar: true,

  async ejecutar(contexto, entrada) {
    const pagos = losPagos(contexto);
    const { organizacionId, fila } = await laMia(contexto);
    if (!tieneStripe(fila, pagos.modo)) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Todavía no hay ningún plan pagado que cambiar.',
      });
    }
    const quien = `persona:${contexto.personaId ?? ''}`;
    const pausar = entrada.plan === 'pausa';
    const antes = fila.plan;
    if (pausar) {
      const no = porQueNoSePuedePausar(fila, fila.pausaEmpezo, hoyEnMadrid(contexto.ahora));
      if (no !== null || antes === null || antes === 'pausa') {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: porQueNoSePausaEnLetra(no ?? { porque: 'ya_en_pausa', desde: null }),
        });
      }
    }
    // Volver de la Pausa al plan de antes, con su intervalo: «Volver» en la pantalla.
    if (antes === 'pausa' && !pausar && entrada.plan === fila.vuelveAPlan) {
      const plan = await volverDeLaPausa(
        contexto,
        organizacionId,
        fila,
        quien,
        'vuelve de la Pausa',
      );
      return { plan, intervalo: fila.vuelveAIntervalo ?? 'mes' };
    }

    const intervalo: Intervalo = pausar ? 'mes' : entrada.intervalo;
    const plan = elPlanPorLosLocales(entrada.plan, Math.max(1, fila.localesActivos));
    const catalogo = await elCatalogo(contexto);
    const precio = catalogo.precios[claveDelPrecio(plan, intervalo)];
    if (precio === undefined)
      throw new FalloDeAplicacion('faltan_datos', { campos: ['intervalo'] });

    const id = fila.stripeSuscripcion;
    const actual = await conStripe(contexto, () => pagos.leerSuscripcion(id));
    const nueva = await conStripe(contexto, () =>
      pagos.cambiarSuscripcion(id, {
        linea: actual.linea,
        precio,
        cantidad: Math.max(1, fila.localesActivos),
        iva: catalogo.iva,
      }),
    );
    await aplicarLoDeStripe(
      contexto,
      organizacionId,
      nueva,
      pagos.modo,
      quien,
      pausar ? 'empieza la Pausa' : `cambia a ${plan} (${intervalo})`,
    );
    if (pausar) {
      await cambiarLaSuscripcion(
        contexto,
        organizacionId,
        {
          pausa_empezo: hoyEnMadrid(contexto.ahora),
          vuelve_a_plan: antes,
          vuelve_a_intervalo: fila.intervalo ?? 'mes',
        },
        quien,
        'empieza la Pausa',
      );
    } else if (antes === 'pausa') {
      // Vuelve de la Pausa a otro plan: ya no hay a qué volver.
      await cambiarLaSuscripcion(
        contexto,
        organizacionId,
        { vuelve_a_plan: null, vuelve_a_intervalo: null },
        quien,
        'vuelve de la Pausa',
      );
    }
    return { plan, intervalo };
  },
});

// ── Cancelar y reanudar ──────────────────────────────────────────────────────

function cancelarOReanudar(nombre: string, cancelar: boolean) {
  return comando<Record<string, never>, { cancelaAlAcabar: boolean; hasta: string | null }>({
    nombre,
    entrada: z.object({}).strict(),
    exige: 'dato.facturacion',
    sinPagar: true,

    async ejecutar(contexto) {
      const pagos = losPagos(contexto);
      const { organizacionId, fila } = await laMia(contexto);
      if (!tieneStripe(fila, pagos.modo)) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'No hay ninguna suscripción que cancelar.',
        });
      }
      const id = fila.stripeSuscripcion;
      const actual = await conStripe(contexto, () => pagos.leerSuscripcion(id));
      const nueva = await conStripe(contexto, () =>
        pagos.cambiarSuscripcion(id, { linea: actual.linea, cancelarAlAcabar: cancelar }),
      );
      await aplicarLoDeStripe(
        contexto,
        organizacionId,
        nueva,
        pagos.modo,
        `persona:${contexto.personaId ?? ''}`,
        cancelar ? 'cancela al acabar el periodo' : 'la reanuda',
      );
      return {
        cancelaAlAcabar: nueva.cancelaAlAcabar,
        hasta: nueva.pruebaHasta ?? nueva.periodoHasta,
      };
    },
  });
}

/** Cancela **al acabar lo pagado**: hasta entonces todo sigue igual. En la prueba, no se cobra nada. */
export const cancelarLaSuscripcion = cancelarOReanudar('cancelar_la_suscripcion', true);

/** Deshace la cancelación, si todavía no ha llegado el día. */
export const reanudarLaSuscripcion = cancelarOReanudar('reanudar_la_suscripcion', false);

// ── Al crear un local ────────────────────────────────────────────────────────

/**
 * La cuota sigue a los locales (0048, cinco): al crear uno, se cambia en Stripe,
 * prorrateado en la siguiente factura. Si Stripe no contesta, falla el comando entero
 * y el local no se crea: mejor eso que un local sin cobrar. Lo llama `crear_local`.
 */
export async function laCuotaSigueALosLocales(
  contexto: Contexto,
  organizacionId: string,
  /**
   * Al crear un local la cuota **solo sube** (0142): quien pagó tres al empezar no ve bajar la
   * cuota al crear el segundo. Baja cuando lo pide quien paga, con «Solo tengo estos».
   */
  { bajar = false }: { readonly bajar?: boolean } = {},
): Promise<void> {
  const pagos = contexto.pagos;
  if (pagos === null) return;
  const fila = await laSuscripcionDe(contexto, organizacionId);
  if (fila === null || fila.deLaCasa || fila.esEjemplo || !tieneStripe(fila, pagos.modo)) return;
  if (fila.plan === null || fila.plan === 'pausa') return;
  if (fila.estado !== 'activa' && fila.estado !== 'prueba' && fila.estado !== 'impago') return;

  const locales = bajar
    ? Math.max(1, fila.localesActivos)
    : Math.max(1, fila.localesActivos, fila.localesPagados ?? 1);
  const plan = elPlanPorLosLocales(fila.plan, locales);
  if (locales === fila.localesPagados && plan === fila.plan) return;

  const catalogo = await elCatalogo(contexto);
  const precio = catalogo.precios[claveDelPrecio(plan, fila.intervalo ?? 'mes')];
  const id = fila.stripeSuscripcion;
  const actual = await conStripe(contexto, () => pagos.leerSuscripcion(id));
  const nueva = await conStripe(contexto, () =>
    pagos.cambiarSuscripcion(id, {
      linea: actual.linea,
      cantidad: locales,
      ...(plan === fila.plan || precio === undefined ? {} : { precio, iva: catalogo.iva }),
    }),
  );
  await aplicarLoDeStripe(
    contexto,
    organizacionId,
    nueva,
    pagos.modo,
    `persona:${contexto.personaId ?? ''}`,
    'un local más',
  );
}

// ── Solo tengo estos (la pausa del 8-nov, 0142) ──────────────────────────────

/**
 * Quien pagó más locales de los que al final ha creado: la cuota baja a los que hay, y Stripe
 * descuenta lo pagado de más en la siguiente factura (prorrateo). Lo pide quien paga.
 */
export const ajustarMiCuotaAMisLocales = comando<Record<string, never>, { locales: number }>({
  nombre: 'ajustar_mi_cuota_a_mis_locales',
  entrada: z.object({}).strict(),
  exige: 'dato.facturacion',

  async ejecutar(contexto) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    await laCuotaSigueALosLocales(contexto, organizacionId, { bajar: true });
    const fila = await laSuscripcionDe(contexto, organizacionId);
    return { locales: Math.max(1, fila?.localesPagados ?? fila?.localesActivos ?? 1) };
  },
});
