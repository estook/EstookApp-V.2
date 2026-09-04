import type { ReactNode } from 'react';
import { IconoAjustes, IconoAvisos, IconoBuscar, IconoChat, IconoLocal } from '@estook/iconos';
import { clases } from '../clases.ts';
import { IconoDeFogon } from '../componentes/Marca.tsx';
import { Avatar } from '../componentes/Tarjeta.tsx';

/**
 * La barra de arriba, en movil.
 *
 * ── El agujero que esto tapa ─────────────────────────────────────────────────
 *
 * B5 describe con detalle la barra de escritorio —«a la derecha, notificaciones,
 * chat, Fogon y avatar»— y para el movil describe la barra de abajo, con sus
 * tres posiciones y la rueda. De ahi salio, sin que nadie lo decidiera, que en
 * un telefono **no hubiera ninguna de esas cinco cosas**:
 *
 *   · el buscador universal solo se abria con \`Ctrl+K\`, que en un movil no
 *     existe. Es decir: en el aparato de la cocina no habia buscador;
 *   · avisos, chat y Fogon no aparecian por ningun lado;
 *   · y Ajustes solo estaba **fuera** de una app: dentro de Inventario, la barra
 *     de abajo es la de Inventario, y no habia forma de llegar a Ajustes.
 *
 * Estook se usa de pie y con el telefono en la mano. Que las herramientas
 * transversales solo estuvieran en el ordenador era tenerlas para quien menos
 * las necesita. Lo vio Richi mirando el movil.
 *
 * Va arriba y no en la barra de abajo a proposito: abajo esta lo de **navegar**,
 * que es lo que manda B5 y lo que recomienda Apple; arriba, lo que es de la
 * sesion entera y no de la pantalla que se este mirando.
 *
 * Y se lleva el nombre del local, que antes se pintaba dentro del contenido: es
 * donde esta en escritorio, y «para que nadie apunte una merma en el local
 * equivocado» (Manifiesto 28) empieza por saber donde estas, a la vista.
 */
export interface BarraArribaMovilProps {
  readonly local: {
    readonly id: string;
    readonly nombre: string;
    readonly logo: string | null;
    readonly colorDeMarca: string | null;
  } | null;
  readonly locales: readonly { readonly id: string; readonly nombre: string }[];
  readonly alCambiarDeLocal: (id: string) => void;
  readonly persona: string;
  readonly avisos?: number;
  readonly alBuscar: () => void;
  readonly alAbrirAvisos: () => void;
  readonly alAbrirChat: () => void;
  readonly alAbrirFogon: () => void;
  readonly alIrAAjustes: () => void;
}

export function BarraArribaMovil({
  local,
  locales,
  alCambiarDeLocal,
  persona,
  avisos = 0,
  alBuscar,
  alAbrirAvisos,
  alAbrirChat,
  alAbrirFogon,
  alIrAAjustes,
}: BarraArribaMovilProps) {
  return (
    <header
      className={clases(
        'sticky top-0 z-30 flex items-center gap-e1 border-b border-borde bg-superficie px-e2',
        'h-[--alto-barra-movil] lg:hidden',
      )}
    >
      <DondeEstas local={local} locales={locales} alCambiar={alCambiarDeLocal} />

      <div className="flex shrink-0 items-center gap-0">
        <Redondo etiqueta="Buscar en todo" alPulsar={alBuscar}>
          <IconoBuscar size={20} />
        </Redondo>

        <Redondo
          etiqueta={avisos > 0 ? `Avisos: ${avisos} sin leer` : 'Avisos'}
          alPulsar={alAbrirAvisos}
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

        <Redondo etiqueta="Chat del equipo" alPulsar={alAbrirChat}>
          <IconoChat size={20} />
        </Redondo>

        {/* Fogon lleva su mascota, igual que en escritorio: es lo que lo hace
            reconocible de un vistazo entre cuatro botones grises. */}
        <Redondo etiqueta="Fogón" alPulsar={alAbrirFogon}>
          <IconoDeFogon size={22} />
        </Redondo>

        {/*
          El avatar lleva a Ajustes, y **por eso dice lo que hace**. En un movil
          no hay sitio para un icono de ajustes y ademas un avatar, y un retrato
          que no se pueda pulsar es un adorno. Lleva el icono al lado para que se
          entienda sin tener que probarlo.
        */}
        <button
          type="button"
          onClick={alIrAAjustes}
          aria-label={`Tu cuenta y los ajustes · ${persona}`}
          className="ml-e1 flex min-h-toque items-center gap-e1 rounded-medio pl-e1 pr-e1 text-texto-suave"
        >
          <IconoAjustes size={16} />
          <Avatar nombre={persona} tamano={28} />
        </button>
      </div>
    </header>
  );
}

/**
 * El local en el que estas, y como cambiarlo.
 *
 * Con un solo local se ensena y ya: un desplegable de un elemento es una promesa
 * vacia, y es la misma regla que sigue la barra de escritorio.
 */
function DondeEstas({
  local,
  locales,
  alCambiar,
}: {
  readonly local: BarraArribaMovilProps['local'];
  readonly locales: BarraArribaMovilProps['locales'];
  readonly alCambiar: (id: string) => void;
}) {
  if (local === null) {
    return <span className="min-w-0 flex-1 text-secundario text-texto-suave">Sin local</span>;
  }

  const color = local.colorDeMarca;
  const conColor = color !== null;

  const marca = (
    <span
      className="inline-flex shrink-0 items-center rounded-redondo p-[3px]"
      style={color === null ? undefined : { backgroundColor: color }}
    >
      {local.logo === null ? (
        <span
          className={clases(
            'inline-flex size-6 items-center justify-center rounded-redondo',
            conColor ? 'text-superficie' : 'text-texto-suave',
          )}
        >
          <IconoLocal size={16} />
        </span>
      ) : (
        <img
          src={local.logo}
          alt=""
          className="size-6 rounded-redondo bg-superficie object-contain"
        />
      )}
    </span>
  );

  if (locales.length <= 1) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-e1">
        {marca}
        <span className="min-w-0 truncate text-secundario font-medium text-texto">
          {local.nombre}
        </span>
      </span>
    );
  }

  return (
    <label className="flex min-w-0 flex-1 items-center gap-e1">
      {marca}
      <span className="sr-only">Donde estas</span>
      <select
        aria-label="Donde estas"
        value={local.id}
        onChange={(evento) => {
          alCambiar(evento.target.value);
        }}
        className="min-h-toque min-w-0 flex-1 cursor-pointer truncate bg-transparent text-secundario font-medium text-texto"
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
      className="grid size-toque place-items-center rounded-medio text-texto-suave"
    >
      {children}
    </button>
  );
}
