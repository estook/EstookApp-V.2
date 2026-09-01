import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  IconoAjustes,
  IconoAvisos,
  IconoBuscar,
  IconoChat,
  IconoFlechaAbajo,
  IconoFogon,
  IconoLocal,
} from '@estook/iconos';
import type { App } from '../apps.ts';
import { clases } from '../clases.ts';
import { Avatar } from '../componentes/Tarjeta.tsx';

/**
 * La barra de escritorio · Parte B5 del Plan.
 *
 * «Arriba, el selector de local, las ocho apps con su desplegable (sub-apps
 * arriba y acciones directas debajo de una linea) y, a la derecha,
 * notificaciones, chat, Fogon y avatar.»
 *
 * El desplegable se abre al pulsar, no al pasar el raton. Con ocho apps en fila,
 * abrirlo al pasar convierte cruzar la barra en una metralleta de menus.
 *
 * Los atajos de B5 (`⌘K`, `⌘1`–`⌘8`, `⌘G`, `⌘J`, `Esc`) los escucha la
 * aplicacion, no esta barra: son de toda la pantalla y siguen valiendo con el
 * foco en cualquier sitio.
 */
export interface BarraEscritorioProps {
  readonly apps: readonly App[];
  readonly appActiva: string | null;
  readonly alIrAApp: (app: App, pestana?: string) => void;
  readonly alIrAlPanel: () => void;
  readonly alIrAAjustes: () => void;
  readonly alBuscar: () => void;
  readonly local: { readonly nombre: string; readonly organizacion: string } | null;
  readonly locales: readonly { readonly id: string; readonly nombre: string }[];
  readonly alCambiarDeLocal: (id: string) => void;
  readonly persona: string;
  readonly avisos?: number;
  readonly alAbrirFogon?: () => void;
}

export function BarraEscritorio({
  apps,
  appActiva,
  alIrAApp,
  alIrAlPanel,
  alIrAAjustes,
  alBuscar,
  local,
  locales,
  alCambiarDeLocal,
  persona,
  avisos = 0,
  alAbrirFogon,
}: BarraEscritorioProps) {
  return (
    <header className="sticky top-0 z-40 hidden h-[--alto-barra-escritorio] items-center gap-e3 border-b border-borde bg-superficie px-e4 lg:flex">
      <button
        type="button"
        onClick={alIrAlPanel}
        className="shrink-0 text-etiqueta font-bold uppercase tracking-[0.18em] text-texto"
      >
        Estook
      </button>

      <SelectorDeLocal local={local} locales={locales} alCambiar={alCambiarDeLocal} />

      <nav
        aria-label="Las apps"
        className="flex min-w-0 flex-1 items-center gap-e1 overflow-x-auto"
      >
        {apps.map((app) => (
          <AppConDesplegable key={app.id} app={app} activa={app.id === appActiva} alIr={alIrAApp} />
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-e1">
        <Redondo etiqueta="Buscar en todo (Ctrl+K)" alPulsar={alBuscar}>
          <IconoBuscar size={20} />
        </Redondo>

        <Redondo
          etiqueta={avisos > 0 ? `Avisos: ${avisos} sin leer` : 'Avisos'}
          alPulsar={() => undefined}
        >
          <span className="relative">
            <IconoAvisos size={20} />
            {avisos > 0 && (
              <span
                aria-hidden
                className="absolute -right-[3px] -top-[3px] size-[8px] rounded-redondo bg-mal"
              />
            )}
          </span>
        </Redondo>

        <Redondo etiqueta="Chat del equipo" alPulsar={() => undefined}>
          <IconoChat size={20} />
        </Redondo>

        <Redondo etiqueta="Fogon (Ctrl+J)" alPulsar={alAbrirFogon ?? (() => undefined)}>
          <span className="text-naranja">
            <IconoFogon size={20} />
          </span>
        </Redondo>

        <Redondo etiqueta="Ajustes" alPulsar={alIrAAjustes}>
          <IconoAjustes size={20} />
        </Redondo>

        <span className="ml-e1">
          <Avatar nombre={persona} tamano={30} />
        </span>
      </div>
    </header>
  );
}

function AppConDesplegable({
  app,
  activa,
  alIr,
}: {
  readonly app: App;
  readonly activa: boolean;
  readonly alIr: (app: App, pestana?: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al pulsar fuera y con `Esc`. Sin las dos cosas, un desplegable
  // abierto se queda por ahi tapando media pantalla.
  useEffect(() => {
    if (!abierto) return;

    const alPulsarFuera = (evento: MouseEvent) => {
      if (!caja.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const alEscapar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alEscapar);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alEscapar);
    };
  }, [abierto]);

  const Icono = app.icono;

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-current={activa ? 'page' : undefined}
        onClick={() => {
          setAbierto((antes) => !antes);
        }}
        className={clases(
          'inline-flex min-h-toque items-center gap-e1 whitespace-nowrap rounded-medio px-e2',
          'text-secundario font-medium hover:bg-fondo',
          activa ? 'text-texto' : 'text-texto-suave',
        )}
      >
        <span style={{ color: app.acento }}>
          <Icono size={18} />
        </span>
        {app.nombre}
        <IconoFlechaAbajo size={14} />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label={app.nombre}
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[13rem] rounded-medio border border-borde bg-superficie py-e1 shadow-s3 anima-aparece"
        >
          {/* Las sub-apps arriba... */}
          {app.pestanas.map((pestana) => (
            <button
              key={pestana.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setAbierto(false);
                alIr(app, pestana.id);
              }}
              className="flex w-full min-h-toque items-center px-e3 text-left text-cuerpo hover:bg-fondo"
            >
              {pestana.nombre}
            </button>
          ))}

          {/* ...y las acciones directas debajo de una linea (B5). Las de verdad
              las traen los modulos de cada app; de momento, la de entrar. */}
          <hr className="my-e1 border-borde" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setAbierto(false);
              alIr(app);
            }}
            className="flex w-full min-h-toque items-center px-e3 text-left text-cuerpo text-texto-suave hover:bg-fondo"
          >
            Abrir {app.nombre}
          </button>
        </div>
      )}
    </div>
  );
}

function SelectorDeLocal({
  local,
  locales,
  alCambiar,
}: {
  readonly local: { readonly nombre: string; readonly organizacion: string } | null;
  readonly locales: readonly { readonly id: string; readonly nombre: string }[];
  readonly alCambiar: (id: string) => void;
}) {
  if (local === null) {
    return <span className="shrink-0 text-secundario text-texto-suave">Sin local</span>;
  }

  // Con un solo local no hay nada que elegir: se ensena y ya. Un desplegable de
  // un elemento es una promesa vacia.
  if (locales.length <= 1) {
    return (
      <span className="flex shrink-0 items-center gap-e1 text-secundario text-texto-suave">
        <IconoLocal size={16} />
        {local.nombre}
      </span>
    );
  }

  return (
    <label className="flex shrink-0 items-center gap-e1 text-secundario text-texto-suave">
      <IconoLocal size={16} />
      <span className="sr-only">Local</span>
      <select
        value={locales.find((l) => l.nombre === local.nombre)?.id ?? ''}
        onChange={(evento) => {
          alCambiar(evento.target.value);
        }}
        className="min-h-toque cursor-pointer appearance-none bg-transparent pr-e4 text-secundario text-texto"
      >
        {locales.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nombre}
          </option>
        ))}
      </select>
    </label>
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
      className="grid size-toque place-items-center rounded-medio text-texto-suave hover:bg-fondo hover:text-texto"
    >
      {children}
    </button>
  );
}
