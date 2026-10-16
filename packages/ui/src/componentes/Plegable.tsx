import type { ReactNode } from 'react';
import { IconoFlechaAbajo } from '@estook/iconos';
import { clases } from '../clases.ts';

/**
 * Lo que se mira de vez en cuando, plegado (repaso del 16-oct).
 *
 * Richi, viendo la ficha de un producto: «las caducidades, los movimientos y eso, más
 * abajo y no tan de golpe, sino expansibles y más organizados». Es la lista de
 * Ajustes del iPhone: una tarjeta, una fila por tema con lo esencial a la derecha
 * —«Caduca el 20 dic», «18,18 € el kilo»— y lo demás dentro, al tocar. Así se lee de
 * un vistazo lo que hay y se abre solo lo que se busca.
 *
 * Es un `<details>` de verdad: se abre con el teclado, lo anuncia el lector de
 * pantalla y no necesita estado.
 */
export function GrupoDePlegables({
  children,
  titulo,
}: {
  readonly children: ReactNode;
  /** Para el lector de pantalla: «Más de este producto». */
  readonly titulo: string;
}) {
  return (
    <section
      aria-label={titulo}
      className="flex flex-col divide-y divide-borde overflow-hidden rounded-mayor border border-borde bg-superficie [box-shadow:var(--sombra-tarjeta)]"
    >
      {children}
    </section>
  );
}

export function Plegable({
  titulo,
  resumen,
  icono,
  tono = 'neutro',
  abierto = false,
  children,
}: {
  readonly titulo: string;
  /** Lo esencial, a la vista sin abrir: «Caduca el 20 dic». */
  readonly resumen?: ReactNode;
  readonly icono?: ReactNode;
  /** El resumen en color cuando pide atención: un lote caducado. */
  readonly tono?: 'neutro' | 'atencion' | 'mal';
  /** Abierto de entrada (lo que no puede esperar: un lote caducado). */
  readonly abierto?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <details className="group" open={abierto}>
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-e3 px-e4 py-e2 hover:bg-fondo/60 [&::-webkit-details-marker]:hidden">
        {icono !== undefined && (
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-grande bg-fondo text-texto-suave"
          >
            {icono}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-cuerpo font-semibold">{titulo}</span>
          {resumen !== undefined && resumen !== null && (
            <span
              className={clases(
                'truncate text-secundario',
                tono === 'mal'
                  ? 'font-semibold text-mal'
                  : tono === 'atencion'
                    ? 'font-semibold text-atencion'
                    : 'text-texto-suave',
              )}
            >
              {resumen}
            </span>
          )}
        </span>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center text-texto-suave transition-transform duration-[--rapido] group-open:rotate-180"
        >
          <IconoFlechaAbajo size={18} />
        </span>
      </summary>
      <div className="flex flex-col gap-e3 px-e4 pb-e4 pt-e1">{children}</div>
    </details>
  );
}
