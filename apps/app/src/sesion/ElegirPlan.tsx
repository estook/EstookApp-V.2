import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Aviso, Boton, Cargando, ErrorEnCristiano, Etiqueta, clases } from '@estook/ui';
import { PLANES, centimos, conSimbolo, elDescuentoEnPalabras, type Plan } from '@estook/dominio';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarMiSuscripcion } from '../ganchos/usarMiSuscripcion.ts';
import { ComoFunciona } from '../pago/ComoFunciona.tsx';
import { MarcoDeLaPuerta } from './Formas.tsx';
import { usarSesion } from './Sesion.tsx';

/**
 * Elige tu plan (0042, y desde la 0048 con el pago de verdad).
 *
 * «Sin pago no hay app» (Richi, 25-sep): aquí llega toda cuenta nueva, con o sin
 * oferta de prueba, y quien tiene una prueba vieja que ya acabó. Se elige plan y
 * se paga en la página de Stripe; con oferta, la prueba empieza con la tarjeta
 * puesta y hoy no se cobra nada. Lo legal va plegado en «Cómo funciona».
 *
 * Los planes salen de `PLANES`. Con un local se ofrecen Esencial y Pro; con dos o
 * más, Esencial y Cadena, que es Pro para grupos y más barato por local. Pausa no se
 * contrata al empezar: es para quien ya lleva tiempo y cierra una temporada.
 */
/** Cadena llega hasta diez locales (`PLANES`); con más, se habla con nosotros. */
const MAS_DE_ESTOS_SE_HABLA = 10;

export function ElegirPlan() {
  const { yo, salir, cliente } = usarSesion();
  const suya = usarMiSuscripcion();
  const [anual, setAnual] = useState(false);
  // Cuántos locales, antes de pagar (la pausa del 8-nov, 0142). Nulo: los que ya tiene.
  const [cuantos, setCuantos] = useState<number | null>(null);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [cancelado] = useState(
    () => new URLSearchParams(window.location.search).get('pago') === 'cancelado',
  );

  const pagar = useMutation({
    mutationFn: async (plan: Plan['codigo']) => {
      const respuesta = await cliente.ejecutar<{ url: string }>('empezar_a_pagar', {
        plan,
        intervalo: anual ? 'ano' : 'mes',
        locales,
      });
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos.url;
    },
    onSuccess: (url) => {
      window.location.assign(url);
    },
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  const negocio = yo?.organizacion?.nombre;

  // Quien no lleva la facturación no puede pagar: se le dice quién puede.
  if (suya.error?.error.codigo === 'sin_permiso') {
    return (
      <MarcoDeLaPuerta
        titulo="Falta elegir el plan"
        frase={`${negocio ?? 'Tu negocio'} todavía no tiene un plan pagado. Lo elige quien lleva la cuenta: en cuanto lo haga, entras sin hacer nada.`}
      >
        <div className="flex justify-center">
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

  const datos = suya.data;
  const yaTiene = Math.max(1, datos?.localesActivos ?? 1);
  const locales = Math.max(yaTiene, cuantos ?? yaTiene);
  const planes = PLANES.filter(
    (plan) =>
      plan.codigo !== 'pausa' && (locales >= 2 ? plan.codigo !== 'pro' : plan.codigo !== 'cadena'),
  );
  const diasDePrueba = datos?.diasDePrueba ?? null;

  return (
    <MarcoDeLaPuerta
      titulo={
        diasDePrueba === null ? 'Elige tu plan' : `Empieza tus ${String(diasDePrueba)} días gratis`
      }
      frase={
        diasDePrueba === null
          ? `Tu cuenta${negocio ? ` de ${negocio}` : ''} está creada. Elige cómo quieres usar Estook.`
          : 'Elige tu plan y pon tu tarjeta. Hoy no se cobra nada.'
      }
    >
      {datos?.descuento != null && (
        <div className="mb-e4">
          {/* El código con que llegó (A3 · 0076): solo en el pago mensual. */}
          <Aviso
            tono={anual ? 'info' : 'bien'}
            titulo={`Con ${datos.descuento.codigo}: ${(elDescuentoEnPalabras(datos.descuento.porcentaje) ?? '').toLowerCase()}`}
          >
            {anual
              ? 'El descuento es para el pago mensual: el anual ya lleva dos meses gratis.'
              : diasDePrueba === null
                ? 'Se aplica en el pago de hoy.'
                : 'Se aplica en tu primer cobro, al acabar la prueba.'}
          </Aviso>
        </div>
      )}

      {cancelado && (
        <div className="mb-e4">
          <Aviso tono="info" titulo="No se ha cobrado nada">
            Has vuelto sin terminar el pago. Cuando quieras, elige tu plan otra vez.
          </Aviso>
        </div>
      )}

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

      {/*
        ── Cuántos locales, lo primero (la pausa del 8-nov, 0142) ─────────────────
        Richi: «preguntar por locales antes, ahora lo pregunta después, no tiene sentido».
        Se paga por todos, y en el alta solo se les pone nombre. Con dos o más, Pro pasa a
        Cadena, que es Pro más barato por local. Más de diez, se habla con nosotros.
      */}
      <div className="mb-e4 flex flex-wrap items-center justify-between gap-e3 rounded-mayor border border-borde bg-superficie p-e4">
        <div className="min-w-0">
          <p className="text-cuerpo font-semibold">¿Cuántos locales tienes?</p>
          <p className="text-secundario text-texto-suave">
            Cada local, su cuota. Se pueden añadir más cuando quieras.
          </p>
        </div>
        <div
          role="group"
          aria-label="Cuántos locales"
          className="flex items-center overflow-hidden rounded-medio border border-borde-fuerte"
        >
          <button
            type="button"
            aria-label="Uno menos"
            disabled={locales <= yaTiene}
            onClick={() => {
              setCuantos(Math.max(yaTiene, locales - 1));
            }}
            className="min-h-toque min-w-toque text-pantalla font-semibold disabled:text-texto-tenue"
          >
            −
          </button>
          <output aria-live="polite" className="min-w-[2.5rem] text-center text-pantalla font-semibold tabular-nums">
            {locales}
          </output>
          <button
            type="button"
            aria-label="Uno más"
            disabled={locales >= MAS_DE_ESTOS_SE_HABLA}
            onClick={() => {
              setCuantos(Math.min(MAS_DE_ESTOS_SE_HABLA, locales + 1));
            }}
            className="min-h-toque min-w-toque text-pantalla font-semibold disabled:text-texto-tenue"
          >
            +
          </button>
        </div>
        {locales >= MAS_DE_ESTOS_SE_HABLA && (
          <p className="w-full text-secundario text-texto-suave">
            ¿Más de {MAS_DE_ESTOS_SE_HABLA}? Escríbenos a hola@estook.com y lo preparamos contigo.
          </p>
        )}
      </div>

      {suya.isLoading ? (
        <Cargando que="los planes" lineas={3} />
      ) : (
        <ul className="flex flex-col gap-e3">
          {planes.map((plan) => (
            <TarjetaDePlan
              key={plan.codigo}
              plan={plan}
              anual={anual}
              locales={locales}
              conPrueba={diasDePrueba !== null}
              abierto={datos?.pagoAbierto !== false}
              yendo={pagar.isPending && pagar.variables === plan.codigo}
              ocupado={pagar.isPending}
              alElegir={() => {
                setError(null);
                pagar.mutate(plan.codigo);
              }}
            />
          ))}
        </ul>
      )}

      {error !== null && (
        <div className="mt-e4">
          <ErrorEnCristiano error={error} />
        </div>
      )}

      {datos?.pagoAbierto === false && (
        <div className="mt-e4">
          <Aviso tono="info" titulo="El pago con tarjeta se abre en unos días">
            Tu cuenta y tu negocio ya están creados y no se pierden. En cuanto esté, podrás elegir
            tu plan desde aquí y empezar.
          </Aviso>
        </div>
      )}

      <p className="mt-e3 text-center text-secundario text-texto-suave">
        Precios por local, más IVA.
      </p>

      <div className="mt-e4">
        <ComoFunciona diasDePrueba={diasDePrueba} />
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

function TarjetaDePlan({
  plan,
  anual,
  locales,
  conPrueba,
  abierto,
  yendo,
  ocupado,
  alElegir,
}: {
  readonly plan: Plan;
  readonly anual: boolean;
  readonly locales: number;
  readonly conPrueba: boolean;
  readonly abierto: boolean;
  readonly yendo: boolean;
  readonly ocupado: boolean;
  readonly alElegir: () => void;
}) {
  const precio = anual && plan.alAnoPorLocal !== null ? plan.alAnoPorLocal : plan.alMesPorLocal;
  const cada = anual && plan.alAnoPorLocal !== null ? 'al año' : 'al mes';
  const recomendado = plan.codigo === 'pro' || plan.codigo === 'cadena';

  return (
    <li
      className={clases(
        'rounded-mayor border bg-superficie p-e4',
        recomendado ? 'border-naranja/60 [box-shadow:var(--sombra-tarjeta)]' : 'border-borde',
      )}
    >
      <div className="flex items-baseline justify-between gap-e3">
        <h2 className="text-seccion font-semibold">{plan.nombre}</h2>
        {recomendado && <Etiqueta tono="marca">Recomendado</Etiqueta>}
      </div>
      <p className="mt-e1 text-secundario text-texto-suave">{plan.paraQuien}</p>
      <p className="mt-e3">
        <span className="text-pantalla font-semibold">{conSimbolo(centimos(precio))}</span>{' '}
        <span className="text-secundario text-texto-suave">+ IVA por local {cada}</span>
      </p>
      {locales > 1 && (
        <p className="text-secundario font-medium text-texto">
          Con tus {locales} locales: {conSimbolo(centimos(precio * locales))} + IVA {cada}.
        </p>
      )}
      <ul className="mt-e3 flex flex-col gap-e1 text-secundario">
        {plan.loQueLleva.map((cosa) => (
          <li key={cosa}>· {cosa}</li>
        ))}
      </ul>
      <div className="mt-e4">
        <Boton
          tono={recomendado ? 'principal' : 'secundario'}
          ancho
          disabled={!abierto || ocupado}
          cargando={yendo}
          textoCargando="Abriendo el pago"
          onClick={alElegir}
        >
          {conPrueba ? `Probar ${plan.nombre} gratis` : `Elegir ${plan.nombre}`}
        </Boton>
      </div>
    </li>
  );
}
