import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  IconoAjustes,
  IconoCambiar,
  IconoDesplegar,
  IconoFlechaDerecha,
  IconoInicio,
  IconoPlegar,
} from '@estook/iconos';
import type { App, Destino } from '../apps.ts';
import { comoSeLlamaElModulo, destinosConstruidos } from '../apps.ts';
import { clases } from '../clases.ts';
import { Logo } from '../componentes/Marca.tsx';
import { Avatar } from '../componentes/Tarjeta.tsx';
import { LogoDelLocal } from './LogoDelLocal.tsx';

/**
 * El menú del ordenador · a la izquierda, y se pliega (la experiencia, 0083).
 *
 * «En el PC, el menú es desplegable: si está plegado se ve el logo de tu
 *  bar/restaurante; al desplegarlo sale el menú con el logo de Estook y con todas
 *  las apps y sub-apps. Más profesional.»
 *
 * Sustituye a la barra de arriba con las ocho apps en fila, que en 1.280 px ya no
 * cabía y obligaba a desplazar, y **al menú lateral de dentro de cada app**: los
 * destinos de cada app cuelgan aquí, debajo de su app, así que la pantalla ya no
 * gasta 13 rem en repetirlos. Ese ancho es el que llenaba de hueco el monitor.
 *
 * ── Oscuro en los dos temas ──────────────────────────────────────────────────
 *
 * Como el de la referencia que trajo Richi: un menú oscuro al lado de un contenido
 * claro separa la navegación del trabajo sin una sola línea. Lleva `.zona-oscura`,
 * que pone las fichas del oscuro solo aquí dentro (`temas.css`).
 *
 * ── Plegado ──────────────────────────────────────────────────────────────────
 *
 * Los iconos de las apps y, arriba, **el logo del local**. Cada app enseña su
 * nombre al pasar por encima y, al pulsarla, sus destinos en un menú al lado. Se
 * recuerda en el aparato, porque quien lo pliega lo quiere plegado mañana.
 *
 * Las apps que todavía no tienen nada construido (Escandallos, Carta y Cuaderno
 * hasta M9, M10 y M17) no ocupan sitio entre las que funcionan: van juntas y
 * cerradas en «Próximamente». «No petarle a información y mil pestañas.»
 */
export interface MenuDelOrdenadorProps {
  readonly apps: readonly App[];
  readonly appActiva: string | null;
  readonly destinoActivo: string | null;
  readonly enPanel: boolean;
  readonly enAjustes: boolean;
  readonly abierto: boolean;
  readonly alCambiarAbierto: (abierto: boolean) => void;
  readonly alIrAApp: (app: App, destino?: string) => void;
  readonly alIrAlPanel: () => void;
  readonly alIrAAjustes: () => void;
  readonly alAbrirMiCuenta: () => void;
  readonly local: {
    readonly id: string;
    readonly nombre: string;
    readonly logo: string | null;
    readonly colorDeMarca: string | null;
  } | null;
  readonly organizacion: string;
  readonly locales: readonly { readonly id: string; readonly nombre: string }[];
  readonly alCambiarDeLocal: (id: string) => void;
  readonly persona: string;
  readonly fotoDeLaPersona?: string | null;
  readonly rol?: string;
}

/** El ancho de cada estado, en una sola parte: el contenido se aparta lo mismo. */
export const ANCHO_DEL_MENU = { abierto: '16.5rem', plegado: '4.75rem' } as const;

export function MenuDelOrdenador({
  apps,
  appActiva,
  destinoActivo,
  enPanel,
  enAjustes,
  abierto,
  alCambiarAbierto,
  alIrAApp,
  alIrAlPanel,
  alIrAAjustes,
  alAbrirMiCuenta,
  local,
  organizacion,
  locales,
  alCambiarDeLocal,
  persona,
  fotoDeLaPersona = null,
  rol,
}: MenuDelOrdenadorProps) {
  const construidas = apps.filter((app) => destinosConstruidos(app).length > 0);
  const queLlegan = apps.filter((app) => destinosConstruidos(app).length === 0);

  return (
    <aside
      aria-label="Menú"
      data-menu={abierto ? 'abierto' : 'plegado'}
      data-recorrido="menu"
      style={{ width: abierto ? ANCHO_DEL_MENU.abierto : ANCHO_DEL_MENU.plegado }}
      className={clases(
        'zona-oscura fixed inset-y-0 left-0 z-40 hidden flex-col lg:flex no-imprimir',
        'border-r border-white/[0.06] bg-[#0f1215]',
        '[background-image:radial-gradient(120%_40%_at_0%_0%,rgba(255,122,0,0.10),transparent_60%)]',
        'transition-[width] duration-[--normal] ease-curva',
      )}
    >
      {/* Arriba: el logo de Estook abierto; el del local, plegado. */}
      <div
        className={clases(
          'flex h-16 shrink-0 items-center',
          abierto ? 'justify-between px-e4' : 'justify-center',
        )}
      >
        {abierto ? (
          <>
            <button
              type="button"
              onClick={alIrAlPanel}
              aria-label="Ir al Panel"
              className="rounded-chico"
            >
              <Logo alto={24} enOscuro />
            </button>
            <BotonDelMenu
              etiqueta="Plegar el menú"
              alPulsar={() => {
                alCambiarAbierto(false);
              }}
            >
              <IconoPlegar size={18} />
            </BotonDelMenu>
          </>
        ) : (
          /*
            Plegado, **el logo del local despliega el menú** (Richi, 14-oct): el botón
            de desplegar estaba abajo del todo y costaba encontrarlo. Al pasar por
            encima, el logo deja ver el icono de desplegar, como en las apps de ahora;
            el Panel tiene su propia fila justo debajo.
          */
          <button
            type="button"
            onClick={() => {
              alCambiarAbierto(true);
            }}
            aria-label="Desplegar el menú"
            title={local === null ? 'Desplegar el menú' : `${local.nombre} · desplegar el menú`}
            className="group/logo relative grid size-12 place-items-center rounded-grande hover:bg-white/[0.06]"
          >
            <span className="transition-opacity duration-[--rapido] group-hover/logo:opacity-0 group-focus-visible/logo:opacity-0">
              {local === null ? (
                <IconoInicio size={20} />
              ) : (
                <LogoDelLocal
                  nombre={local.nombre}
                  logo={local.logo}
                  colorDeMarca={local.colorDeMarca}
                  alto={38}
                  cuadrado
                />
              )}
            </span>
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center text-texto opacity-0 transition-opacity duration-[--rapido] group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100"
            >
              <IconoDesplegar size={20} />
            </span>
          </button>
        )}
      </div>

      {abierto && local !== null && (
        <ElLocal
          local={local}
          organizacion={organizacion}
          locales={locales}
          alCambiar={alCambiarDeLocal}
        />
      )}

      <nav
        aria-label="Las apps"
        className={clases(
          'flex min-h-0 flex-1 flex-col gap-[2px] py-e2',
          // Abierto, se desplaza si no cabe. Plegado, no: el nombre de cada app sale
          // al lado, fuera del menú, y un desplazamiento lo recortaría.
          abierto
            ? 'overflow-y-auto overflow-x-hidden px-e3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]'
            : 'items-center overflow-visible px-e2',
        )}
      >
        <Fila
          abierto={abierto}
          etiqueta="Panel"
          activa={enPanel}
          icono={<IconoInicio size={18} />}
          acento="var(--color-naranja)"
          alPulsar={alIrAlPanel}
        />

        {abierto && <Apartado>Tus apps</Apartado>}

        {construidas.map((app) => (
          <AppDelMenu
            key={app.id}
            app={app}
            abierto={abierto}
            activa={app.id === appActiva}
            destinoActivo={app.id === appActiva ? destinoActivo : null}
            alIr={alIrAApp}
          />
        ))}

        {abierto && queLlegan.length > 0 && <Proximamente apps={queLlegan} />}
      </nav>

      <div
        className={clases(
          'flex shrink-0 flex-col gap-[2px] border-t border-white/[0.06] py-e3',
          abierto ? 'px-e3' : 'items-center px-e2',
        )}
      >
        <Fila
          abierto={abierto}
          etiqueta="Ajustes"
          activa={enAjustes}
          icono={<IconoAjustes size={18} />}
          acento="var(--color-texto-suave)"
          alPulsar={alIrAAjustes}
        />

        <button
          type="button"
          onClick={alAbrirMiCuenta}
          aria-label={`Tu cuenta · ${persona}`}
          title={abierto ? undefined : persona}
          className={clases(
            'mt-e1 flex min-h-toque items-center gap-e3 rounded-grande text-left hover:bg-white/[0.06]',
            abierto ? 'w-full px-e2 py-e2' : 'size-12 justify-center',
          )}
        >
          <Avatar nombre={persona} tamano={abierto ? 36 : 32} foto={fotoDeLaPersona} />
          {abierto && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-secundario font-semibold text-texto">
                {persona}
              </span>
              {rol !== undefined && (
                <span className="block truncate text-etiqueta text-texto-tenue">{rol}</span>
              )}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

// ── El local, con su cambio ──────────────────────────────────────────────────

function ElLocal({
  local,
  organizacion,
  locales,
  alCambiar,
}: {
  readonly local: NonNullable<MenuDelOrdenadorProps['local']>;
  readonly organizacion: string;
  readonly locales: MenuDelOrdenadorProps['locales'];
  readonly alCambiar: (id: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const variosLocales = locales.length > 1;

  useEffect(() => {
    if (!abierta) return;
    const fuera = (evento: MouseEvent) => {
      if (!caja.current?.contains(evento.target as Node)) setAbierta(false);
    };
    const escapar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierta(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escapar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escapar);
    };
  }, [abierta]);

  const dentro = (
    <>
      <LogoDelLocal
        nombre={local.nombre}
        logo={local.logo}
        colorDeMarca={local.colorDeMarca}
        alto={34}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-secundario font-semibold text-texto">
          {local.nombre}
        </span>
        {organizacion !== '' && organizacion !== local.nombre && (
          <span className="block truncate text-etiqueta text-texto-tenue">{organizacion}</span>
        )}
      </span>
    </>
  );

  return (
    <div ref={caja} className="relative mx-e3 mb-e2 shrink-0">
      {variosLocales ? (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={abierta}
          aria-label={`Local: ${local.nombre}. Cambiar de local`}
          onClick={() => {
            setAbierta((antes) => !antes);
          }}
          className="flex w-full items-center gap-e3 rounded-grande border border-white/[0.07] bg-white/[0.04] px-e3 py-e2 text-left hover:bg-white/[0.07]"
        >
          {dentro}
          <span className="shrink-0 text-texto-tenue">
            <IconoCambiar size={16} />
          </span>
        </button>
      ) : (
        <div className="flex w-full items-center gap-e3 rounded-grande border border-white/[0.07] bg-white/[0.04] px-e3 py-e2">
          {dentro}
        </div>
      )}

      {abierta && (
        <div
          role="menu"
          aria-label="Cambiar de local"
          className="absolute inset-x-0 top-full z-50 mt-e1 max-h-80 overflow-y-auto rounded-grande border border-white/[0.08] bg-[#1a1e22] p-e1 shadow-s3 anima-aparece"
        >
          {locales.map((otro) => (
            <button
              key={otro.id}
              type="button"
              role="menuitemradio"
              aria-checked={otro.id === local.id}
              onClick={() => {
                setAbierta(false);
                if (otro.id !== local.id) alCambiar(otro.id);
              }}
              className={clases(
                'flex min-h-toque w-full items-center gap-e2 rounded-medio px-e3 text-left text-secundario',
                otro.id === local.id
                  ? 'bg-white/[0.07] font-semibold text-texto'
                  : 'text-texto-suave hover:bg-white/[0.05] hover:text-texto',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{otro.nombre}</span>
              {otro.id === local.id && (
                <span aria-hidden className="size-2 rounded-redondo bg-naranja" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Una app, con sus destinos colgando ───────────────────────────────────────

function AppDelMenu({
  app,
  abierto,
  activa,
  destinoActivo,
  alIr,
}: {
  readonly app: App;
  readonly abierto: boolean;
  readonly activa: boolean;
  readonly destinoActivo: string | null;
  readonly alIr: (app: App, destino?: string) => void;
}) {
  const destinos = destinosConstruidos(app);
  // Desplegada la activa, y **solo la activa** (0084): al cambiar de app, la nueva se
  // despliega y la de antes se pliega. Antes se quedaba abierta cada app por la que se
  // pasaba, y a la tercera el menú era una lista larga que había que desplazar.
  const [desplegada, setDesplegada] = useState(activa);
  useEffect(() => {
    setDesplegada(activa);
  }, [activa]);

  if (!abierto) {
    return <AppPlegada app={app} activa={activa} destinoActivo={destinoActivo} alIr={alIr} />;
  }

  const Icono = app.icono;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={desplegada}
        aria-current={activa && destinoActivo === null ? 'page' : undefined}
        onClick={() => {
          if (!activa) {
            alIr(app);
            setDesplegada(true);
            return;
          }
          setDesplegada((antes) => !antes);
        }}
        className={clases(
          'group flex min-h-[42px] w-full items-center gap-e3 rounded-grande px-e2 text-left',
          'transition-colors duration-[--rapido]',
          activa
            ? 'bg-white/[0.07] text-texto'
            : 'text-texto-suave hover:bg-white/[0.04] hover:text-texto',
        )}
      >
        <PastillaDeIcono acento={app.acento} viva={activa}>
          <Icono size={17} />
        </PastillaDeIcono>
        <span className="min-w-0 flex-1 truncate text-secundario font-medium">{app.nombre}</span>
        <span
          aria-hidden
          className={clases(
            'shrink-0 text-texto-tenue transition-transform duration-[--normal]',
            desplegada && 'rotate-90',
          )}
        >
          <IconoFlechaDerecha size={15} />
        </span>
      </button>

      {/*
        Los destinos, con una guía a la izquierda como un árbol. Se pliegan con
        `grid-rows` para que la altura se anime sin medir nada.
      */}
      <div
        className={clases(
          'grid transition-[grid-template-rows] duration-[--normal] ease-curva',
          desplegada ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <nav
            aria-label={`Dentro de ${app.nombre}`}
            className="relative ml-[1.35rem] flex flex-col gap-[1px] border-l border-white/[0.08] py-e1 pl-e3"
          >
            {destinos.map((destino) => (
              <DestinoDelMenu
                key={destino.id}
                destino={destino}
                activo={activa && destino.id === destinoActivo}
                acento={app.acento}
                alPulsar={() => {
                  alIr(app, destino.id);
                }}
                oculto={!desplegada}
              />
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

function DestinoDelMenu({
  destino,
  activo,
  acento,
  alPulsar,
  oculto,
}: {
  readonly destino: Destino;
  readonly activo: boolean;
  readonly acento: string;
  readonly alPulsar: () => void;
  readonly oculto: boolean;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-current={activo ? 'page' : undefined}
      tabIndex={oculto ? -1 : undefined}
      title={destino.queContesta}
      className={clases(
        'relative flex min-h-[36px] w-full items-center rounded-medio px-e3 text-left text-secundario',
        'transition-colors duration-[--rapido]',
        activo
          ? 'bg-white/[0.06] font-semibold text-texto'
          : 'text-texto-tenue hover:bg-white/[0.04] hover:text-texto',
      )}
    >
      {activo && (
        <span
          aria-hidden
          className="absolute -left-[calc(var(--spacing-e3)+1.5px)] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-redondo"
          style={{ background: acento }}
        />
      )}
      {destino.nombre}
    </button>
  );
}

/**
 * La app con el menú plegado: el icono, su nombre al pasar por encima y, al pulsar,
 * sus destinos en un menú al lado. El menú va en un portal y `fixed`, por lo mismo
 * que el de la barra de antes: dentro de algo que desplaza, un `absolute` se recorta.
 */
function AppPlegada({
  app,
  activa,
  destinoActivo,
  alIr,
}: {
  readonly app: App;
  readonly activa: boolean;
  readonly destinoActivo: string | null;
  readonly alIr: (app: App, destino?: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [donde, setDonde] = useState<{ readonly x: number; readonly y: number } | null>(null);

  useLayoutEffect(() => {
    if (!abierto) return;
    const r = boton.current?.getBoundingClientRect();
    if (r) setDonde({ x: r.right + 10, y: r.top });
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: MouseEvent) => {
      const donde = evento.target as Node;
      if (boton.current?.contains(donde) || menu.current?.contains(donde)) return;
      setAbierto(false);
    };
    const escapar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escapar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escapar);
    };
  }, [abierto]);

  const Icono = app.icono;
  return (
    <div className="group relative">
      <button
        ref={boton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-current={activa ? 'page' : undefined}
        aria-label={app.nombre}
        onClick={() => {
          setAbierto((antes) => !antes);
        }}
        className={clases(
          'grid size-12 place-items-center rounded-grande transition-colors duration-[--rapido]',
          activa ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]',
        )}
      >
        <PastillaDeIcono acento={app.acento} viva={activa}>
          <Icono size={18} />
        </PastillaDeIcono>
      </button>
      {!abierto && <Bocadillo>{app.nombre}</Bocadillo>}

      {abierto &&
        donde !== null &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={app.nombre}
            style={{ position: 'fixed', left: donde.x, top: donde.y }}
            className="zona-oscura z-50 min-w-[14rem] rounded-grande border border-white/[0.08] bg-[#1a1e22] p-e1 shadow-s3 anima-aparece"
          >
            <p className="px-e3 pb-e1 pt-e2 text-etiqueta font-semibold text-texto-tenue">
              {app.nombre}
            </p>
            {destinosConstruidos(app).map((destino) => (
              <button
                key={destino.id}
                type="button"
                role="menuitem"
                aria-current={activa && destino.id === destinoActivo ? 'page' : undefined}
                onClick={() => {
                  setAbierto(false);
                  alIr(app, destino.id);
                }}
                className={clases(
                  'flex min-h-toque w-full items-center gap-e3 rounded-medio px-e3 text-left text-secundario',
                  activa && destino.id === destinoActivo
                    ? 'bg-white/[0.07] font-semibold text-texto'
                    : 'text-texto-suave hover:bg-white/[0.05] hover:text-texto',
                )}
              >
                <span className="shrink-0 text-texto-tenue">
                  <destino.icono size={16} />
                </span>
                {destino.nombre}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ── Las que llegan ───────────────────────────────────────────────────────────

function Proximamente({ apps }: { readonly apps: readonly App[] }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="mt-e3 flex flex-col">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => {
          setAbierto((antes) => !antes);
        }}
        className="flex min-h-[36px] items-center justify-between rounded-medio px-e2 text-etiqueta font-semibold text-texto-tenue hover:text-texto-suave"
      >
        Próximamente
        <span
          aria-hidden
          className={clases('transition-transform duration-[--normal]', abierto && 'rotate-90')}
        >
          <IconoFlechaDerecha size={14} />
        </span>
      </button>
      {abierto &&
        apps.map((app) => (
          <div
            key={app.id}
            title={app.queHace}
            className="flex min-h-[38px] items-center gap-e3 px-e2 text-texto-tenue"
          >
            <span className="grid size-8 place-items-center opacity-60">
              <app.icono size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate text-secundario">{app.nombre}</span>
            <span className="shrink-0 text-etiqueta">
              {comoSeLlamaElModulo(app.destinos[0]?.modulo ?? '').split(' · ')[0]}
            </span>
          </div>
        ))}
    </div>
  );
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function Fila({
  abierto,
  etiqueta,
  activa,
  icono,
  acento,
  alPulsar,
}: {
  readonly abierto: boolean;
  readonly etiqueta: string;
  readonly activa: boolean;
  readonly icono: ReactNode;
  readonly acento: string;
  readonly alPulsar: () => void;
}) {
  if (!abierto) {
    return (
      <div className="group relative">
        <button
          type="button"
          onClick={alPulsar}
          aria-label={etiqueta}
          aria-current={activa ? 'page' : undefined}
          className={clases(
            'grid size-12 place-items-center rounded-grande transition-colors duration-[--rapido]',
            activa ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]',
          )}
        >
          <PastillaDeIcono acento={acento} viva={activa}>
            {icono}
          </PastillaDeIcono>
        </button>
        <Bocadillo>{etiqueta}</Bocadillo>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-current={activa ? 'page' : undefined}
      className={clases(
        'flex min-h-[42px] w-full items-center gap-e3 rounded-grande px-e2 text-left',
        'transition-colors duration-[--rapido]',
        activa
          ? 'bg-white/[0.07] text-texto'
          : 'text-texto-suave hover:bg-white/[0.04] hover:text-texto',
      )}
    >
      <PastillaDeIcono acento={acento} viva={activa}>
        {icono}
      </PastillaDeIcono>
      <span className="text-secundario font-medium">{etiqueta}</span>
    </button>
  );
}

/** El icono de una app en su cuadrado: tenue en reposo, encendido si es donde estás. */
function PastillaDeIcono({
  acento,
  viva,
  children,
}: {
  readonly acento: string;
  readonly viva: boolean;
  readonly children: ReactNode;
}) {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-medio transition-[background,color] duration-[--rapido]"
      style={{
        color: viva ? '#ffffff' : acento,
        background: viva
          ? `linear-gradient(140deg, color-mix(in srgb, ${acento} 95%, white), color-mix(in srgb, ${acento} 75%, black))`
          : `color-mix(in srgb, ${acento} 14%, transparent)`,
        boxShadow: viva ? `0 6px 16px -6px ${acento}` : undefined,
      }}
    >
      {children}
    </span>
  );
}

function Bocadillo({ children }: { readonly children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={clases(
        'pointer-events-none absolute left-full top-1/2 z-50 ml-e3 -translate-y-1/2 whitespace-nowrap',
        'rounded-medio bg-[#1a1e22] px-e3 py-e1 text-secundario font-medium text-texto shadow-s3',
        'opacity-0 transition-opacity duration-[--rapido] group-hover:opacity-100',
      )}
    >
      {children}
    </span>
  );
}

function BotonDelMenu({
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
      className="grid size-10 place-items-center rounded-medio text-texto-tenue hover:bg-white/[0.06] hover:text-texto"
    >
      {children}
    </button>
  );
}

function Apartado({ children }: { readonly children: ReactNode }) {
  return (
    <p className="mt-e3 mb-e1 px-e2 text-etiqueta font-semibold text-texto-tenue">{children}</p>
  );
}
