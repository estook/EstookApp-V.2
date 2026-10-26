import { useState } from 'react';
import {
  FUNCIONES_QUE_SE_ELIGEN,
  NOMBRE_DE_LA_FUNCION,
  nombrePropuesto,
  type FuncionDelAparato,
} from '@estook/dominio';
import type { QueSera } from '../datos/tipos.ts';

/**
 * **Qué es este aparato** (maquetas 2 y 16; Anexo 11.3): la función se elige, **no se
 * adivina nunca**. Caja, comandero, pantalla de cocina o de barra (T4). Si es una caja, su cajón; si es un comandero, para todos o el móvil de alguien.
 * El nombre se propone solo.
 *
 * La usan el primer aparato (con el correo) y «Añadir aparato» en Ajustes del TPV, que
 * es lo mismo dicho antes de sacar el código; y la ficha de cada aparato, para cambiar lo
 * que es sin volver a vincularlo (Anexo 11.3), con lo que ya es marcado (`yaEs`).
 */

/** Lo que ya es un aparato, para cambiarlo. */
export interface LoQueYaEs {
  readonly funcion: FuncionDelAparato;
  readonly nombre: string;
  readonly personaId: string | null;
  readonly cajonId: string | null;
}

const QUE_HACE: Record<(typeof FUNCIONES_QUE_SE_ELIGEN)[number], string> = {
  caja: 'El mostrador. Mesas, barra, para llevar y cobrar. Tiene el cajón del dinero.',
  comandero:
    'La tablet de la sala (para todos) o el móvil de un camarero (solo suyo). Solo la sala: mesas, pedir y cobrar.',
  cocina:
    'Una tablet grande o una tele en la cocina. Sin PIN, siempre encendida: los tickets, tachar lo que sale y llamar al camarero.',
  barra:
    'Lo mismo, en la barra: bebidas, cafés y copas, todo en marcha al llegar. Sin PIN, siempre encendida.',
};

export function ElegirQueSera({
  cajones,
  personas,
  losQueHay,
  textoDelBoton,
  ocupado,
  alElegir,
  yaEs,
  funciones = FUNCIONES_QUE_SE_ELIGEN,
}: {
  readonly cajones: readonly { readonly id: string; readonly nombre: string }[];
  readonly personas: readonly { readonly id: string; readonly nombre: string }[];
  /** Los nombres de los aparatos que ya hay, para proponer el siguiente. */
  readonly losQueHay: readonly string[];
  readonly textoDelBoton: string;
  readonly ocupado: boolean;
  readonly alElegir: (que: QueSera) => void;
  /** Al cambiar un aparato: lo que ya es, marcado de entrada. */
  readonly yaEs?: LoQueYaEs;
  readonly funciones?: readonly (typeof FUNCIONES_QUE_SE_ELIGEN)[number][];
}) {
  const [funcion, setFuncion] = useState<FuncionDelAparato>(yaEs?.funcion ?? 'caja');
  const [deQuien, setDeQuien] = useState<string | null>(yaEs?.personaId ?? null);
  // Una caja por cajón (0107): lo de fábrica es uno nuevo; compartir se elige.
  const [cajon, setCajon] = useState<string | null>(yaEs?.cajonId ?? null);
  const [nombreEscrito, setNombreEscrito] = useState<string | null>(yaEs?.nombre ?? null);

  const dueno = personas.find((p) => p.id === deQuien);
  const propuesto = nombrePropuesto(funcion, losQueHay, dueno?.nombre);
  const nombre = nombreEscrito ?? propuesto;
  const cajonNuevo = `Cajón ${String(cajones.length + 1)}`;
  const listo = nombre.trim() !== '' && (funcion !== 'comandero' || deQuien !== 'elegir');
  // Al cambiar un aparato, el botón no hace nada hasta que algo cambia.
  const cambiaAlgo =
    yaEs === undefined ||
    funcion !== yaEs.funcion ||
    nombre.trim() !== yaEs.nombre ||
    (funcion === 'comandero' && deQuien !== yaEs.personaId) ||
    (funcion === 'caja' && cajon !== yaEs.cajonId);

  function elegir() {
    if (!listo || !cambiaAlgo) return;
    alElegir({
      funcion,
      nombre: nombre.trim(),
      ...(funcion === 'comandero' && dueno !== undefined ? { persona_id: dueno.id } : {}),
      ...(funcion === 'caja'
        ? cajon === null
          ? { cajon_nuevo: cajonNuevo }
          : { cajon_id: cajon }
        : {}),
    });
  }

  return (
    <div className="flex flex-col gap-e5">
      <div
        role="radiogroup"
        aria-label="Qué es"
        className={`grid gap-e3 ${funciones.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}
      >
        {funciones.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={funcion === f}
            onClick={() => {
              if (f === funcion) return;
              setFuncion(f);
              // Volver a lo que ya era lo deja como estaba; otra cosa propone su nombre.
              const vuelve = yaEs?.funcion === f;
              setNombreEscrito(vuelve ? yaEs.nombre : null);
              setDeQuien(vuelve ? yaEs.personaId : null);
              setCajon(vuelve ? yaEs.cajonId : null);
            }}
            className={[
              'flex flex-col gap-e2 rounded-mayor p-e4 text-left',
              funcion === f
                ? 'border-[3px] border-naranja bg-charcoal'
                : 'border-2 border-borde bg-superficie',
            ].join(' ')}
          >
            <span className="text-pantalla font-bold">{NOMBRE_DE_LA_FUNCION[f]}</span>
            <span className="text-secundario text-texto-suave">{QUE_HACE[f]}</span>
          </button>
        ))}
      </div>

      {funcion === 'comandero' && (
        <div className="flex flex-col gap-e3">
          <span className="text-secundario font-semibold text-texto-tenue">¿Para quién?</span>
          <div role="radiogroup" aria-label="Para quién" className="grid gap-e3 sm:grid-cols-2">
            <Opcion
              puesta={deQuien === null}
              titulo="Para todos"
              frase="La tablet de la sala. Entra cualquiera con su PIN."
              alElegir={() => {
                setDeQuien(null);
                setNombreEscrito(null);
              }}
            />
            <Opcion
              puesta={deQuien !== null}
              titulo="El móvil de una persona"
              frase="Solo entra su PIN. Si deja el local, deja de valer."
              alElegir={() => {
                setDeQuien(personas[0]?.id ?? 'elegir');
                setNombreEscrito(null);
              }}
            />
          </div>
          {deQuien !== null && (
            <div role="radiogroup" aria-label="De quién es" className="flex flex-wrap gap-e2">
              {personas.length === 0 ? (
                <span className="text-secundario text-texto-suave">
                  Nadie toma nota en este local todavía.
                </span>
              ) : (
                personas.map((p) => (
                  <Pastilla
                    key={p.id}
                    puesta={deQuien === p.id}
                    alElegir={() => {
                      setDeQuien(p.id);
                      setNombreEscrito(null);
                    }}
                  >
                    {p.nombre}
                  </Pastilla>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {funcion === 'caja' && (
        <div className="flex flex-col gap-e3">
          <span className="text-secundario font-semibold text-texto-tenue">
            Su cajón del dinero (una caja siempre tiene uno)
          </span>
          <div role="radiogroup" aria-label="Su cajón" className="flex flex-wrap gap-e2">
            {cajones.map((c) => (
              <Pastilla
                key={c.id}
                puesta={cajon === c.id}
                alElegir={() => {
                  setCajon(c.id);
                }}
              >
                {c.id === yaEs?.cajonId ? c.nombre : `Compartir ${c.nombre}`}
              </Pastilla>
            ))}
            <Pastilla
              puesta={cajon === null}
              alElegir={() => {
                setCajon(null);
              }}
            >
              {cajonNuevo} · nuevo
            </Pastilla>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-e4">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-e2">
          <span className="text-secundario font-semibold text-texto-tenue">Cómo se llama</span>
          <input
            value={nombre}
            maxLength={60}
            onChange={(e) => {
              setNombreEscrito(e.target.value);
            }}
            className="min-h-toque-cocina rounded-grande border-2 border-borde bg-superficie px-e4 text-seccion font-semibold text-texto"
          />
        </label>
        <button
          type="button"
          disabled={!listo || !cambiaAlgo || ocupado}
          onClick={elegir}
          className="min-h-toque-cocina rounded-grande bg-naranja px-e6 text-seccion font-bold text-sobre-naranja disabled:opacity-60"
        >
          {ocupado ? 'Un momento…' : textoDelBoton}
        </button>
      </div>
    </div>
  );
}

function Opcion({
  puesta,
  titulo,
  frase,
  alElegir,
}: {
  readonly puesta: boolean;
  readonly titulo: string;
  readonly frase: string;
  readonly alElegir: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={puesta}
      onClick={alElegir}
      className={[
        'flex flex-col gap-e1 rounded-mayor p-e4 text-left',
        puesta ? 'border-[3px] border-naranja bg-charcoal' : 'border-2 border-borde bg-superficie',
      ].join(' ')}
    >
      <span className="text-seccion font-bold">{titulo}</span>
      <span className="text-secundario text-texto-suave">{frase}</span>
    </button>
  );
}

export function Pastilla({
  puesta,
  alElegir,
  children,
}: {
  readonly puesta: boolean;
  readonly alElegir: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={puesta}
      onClick={alElegir}
      className={[
        'min-h-toque rounded-redondo px-e4 font-semibold',
        puesta ? 'bg-texto text-fondo' : 'border-2 border-borde text-texto-suave',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
