import { useEffect, useRef, type ReactNode } from 'react';
import { IconoCerrar } from '@estook/iconos';
import { clases } from '../clases.ts';
import { entraEnLaCapaDeArriba } from '../ganchos/capaDeArriba.ts';
// Que la página sepa si se maneja con el dedo: sin eso, la «X» sale con el anillo.
import '../navegacion/modalidad.ts';

/**
 * La hoja y el panel lateral · Partes B4, B5 y B6 del Plan.
 *
 * «Hoja (deslizante en movil al 92 %)» · «PanelLateral (escritorio)» · «la ficha
 * se abre en panel derecho **sin tapar la lista**».
 *
 * Los dos son el mismo `<dialog>` con distinta colocacion, y eso no es pereza:
 * `<dialog>` con `showModal()` trae de serie lo que se hace mal a mano casi
 * siempre — el foco se queda dentro, `Esc` cierra, lo de detras deja de ser
 * navegable, y al cerrar el foco vuelve a donde estaba. Escribir eso a mano
 * habria sido mas codigo y peor.
 *
 * `Esc` cierra, y esta en los atajos de B5: «Esc cierra hoja o panel».
 */
interface Comunes {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly titulo: string;
  readonly children: ReactNode;
  /** Los botones de abajo. Van con `Botones`, para que queden como manda B4. */
  readonly pie?: ReactNode;
  /** Más ancha en el ordenador: la del detalle de una gráfica (la experiencia, 0083). */
  readonly amplia?: boolean;
}

interface DeLaHoja extends Comunes {
  /**
   * **Del alto de lo que lleva** en el móvil, hasta el 92 % (0131): la mesa del TPV, que se
   * abre en pleno servicio y no tiene por qué tapar el plano entero.
   */
  readonly ajustada?: boolean;
  /** Lo que va junto al título, antes de la «X»: los iconos de la mesa del TPV (0131). */
  readonly acciones?: ReactNode;
}

function useDialogo(abierta: boolean, alCerrar: () => void) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;

    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  /*
    Y mientras está abierta, se apunta en la capa de arriba.

    Un `<dialog>` con `showModal()` vive en la capa superior del navegador, por
    encima de toda la página y de cualquier `z-index`, y su fondo se traga los
    clics. Eso es lo que lo hace modal y está bien. Lo que no estaba bien es que
    **la barra de deshacer se quedaba debajo**, visible y sin poder pulsarse, que
    es justo el momento en el que hace falta: se corrige una ficha, se guarda, y
    el panel sigue abierto.

    Apuntándose aquí, lo que tenga que ir por encima de todo se pinta dentro de
    esta hoja. Lo cuenta entero `capaDeArriba.ts`.
  */
  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo || !abierta) return;
    return entraEnLaCapaDeArriba(dialogo);
  }, [abierta]);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;

    // `Esc` cierra el dialogo por su cuenta; hay que enterarse para que el
    // estado de fuera no se quede creyendo que sigue abierto.
    const alCerrarse = () => {
      alCerrar();
    };
    dialogo.addEventListener('close', alCerrarse);
    return () => {
      dialogo.removeEventListener('close', alCerrarse);
    };
  }, [alCerrar]);

  return referencia;
}

/** El fondo del `<dialog>`, comun a los dos. Se pinta con `::backdrop` en la hoja. */
const DIALOGO =
  'p-0 m-0 max-w-none max-h-none bg-transparent text-texto ' +
  'backdrop:bg-charcoal/35 open:backdrop:anima-aparece';

/**
 * La hoja: sube desde abajo y ocupa el 92 % del alto, como pide B4.
 *
 * El 8 % que queda no es margen: es lo que deja ver que hay algo detras, y lo
 * que hace que tocar ahi arriba se entienda como «cerrar».
 *
 * ── Y en un ordenador, una ventana en el centro ──────────────────────────────
 *
 * En una pantalla ancha la hoja ocupaba **todo el ancho**: un campo de nombre de
 * dos metros, los botones en la otra punta, y la cabeza girando para leer una
 * frase. En el ordenador y en el TPV se abre en el centro, con un ancho de
 * formulario —40rem, lo que se lee sin mover los ojos— y la altura que pida lo
 * de dentro. Fuera de ella, todo cierra, igual que el 8 % de arriba en el movil.
 */
export function Hoja({
  abierta,
  alCerrar,
  titulo,
  children,
  pie,
  amplia = false,
  ajustada = false,
  acciones,
}: DeLaHoja) {
  const dialogo = useDialogo(abierta, alCerrar);

  return (
    <dialog
      ref={dialogo}
      aria-label={titulo}
      // Con el desfase del visor, como la barra de abajo: en el iPhone la hoja subía
      // con él (repaso del 25-sep, `anclaAbajo.ts`). **Pero no con el teclado abierto**
      // (19-oct): Safari mueve el visor para enseñar el campo, y si la hoja se movía a
      // la vez, el campo se escapaba y el teclado «se bugeaba» (Richi, al desgranar).
      // El desfase es para cuando el teclado ya se ha cerrado y el visor se queda colgado.
      className={clases(
        DIALOGO,
        'fixed inset-0 w-full h-full translate-y-[var(--desfase-abajo,0px)]',
        '[html[data-teclado]_&]:translate-y-0',
      )}
    >
      {/* La zona segura del teléfono arriba (23-sep): la franja de tocar para cerrar
          empieza debajo de la muesca, no detrás. */}
      <div className="relative flex h-full w-full flex-col justify-end pt-[env(safe-area-inset-top)] md:items-center md:justify-center md:p-e6">
        {/* Tocar fuera cierra. Es un boton de verdad para que tambien se pueda
            con teclado, aunque `Esc` ya haga lo mismo. En el movil es la franja
            de arriba; en el ordenador, todo lo que rodea a la ventana. */}
        <button
          type="button"
          aria-label="Cerrar"
          className={clases(
            'w-full cursor-default md:absolute md:inset-0 md:h-full',
            ajustada ? 'min-h-[8%] flex-1' : 'h-[8%]',
          )}
          onClick={alCerrar}
        />
        <div
          className={clases(
            'relative flex flex-col bg-superficie rounded-t-mayor shadow-s3',
            ajustada ? 'max-h-[92%]' : 'h-[92%]',
            'md:h-auto md:max-h-[85vh] md:w-full md:rounded-mayor',
            amplia ? 'md:max-w-[58rem]' : 'md:max-w-[40rem]',
            'anima-sube',
          )}
        >
          <Cabecera titulo={titulo} alCerrar={alCerrar} acciones={acciones} />
          <div className="flex-1 overflow-y-auto px-e4 pb-e4">{children}</div>
          {pie !== undefined && (
            // `pb-[env(safe-area-inset-bottom)]` para que en un iPhone los
            // botones no queden debajo de la barra del sistema.
            <footer className="border-t border-borde px-e4 py-e3 pb-[calc(var(--spacing-e3)+env(safe-area-inset-bottom))]">
              {pie}
            </footer>
          )}
        </div>
      </div>
    </dialog>
  );
}

/**
 * El panel lateral: entra desde la derecha y **no tapa la lista**.
 *
 * Por eso tiene ancho fijo y no ocupa la pantalla: B5 dice que en escritorio la
 * ficha se abre al lado, no encima, para poder ir de una a otra sin cerrar.
 */
export function PanelLateral({ abierta, alCerrar, titulo, children, pie }: Comunes) {
  const dialogo = useDialogo(abierta, alCerrar);

  return (
    <dialog
      ref={dialogo}
      aria-label={titulo}
      className={clases(DIALOGO, 'fixed inset-y-0 right-0 left-auto h-full')}
    >
      <div
        className={clases(
          // En el teléfono ocupa la pantalla entera: su cabecera deja la zona
          // segura de arriba y su pie la de abajo, o la muesca tapa el título (23-sep).
          'flex h-full w-[min(420px,100vw)] flex-col bg-superficie shadow-s3 pt-[env(safe-area-inset-top)]',
          'border-l border-borde anima-derecha',
        )}
      >
        <Cabecera titulo={titulo} alCerrar={alCerrar} />
        <div className="flex-1 overflow-y-auto px-e4 pb-e4">{children}</div>
        {pie !== undefined && (
          <footer className="border-t border-borde px-e4 py-e3 pb-[calc(var(--spacing-e3)+env(safe-area-inset-bottom))]">
            {pie}
          </footer>
        )}
      </div>
    </dialog>
  );
}

function Cabecera({
  titulo,
  alCerrar,
  acciones,
}: {
  readonly titulo: string;
  readonly alCerrar: () => void;
  readonly acciones?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-e3 px-e4 py-e3 border-b border-borde">
      <h2
        className={clases(
          'text-pantalla font-semibold',
          acciones !== undefined && 'min-w-0 flex-1 truncate',
        )}
      >
        {titulo}
      </h2>
      {acciones !== undefined && (
        <div className="flex shrink-0 items-center gap-e2">{acciones}</div>
      )}
      <button
        type="button"
        onClick={alCerrar}
        aria-label="Cerrar"
        className="grid size-toque place-items-center -mr-e2 rounded-medio text-texto-suave hover:bg-fondo"
      >
        <IconoCerrar size={20} />
      </button>
    </header>
  );
}
