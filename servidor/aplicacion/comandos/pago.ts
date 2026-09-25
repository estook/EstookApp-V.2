import { z } from 'zod';
import {
  claveDelPrecio,
  elPlanPorLosLocales,
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
  laAppPublica,
  laSuscripcionDe,
  losPagos,
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

/** El texto junto al botón de pagar de Stripe: la renovación y cómo cancelar (0048, ocho). */
function elAvisoDelPago(diasDePrueba: number | null): string {
  const renovacion =
    'La suscripción se renueva sola al final de cada periodo, al precio de tu plan con el IVA incluido. La cancelas cuando quieras en Estook, en Ajustes → Suscripción, y sigue hasta el final de lo pagado.';
  return diasDePrueba === null
    ? renovacion
    : `Hoy no se cobra nada: tu prueba dura ${String(diasDePrueba)} días y el primer cobro es al acabar. Si cancelas antes, no se te cobra nada. ${renovacion}`;
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
  })
  .strict();

/**
 * La página de pago de Stripe, para la organización de la sesión.
 *
 * El plan se ajusta a los locales (Pro con dos o más es Cadena) y la cantidad son los
 * locales activos. Los días de prueba son los que se guardaron al crear la cuenta, y
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
    const locales = Math.max(1, fila.localesActivos);
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
        aviso: elAvisoDelPago(diasDePrueba),
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
    const intervalo: Intervalo = entrada.plan === 'pausa' ? 'mes' : entrada.intervalo;
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
      }),
    );
    await aplicarLoDeStripe(
      contexto,
      organizacionId,
      nueva,
      pagos.modo,
      `persona:${contexto.personaId ?? ''}`,
      `cambia a ${plan} (${intervalo})`,
    );
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
): Promise<void> {
  const pagos = contexto.pagos;
  if (pagos === null) return;
  const fila = await laSuscripcionDe(contexto, organizacionId);
  if (fila === null || fila.deLaCasa || fila.esEjemplo || !tieneStripe(fila, pagos.modo)) return;
  if (fila.plan === null || fila.plan === 'pausa') return;
  if (fila.estado !== 'activa' && fila.estado !== 'prueba' && fila.estado !== 'impago') return;

  const locales = Math.max(1, fila.localesActivos);
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
      ...(plan === fila.plan || precio === undefined ? {} : { precio }),
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
