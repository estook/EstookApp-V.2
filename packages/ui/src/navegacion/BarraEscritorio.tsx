import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  IconoAjustes,
  IconoAvisos,
  IconoBuscar,
  IconoChat,
  IconoFlechaAbajo,
  IconoLocal,
} from '@estook/iconos';
import type { App } from '../apps.ts';
import { clases } from '../clases.ts';
import { IconoDeFogon, Logo } from '../componentes/Marca.tsx';
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
  /**
   * Los tres botones que no llevaban a ningun sitio.
   *
   * Avisos, chat y Fogon estaban puestos como `() => undefined`: se pulsaban y
   * no pasaba nada. Un boton mudo es de las cosas que mas rapido rompen la
   * confianza en una aplicacion, asi que ahora los tres avisan de que llegan y
   * de cuando, y quien los usa lo decide arriba.
   */
  readonly alAbrirAvisos: () => void;
  readonly alAbrirChat: () => void;
  readonly alAbrirFogon: () => void;
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
  alAbrirAvisos,
  alAbrirChat,
  alAbrirFogon,
}: BarraEscritorioProps) {
  return (
    <header className="sticky top-0 z-40 hidden h-[--alto-barra-escritorio] items-center gap-e3 border-b border-borde bg-superficie px-e4 lg:flex">
      <button
        type="button"
        onClick={alIrAlPanel}
        aria-label="Ir al Panel"
        className="shrink-0 rounded-chico"
      >
        <Logo alto={30} />
      </button>

      <SelectorDeLocal local={local} locales={locales} alCambiar={alCambiarDeLocal} />

      <nav
        aria-label="Las apps"
        // Con ocho apps, el selector de local y seis botones, a 1024 px —el ancho
        // minimo de escritorio— no caben todas. Se deja desplazar a lo ancho, que
        // es mejor que apretarlas hasta que no se lean, y se esconde la barra de
        // desplazamiento: dentro de una barra de navegacion es ruido, y el gesto
        // sigue funcionando con la rueda del raton y con el dedo.
        className={clases(
          'flex min-w-0 flex-1 items-center gap-e1 overflow-x-auto',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
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

        {/* Fogon lleva su mascota, no el icono de Lucide: es lo que lo hace
            reconocible de un vistazo entre cinco botones grises. */}
        <Redondo etiqueta="Fogón (Ctrl+J)" alPulsar={alAbrirFogon}>
          <IconoDeFogon size={22} />
        </Redondo>

        <Redondo etiqueta="Ajustes" alPulsar={alIrAAjustes}>
          <IconoAjustes size={20} />
        </Redondo>

        {/* El avatar tampoco hacia nada. Lleva a Ajustes, que es lo que hay
            detras de un retrato en cualquier aplicacion. */}
        <button
          type="button"
          onClick={alIrAAjustes}
          aria-label={`Tu cuenta y los ajustes · ${persona}`}
          className="ml-e1 grid size-toque place-items-center rounded-medio"
        >
          <Avatar nombre={persona} tamano={30} />
        </button>
      </div>
    </header>
  );
}

/**
 * Una app de la barra, con su desplegable.
 *
 * ── El fallo que esto arregla ────────────────────────────────────────────────
 *
 * El menu se pintaba `absolute` dentro del `<nav>`, y ese `<nav>` lleva
 * `overflow-x-auto` para poder desplazar las ocho apps cuando no caben. En CSS,
 * poner `overflow-x` distinto de `visible` **convierte tambien el eje vertical
 * en recortado**: no hay forma de recortar a lo ancho y no a lo alto. Asi que el
 * desplegable se abria —el estado cambiaba, el nodo existia, las pruebas de
 * unidad lo encontraban— y quedaba entero por debajo del borde de la barra,
 * recortado. En pantalla, pulsar Inventario no hacia absolutamente nada.
 *
 * Lo encontro Richi mirando la aplicacion, no las pruebas: es el mismo fallo de
 * siempre, algo construido y probado que la pantalla no ensena.
 *
 * Se arregla sacando el menu del `<nav>` con un portal y colocandolo `fixed`
 * sobre las coordenadas del boton. Fuera del recorte no hay nada que lo tape, y
 * el desplazamiento a lo ancho de la barra se conserva.
 */
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
  const menu = useRef<HTMLDivElement>(null);
  const [donde, setDonde] = useState<{ readonly x: number; readonly y: number } | null>(null);

  // Donde se pinta el menu: justo debajo del boton, en coordenadas de ventana.
  // Se mide antes de pintar para que no se vea saltar de una esquina a su sitio.
  useLayoutEffect(() => {
    if (!abierto) return;

    const colocar = () => {
      const r = caja.current?.getBoundingClientRect();
      if (r) setDonde({ x: r.left, y: r.bottom + 4 });
    };

    colocar();
    // Si la barra se desplaza a lo ancho o cambia el tamano de la ventana, el
    // boton se mueve y el menu tiene que irse con el.
    window.addEventListener('resize', colocar);
    window.addEventListener('scroll', colocar, true);
    return () => {
      window.removeEventListener('resize', colocar);
      window.removeEventListener('scroll', colocar, true);
    };
  }, [abierto]);

  // Se cierra al pulsar fuera y con `Esc`. Sin las dos cosas, un desplegable
  // abierto se queda por ahi tapando media pantalla. «Fuera» son los dos: el
  // boton y el menu, que ya no son parientes en el arbol del documento.
  useEffect(() => {
    if (!abierto) return;

    const alPulsarFuera = (evento: MouseEvent) => {
      const donde = evento.target as Node;
      if (caja.current?.contains(donde)) return;
      if (menu.current?.contains(donde)) return;
      setAbierto(false);
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

      {abierto &&
        donde !== null &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={app.nombre}
            style={{ position: 'fixed', left: donde.x, top: donde.y }}
            className="z-50 min-w-[13rem] rounded-medio border border-borde bg-superficie py-e1 shadow-s3 anima-aparece"
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
          </div>,
          document.body,
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
