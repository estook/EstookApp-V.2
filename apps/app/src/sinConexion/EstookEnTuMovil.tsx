import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Boton } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarFichar } from '../ganchos/usarFichar.ts';
import { CLAVE_DE_MI_MOVIL, usarMiMovil } from '../ganchos/usarMiMovil.ts';
import { usarComoSeInstala } from '../ganchos/usarComoSeInstala.ts';
import { comoEstaEsteMovil, recibirEnEsteMovil, type ComoEstaElMovil } from './avisosAlMovil.ts';
import { esUnMovil, instalar } from './instalar.ts';

/**
 * **Estook en tu móvil**, una tarjeta pequeña en el Panel (I · decisión 0070).
 *
 * Dos pasos, uno detrás de otro y **cada uno una sola vez** (se cierra y no vuelve):
 *
 *   1 · Ponerla en la pantalla de inicio: en Android, un botón; en el iPhone, los dos
 *       toques, dibujados, porque Apple no deja poner un botón.
 *   2 · Los avisos en el móvil, **cuando tienen sentido**: después de haber fichado
 *       (la mejora 14: «al fichar por primera vez, nunca al entrar»), o enseguida a
 *       quien no ficha, como un area manager.
 *
 * Solo en el móvil: en el ordenador no se instala nada y los avisos se miran en la
 * campana. Siempre se pueden encender después en Ajustes → Avisos.
 */

const CERRADA_INSTALAR = 'estook.instalar.cerrada';
const CERRADA_AVISOS = 'estook.avisos.preguntado';

function yaSeCerro(clave: string): boolean {
  try {
    return window.localStorage.getItem(clave) === 'si';
  } catch {
    return false;
  }
}

function cerrar(clave: string): void {
  try {
    window.localStorage.setItem(clave, 'si');
  } catch {
    // Sin poder guardarlo, vuelve a salir la próxima vez: no se pierde nada.
  }
}

/** El icono de Compartir del iPhone: un cuadrado con una flecha hacia arriba. */
function IconoCompartir() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="inline size-[1.15em] align-[-0.2em]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  );
}

function Recuadro({
  titulo,
  children,
  alCerrar,
}: {
  readonly titulo: string;
  readonly children: React.ReactNode;
  readonly alCerrar: () => void;
}) {
  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-e2 rounded-mayor border border-borde bg-superficie p-e4 [box-shadow:var(--sombra-tarjeta)]"
    >
      <div className="flex items-start justify-between gap-e3">
        <h2 className="text-cuerpo font-semibold">{titulo}</h2>
        <button
          type="button"
          onClick={alCerrar}
          className="-m-e2 min-h-toque min-w-toque rounded-medio text-secundario text-texto-suave hover:text-texto"
        >
          Ahora no
        </button>
      </div>
      {children}
    </section>
  );
}

export function EstookEnTuMovil() {
  const { cliente, yo } = usarSesion();
  const cache = useQueryClient();
  const comoSeInstala = usarComoSeInstala();
  const miMovil = usarMiMovil();
  const fichar = usarFichar();
  const [cerradaInstalar, setCerradaInstalar] = useState(() => yaSeCerro(CERRADA_INSTALAR));
  const [cerradaAvisos, setCerradaAvisos] = useState(() => yaSeCerro(CERRADA_AVISOS));
  const [comoEsta, setComoEsta] = useState<ComoEstaElMovil | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const encendido = miMovil.data?.encendido === true;
  useEffect(() => {
    if (miMovil.data === undefined) return;
    void comoEstaEsteMovil(encendido).then(setComoEsta);
  }, [miMovil.data, encendido]);

  if (!esUnMovil() || yo?.esDemostracion === true) return null;

  // 1 · A la pantalla de inicio.
  if ((comoSeInstala === 'boton' || comoSeInstala === 'iphone') && !cerradaInstalar) {
    return (
      <Recuadro
        titulo="Pon Estook en tu pantalla de inicio"
        alCerrar={() => {
          cerrar(CERRADA_INSTALAR);
          setCerradaInstalar(true);
        }}
      >
        <p className="text-secundario text-texto-suave">
          Se abre como una app, fichas sin señal y te avisa en el móvil.
        </p>
        {comoSeInstala === 'boton' ? (
          <div>
            <Boton
              tono="principal"
              onClick={() => {
                void instalar();
              }}
            >
              Instalar
            </Boton>
          </div>
        ) : (
          <ol className="flex flex-col gap-e1 text-cuerpo">
            <li>
              <span className="font-semibold">1.</span> Toca <IconoCompartir />{' '}
              <span className="font-medium">Compartir</span>, abajo en Safari.
            </li>
            <li>
              <span className="font-semibold">2.</span> Elige{' '}
              <span className="font-medium">«Añadir a pantalla de inicio»</span>.
            </li>
          </ol>
        )}
      </Recuadro>
    );
  }

  // 2 · Los avisos, cuando tienen sentido: después de fichar, o a quien no ficha.
  const haFichado =
    fichar.mio !== undefined && (fichar.mio.abierto !== null || fichar.mio.minutosDeHoy > 0);
  const noFicha = fichar.mio !== undefined && !fichar.mio.puedoFichar;
  const tocaPreguntar =
    comoEsta === 'sin_activar' &&
    encendido &&
    !cerradaAvisos &&
    (haFichado || noFicha) &&
    miMovil.data?.clavePublica !== null;

  if (!tocaPreguntar) return null;

  return (
    <Recuadro
      titulo="¿Te avisamos en el móvil?"
      alCerrar={() => {
        cerrar(CERRADA_AVISOS);
        setCerradaAvisos(true);
      }}
    >
      <p className="text-secundario text-texto-suave">
        Cinco minutos antes de tu turno y lo que no puede esperar. Nunca en tus horas de descanso:
        lo eliges en Ajustes → Avisos.
      </p>
      <div>
        <Boton
          tono="principal"
          disabled={ocupado}
          cargando={ocupado}
          textoCargando="Preguntando"
          onClick={() => {
            const clave = miMovil.data?.clavePublica;
            if (clave === null || clave === undefined) return;
            setOcupado(true);
            void recibirEnEsteMovil(cliente, clave)
              .then(async () => {
                cerrar(CERRADA_AVISOS);
                setCerradaAvisos(true);
                await cache.invalidateQueries({ queryKey: CLAVE_DE_MI_MOVIL });
              })
              .finally(() => {
                setOcupado(false);
              });
          }}
        >
          Sí, avisadme
        </Boton>
      </div>
    </Recuadro>
  );
}
