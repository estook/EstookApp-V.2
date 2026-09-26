/* eslint-disable @typescript-eslint/require-await -- hace de Stripe, que contesta por la red: el puerto es asíncrono aunque aquí la respuesta esté en memoria */
import {
  firmarComoStripe,
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
      price: { id: string; lookup_key: string };
      current_period_end: number;
    }[];
  };
  trial_end: number | null;
  cancel_at_period_end: boolean;
  cancel_at: null;
  default_payment_method: { card: { brand: string; last4: string } };
}

export interface PagosDeMentira extends Pagos {
  /** Donde se entregan los avisos: lo engancha la API de pruebas al arrancar. */
  enganchar(entregar: (cuerpo: string, firma: string) => Promise<unknown>): void;
  /** Abrir la página de pago es pagar. Devuelve a dónde vuelve. */
  pagar(sesion: string): Promise<string>;
  /** Un cobro que falla, como cuando caduca la tarjeta. */
  fallarElCobro(organizacionId: string): Promise<void>;
  /** Y uno que entra. */
  cobrar(organizacionId: string): Promise<void>;
}

export function pagosDeMentira(
  raiz: string,
  reloj: () => number = () => Date.now(),
): PagosDeMentira {
  const sesiones = new Map<string, DatosDelPago>();
  const suscripciones = new Map<string, SuscripcionGuardada>();
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
      return {
        precios: Object.fromEntries(precios.map((p) => [p.clave, `price_${p.clave}`])),
        iva: hay?.iva ?? 'txr_iva_de_mentira',
        portal: hay?.portal ?? 'bpc_de_mentira',
        aviso: hay?.aviso ?? 'we_de_mentira',
        avisoSecreto: SECRETO_DEL_AVISO_DE_MENTIRA,
      };
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
              price: { id: datos.precio, lookup_key: clavePorPrecio(datos.precio) },
              current_period_end: ahoraS() + (conPrueba ? datos.diasDePrueba : 30) * 86_400,
            },
          ],
        },
        trial_end: conPrueba ? ahoraS() + datos.diasDePrueba * 86_400 : null,
        cancel_at_period_end: false,
        cancel_at: null,
        default_payment_method: { card: { brand: 'visa', last4: '4242' } },
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
      await avisar('invoice.paid', { object: 'invoice', subscription: s.id, customer: s.customer });
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
          linea.price = { id: cambios.precio, lookup_key: clavePorPrecio(cambios.precio) };
        if (cambios.cantidad !== undefined) linea.quantity = cambios.cantidad;
      }
      if (cambios.cancelarAlAcabar !== undefined) s.cancel_at_period_end = cambios.cancelarAlAcabar;
      if (cambios.pruebaHasta !== undefined) {
        s.trial_end = Math.trunc(cambios.pruebaHasta.getTime() / 1000);
      }
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
