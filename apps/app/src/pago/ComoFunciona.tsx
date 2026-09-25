import { DIAS_DE_AVISO_ANTES_DE_COBRAR, DIAS_DE_GRACIA } from '@estook/dominio';
import { IconoFlechaAbajo } from '@estook/iconos';

/**
 * «Cómo funciona» el pago, plegado (0048, ocho).
 *
 * Richi, 25-sep: la renovación y la prueba, «explicado y legal, pero sin ponerlo de
 * una». Así que va entero —la renovación, cómo cancelar, la prueba, el cobro que
 * falla, las facturas— y cerrado, al alcance de quien lo busca. Lo mismo dicen las
 * condiciones y la página de pago de Stripe, junto a su botón.
 */
export function ComoFunciona({ diasDePrueba }: { readonly diasDePrueba: number | null }) {
  return (
    <details className="group rounded-mayor border border-borde bg-superficie px-e4 py-e3 text-secundario [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-toque cursor-pointer items-center justify-between gap-e2 font-medium">
        Cómo funciona el pago
        <span aria-hidden className="text-texto-tenue transition-transform group-open:rotate-180">
          <IconoFlechaAbajo size={18} />
        </span>
      </summary>
      <ul className="mt-e2 flex flex-col gap-e2 text-texto-suave">
        <li>Pagas con tarjeta en la página segura de Stripe. Estook no ve ni guarda tu tarjeta.</li>
        <li>
          La cuota es por local, con el IVA incluido, y{' '}
          <strong className="text-texto">se renueva sola</strong> cada mes o cada año, según elijas.
        </li>
        {diasDePrueba !== null && (
          <li>
            <strong className="text-texto">Hoy no se cobra nada.</strong> La prueba dura{' '}
            {diasDePrueba} días y el primer cobro es el día que acaba. Te avisamos por correo{' '}
            {DIAS_DE_AVISO_ANTES_DE_COBRAR} días antes.
          </li>
        )}
        <li>
          La cancelas cuando quieras en{' '}
          <strong className="text-texto">Ajustes → Suscripción</strong>. Sigue hasta el final de lo
          pagado{diasDePrueba !== null ? ', y si cancelas durante la prueba no se cobra nada' : ''}.
        </li>
        <li>
          Si un cobro falla, tienes {DIAS_DE_GRACIA} días para arreglarlo; después la cuenta queda
          en solo lectura. No se pierde nada.
        </li>
        <li>
          Las facturas te llegan por correo y las tienes en Ajustes → Suscripción. Más en las{' '}
          <a
            className="underline"
            href="https://estook.com/condiciones/"
            target="_blank"
            rel="noreferrer"
          >
            condiciones
          </a>{' '}
          y la{' '}
          <a
            className="underline"
            href="https://estook.com/privacidad/"
            target="_blank"
            rel="noreferrer"
          >
            privacidad
          </a>
          .
        </li>
      </ul>
    </details>
  );
}
