import { createContext, useContext, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconoAmpliar, IconoFlechaDerecha } from '@estook/iconos';
import { Boton, acentoDelWidget, appDelWidget, appPorPermiso, clases } from '@estook/ui';

/**
 * El marco de cada widget del Panel (la experiencia, 0083).
 *
 * Sustituye a la «caja» de antes, que era la misma tarjeta para todos con un título
 * y un «Ver ›». Este es más de ahora, como los del panel de referencia de Richi:
 *
 *   · **El icono en su cuadrado relleno del color de su app**, con un brillo, y el
 *     título al lado. Es lo que dice de un vistazo de qué es cada widget.
 *   · **A la derecha, lo suyo**: el periodo de su gráfica («7 d · 30 d») y una flecha
 *     o un «ampliar», según lleve a otra pantalla o abra su detalle aquí mismo.
 *   · **Sin la línea de origen debajo** («Lotes con fecha · próximos 7 días»): poco
 *     texto. De dónde sale cada cifra se dice en su detalle, que es donde se mira.
 *   · Y el dibujo de dentro lo pone cada widget: ninguno es igual que otro.
 */
export const QuienSePinta = createContext<string | null>(null);

export interface MarcoProps {
  readonly titulo: string;
  /** Un icono propio; si no, el de su app. */
  readonly icono?: ReactNode;
  /** Lo de la derecha de la cabecera: el periodo, una cifra pequeña. */
  readonly derecha?: ReactNode;
  /** A dónde lleva la flecha. */
  readonly ir?: string;
  /** Si se abre su detalle aquí: el botón «ampliar». */
  readonly alAmpliar?: () => void;
  /** Lo que se está leyendo, para decir que no se ha podido. */
  readonly leyendo?: { readonly isError: boolean; readonly refetch: () => unknown };
  /** Sin relleno: la gráfica llega a los bordes. */
  readonly pegado?: boolean;
  readonly children: ReactNode;
}

export function Marco({
  titulo,
  icono,
  derecha,
  ir,
  alAmpliar,
  leyendo,
  pegado = false,
  children,
}: MarcoProps) {
  const navegar = useNavigate();
  const quien = useContext(QuienSePinta);
  const acento = (quien === null ? undefined : acentoDelWidget(quien)) ?? 'var(--color-naranja)';
  const deLaApp = quien === null ? undefined : appDelWidget(quien);
  const IconoDeLaApp = deLaApp === undefined ? undefined : appPorPermiso(deLaApp)?.icono;

  return (
    <section
      aria-label={titulo}
      className={clases(
        'group/widget @container relative flex h-full flex-col overflow-hidden rounded-mayor border border-borde bg-superficie',
        '[background-image:var(--relleno-tarjeta)] [box-shadow:var(--sombra-tarjeta)]',
        'transition-[transform,box-shadow] duration-[--normal] ease-curva',
      )}
    >
      <header className="flex min-h-[3.5rem] items-center gap-e2 px-e4 pb-e1 pt-e4">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-medio text-white @max-[13rem]:hidden"
          style={{
            background: `linear-gradient(140deg, color-mix(in srgb, ${acento} 92%, white), color-mix(in srgb, ${acento} 70%, black))`,
            boxShadow: `0 6px 14px -8px ${acento}`,
          }}
        >
          {icono ?? (IconoDeLaApp === undefined ? null : <IconoDeLaApp size={16} />)}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-cuerpo font-semibold tracking-[-0.01em]">
          {titulo}
        </h2>
        {/* En un widget estrecho (media pantalla de móvil) lo de la derecha baja a su
            línea: si no, el título se queda en una letra. */}
        {derecha !== undefined && <div className="@max-[17rem]:hidden">{derecha}</div>}
        {alAmpliar !== undefined ? (
          <BotonDeLaEsquina
            estrecho etiqueta={`Ampliar ${titulo.toLowerCase()}`} alPulsar={alAmpliar}>
            <IconoAmpliar size={15} />
          </BotonDeLaEsquina>
        ) : (
          ir !== undefined && (
            <BotonDeLaEsquina
              etiqueta={`Ver ${titulo.toLowerCase()}`}
              alPulsar={() => {
                navegar(ir);
              }}
            >
              <IconoFlechaDerecha size={16} />
            </BotonDeLaEsquina>
          )
        )}
      </header>
      {derecha !== undefined && <div className="px-e4 pb-e1 @min-[17rem]:hidden">{derecha}</div>}

      <div className={clases('min-h-0 flex-1', pegado ? 'pb-e2' : 'px-e4 pb-e4 pt-e1')}>
        {leyendo?.isError === true ? (
          <div className={clases('flex flex-col items-start gap-e3', pegado && 'px-e4 pb-e2')}>
            <p className="text-secundario text-texto-suave">No he podido leerlo.</p>
            <Boton
              tono="secundario"
              onClick={() => {
                void leyendo.refetch();
              }}
            >
              Volver a intentarlo
            </Boton>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function BotonDeLaEsquina({
  etiqueta,
  alPulsar,
  estrecho = false,
  children,
}: {
  readonly etiqueta: string;
  /** «Ampliar» se esconde en estrecho: ahí se toca la cifra y se abre igual. */
  readonly estrecho?: boolean;
  readonly alPulsar: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      aria-label={etiqueta}
      title={etiqueta}
      className={clases(
        '-mr-e1 grid size-9 shrink-0 place-items-center rounded-redondo text-texto-tenue',
        estrecho && '@max-[17rem]:hidden',
        'transition-colors duration-[--rapido] hover:bg-fondo hover:text-texto',
        // Un blanco de 44 px aunque se vea de 36.
        'relative before:absolute before:-inset-1 before:content-[""]',
      )}
    >
      {children}
    </button>
  );
}

/** Una línea suave, para cuando un widget no tiene nada que decir. */
export function Tranquilo({ children }: { readonly children: ReactNode }) {
  return <p className="text-secundario text-texto-suave">{children}</p>;
}
