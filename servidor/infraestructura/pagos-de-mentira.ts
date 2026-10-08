/* eslint-disable @typescript-eslint/require-await -- hace de Stripe, que contesta por la red: el puerto es asíncrono aunque aquí la respuesta esté en memoria */
import { centimos, porFraccion, sinIva } from '@estook/dominio';
import {
  elCuponDelPorcentaje,
  firmarComoStripe,
  traducirCobro,
  traducirSuscripcion,
  type CatalogoDeStripe,
  type DatosDelPago,
  type Pagos,
} from './stripe.ts';

/**
 * Un Stripe de mentira, para la API de pruebas (entrega E2 · decisión 0048).
 *
 * Hace lo que hace Stripe **por fuera de la aplicación**: guarda clientes y
 * suscripciones en memoria, y cuando algo cambia **manda el aviso firmado** al mismo
 * sitio que el de verdad (`/api/stripe/aviso`). Así las pruebas pasan por la firma,
 * por el «no me creo lo que traes, te lo vuelvo a preguntar» y por el apunte de cada
 * aviso, igual que en producción.
 *
 * La página de pago es una dirección de la propia API de pruebas
 * (`/api/pruebas/stripe/pagar`): abrirla es pagar, y vuelve a la app como vuelve
 * Stripe. Y dos más para lo que en Stripe pasa solo: que falle un cobro y que se
 * cobre.
 */

export const SECRETO_DEL_AVISO_DE_MENTIRA = 'whsec_de_mentira_para_las_pruebas';

interface SuscripcionGuardada {
  id: string;
  status: string;
  customer: string;
  metadata: { organizacion_id: string };
  items: {
    data: {
      id: string;
      quantity: number;
      price: { id: string; lookup_key: string; unit_amount: number | null };
      current_period_end: number;
    }[];
  };
  trial_end: number | null;
  cancel_at_period_end: boolean;
  cancel_at: null;
  default_payment_method: { card: { brand: string; last4: string } };
  /** El cupón puesto, como los `discounts` de Stripe: se gasta en el primer cobro. */
  cupon: string | null;
}

export interface PagosDeMentira extends Pagos {
  /** Donde se entregan los avisos: lo engancha la API de pruebas al arrancar. */
  enganchar(entregar: (cuerpo: string, firma: string) => Promise<unknown>): void;
  /** Abrir la página de pago es pagar. Devuelve a dónde vuelve. */
  pagar(sesion: string): Promise<string>;
  /** Un cobro que falla, como cuando caduca la tarjeta. */
  fallarElCobro(organizacionId: string): Promise<void>;
  /** Y uno que entra. Devuelve el cupón que se gastó en él, si había. */
  cobrar(organizacionId: string): Promise<string | null>;
  /**
   * Devolver parte o todo de lo último cobrado a una organización (A4): Stripe avisa con
   * el cargo y lo devuelto **en total** hasta ahora.
   */
  devolver(organizacionId: string, centimos: number): Promise<void>;
  /** Lo que Stripe avisa tres días antes de que acabe una prueba (A3). */
  avisarDeQueAcabaLaPrueba(organizacionId: string): Promise<void>;
  /** Los cupones creados, y el que lleva puesto la suscripción de una organización. */
  readonly cupones: ReadonlySet<string>;
  elCuponDe(organizacionId: string): string | null;
  /** El cupón con que se abrió una página de pago. */
  elCuponDelPago(sesion: string): string | null;
}

export function pagosDeMentira(
  raiz: string,
  reloj: () => number = () => Date.now(),
): PagosDeMentira {
  const sesiones = new Map<string, DatosDelPago>();
  const suscripciones = new Map<string, SuscripcionGuardada>();
  const cupones = new Set<string>();
  // El importe de cada precio, como lo creó el catálogo: lo que dice `unit_amount`.
  const importes = new Map<string, number>();
  // Las facturas cobradas, con su cargo y lo devuelto de él.
  const facturas: {
    factura: Record<string, unknown>;
    organizacionId: string;
    cargo: string;
    devuelto: number;
  }[] = [];
  let entregar: (cuerpo: string, firma: string) => Promise<unknown> = async () => undefined;
  let numero = 0;
  const nuevo = (prefijo: string) => {
    numero += 1;
    return `${prefijo}_mentira_${String(numero)}`;
  };
  // La hora de quien lo usa: la firma de un aviso caduca a los cinco minutos, y una
  // prueba que mueve el reloj tiene que firmar con su hora, no con la de verdad.
  const ahoraS = () => Math.floor(reloj() / 1000);

  async function avisar(tipo: string, objeto: unknown): Promise<void> {
    const cuerpo = JSON.stringify({ id: nuevo('evt'), type: tipo, data: { object: objeto } });
    await entregar(cuerpo, await firmarComoStripe(cuerpo, SECRETO_DEL_AVISO_DE_MENTIRA, ahoraS()));
  }

  function deLaOrganizacion(organizacionId: string): SuscripcionGuardada {
    const suya = [...suscripciones.values()].find(
      (s) => s.metadata.organizacion_id === organizacionId,
    );
    if (suya === undefined)
      throw new Error(`Esa organización no tiene suscripción de mentira: ${organizacionId}`);
    return suya;
  }

  const clavePorPrecio = (precio: string) => precio.replace(/^price_/, '');

  return {
    modo: 'prueba',

    enganchar(entregarAqui) {
      entregar = entregarAqui;
    },

    async prepararCatalogo(hay, _en, precios): Promise<CatalogoDeStripe> {
      for (const p of precios) importes.set(`price_${p.clave}`, p.centimos);
      return {
        precios: Object.fromEntries(precios.map((p) => [p.clave, `price_${p.clave}`])),
        iva: hay?.iva ?? 'txr_iva_de_mentira',
        portal: hay?.portal ?? 'bpc_de_mentira',
        aviso: hay?.aviso ?? 'we_de_mentira',
        avisoSecreto: SECRETO_DEL_AVISO_DE_MENTIRA,
      };
    },

    async prepararElCupon(porcentaje) {
      const id = elCuponDelPorcentaje(porcentaje);
      cupones.add(id);
      return id;
    },

    cupones,

    elCuponDe(organizacionId) {
      return deLaOrganizacion(organizacionId).cupon;
    },

    elCuponDelPago(sesion) {
      return sesiones.get(sesion)?.cupon ?? null;
    },

    async crearCliente() {
      return nuevo('cus');
    },

    async crearPago(datos) {
      const id = nuevo('cs');
      sesiones.set(id, datos);
      return { id, url: `${raiz}/pruebas/stripe/pagar?sesion=${id}` };
    },

    async crearPortal(_cliente, _configuracion, vuelta) {
      return `${raiz}/pruebas/stripe/portal?vuelta=${encodeURIComponent(vuelta)}`;
    },

    async pagar(id) {
      const datos = sesiones.get(id);
      if (datos === undefined) throw new Error('Esa página de pago no existe.');
      const conPrueba = datos.diasDePrueba !== null;
      const suscripcion: SuscripcionGuardada = {
        id: nuevo('sub'),
        status: conPrueba ? 'trialing' : 'active',
        customer: datos.cliente,
        metadata: { organizacion_id: datos.organizacionId },
        items: {
          data: [
            {
              id: nuevo('si'),
              quantity: datos.cantidad,
              price: {
                id: datos.precio,
                lookup_key: clavePorPrecio(datos.precio),
                unit_amount: importes.get(datos.precio) ?? null,
              },
              current_period_end: ahoraS() + (conPrueba ? datos.diasDePrueba : 30) * 86_400,
            },
          ],
        },
        trial_end: conPrueba ? ahoraS() + datos.diasDePrueba * 86_400 : null,
        cancel_at_period_end: false,
        cancel_at: null,
        default_payment_method: { card: { brand: 'visa', last4: '4242' } },
        // Sin prueba, el cupón de la página se gasta en el primer cobro, que es ya.
        cupon: conPrueba ? null : datos.cupon,
      };
      suscripciones.set(suscripcion.id, suscripcion);
      await avisar('checkout.session.completed', {
        id,
        object: 'checkout.session',
        subscription: suscripcion.id,
        customer: datos.cliente,
        client_reference_id: datos.organizacionId,
      });
      return datos.exito.replace('{CHECKOUT_SESSION_ID}', id);
    },

    async fallarElCobro(organizacionId) {
      const s = deLaOrganizacion(organizacionId);
      s.status = 'past_due';
      await avisar('invoice.payment_failed', {
        object: 'invoice',
        subscription: s.id,
        customer: s.customer,
      });
    },

    async cobrar(organizacionId) {
      const s = deLaOrganizacion(organizacionId);
      s.status = 'active';
      s.trial_end = null;
      // Un cupón `once` se gasta en el primer cobro que lo encuentra puesto.
      const gastado = s.cupon;
      s.cupon = null;
      // La factura, con lo que dice la de Stripe (A4): el precio por los locales, el
      // descuento del cupón y el IVA dentro, separado como lo separa Stripe.
      const linea = s.items.data[0];
      const bruto = (linea?.price.unit_amount ?? 0) * (linea?.quantity ?? 1);
      const porcentaje = Number(/(\d+)$/.exec(gastado ?? '')?.[1] ?? 0);
      const total = porFraccion(centimos(bruto), (100 - porcentaje) / 100);
      const factura = {
        id: nuevo('in'),
        object: 'invoice',
        subscription: s.id,
        customer: s.customer,
        amount_paid: total,
        total,
        total_excluding_tax: sinIva(total, 0.21),
        billing_reason: facturas.some((x) => x.organizacionId === organizacionId)
          ? 'subscription_cycle'
          : 'subscription_create',
        status_transitions: { paid_at: ahoraS() },
        created: ahoraS(),
      };
      if (total > 0) {
        facturas.push({ factura, organizacionId, cargo: nuevo('ch'), devuelto: 0 });
      }
      await avisar('invoice.paid', factura);
      return gastado;
    },

    async devolver(organizacionId, centimos) {
      const suya = facturas.filter((x) => x.organizacionId === organizacionId).at(-1);
      if (suya === undefined)
        throw new Error(`Esa organización no tiene cobros de mentira: ${organizacionId}`);
      suya.devuelto += centimos;
      await avisar('charge.refunded', {
        id: suya.cargo,
        object: 'charge',
        customer: suya.factura['customer'],
        amount: suya.factura['amount_paid'],
        amount_refunded: suya.devuelto,
        refunded: suya.devuelto >= Number(suya.factura['amount_paid']),
        livemode: false,
      });
    },

    async losCobros() {
      return facturas
        .map((x) => traducirCobro(x.factura))
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .reverse();
    },

    async avisarDeQueAcabaLaPrueba(organizacionId) {
      const s = deLaOrganizacion(organizacionId);
      // Como lo manda Stripe: el objeto dice que es una suscripción, que es como la
      // API sabe de cuál habla el aviso (`laSuscripcionDelAviso`).
      await avisar('customer.subscription.trial_will_end', {
        ...structuredClone(s),
        object: 'subscription',
      });
    },

    async leerSuscripcion(id) {
      const s = suscripciones.get(id);
      if (s === undefined) throw new Error('Esa suscripción no existe.');
      return traducirSuscripcion(s as unknown as Record<string, unknown>);
    },

    async leerPago(id) {
      const s = [...suscripciones.values()].find(
        (x) => sesiones.get(id)?.organizacionId === x.metadata.organizacion_id,
      );
      return {
        suscripcion: s?.id ?? null,
        cliente: s?.customer ?? null,
        organizacionId: sesiones.get(id)?.organizacionId ?? null,
      };
    },

    async cambiarSuscripcion(id, cambios) {
      const s = suscripciones.get(id);
      if (s === undefined) throw new Error('Esa suscripción no existe.');
      const linea = s.items.data[0];
      if (linea !== undefined) {
        if (cambios.precio !== undefined)
          linea.price = {
            id: cambios.precio,
            lookup_key: clavePorPrecio(cambios.precio),
            unit_amount: importes.get(cambios.precio) ?? null,
          };
        if (cambios.cantidad !== undefined) linea.quantity = cambios.cantidad;
      }
      if (cambios.cancelarAlAcabar !== undefined) s.cancel_at_period_end = cambios.cancelarAlAcabar;
      if (cambios.pruebaHasta !== undefined) {
        s.trial_end = Math.trunc(cambios.pruebaHasta.getTime() / 1000);
      }
      if (cambios.cupon !== undefined) s.cupon = cambios.cupon;
      // Después, por su cuenta, como Stripe: esto se llama dentro de un comando, y la
      // API de pruebas atiende de una en una. Esperar aquí al aviso sería esperarse a
      // sí mismo.
      const copia = structuredClone(s);
      setTimeout(() => {
        void avisar('customer.subscription.updated', copia);
      }, 0);
      return traducirSuscripcion(s as unknown as Record<string, unknown>);
    },
  };
}
