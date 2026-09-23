import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clases } from '../clases.ts';

/**
 * La red de debajo de cada pantalla (entrega V, 23-sep).
 *
 * ── El agujero que tapa ──────────────────────────────────────────────────────
 *
 * La aplicación se descarga **a trozos**: Movimientos, Compras, la ficha de un
 * producto, el alta o las gráficas llegan cuando hacen falta. Hasta hoy, si un trozo
 * no llegaba, el fallo **no lo recogía nadie** y la pantalla podía quedarse en blanco.
 * Pasa en dos casos, y el segundo es el de todos los días:
 *
 *   · **Se va la conexión** justo al abrir esa pantalla: la wifi de una cocina.
 *   · **Se ha publicado una versión nueva** con la app abierta. Los trozos viejos
 *     dejan de existir y quien pulsa Movimientos pide uno que ya no está.
 *
 * Lo cazó una prueba de Safari en la integración continua (la #64), con un trozo que
 * no llegó. Y habría pasado de verdad el día de fusionar V, que cambia todos.
 *
 * ── Lo que hace ──────────────────────────────────────────────────────────────
 *
 *   · **Un trozo que no llega**: la página se recarga sola **una vez**, que es lo que
 *     arregla el caso de la versión nueva sin que nadie tenga que entender nada. Si
 *     vuelve a fallar en menos de medio minuto, no se recarga en bucle: se dice.
 *   · **Cualquier otro fallo**: se dice qué ha pasado y hay un botón para volver a
 *     cargar. Nunca una pantalla en blanco (B4).
 *   · **Se avisa** a quien lo recoja (`alFallar`: Sentry, en la app).
 *   · **Cambiar de pantalla lo borra** (`clave`): el fallo de Movimientos no se queda
 *     puesto al volver al Panel.
 */

/** Los mensajes con los que los navegadores dicen «ese trozo no ha llegado». */
const UN_TROZO_QUE_NO_LLEGA =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS|Loading (CSS )?chunk/i;

const DONDE_SE_APUNTA = 'estook.recargado-por-un-trozo';
/** Si ya se recargó hace menos de esto y vuelve a fallar, no se recarga otra vez. */
const MEDIO_MINUTO = 30_000;

export function esUnTrozoQueNoLlega(fallo: unknown): boolean {
  const texto = fallo instanceof Error ? `${fallo.name} ${fallo.message}` : String(fallo);
  return UN_TROZO_QUE_NO_LLEGA.test(texto);
}

/**
 * Si toca recargar para traer los trozos nuevos: solo si no se ha hecho ya hace
 * nada. Sin almacenamiento (navegación privada), no se recarga sola: se dice.
 */
function tocaRecargarSola(ahora: number): boolean {
  try {
    const antes = Number(window.sessionStorage.getItem(DONDE_SE_APUNTA) ?? '0');
    if (ahora - antes < MEDIO_MINUTO) return false;
    window.sessionStorage.setItem(DONDE_SE_APUNTA, String(ahora));
    return true;
  } catch {
    return false;
  }
}

export interface SiAlgoFallaProps {
  readonly children: ReactNode;
  /** Cuando cambia, el fallo se olvida: la dirección de la pantalla, por ejemplo. */
  readonly clave?: string;
  /** Para avisar a quien lo recoja. Recibe el fallo tal cual. */
  readonly alFallar?: (fallo: unknown) => void;
  /** Ocupa la pantalla entera: la red de la raíz, cuando no hay barras alrededor. */
  readonly aPantallaCompleta?: boolean;
}

interface Estado {
  readonly fallo: unknown;
  readonly clave: string | undefined;
}

export class SiAlgoFalla extends Component<SiAlgoFallaProps, Estado> {
  override state: Estado = { fallo: null, clave: this.props.clave };

  static getDerivedStateFromError(fallo: unknown): Partial<Estado> {
    return { fallo };
  }

  static getDerivedStateFromProps(props: SiAlgoFallaProps, estado: Estado): Partial<Estado> | null {
    // Otra pantalla: lo de la anterior no se arrastra.
    if (props.clave !== estado.clave) return { fallo: null, clave: props.clave };
    return null;
  }

  override componentDidCatch(fallo: unknown, _donde: ErrorInfo): void {
    this.props.alFallar?.(fallo);
    if (esUnTrozoQueNoLlega(fallo) && tocaRecargarSola(Date.now())) {
      window.location.reload();
    }
  }

  override render(): ReactNode {
    const { fallo } = this.state;
    if (fallo === null) return this.props.children;

    const trozo = esUnTrozoQueNoLlega(fallo);
    return (
      <div
        role="alert"
        className={clases(
          'flex w-full items-center justify-center px-e4',
          this.props.aPantallaCompleta === true ? 'min-h-dvh bg-fondo' : 'py-e7',
        )}
      >
        <div className="flex max-w-[28rem] flex-col items-center gap-e3 rounded-mayor border border-borde bg-superficie px-e5 py-e5 text-center [box-shadow:var(--sombra-tarjeta)]">
          <p className="text-seccion font-semibold">
            {trozo ? 'Esta pantalla no ha terminado de cargar' : 'Algo ha fallado en esta pantalla'}
          </p>
          <p className="text-secundario text-texto-suave">
            {trozo
              ? 'Puede que se haya ido la conexión o que haya una versión nueva de Estook. Vuelve a cargarla: lo que ya estaba guardado sigue ahí.'
              : 'Vuelve a cargarla. Si vuelve a pasar, avísanos y dinos en qué pantalla estabas.'}
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="inline-flex min-h-toque items-center justify-center rounded-medio border border-naranja bg-naranja px-e4 font-medium text-sobre-naranja hover:brightness-95"
          >
            Volver a cargar
          </button>
        </div>
      </div>
    );
  }
}
