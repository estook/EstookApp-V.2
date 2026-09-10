import type { ReactNode } from 'react';
import { IconoAvisos, IconoBuscar, IconoChat, IconoLocal } from '@estook/iconos';
import { IconoDeFogon } from '../componentes/Marca.tsx';
import { clases } from '../clases.ts';
import { Avatar } from '../componentes/Tarjeta.tsx';

/**
 * La barra de arriba, en movil.
 *
 * ── El agujero que esto tapo en M6 ───────────────────────────────────────────
 *
 * B5 describe con detalle la barra de escritorio —«a la derecha, notificaciones,
 * chat, Fogon y avatar»— y para el movil describe la barra de abajo. De ahi
 * salio, sin que nadie lo decidiera, que en un telefono **no hubiera ninguna de
 * esas cosas**: el buscador solo se abria con `Ctrl+K`, que en un movil no
 * existe; avisos, chat y Fogon no aparecian por ningun lado; y a Ajustes no se
 * llegaba desde dentro de una app, porque ahi la barra de abajo es la de la app.
 *
 * ── Y el que abrio al taparlo ────────────────────────────────────────────────
 *
 * La solucion fue traerse las cinco tal cual estaban en escritorio, y en un
 * telefono de 375 px eso son **seis botones y un selector de local en 375
 * pixeles**: buscar, avisos, chat, Fogon, un icono de ajustes, el avatar y el
 * nombre del local, que se quedaba sin sitio para leerse. Lo que en un ordenador
 * es una fila comoda, en un movil es una fila apretada donde se pulsa lo de al
 * lado.
 *
 * Ahora son **cinco botones y el avatar**, que es la misma fila de escritorio
 * **menos Ajustes**:
 *
 *   · **Donde estas**, con el logo del local. Es lo primero, porque «para que
 *     nadie apunte una merma en el local equivocado» (Manifiesto 28) empieza por
 *     saber donde estas, a la vista y sin pulsar nada.
 *   · **Buscar.** En un movil no hay `Ctrl+K`.
 *   · **Avisos** y **chat**, cada uno el suyo.
 *   · **Fogon**, que ademas tiene su burbuja abajo. Son dos puertas a lo mismo y
 *     se quedan las dos: la burbuja es para el pulgar mientras trabajas, y el
 *     icono de arriba es donde lo busca quien viene del ordenador.
 *   · **El avatar**, que abre tu cuenta: ajustes, mi acceso, cambiar de local y
 *     salir.
 *
 * ── Lo que se fue, y lo que se llevo por delante sin querer ──────────────────
 *
 * **El icono de Ajustes** estaba aqui arriba *y* abajo en la barra de movil, dos
 * puertas a la misma pantalla a diez centimetros una de otra. Esa se queda abajo,
 * que es donde B5 la pone, y aqui la sustituye el avatar: dentro de una app
 * —donde la barra de abajo es la de la app— sigue habiendo camino a Ajustes, que
 * era el agujero de M6 y no se vuelve a abrir.
 *
 * **Y al quitarla se quitaron tambien el chat y Fogon**, que no sobraban. Es la
 * leccion de siempre en su version pequena: se arregla lo que se ha visto, no lo
 * que uno deduce de lo que ha visto. Los dos han vuelto.
 *
 * ── Como caben seis cosas en 375 px ──────────────────────────────────────────
 *
 * Los botones se quedan en el toque minimo de 44 px que manda B4 —eso no se
 * negocia— y lo que cede es **el nombre del local**, que se recorta. Es lo
 * correcto: el logo ya identifica el local de un vistazo, y el nombre entero esta
 * a un toque, en tu cuenta.
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
  /** Tu cuenta: ajustes, mi acceso, cambiar de local y salir. */
  readonly alAbrirMiCuenta: () => void;
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
  alAbrirMiCuenta,
}: BarraArribaMovilProps) {
  return (
    <header
      className={clases(
        'sticky top-0 z-30 flex items-center gap-e1 border-b border-borde bg-superficie px-e2',
        'h-[--alto-barra-movil] lg:hidden no-imprimir',
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

        <button
          type="button"
          onClick={alAbrirMiCuenta}
          aria-label={`Tu cuenta · ${persona}`}
          className="grid size-toque place-items-center rounded-medio"
        >
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
      <span className="sr-only">Dónde estás</span>
      <select
        aria-label="Dónde estás"
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
