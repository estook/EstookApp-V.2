import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CREDITOS_DE_FOGON, LETRAS_PARA_FOGON } from '@estook/dominio';
import { Boton, CAJA, ErrorEnCristiano, IconoDeFogon, clases } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { creditos, dondeEstas, type LoQueQueda, type RespuestaDeFogon } from './contrato.ts';

/**
 * Hablar con Fogón (Fogón 1 · 1, decisión 0097).
 *
 * Una caja para preguntar y lo que contesta, **sin nada más**: la pantalla que tienes
 * detrás es el contexto, y eso lo sabe el servidor (0023), no esta ventana.
 *
 *   · **Dice que es una IA**, siempre, arriba (Reglamento europeo de IA, art. 50).
 *   · **Dice lo que gasta** antes de preguntar («1 crédito») y lo que queda después.
 *   · **La conversación vive aquí**, en la pantalla: al cambiar de local o cerrar la
 *     sesión, se borra. Las dos últimas preguntas viajan con la nueva para seguir el
 *     hilo; nada se guarda en la base salvo lo que se preguntó y lo que costó.
 */

interface Mensaje {
  readonly rol: 'user' | 'assistant';
  readonly texto: string;
}

/** «1.499»: en castellano, el punto de los miles también con cuatro cifras. */
function conPuntos(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Cuántos mensajes de antes viajan con la pregunta: las dos últimas idas y vueltas. */
const DEL_HILO = 4;

export function HablarConFogon({
  queda: quedaAlAbrir,
  casiSinCreditos,
  donde,
}: {
  readonly queda: LoQueQueda;
  readonly casiSinCreditos: boolean;
  /** «Almacén · Compras», para la frase de arriba. */
  readonly donde: string;
}) {
  const { cliente, yo } = usarSesion();
  const { pathname } = useLocation();
  const cache = useQueryClient();
  const [mensajes, setMensajes] = useState<readonly Mensaje[]>([]);
  const [pregunta, setPregunta] = useState('');
  const [preguntando, setPreguntando] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [queda, setQueda] = useState(quedaAlAbrir);
  const final = useRef<HTMLDivElement>(null);

  // Una conversación es de una persona y un local (0023, regla dos): al cambiar, se va.
  const localId = yo?.local?.id ?? null;
  useEffect(() => {
    setMensajes([]);
    setError(null);
  }, [localId]);

  useEffect(() => {
    setQueda(quedaAlAbrir);
  }, [quedaAlAbrir]);

  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' });
  }, [mensajes.length, preguntando]);

  const gasta = CREDITOS_DE_FOGON.preguntar;
  const sinCreditos = queda.hoy < gasta || queda.mes < gasta;
  const escrita = pregunta.trim();

  async function preguntar() {
    if (escrita.length < 2 || preguntando) return;
    setPreguntando(true);
    setError(null);
    const antes = mensajes.slice(-DEL_HILO);
    setMensajes((m) => [...m, { rol: 'user', texto: escrita }]);
    setPregunta('');
    const respuesta = await cliente.ejecutar<RespuestaDeFogon>('preguntar_a_fogon', {
      pregunta: escrita,
      donde: dondeEstas(pathname),
      antes,
    });
    setPreguntando(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      // La pregunta vuelve a la caja: no se pierde lo escrito.
      setMensajes((m) => m.slice(0, -1));
      setPregunta(escrita);
      return;
    }
    setMensajes((m) => [...m, { rol: 'assistant', texto: respuesta.datos.respuesta }]);
    setQueda(respuesta.datos.queda);
    void cache.invalidateQueries({ queryKey: ['fogon_y_yo'] });
  }

  return (
    <div className="flex flex-col gap-e3">
      <p className="text-secundario text-texto-suave">
        Fogón es una inteligencia artificial. Contesta con lo que tú puedes ver en {donde}; revisa
        lo importante.
      </p>

      {mensajes.length > 0 && (
        <ol aria-label="La conversación" className="flex flex-col gap-e2">
          {mensajes.map((m, i) => (
            <li
              key={i}
              className={clases(
                'max-w-[92%] whitespace-pre-line rounded-grande px-e3 py-e2 text-cuerpo',
                m.rol === 'user'
                  ? 'self-end bg-texto text-superficie'
                  : 'flex gap-e2 self-start bg-fondo',
              )}
            >
              {m.rol === 'assistant' && (
                <span aria-hidden className="mt-[2px] shrink-0 text-naranja">
                  <IconoDeFogon size={18} />
                </span>
              )}
              <span>{m.texto}</span>
            </li>
          ))}
          {preguntando && (
            <li className="self-start rounded-grande bg-fondo px-e3 py-e2 text-cuerpo text-texto-suave">
              Fogón está mirando…
            </li>
          )}
        </ol>
      )}
      <div ref={final} />

      {error !== null && <ErrorEnCristiano error={error} />}

      <form
        className="flex flex-col gap-e2"
        onSubmit={(e) => {
          e.preventDefault();
          void preguntar();
        }}
      >
        <textarea
          aria-label="Tu pregunta"
          value={pregunta}
          maxLength={LETRAS_PARA_FOGON}
          rows={2}
          disabled={sinCreditos}
          placeholder={
            mensajes.length === 0 ? '¿Qué tengo que atender hoy?' : 'Pregúntale otra cosa'
          }
          onChange={(e) => {
            setPregunta(e.target.value);
          }}
          onKeyDown={(e) => {
            // Intro pregunta; Mayúsculas + Intro, una línea nueva.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void preguntar();
            }
          }}
          className={`${CAJA} min-h-[3.25rem] py-e2`}
        />
        <div className="flex flex-wrap items-center justify-between gap-e2">
          <p className="text-etiqueta text-texto-tenue">
            {sinCreditos
              ? queda.mes < gasta
                ? 'Este mes ya no quedan créditos. El día 1 vuelven.'
                : 'Hoy ya no quedan créditos. Mañana vuelven.'
              : `Quedan ${creditos(queda.hoy)} hoy · ${conPuntos(queda.mes)} de ${conPuntos(queda.delMes)} este mes`}
            {casiSinCreditos && !sinCreditos ? ' · Queda poco este mes' : ''}
          </p>
          <Boton
            tono="principal"
            type="submit"
            disabled={escrita.length < 2 || sinCreditos}
            cargando={preguntando}
            textoCargando="Preguntando"
          >
            Preguntar · {creditos(gasta)}
          </Boton>
        </div>
      </form>
    </div>
  );
}
