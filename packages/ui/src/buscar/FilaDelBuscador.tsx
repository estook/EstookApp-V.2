import type { ReactNode } from 'react';
import { clases } from '../clases.ts';

/**
 * Las dos piezas con las que se pinta el buscador: el grupo y la fila.
 *
 * Estan aparte por el limite de A2 —ningun fichero pasa de 300 lineas—, y de
 * paso se lee mejor: `Buscador.tsx` se queda con el teclado y la busqueda, que
 * es lo que tiene enjundia, y aqui solo hay marcado.
 */
export function Grupo({
  titulo,
  children,
}: {
  readonly titulo: string;
  readonly children: ReactNode;
}) {
  return (
    <section>
      <h2 className="px-e3 pt-e3 pb-e1 text-etiqueta uppercase tracking-wide text-texto-suave">
        {titulo}
      </h2>
      <ul>{children}</ul>
    </section>
  );
}

export interface FilaProps {
  /** La que abriria `Enter` ahora mismo. Se resalta, no se enfoca. */
  readonly senalada: boolean;
  readonly titulo: string;
  readonly subtitulo?: string | undefined;
  /** De que tipo es el resultado: local, persona. A la derecha, en gris. */
  readonly etiqueta?: string;
  readonly icono?: ReactNode;
  readonly alPulsar: () => void;
  readonly alSenalar: () => void;
}

export function Fila({
  senalada,
  titulo,
  subtitulo,
  etiqueta,
  icono,
  alPulsar,
  alSenalar,
}: FilaProps) {
  return (
    <li>
      <button
        type="button"
        onClick={alPulsar}
        // Con `mousemove` y no con `mouseenter`: al bajar con las flechas, el
        // raton quieto encima de otra fila no puede robarle el turno.
        onMouseMove={alSenalar}
        aria-current={senalada ? 'true' : undefined}
        className={clases(
          'flex w-full min-h-toque items-center gap-e3 px-e3 text-left',
          senalada && 'bg-naranja-suave',
        )}
      >
        {icono !== undefined && <span className="shrink-0 text-texto-suave">{icono}</span>}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-cuerpo">{titulo}</span>
          {subtitulo !== undefined && subtitulo !== '' && (
            <span className="block truncate text-secundario text-texto-suave">{subtitulo}</span>
          )}
        </span>

        {etiqueta !== undefined && (
          <span className="shrink-0 text-etiqueta uppercase tracking-wide text-texto-suave">
            {etiqueta}
          </span>
        )}
      </button>
    </li>
  );
}
