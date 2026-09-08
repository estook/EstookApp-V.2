import { IconoAjustes, IconoPanel } from '@estook/iconos';
import type { App } from '../apps.ts';
import { destinosConstruidos } from '../apps.ts';
import { clases } from '../clases.ts';

/**
 * La barra de movil · Parte B5 del Plan.
 *
 * «Movil · tres posiciones y la rueda.
 *
 *   ┌──────────────┬───────────────────┬──────────────┐
 *   │ PANEL        │        ✦          │   AJUSTES    │
 *   └──────────────┴───────────────────┴──────────────┘
 *
 * Dentro de una app, la barra de abajo pasa a ser la de esa app, con un maximo
 * de cuatro posiciones y un "Mas" si hacen falta cinco.»
 *
 * Dos barras, no una con condiciones: `BarraMovil` fuera de una app y
 * `BarraDeApp` dentro. Lo dice el Manifiesto y es lo que hace que cada app se
 * sienta una app aparte: «Eso es lo que hace que se sienta una aplicacion
 * aparte».
 *
 * «Apple recomienda pocas secciones de primer nivel, y que la barra de pestanas
 * sea para **navegar**, no para actuar.» Por eso el boton del centro abre la
 * rueda, que es navegar, y no crea nada.
 */
export interface BarraMovilProps {
  readonly enPanel: boolean;
  readonly enAjustes: boolean;
  readonly alIrAlPanel: () => void;
  readonly alIrAAjustes: () => void;
  readonly alAbrirLaRueda: () => void;
  /** Los pendientes de todas las apps juntos, para el punto del centro. */
  readonly pendientes?: number;
}

export function BarraMovil({
  enPanel,
  enAjustes,
  alIrAlPanel,
  alIrAAjustes,
  alAbrirLaRueda,
  pendientes = 0,
}: BarraMovilProps) {
  return (
    <nav aria-label="Principal" className={CAJA}>
      <Posicion
        nombre="Panel"
        activa={enPanel}
        alPulsar={alIrAlPanel}
        icono={<IconoPanel size={24} />}
      />

      <BotonDeLaRueda alPulsar={alAbrirLaRueda} pendientes={pendientes} />

      <Posicion
        nombre="Ajustes"
        activa={enAjustes}
        alPulsar={alIrAAjustes}
        icono={<IconoAjustes size={24} />}
      />
    </nav>
  );
}

/**
 * La barra de dentro de una app · Parte B5.
 *
 * ── Lo que cambia, y el fallo que arregla ────────────────────────────────────
 *
 * Antes esta barra pintaba **todas** las pestanas del catalogo, existieran o no.
 * En Inventario eso significaba cuatro posiciones de las cuales **dos no
 * llevaban a ningun sitio**: «Pedidos», que es M7 y ensenaba un cartel, y «Mas»,
 * que era el cajon donde vivia Proveedores. La barra de navegacion principal de
 * la app, en el aparato donde de verdad se usa Estook, con la mitad de los
 * botones vacios.
 *
 * Ahora pinta **solo los destinos construidos** (`destinosConstruidos`). Lo que
 * llega despues se cuenta en el menu lateral de escritorio y en la pantalla del
 * destino, con su modulo, donde se lee en vez de ocupar un hueco.
 *
 * A la izquierda del todo, la marca de la app con su acento: es lo que recuerda
 * en que app se esta sin tener que leer, y es el camino de vuelta a la rueda.
 */
export interface BarraDeAppProps {
  readonly app: App;
  readonly destinoActivo: string;
  readonly alIrADestino: (id: string) => void;
  readonly alAbrirLaRueda: () => void;
}

export function BarraDeApp({ app, destinoActivo, alIrADestino, alAbrirLaRueda }: BarraDeAppProps) {
  const Icono = app.icono;
  const destinos = destinosConstruidos(app);

  return (
    <nav aria-label={app.nombre} className={CAJA}>
      {/* Volver al conjunto: «la flecha de atras, o el boton de la rueda». */}
      <button
        type="button"
        onClick={alAbrirLaRueda}
        aria-label="Ver todas las apps"
        className="flex min-h-toque min-w-toque flex-col items-center justify-center gap-[2px] rounded-medio px-e1"
        style={{ color: app.acento }}
      >
        <Icono size={24} />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Apps</span>
      </button>

      {destinos.map((destino) => (
        <Posicion
          key={destino.id}
          nombre={destino.nombre}
          activa={destino.id === destinoActivo}
          acento={app.acento}
          icono={<destino.icono size={22} />}
          alPulsar={() => {
            alIrADestino(destino.id);
          }}
        />
      ))}
    </nav>
  );
}

const CAJA = [
  'fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around gap-e1',
  'border-t border-borde bg-superficie px-e2',
  'h-[calc(var(--alto-barra-movil)+env(safe-area-inset-bottom))]',
  'pb-[env(safe-area-inset-bottom)]',
  'lg:hidden',
].join(' ');

function Posicion({
  nombre,
  activa,
  alPulsar,
  icono,
  acento,
}: {
  readonly nombre: string;
  readonly activa: boolean;
  readonly alPulsar: () => void;
  readonly icono?: React.ReactNode;
  readonly acento?: string;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      // Lo que hace que un lector de pantalla diga «pagina actual» sin que haya
      // que escribirlo en el texto.
      aria-current={activa ? 'page' : undefined}
      className={clases(
        'flex min-h-toque flex-1 flex-col items-center justify-center gap-[2px] rounded-medio px-e1',
        'text-[10px] font-semibold uppercase tracking-wide',
        activa ? 'text-texto' : 'text-texto-suave',
      )}
      {...(activa && acento !== undefined ? { style: { color: acento } } : {})}
    >
      {icono}
      <span className="max-w-full truncate">{nombre}</span>
      {/* El subrayado del activo. Va debajo del texto para que se vea igual con
          icono y sin el. */}
      <span
        aria-hidden
        className={clases(
          'h-[2px] w-[18px] rounded-redondo',
          activa ? 'bg-current' : 'bg-transparent',
        )}
      />
    </button>
  );
}

function BotonDeLaRueda({
  alPulsar,
  pendientes,
}: {
  readonly alPulsar: () => void;
  readonly pendientes: number;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={
        pendientes > 0 ? `Abrir las apps. ${pendientes} pendientes en total` : 'Abrir las apps'
      }
      className="relative grid min-h-toque min-w-toque flex-1 place-items-center"
    >
      <span
        aria-hidden
        // Charcoal y no blanco: el blanco sobre el naranja da 2,6:1, y este icono
        // significa algo, asi que B8 le pide 3:1. El charcoal da 6,6:1.
        className="grid size-[46px] -translate-y-e2 place-items-center rounded-redondo bg-naranja text-charcoal shadow-s2"
      >
        {/* La estrella de cuatro puntas del Plan. Es la marca del boton, no un
            icono de Lucide: no hay ninguno que sea esto. */}
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 2c.5 4.6 5.4 9.5 10 10-4.6.5-9.5 5.4-10 10-.5-4.6-5.4-9.5-10-10 4.6-.5 9.5-5.4 10-10Z" />
        </svg>
      </span>

      {pendientes > 0 && (
        <span
          aria-hidden
          className="absolute right-[calc(50%-30px)] top-[2px] grid size-[18px] place-items-center rounded-redondo border-2 border-superficie bg-charcoal text-[9px] font-bold text-white"
        >
          {pendientes > 9 ? '9+' : pendientes}
        </span>
      )}
    </button>
  );
}
