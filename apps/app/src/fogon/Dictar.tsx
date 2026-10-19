import { useEffect, useRef, useState } from 'react';
import { IconoMicrofono } from '@estook/iconos';
import { Boton } from '@estook/ui';

/**
 * Dictar en vez de escribir (Fogón 1 · 2, decisión 0098): **gratis**.
 *
 * Anthropic no transcribe audio, y no hace falta: el navegador ya sabe (Chrome, Edge y
 * Safari en el iPhone, con el reconocimiento del propio sistema). Lo dicho se escribe en
 * la caja de al lado y Fogón lo lee como si se hubiera tecleado: no gasta más que eso.
 * Donde el navegador no sabe, el botón no sale; el micrófono del teclado del móvil sigue
 * ahí.
 */

/** Lo justo del reconocimiento de voz del navegador: no viene en los tipos de siempre. */
interface Reconocimiento {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((evento: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((evento: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type ConstructorDeReconocimiento = new () => Reconocimiento;

function elReconocimiento(): ConstructorDeReconocimiento | null {
  if (typeof window === 'undefined') return null;
  const conVoz = window as unknown as {
    SpeechRecognition?: ConstructorDeReconocimiento;
    webkitSpeechRecognition?: ConstructorDeReconocimiento;
  };
  return conVoz.SpeechRecognition ?? conVoz.webkitSpeechRecognition ?? null;
}

export function Dictar({
  alDecir,
  etiqueta = 'Dictar',
  soloIcono = false,
}: {
  /** Lo dicho, entero, cuando se acaba de hablar. */
  readonly alDecir: (texto: string) => void;
  readonly etiqueta?: string;
  /** Un botón redondo con el micrófono, junto a una caja de escribir (el chat). */
  readonly soloIcono?: boolean;
}) {
  const [escuchando, setEscuchando] = useState(false);
  const [noOye, setNoOye] = useState<string | null>(null);
  const actual = useRef<Reconocimiento | null>(null);
  const Clase = elReconocimiento();

  // Al irse de la pantalla, se deja de escuchar: el micrófono no se queda abierto.
  useEffect(
    () => () => {
      actual.current?.stop();
    },
    [],
  );

  if (Clase === null) return null;

  function empezar() {
    if (Clase === null) return;
    setNoOye(null);
    const reconocimiento = new Clase();
    reconocimiento.lang = 'es-ES';
    reconocimiento.interimResults = false;
    reconocimiento.continuous = false;
    reconocimiento.onresult = (evento) => {
      const dicho = Array.from(evento.results)
        .map((r) => r[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (dicho !== '') alDecir(dicho);
    };
    reconocimiento.onerror = (evento) => {
      setNoOye(
        evento.error === 'not-allowed' || evento.error === 'service-not-allowed'
          ? 'Dale permiso al micrófono en el navegador para dictar.'
          : evento.error === 'no-speech'
            ? 'No te he oído. Prueba otra vez.'
            : 'No he podido escucharte. Escríbelo.',
      );
    };
    reconocimiento.onend = () => {
      setEscuchando(false);
      actual.current = null;
    };
    actual.current = reconocimiento;
    setEscuchando(true);
    try {
      reconocimiento.start();
    } catch {
      setEscuchando(false);
      setNoOye('No he podido escucharte. Escríbelo.');
    }
  }

  if (soloIcono) {
    return (
      <button
        type="button"
        aria-label={escuchando ? 'Dejar de escuchar' : etiqueta}
        aria-pressed={escuchando}
        title={noOye ?? undefined}
        onMouseDown={(e) => {
          // Que la caja no pierda el foco: en el móvil el teclado no se cierra.
          e.preventDefault();
        }}
        onClick={() => {
          if (escuchando) actual.current?.stop();
          else empezar();
        }}
        className={`grid size-toque shrink-0 place-items-center rounded-redondo border border-borde-fuerte ${escuchando ? 'bg-naranja text-sobre-naranja' : 'bg-superficie text-texto-suave'}`}
      >
        <IconoMicrofono size={20} />
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-e1">
      <Boton
        tono="texto"
        icono={<IconoMicrofono size={18} />}
        aria-pressed={escuchando}
        onClick={() => {
          if (escuchando) actual.current?.stop();
          else empezar();
        }}
      >
        {escuchando ? 'Escuchando… toca para parar' : etiqueta}
      </Boton>
      {noOye !== null && <span className="text-secundario text-texto-suave">{noOye}</span>}
    </span>
  );
}
