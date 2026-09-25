import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PLANES,
  centimos,
  conSimbolo,
  elPlanPorLosLocales,
  fechaEnLetra,
  planPorCodigo,
  type CodigoDePlan,
  type FechaOperativa,
  type Intervalo,
} from '@estook/dominio';
import { Aviso, Boton, Cargando, ErrorEnCristiano, Etiqueta, Tarjeta, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarMiSuscripcion } from '../ganchos/usarMiSuscripcion.ts';
import { ComoFunciona } from '../pago/ComoFunciona.tsx';
import type { MiSuscripcion } from '../pago/contrato.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Ajustes → Suscripción (entrega E2 · decisión 0048).
 *
 * «Que la vea desde ahí, todos los datos: cuánto queda, renovación, cancelación»
 * (Richi, 25-sep). Arriba lo que se mira —el plan, lo que se paga y cuándo se
 * renueva—; debajo lo que se hace: la tarjeta y las facturas (en el portal de
 * Stripe), cambiar de plan y cancelar. El porqué, plegado en «Cómo funciona».
 */

/** «25 de octubre de 2026», de una fecha o un instante. */
function elDia(fecha: string | null): string | null {
  if (fecha === null) return null;
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? fecha
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(fecha));
  return fechaEnLetra(dia as FechaOperativa);
}

const COMO_SE_LLAMA: Record<
  MiSuscripcion['como'],
  { texto: string; tono: 'bien' | 'info' | 'mal' | 'atencion' }
> = {
  al_dia: { texto: 'Al día', tono: 'bien' },
  prueba: { texto: 'En prueba', tono: 'info' },
  impago: { texto: 'Cobro fallido', tono: 'mal' },
  solo_lectura: { texto: 'Solo lectura', tono: 'atencion' },
  sin_pagar: { texto: 'Sin plan', tono: 'atencion' },
};

export function TuSuscripcion() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const suya = usarMiSuscripcion();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const ir = useMutation({
    mutationFn: async () => {
      const respuesta = await cliente.ejecutar<{ url: string }>('abrir_el_portal', {});
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

  const hacer = useMutation({
    mutationFn: async ({
      nombre,
      entrada,
    }: {
      nombre: string;
      entrada: Record<string, unknown>;
    }) => {
      const respuesta = await cliente.ejecutar(nombre, entrada);
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
    },
    onSuccess: async () => {
      setError(null);
      setCambiando(false);
      setCancelando(false);
      await cache.invalidateQueries({ queryKey: ['mi_suscripcion'] });
    },
    onError: (fallo: FalloDeLaApi) => {
      setError(fallo.error);
    },
  });

  if (suya.isLoading) {
    return (
      <Tarjeta titulo="Tu suscripción">
        <Cargando que="tu suscripción" lineas={3} />
      </Tarjeta>
    );
  }
  if (suya.error !== null || suya.data === undefined) {
    return (
      <Tarjeta titulo="Tu suscripción">
        {suya.error !== null ? (
          <ErrorEnCristiano error={suya.error.error} />
        ) : (
          <p className="text-secundario text-texto-suave">No he podido leerla.</p>
        )}
      </Tarjeta>
    );
  }

  const s = suya.data;
  const plan = s.plan === null ? null : planPorCodigo(s.plan);
  const cada = s.intervalo === 'ano' ? 'al año' : 'al mes';
  const etiqueta = s.deLaCasa
    ? { texto: 'De la casa', tono: 'info' as const }
    : s.cancelaAlAcabar && s.como !== 'solo_lectura'
      ? { texto: 'Cancelada', tono: 'atencion' as const }
      : COMO_SE_LLAMA[s.como];

  return (
    <Tarjeta
      titulo="Tu suscripción"
      accion={<Etiqueta tono={etiqueta.tono}>{etiqueta.texto}</Etiqueta>}
    >
      <div className="flex flex-col gap-e4">
        {s.deLaCasa ? (
          <p className="text-secundario text-texto-suave">
            Esta cuenta es de la casa: no se cobra, y tiene todo abierto.
          </p>
        ) : (
          <>
            {/* ── Lo que se mira ── */}
            <div>
              <p className="text-secundario text-texto-suave">
                {plan?.nombre ?? 'Sin plan'}
                {s.intervalo === null ? '' : s.intervalo === 'ano' ? ' · anual' : ' · mensual'}
              </p>
              {s.cuota !== null && (
                <p className="mt-e1">
                  <span className="text-pantalla font-semibold tabular-nums">
                    {conSimbolo(centimos(s.cuota))}
                  </span>{' '}
                  <span className="text-secundario text-texto-suave">
                    {cada} · {s.locales === 1 ? '1 local' : `${String(s.locales)} locales`} · IVA
                    incluido
                  </span>
                </p>
              )}
              <LoQueViene s={s} />
              {s.tarjeta !== null && (
                <p className="mt-e1 text-secundario text-texto-suave">Con tu {s.tarjeta}</p>
              )}
            </div>

            {s.como === 'impago' && (
              <Aviso
                tono="mal"
                titulo={`No hemos podido cobrar. Te ${s.diasQuedan === 1 ? 'queda 1 día' : `quedan ${String(s.diasQuedan ?? 0)} días`}.`}
              >
                Cambia la tarjeta o paga desde «Tarjeta y facturas». Después la cuenta pasa a solo
                lectura; no se pierde nada.
              </Aviso>
            )}
            {s.como === 'solo_lectura' && s.plan !== 'pausa' && (
              <Aviso tono="atencion" titulo="Tu cuenta está en solo lectura">
                Paga desde «Tarjeta y facturas» y vuelve todo como estaba. No se ha perdido nada.
              </Aviso>
            )}

            {/* ── Lo que se hace ── */}
            {s.conStripe && (
              <div className="flex flex-wrap gap-e2">
                <Boton
                  tono={
                    s.como === 'impago' || s.como === 'solo_lectura' ? 'principal' : 'secundario'
                  }
                  cargando={ir.isPending}
                  textoCargando="Abriendo"
                  onClick={() => {
                    setError(null);
                    ir.mutate();
                  }}
                >
                  {s.como === 'impago' || s.como === 'solo_lectura'
                    ? 'Pagar ahora'
                    : 'Tarjeta y facturas'}
                </Boton>
                {!cambiando && (
                  <Boton
                    tono="secundario"
                    onClick={() => {
                      setCambiando(true);
                      setCancelando(false);
                    }}
                  >
                    Cambiar de plan
                  </Boton>
                )}
              </div>
            )}

            {cambiando && (
              <CambiarDePlan
                s={s}
                ocupado={hacer.isPending}
                alElegir={(nuevo, intervalo) => {
                  hacer.mutate({ nombre: 'cambiar_de_plan', entrada: { plan: nuevo, intervalo } });
                }}
                alCerrar={() => {
                  setCambiando(false);
                }}
              />
            )}

            {s.conStripe && !s.cancelaAlAcabar && !cancelando && (
              <div>
                <Boton
                  tono="texto"
                  onClick={() => {
                    setCancelando(true);
                    setCambiando(false);
                  }}
                >
                  Cancelar la suscripción
                </Boton>
              </div>
            )}

            {cancelando && (
              <Aviso
                tono="atencion"
                titulo={s.como === 'prueba' ? '¿Cancelar la prueba?' : '¿Cancelar la suscripción?'}
                accion={
                  <div className="flex flex-wrap gap-e2">
                    <Boton
                      tono="peligro"
                      cargando={hacer.isPending}
                      textoCargando="Cancelando"
                      onClick={() => {
                        hacer.mutate({ nombre: 'cancelar_la_suscripcion', entrada: {} });
                      }}
                    >
                      Sí, cancelar
                    </Boton>
                    <Boton
                      tono="texto"
                      onClick={() => {
                        setCancelando(false);
                      }}
                    >
                      No
                    </Boton>
                  </div>
                }
              >
                {s.como === 'prueba'
                  ? `Sigue hasta el ${elDia(s.pruebaHasta) ?? 'final de la prueba'} y no se te cobra nada.`
                  : `Sigue hasta el ${elDia(s.periodoHasta) ?? 'final de lo pagado'}. Después queda en solo lectura, con tus datos.`}
              </Aviso>
            )}

            {s.conStripe && s.cancelaAlAcabar && (
              <div>
                <Boton
                  tono="secundario"
                  cargando={hacer.isPending}
                  textoCargando="Reanudando"
                  onClick={() => {
                    hacer.mutate({ nombre: 'reanudar_la_suscripcion', entrada: {} });
                  }}
                >
                  Seguir con la suscripción
                </Boton>
              </div>
            )}
          </>
        )}

        {error !== null && <ErrorEnCristiano error={error} />}

        {!s.deLaCasa && <ComoFunciona diasDePrueba={s.como === 'prueba' ? null : s.diasDePrueba} />}
      </div>
    </Tarjeta>
  );
}

/** Lo que pasa después: cuándo acaba la prueba, cuándo se renueva o cuándo se cancela. */
function LoQueViene({ s }: { readonly s: MiSuscripcion }) {
  const prueba = elDia(s.pruebaHasta);
  const periodo = elDia(s.periodoHasta);
  const cuanto = s.cuota === null ? null : conSimbolo(centimos(s.cuota));
  let texto: string | null = null;
  if (s.como === 'prueba' && prueba !== null) {
    texto = s.cancelaAlAcabar
      ? `Tu prueba acaba el ${prueba} y no se cobrará nada.`
      : `Tu prueba acaba el ${prueba}. Ese día se cobran ${cuanto ?? 'la cuota'}.`;
  } else if (periodo !== null) {
    texto = s.cancelaAlAcabar
      ? `Se cancela el ${periodo}: hasta entonces, todo igual.`
      : `Se renueva el ${periodo}.`;
  }
  if (texto === null) return null;
  return <p className="mt-e2 text-cuerpo">{texto}</p>;
}

/** Los planes a los que se puede cambiar, con el que toca por los locales. */
function CambiarDePlan({
  s,
  ocupado,
  alElegir,
  alCerrar,
}: {
  readonly s: MiSuscripcion;
  readonly ocupado: boolean;
  readonly alElegir: (plan: CodigoDePlan, intervalo: Intervalo) => void;
  readonly alCerrar: () => void;
}) {
  const [intervalo, setIntervalo] = useState<Intervalo>(s.intervalo ?? 'mes');
  const locales = Math.max(1, s.localesActivos);
  const opciones = PLANES.filter((p) =>
    locales >= 2 ? p.codigo !== 'pro' : p.codigo !== 'cadena',
  );

  return (
    <div className="flex flex-col gap-e3 rounded-grande border border-borde p-e3">
      <div
        role="tablist"
        aria-label="Cada cuánto"
        className="grid grid-cols-2 gap-e1 rounded-medio bg-borde/40 p-e1"
      >
        {(['mes', 'ano'] as const).map((valor) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={intervalo === valor}
            onClick={() => {
              setIntervalo(valor);
            }}
            className={clases(
              'min-h-toque rounded-medio px-e2 text-secundario',
              intervalo === valor
                ? 'bg-superficie font-medium text-texto shadow-s1'
                : 'text-texto-suave',
            )}
          >
            {valor === 'mes' ? 'Cada mes' : 'Cada año · 2 meses gratis'}
          </button>
        ))}
      </div>
      <ul className="flex flex-col divide-y divide-borde">
        {opciones.map((p) => {
          const elQueToca = elPlanPorLosLocales(p.codigo, locales);
          const soloMensual = p.alAnoPorLocal === null;
          const cadaUno = intervalo === 'ano' && !soloMensual ? p.alAnoPorLocal : p.alMesPorLocal;
          const esElSuyo =
            s.plan === elQueToca && (s.intervalo ?? 'mes') === (soloMensual ? 'mes' : intervalo);
          return (
            <li key={p.codigo} className="flex items-center justify-between gap-e3 py-e2">
              <span className="min-w-0">
                <span className="block font-medium">{p.nombre}</span>
                <span className="block text-secundario text-texto-suave">
                  {conSimbolo(centimos(cadaUno * locales))}{' '}
                  {intervalo === 'ano' && !soloMensual ? 'al año' : 'al mes'}
                  {p.codigo === 'pausa' ? ' · solo lectura' : ''}
                </span>
              </span>
              {esElSuyo ? (
                <Etiqueta tono="neutro">El tuyo</Etiqueta>
              ) : (
                <Boton
                  tono="secundario"
                  disabled={ocupado}
                  onClick={() => {
                    alElegir(p.codigo, soloMensual ? 'mes' : intervalo);
                  }}
                >
                  Cambiar
                </Boton>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-etiqueta text-texto-suave">
        Se prorratea en la siguiente factura. Pausa deja la cuenta en solo lectura, con tus datos,
        por 12 € al mes por local.
      </p>
      <div>
        <Boton tono="texto" onClick={alCerrar}>
          Dejarlo como está
        </Boton>
      </div>
    </div>
  );
}
