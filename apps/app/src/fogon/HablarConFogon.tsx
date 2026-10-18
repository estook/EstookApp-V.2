import { useEffect, useRef, useState } from 'react';
import { CREDITOS_DE_FOGON, LETRAS_PARA_FOGON } from '@estook/dominio';
import { IconoDeFogon, Logo, clases, usarEsEscritorio } from '@estook/ui';
import { IconoEnviar } from '@estook/iconos';
import { puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';
import type { LaConversacion } from '../ganchos/usarLaConversacion.ts';
import { creditos } from './contrato.ts';
import { lasSugerencias } from './sugerencias.ts';

/**
 * Hablar con Fogón, como un chat de verdad (Fogón 1 · 1, 0097; rehecho el 19-oct).
 *
 * Richi, al verlo en el iPhone: «tiene que ser un chat normal, con el logo de Estook y
 * "sabe que estás en (sitio), pregunta lo que necesites"… ayudar a la gente a entender
 * qué puede hacer en cada página». Así queda:
 *
 *   · **Vacío**: el logo, «Fogón sabe que estás en Almacén», y **tres o cuatro preguntas
 *     que se tocan y se mandan** (`sugerencias.ts`), las de esa pantalla. Es lo que
 *     enseña qué se le puede pedir, sin texto que explique.
 *   · **Con mensajes**: los tuyos a la derecha, los de Fogón a la izquierda con su llama.
 *     Un fallo es un mensaje más, con su motivo, no un recuadro rojo encima de todo.
 *   · **La caja, abajo y fija** (`CajaDeFogon`, en el pie de la ventana), con el botón de
 *     enviar como el chat del equipo, y debajo, pequeño, lo que queda.
 *   · **Dice que es una IA** (Reglamento europeo de IA, art. 50), en una línea.
 *
 * La conversación vive en la pantalla (0023): al cambiar de local, se va. Las dos últimas
 * idas y vueltas viajan con la pregunta para que siga el hilo.
 */

/** «1.499»: en castellano, el punto de los miles también con cuatro cifras. */
function conPuntos(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ── El cuerpo: el saludo con sus preguntas, o la conversación ───────────────

export function ConversacionConFogon({
  charla,
  donde,
  app,
}: {
  readonly charla: LaConversacion;
  /** «Almacén · Compras», para el saludo. */
  readonly donde: string;
  /** La app («almacen»), para las sugerencias. */
  readonly app: string;
}) {
  const { permisos } = usarSesion();
  const final = useRef<HTMLDivElement>(null);
  const veDinero = puedeVer(permisos, 'dato.precio_de_compra') || puedeVer(permisos, 'dato.ventas');

  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' });
  }, [charla.mensajes.length, charla.preguntando]);

  if (charla.mensajes.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-e4 py-e5 text-center">
        <Logo alto={30} />
        <div className="flex flex-col gap-e1">
          <p className="text-titulo font-semibold">Pregunta lo que necesites</p>
          <p className="text-cuerpo text-texto-suave">
            Fogón sabe que estás en <strong className="text-texto">{donde}</strong>.
          </p>
        </div>
        <ul aria-label="Puedes preguntarle" className="flex w-full max-w-[26rem] flex-col gap-e2">
          {lasSugerencias(app, veDinero).map((s) => (
            <li key={s.texto}>
              <button
                type="button"
                disabled={charla.sinCreditos}
                onClick={() => {
                  void charla.preguntar(s.texto);
                }}
                className={clases(
                  'flex min-h-toque w-full items-center gap-e2 rounded-grande border border-borde',
                  'bg-superficie px-e3 py-e2 text-left text-cuerpo hover:bg-fondo disabled:opacity-50',
                )}
              >
                <span aria-hidden className="shrink-0 text-naranja">
                  <IconoDeFogon size={16} />
                </span>
                {s.texto}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-etiqueta text-texto-tenue">
          Fogón es una inteligencia artificial: contesta con lo que tú puedes ver. Revisa lo
          importante.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-e3 py-e3">
      <ol aria-label="La conversación" className="flex flex-col gap-e2">
        {charla.mensajes.map((m, i) => (
          <li
            key={i}
            className={clases(
              'max-w-[88%] whitespace-pre-line rounded-grande px-e3 py-e2 text-cuerpo',
              m.rol === 'user'
                ? 'self-end bg-texto text-superficie'
                : clases(
                    'flex gap-e2 self-start',
                    m.fallo === true ? 'border border-mal/40 bg-mal/10' : 'bg-fondo',
                  ),
            )}
          >
            {m.rol === 'assistant' && (
              <span
                aria-hidden
                className={clases(
                  'mt-[2px] shrink-0',
                  m.fallo === true ? 'text-mal' : 'text-naranja',
                )}
              >
                <IconoDeFogon size={18} />
              </span>
            )}
            <span>{m.texto}</span>
          </li>
        ))}
        {charla.preguntando && (
          <li className="flex items-center gap-e2 self-start rounded-grande bg-fondo px-e3 py-e2 text-cuerpo text-texto-suave">
            <span aria-hidden className="animate-pulse text-naranja">
              <IconoDeFogon size={18} />
            </span>
            Fogón está mirando…
          </li>
        )}
      </ol>
      <div ref={final} />
    </div>
  );
}

// ── El pie: la caja de escribir, fija abajo ──────────────────────────────────

export function CajaDeFogon({
  charla,
  donde,
}: {
  readonly charla: LaConversacion;
  readonly donde: string;
}) {
  const [pregunta, setPregunta] = useState('');
  const enEscritorio = usarEsEscritorio();
  const caja = useRef<HTMLTextAreaElement>(null);
  const gasta = CREDITOS_DE_FOGON.preguntar;
  const escrita = pregunta.trim();
  const { queda } = charla;

  // La caja crece con lo escrito, hasta unas cinco líneas.
  useEffect(() => {
    const el = caja.current;
    if (el === null) return;
    el.style.height = 'auto';
    el.style.height = `${String(Math.min(el.scrollHeight, 140))}px`;
  }, [pregunta]);

  function mandar() {
    if (escrita.length < 2 || charla.preguntando || charla.sinCreditos) return;
    setPregunta('');
    void charla.preguntar(escrita);
  }

  return (
    <div className="flex w-full flex-col gap-e1">
      <form
        className="flex items-end gap-e2"
        onSubmit={(e) => {
          e.preventDefault();
          mandar();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Tu pregunta</span>
          <textarea
            ref={caja}
            rows={1}
            value={pregunta}
            maxLength={LETRAS_PARA_FOGON}
            disabled={charla.sinCreditos}
            placeholder={`Pregunta sobre ${donde}…`}
            onChange={(e) => {
              setPregunta(e.target.value);
            }}
            onKeyDown={(e) => {
              // En el ordenador, Intro manda y Mayúsculas + Intro hace otra línea. En el
              // móvil, Intro es una línea más, como en el chat del equipo.
              if (e.key === 'Enter' && !e.shiftKey && enEscritorio) {
                e.preventDefault();
                mandar();
              }
            }}
            className="block max-h-[140px] min-h-toque w-full resize-none rounded-grande border border-borde-fuerte bg-superficie px-e3 py-[10px] text-cuerpo text-texto placeholder:text-texto-tenue"
          />
        </label>
        <button
          type="submit"
          aria-label={`Preguntar · ${creditos(gasta)}`}
          disabled={escrita.length < 2 || charla.preguntando || charla.sinCreditos}
          // Que la caja no pierda el foco: en el móvil el teclado no se cierra.
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          className="grid size-toque shrink-0 place-items-center rounded-redondo bg-naranja text-sobre-naranja disabled:opacity-50"
        >
          <IconoEnviar size={20} />
        </button>
      </form>
      {queda !== null && (
        <p className="text-etiqueta text-texto-tenue">
          {charla.sinCreditos
            ? queda.mes < gasta
              ? 'Este mes ya no quedan créditos. El día 1 vuelven.'
              : 'Hoy ya no quedan créditos. Mañana vuelven.'
            : `Cada pregunta, ${creditos(gasta)} · quedan ${conPuntos(queda.hoy)} hoy y ${conPuntos(queda.mes)} de ${conPuntos(queda.delMes)} este mes`}
        </p>
      )}
    </div>
  );
}
