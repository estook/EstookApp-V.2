import { useEffect, useRef, type ReactNode } from 'react';
import { IconoCerrar } from '@estook/iconos';
import { clases } from '../clases.ts';

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
}

function useDialogo(abierta: boolean, alCerrar: () => void) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;

    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
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
 */
export function Hoja({ abierta, alCerrar, titulo, children, pie }: Comunes) {
  const dialogo = useDialogo(abierta, alCerrar);

  return (
    <dialog
      ref={dialogo}
      aria-label={titulo}
      className={clases(DIALOGO, 'fixed inset-0 w-full h-full')}
    >
      <div className="flex h-full w-full flex-col justify-end">
        {/* Tocar arriba cierra. Es un boton de verdad para que tambien se pueda
            con teclado, aunque `Esc` ya haga lo mismo. */}
        <button
          type="button"
          aria-label="Cerrar"
          className="h-[8%] w-full cursor-default"
          onClick={alCerrar}
        />
        <div
          className={clases(
            'flex h-[92%] flex-col bg-superficie rounded-t-mayor shadow-s3',
            'anima-sube',
          )}
        >
          <Cabecera titulo={titulo} alCerrar={alCerrar} />
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
          'flex h-full w-[min(420px,100vw)] flex-col bg-superficie shadow-s3',
          'border-l border-borde anima-derecha',
        )}
      >
        <Cabecera titulo={titulo} alCerrar={alCerrar} />
        <div className="flex-1 overflow-y-auto px-e4 pb-e4">{children}</div>
        {pie !== undefined && <footer className="border-t border-borde px-e4 py-e3">{pie}</footer>}
      </div>
    </dialog>
  );
}

function Cabecera({
  titulo,
  alCerrar,
}: {
  readonly titulo: string;
  readonly alCerrar: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-e3 px-e4 py-e3 border-b border-borde">
      <h2 className="text-pantalla font-semibold">{titulo}</h2>
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
