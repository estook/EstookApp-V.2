import {
  forwardRef,
  useCallback,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { IconoAnadir, IconoQuitar } from '@estook/iconos';
import { clases } from '../clases.ts';
import { AvisoDeVacio } from './vacio.ts';
import type { TamanoDeWidget } from './catalogo.ts';
import { CLASES_DEL_TAMANO, COMO_SE_LLAMA_EL_TAMANO } from './rejilla.ts';

/**
 * Una casilla de la rejilla del Panel: el sitio de un widget (M7, 0039).
 *
 * La comparten la rejilla quieta y la que se edita, para que **entrar en edición
 * no cambie nada de sitio**: es la misma casilla, con los controles encima y
 * temblando. Si fueran dos componentes, un día una tendría un borde de más y el
 * Panel daría un salto al pulsar «Editar».
 */

export interface CasillaProps extends HTMLAttributes<HTMLDivElement> {
  readonly id: string;
  readonly nombre: string;
  readonly tamano: TamanoDeWidget;
  readonly tamanos: readonly TamanoDeWidget[];
  readonly indice: number;
  readonly editando: boolean;
  /** Si el widget ha dicho que no tiene nada. Fuera de edición, no se ve. */
  readonly vacio: boolean;
  /** Si es el hueco que deja el widget que se está arrastrando. */
  readonly hueco?: boolean;
  /**
   * Estable entre pintadas: el widget la usa en un efecto, y una función nueva en
   * cada pintada lo haría avisar sin parar.
   */
  readonly avisarDeVacio: (id: string, vacio: boolean) => void;
  readonly alQuitar: () => void;
  readonly alCambiarTamano: (tamano: TamanoDeWidget) => void;
  readonly estilo?: CSSProperties;
  readonly children: ReactNode;
}

export const Casilla = forwardRef<HTMLDivElement, CasillaProps>(function Casilla(
  {
    id,
    nombre,
    tamano,
    tamanos,
    indice,
    editando,
    vacio,
    hueco = false,
    avisarDeVacio,
    alQuitar,
    alCambiarTamano,
    estilo,
    children,
    className,
    ...resto
  },
  ref,
) {
  const avisar = useCallback(
    (vacioAhora: boolean) => {
      avisarDeVacio(id, vacioAhora);
    },
    [avisarDeVacio, id],
  );

  return (
    <div
      ref={ref}
      data-widget={id}
      style={{ ...estilo, animationDelay: `${Math.min(indice, 12) * 35}ms` }}
      className={clases(
        CLASES_DEL_TAMANO[tamano],
        'relative min-w-0 anima-entra',
        // Lo vacío se aparta, pero **no se desmonta**: si se desmontara, dejaría
        // de pedir sus datos y no podría avisar de que ya tiene algo.
        !editando && vacio && 'hidden',
        className,
      )}
      {...resto}
    >
      <div
        className={clases('h-full', editando && !hueco && 'anima-tiembla', hueco && 'opacity-30')}
        // Cada uno con su desfase, como en el iPhone: si tiemblan todos a la vez
        // parece que se mueve la pantalla, no los widgets.
        style={editando ? { animationDelay: `${(indice % 4) * -70}ms` } : undefined}
      >
        <AvisoDeVacio.Provider value={avisar}>{children}</AvisoDeVacio.Provider>
      </div>

      {/*
        Los controles, **fuera de lo que tiembla**. Tiembla la tarjeta, que es lo
        que dice «estás editando»; el «quitar» y el tamaño se quedan quietos, que
        un botón que se mueve es un botón que se falla con el dedo.
      */}
      {editando && (
        <ControlesDeEdicion
          nombre={nombre}
          tamano={tamano}
          tamanos={tamanos}
          vacio={vacio}
          alQuitar={alQuitar}
          alCambiarTamano={alCambiarTamano}
        />
      )}
    </div>
  );
});

/**
 * Los controles de un widget en edición.
 *
 * Van **encima** del widget y no dentro, para que el widget no tenga que saber
 * nada de esto. Como en el móvil: el «−» arriba a la izquierda para quitarlo, y
 * se arrastra desde cualquier parte. Los botones de flecha de antes se van —
 * «que se arrastren mejor que las flechas»—, y el teclado sigue pudiendo moverlo
 * todo: foco en el widget, espacio para cogerlo, flechas y espacio para soltarlo.
 */
function ControlesDeEdicion({
  nombre,
  tamano,
  tamanos,
  vacio,
  alQuitar,
  alCambiarTamano,
}: {
  readonly nombre: string;
  readonly tamano: TamanoDeWidget;
  readonly tamanos: readonly TamanoDeWidget[];
  readonly vacio: boolean;
  readonly alQuitar: () => void;
  readonly alCambiarTamano: (tamano: TamanoDeWidget) => void;
}) {
  return (
    <>
      {/* La capa que impide pulsar dentro del widget mientras se edita. Sin ella,
          arrastrar sobre un botón del widget lo activaría al soltar. */}
      <div aria-hidden className="absolute inset-0 rounded-grande bg-superficie/30" />

      <button
        type="button"
        aria-label={`Quitar ${nombre} del panel`}
        onClick={alQuitar}
        // Que pulsar el «−» no empiece a arrastrar el widget.
        onPointerDown={(evento) => {
          evento.stopPropagation();
        }}
        className={clases(
          'absolute -left-[6px] -top-[6px] grid size-[30px] place-items-center rounded-redondo',
          'border border-borde-fuerte bg-superficie text-mal shadow-s2',
          'hover:bg-mal-suave',
        )}
      >
        <IconoQuitar size={16} />
      </button>

      {vacio && (
        <span className="absolute right-e2 top-e2 rounded-redondo bg-fondo px-e2 py-[2px] text-etiqueta font-medium text-texto-suave">
          Vacío ahora
        </span>
      )}

      {/* El tamaño, si admite más de uno. Con uno solo no se ofrece: un control
          de una opción es un control que no hace nada. */}
      {tamanos.length > 1 && (
        <div className="absolute inset-x-e2 bottom-e2 flex flex-wrap items-center justify-center gap-e1">
          <span className="inline-flex overflow-hidden rounded-redondo border border-borde-fuerte bg-superficie shadow-s1">
            {tamanos.map((cual) => (
              <button
                key={cual}
                type="button"
                aria-pressed={cual === tamano}
                onPointerDown={(evento) => {
                  evento.stopPropagation();
                }}
                onClick={() => {
                  alCambiarTamano(cual);
                }}
                className={clases(
                  'min-h-[30px] px-e2 text-etiqueta font-semibold',
                  cual === tamano
                    ? 'bg-charcoal text-superficie'
                    : 'text-texto-suave hover:bg-fondo',
                )}
              >
                {COMO_SE_LLAMA_EL_TAMANO[cual]}
              </button>
            ))}
          </span>
        </div>
      )}
    </>
  );
}

/** El hueco de añadir, dentro de la rejilla y no en un menú escondido. */
export function HuecoDeAnadir({ alAnadir }: { readonly alAnadir: () => void }) {
  return (
    <button
      type="button"
      onClick={alAnadir}
      className={clases(
        'col-span-1 row-span-1 flex flex-col items-center justify-center gap-e1',
        'rounded-grande border-2 border-dashed border-borde-fuerte text-texto-suave',
        'hover:border-naranja hover:text-texto',
      )}
    >
      <IconoAnadir size={24} />
      <span className="text-secundario font-medium">Añadir</span>
    </button>
  );
}
