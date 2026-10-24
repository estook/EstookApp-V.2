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
 * adivina nunca**. Caja, comandero o fichar (cocina y barra llegan con su pantalla, en
 * T4). Si es una caja, su cajón; si es un comandero, para todos o el móvil de alguien.
 * El nombre se propone solo.
 *
 * La usan el primer aparato (con el correo) y «Añadir aparato» en Ajustes del TPV, que
 * es lo mismo dicho antes de sacar el código.
 */

const QUE_HACE: Record<(typeof FUNCIONES_QUE_SE_ELIGEN)[number], string> = {
  caja: 'El mostrador. Mesas, barra, para llevar y cobrar. Tiene el cajón del dinero.',
  comandero:
    'La tablet de la sala (para todos) o el móvil de un camarero (solo suyo). Mesas y pedir; nunca abre un cajón.',
  fichar:
    'El aparato de la entrada: cada uno teclea su PIN y ficha la entrada, la pausa o la salida.',
};

export function ElegirQueSera({
  cajones,
  personas,
  losQueHay,
  textoDelBoton,
  ocupado,
  alElegir,
}: {
  readonly cajones: readonly { readonly id: string; readonly nombre: string }[];
  readonly personas: readonly { readonly id: string; readonly nombre: string }[];
  /** Los nombres de los aparatos que ya hay, para proponer el siguiente. */
  readonly losQueHay: readonly string[];
  readonly textoDelBoton: string;
  readonly ocupado: boolean;
  readonly alElegir: (que: QueSera) => void;
}) {
  const [funcion, setFuncion] = useState<FuncionDelAparato>('caja');
  const [deQuien, setDeQuien] = useState<string | null>(null);
  // Una caja por cajón (0107): lo de fábrica es uno nuevo; compartir se elige.
  const [cajon, setCajon] = useState<string | null>(null);
  const [nombreEscrito, setNombreEscrito] = useState<string | null>(null);

  const dueno = personas.find((p) => p.id === deQuien);
  const propuesto = nombrePropuesto(funcion, losQueHay, dueno?.nombre);
  const nombre = nombreEscrito ?? propuesto;
  const cajonNuevo = `Cajón ${String(cajones.length + 1)}`;
  const listo = nombre.trim() !== '' && (funcion !== 'comandero' || deQuien !== 'elegir');

  function elegir() {
    if (!listo) return;
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
      <div role="radiogroup" aria-label="Qué es" className="grid gap-e3 sm:grid-cols-3">
        {FUNCIONES_QUE_SE_ELIGEN.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={funcion === f}
            onClick={() => {
              setFuncion(f);
              setNombreEscrito(null);
              if (f !== 'comandero') setDeQuien(null);
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
                {cajones.length > 0 ? `Compartir ${c.nombre}` : c.nombre}
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
          disabled={!listo || ocupado}
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
