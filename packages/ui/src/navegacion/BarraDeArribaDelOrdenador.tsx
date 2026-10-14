import type { ReactNode } from 'react';
import { IconoBuscar, IconoLuna, IconoSol } from '@estook/iconos';
import { etiquetaDeLaCampana, etiquetaDelChat } from '@estook/dominio';
import { ElBocadillo, LaCampana } from './LaCampana.tsx';
import { clases } from '../clases.ts';
import { Avatar } from '../componentes/Tarjeta.tsx';
import { usarSeVeOscuro, usarTema } from '../ganchos/usarTema.ts';

/**
 * La barra de arriba del ordenador (la experiencia, 0083).
 *
 * Desde que las apps viven en el menú de la izquierda, aquí queda solo lo que es de
 * toda la aplicación, como en el panel de referencia que trajo Richi: dónde estás a
 * la izquierda y, a la derecha, **el buscador** (que se ve como un campo, no como
 * una lupa suelta: así se sabe que existe), la campana, el chat, el claro y el
 * oscuro a un clic, y tu cara.
 *
 * Es translúcida y se queda arriba al bajar: lo de debajo se adivina sin
 * distraer, y las herramientas siguen a mano en una pantalla larga.
 */
export interface BarraDeArribaDelOrdenadorProps {
  /** Lo de la izquierda: dónde estás o, en el Panel, la fecha. */
  readonly izquierda?: ReactNode;
  readonly alBuscar: () => void;
  readonly avisos?: number;
  readonly alAbrirAvisos: () => void;
  readonly chatSinLeer?: number;
  readonly alAbrirChat: () => void;
  readonly persona: string;
  readonly fotoDeLaPersona?: string | null;
  readonly alAbrirMiCuenta: () => void;
}

export function BarraDeArribaDelOrdenador({
  izquierda,
  alBuscar,
  avisos = 0,
  alAbrirAvisos,
  chatSinLeer = 0,
  alAbrirChat,
  persona,
  fotoDeLaPersona = null,
  alAbrirMiCuenta,
}: BarraDeArribaDelOrdenadorProps) {
  return (
    <header
      className={clases(
        'sticky top-0 z-30 hidden h-[var(--alto-barra-escritorio)] items-center gap-e4 px-e6 lg:flex no-imprimir',
        'border-b border-borde/70 bg-fondo/80 backdrop-blur-xl backdrop-saturate-150',
      )}
    >
      <div className="min-w-0 flex-1 truncate text-secundario text-texto-suave">{izquierda}</div>

      <button
        type="button"
        onClick={alBuscar}
        aria-label="Buscar en todo (Ctrl+K)"
        data-recorrido="buscar"
        className={clases(
          'group flex h-10 w-[19rem] shrink items-center gap-e2 rounded-redondo border border-borde bg-superficie px-e4',
          'text-secundario text-texto-tenue transition-[border-color,box-shadow] duration-[--rapido]',
          'hover:border-borde-fuerte hover:[box-shadow:var(--sombra-tarjeta)]',
        )}
      >
        <IconoBuscar size={17} />
        <span className="min-w-0 flex-1 truncate text-left">Buscar productos, personas…</span>
        <kbd className="shrink-0 rounded-chico border border-borde bg-fondo px-e2 py-[1px] font-[inherit] text-etiqueta text-texto-suave">
          Ctrl K
        </kbd>
      </button>

      <div className="flex shrink-0 items-center gap-e1">
        <Redondo etiqueta={etiquetaDeLaCampana(avisos)} alPulsar={alAbrirAvisos}>
          <LaCampana sinLeer={avisos} />
        </Redondo>
        <Redondo etiqueta={etiquetaDelChat(chatSinLeer)} alPulsar={alAbrirChat}>
          <ElBocadillo sinLeer={chatSinLeer} />
        </Redondo>
        <ClaroUOscuro />
        <button
          type="button"
          onClick={alAbrirMiCuenta}
          aria-label={`Tu cuenta · ${persona}`}
          className="ml-e2 grid size-11 place-items-center rounded-grande transition-transform duration-[--rapido] hover:scale-105"
        >
          <Avatar nombre={persona} tamano={36} foto={fotoDeLaPersona} />
        </button>
      </div>
    </header>
  );
}

/**
 * El claro y el oscuro, a un clic, como en la referencia. Lo que se elige aquí es lo
 * mismo que en Ajustes › Pantalla, y se guarda en el aparato igual.
 */
function ClaroUOscuro() {
  const { poner } = usarTema();
  const oscuro = usarSeVeOscuro();
  return (
    <div
      role="group"
      aria-label="Claro u oscuro"
      className="ml-e1 flex items-center gap-[2px] rounded-redondo border border-borde bg-superficie p-[3px]"
    >
      <button
        type="button"
        aria-pressed={!oscuro}
        aria-label="Claro"
        title="Claro"
        onClick={() => {
          poner('claro');
        }}
        className={clases(
          'grid size-8 place-items-center rounded-redondo transition-colors duration-[--rapido]',
          oscuro ? 'text-texto-tenue hover:text-texto' : 'bg-fondo text-texto',
        )}
      >
        <IconoSol size={16} />
      </button>
      <button
        type="button"
        aria-pressed={oscuro}
        aria-label="Oscuro"
        title="Oscuro"
        onClick={() => {
          poner('oscuro');
        }}
        className={clases(
          'grid size-8 place-items-center rounded-redondo transition-colors duration-[--rapido]',
          oscuro ? 'bg-fondo text-texto' : 'text-texto-tenue hover:text-texto',
        )}
      >
        <IconoLuna size={16} />
      </button>
    </div>
  );
}

function Redondo({
  etiqueta,
  alPulsar,
  children,
}: {
  readonly etiqueta: string;
  readonly alPulsar: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={etiqueta}
      title={etiqueta}
      className="grid size-10 place-items-center rounded-redondo text-texto-suave transition-colors duration-[--rapido] hover:bg-superficie hover:text-texto"
    >
      {children}
    </button>
  );
}
