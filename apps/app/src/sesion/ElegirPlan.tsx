import { useState } from 'react';
import { Aviso, Boton, Etiqueta, clases } from '@estook/ui';
import { PLANES, centimos, conSimbolo, type Plan } from '@estook/dominio';
import { MarcoDeLaPuerta } from './Formas.tsx';
import { usarSesion } from './Sesion.tsx';

/**
 * Elige tu plan (0042).
 *
 * Aquí llega quien ha creado su cuenta **sin oferta de prueba encendida**: su
 * negocio existe, pero no se entra hasta pagar. Los planes y sus precios son los
 * del Manifiesto, con el IVA incluido, y salen de `PLANES`, que es su único dueño.
 *
 * **El pago con tarjeta llega en la entrega siguiente** (Stripe). Hasta entonces
 * esta pantalla enseña los planes y lo dice claro, en vez de un botón que no hace
 * nada: su cuenta está creada y no se pierde.
 */
export function ElegirPlan() {
  const { yo, salir } = usarSesion();
  const [anual, setAnual] = useState(false);

  // Pausa no se contrata al empezar: es para quien ya lleva tiempo y cierra.
  const planes = PLANES.filter((plan) => plan.codigo !== 'pausa');

  return (
    <MarcoDeLaPuerta
      titulo="Elige tu plan"
      frase={
        yo?.organizacion
          ? `Tu cuenta de ${yo.organizacion.nombre} está creada. Elige cómo quieres usar Estook.`
          : 'Tu cuenta está creada. Elige cómo quieres usar Estook.'
      }
    >
      <div
        role="tablist"
        aria-label="Cómo pagar"
        className="mb-e4 grid grid-cols-2 gap-e1 rounded-medio bg-borde/40 p-e1"
      >
        {[
          { valor: false, texto: 'Cada mes' },
          { valor: true, texto: 'Cada año · 2 meses gratis' },
        ].map((opcion) => (
          <button
            key={opcion.texto}
            type="button"
            role="tab"
            aria-selected={anual === opcion.valor}
            onClick={() => {
              setAnual(opcion.valor);
            }}
            className={clases(
              'min-h-toque rounded-medio px-e2 text-secundario',
              anual === opcion.valor
                ? 'bg-superficie font-medium text-texto shadow-s1'
                : 'text-texto-suave hover:text-texto',
            )}
          >
            {opcion.texto}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-e3">
        {planes.map((plan) => (
          <TarjetaDePlan key={plan.codigo} plan={plan} anual={anual} />
        ))}
      </ul>

      <p className="mt-e3 text-center text-secundario text-texto-suave">
        Precios por local, con el IVA incluido.
      </p>

      <div className="mt-e4">
        <Aviso tono="info" titulo="El pago con tarjeta se abre en unos días">
          Tu cuenta y tu negocio ya están creados y no se pierden. En cuanto esté, podrás elegir tu
          plan desde aquí y empezar.
        </Aviso>
      </div>

      <div className="mt-e4 flex justify-center">
        <Boton
          tono="texto"
          onClick={() => {
            void salir();
          }}
        >
          Salir
        </Boton>
      </div>
    </MarcoDeLaPuerta>
  );
}

function TarjetaDePlan({ plan, anual }: { readonly plan: Plan; readonly anual: boolean }) {
  const precio = anual && plan.alAnoPorLocal !== null ? plan.alAnoPorLocal : plan.alMesPorLocal;
  const cada = anual && plan.alAnoPorLocal !== null ? 'al año' : 'al mes';

  return (
    <li className="rounded-mayor border border-borde bg-superficie p-e4">
      <div className="flex items-baseline justify-between gap-e3">
        <h2 className="text-seccion font-semibold">{plan.nombre}</h2>
        {plan.codigo === 'pro' && <Etiqueta tono="marca">Recomendado</Etiqueta>}
      </div>
      <p className="mt-e1 text-secundario text-texto-suave">{plan.paraQuien}</p>
      <p className="mt-e3">
        <span className="text-pantalla font-semibold">{conSimbolo(centimos(precio))}</span>{' '}
        <span className="text-secundario text-texto-suave">por local {cada}</span>
      </p>
      {plan.localesHasta !== null && (
        <p className="text-secundario text-texto-suave">
          De {plan.localesDesde} a {plan.localesHasta} locales.
        </p>
      )}
      <ul className="mt-e3 flex flex-col gap-e1 text-secundario">
        {plan.loQueLleva.map((cosa) => (
          <li key={cosa}>· {cosa}</li>
        ))}
      </ul>
    </li>
  );
}
