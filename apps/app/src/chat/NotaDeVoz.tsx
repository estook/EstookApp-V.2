import { useEffect, useRef, useState } from 'react';
import { duracionEnLetra } from '@estook/dominio';
import { clases } from '@estook/ui';
import { IconoPausa, IconoReproducir } from '@estook/iconos';

/**
 * Una nota de voz, con su reproductor (repaso de C1, 6-oct).
 *
 * «El símbolo de carga se queda cargando aunque ya esté cargado, y no se quita hasta
 * que das al play.» Era el reproductor del navegador: las notas grabadas en WebM no
 * dicen cuánto duran dentro, y Safari se queda esperando a saberlo. Aquí la duración la
 * sabemos al grabar (`segundos`), así que el reproductor es nuestro y no espera a nada:
 *
 *   · **Play y pausa**, una barra que avanza y se puede tocar para saltar, y el tiempo.
 *   · **Solo pide el audio al tocar play** (`preload="none"`): veinte notas en pantalla
 *     no son veinte descargas. Mientras llega, el botón gira; en cuanto suena, para.
 *   · **Una a la vez**: empezar una para la que sonaba, como en cualquier chat.
 */

/** La que está sonando, para pararla si empieza otra. */
let laQueSuena: HTMLAudioElement | null = null;

type ComoVa = 'parada' | 'cargando' | 'sonando' | 'en_pausa' | 'no_se_oye';

export function NotaDeVoz({
  enlace,
  segundos,
  mia,
}: {
  readonly enlace: string;
  /** Lo que dura, sabido al grabar. Nulo en notas viejas: entonces lo dice el audio. */
  readonly segundos: number | null;
  readonly mia: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [como, setComo] = useState<ComoVa>('parada');
  const [va, setVa] = useState(0);
  const [dura, setDura] = useState<number | null>(segundos);

  useEffect(() => {
    const el = audio.current;
    return () => {
      if (el !== null && laQueSuena === el) laQueSuena = null;
      el?.pause();
    };
  }, []);

  function tocar() {
    const el = audio.current;
    if (el === null) return;
    if (como === 'sonando' || como === 'cargando') {
      el.pause();
      return;
    }
    if (laQueSuena !== null && laQueSuena !== el) laQueSuena.pause();
    laQueSuena = el;
    setComo('cargando');
    el.play().catch(() => {
      setComo('no_se_oye');
    });
  }

  function saltar(fraccion: number) {
    const el = audio.current;
    const total = dura ?? (Number.isFinite(el?.duration) ? (el?.duration ?? 0) : 0);
    if (el === null || total <= 0) return;
    try {
      el.currentTime = Math.max(0, Math.min(total, fraccion * total));
      setVa(el.currentTime);
    } catch {
      // Hay audios que no dejan saltar antes de cargarse: se queda donde iba.
    }
  }

  const total = dura ?? 0;
  const avance = total > 0 ? Math.min(1, va / total) : 0;
  const enMarcha = como === 'sonando' || como === 'cargando' || como === 'en_pausa';

  return (
    <div className="flex w-64 max-w-full items-center gap-e2">
      <audio
        ref={audio}
        src={enlace}
        preload="none"
        onPlaying={() => {
          setComo('sonando');
        }}
        onWaiting={() => {
          setComo('cargando');
        }}
        onPause={(e) => {
          setComo(e.currentTarget.ended ? 'parada' : 'en_pausa');
        }}
        onEnded={() => {
          setComo('parada');
          setVa(0);
        }}
        onTimeUpdate={(e) => {
          setVa(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (dura === null && Number.isFinite(d) && d > 0) setDura(d);
        }}
        onError={() => {
          setComo('no_se_oye');
        }}
      />
      <button
        type="button"
        onClick={tocar}
        aria-label={
          como === 'sonando' || como === 'cargando' ? 'Parar la nota de voz' : 'Oír la nota de voz'
        }
        className={clases(
          'relative grid size-10 shrink-0 place-items-center rounded-redondo',
          mia ? 'bg-superficie text-naranja' : 'bg-naranja text-sobre-naranja',
        )}
      >
        {como === 'cargando' && (
          <span
            aria-hidden
            className="absolute inset-0 animate-spin rounded-redondo border-2 border-current border-t-transparent opacity-60"
          />
        )}
        {como === 'sonando' || como === 'cargando' ? (
          <IconoPausa size={18} />
        ) : (
          <IconoReproducir size={18} />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <button
          type="button"
          aria-label="Saltar a otro punto de la nota"
          tabIndex={-1}
          onClick={(e) => {
            const caja = e.currentTarget.getBoundingClientRect();
            saltar((e.clientX - caja.left) / caja.width);
          }}
          className="flex h-6 w-full items-center"
        >
          <span className="relative h-1 w-full rounded-redondo bg-borde-fuerte">
            <span
              className="absolute inset-y-0 left-0 rounded-redondo bg-naranja"
              style={{ width: `${String(avance * 100)}%` }}
            />
            <span
              aria-hidden
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-redondo bg-naranja"
              style={{ left: `${String(avance * 100)}%` }}
            />
          </span>
        </button>
        <span className="text-etiqueta tabular-nums text-texto-suave">
          {como === 'no_se_oye'
            ? 'No se puede oír aquí'
            : enMarcha
              ? duracionEnLetra(Math.floor(va))
              : `Nota de voz · ${dura === null ? '…' : duracionEnLetra(Math.ceil(dura))}`}
        </span>
      </div>
    </div>
  );
}
