import type { ReactNode } from 'react';
import { clases } from '../clases.ts';

/**
 * La tabla y la lista · Parte B4 del Plan.
 *
 * «Tabla (que se convierte en **tarjetas por debajo de 768 px**)» · «Tablas
 * anchas -> tarjetas en movil» (Manifiesto).
 *
 * Y se convierte de verdad, no se hace desplazar a lo ancho: una tabla con
 * desplazamiento lateral en un movil es una tabla que nadie lee entera. Debajo
 * de 768 px cada fila pasa a ser una tarjeta con sus pares de etiqueta y valor.
 *
 * Se pinta dos veces, la de tabla y la de tarjetas, y CSS ensena una. Suena a
 * desperdicio y no lo es: el navegador solo pinta la visible, y a cambio la
 * version de escritorio es una `<table>` de verdad, que es lo que un lector de
 * pantalla sabe recorrer por filas y columnas.
 */
export interface Columna<T> {
  readonly clave: string;
  readonly titulo: string;
  /** Como se pinta la celda. Recibe la fila entera. */
  readonly celda: (fila: T) => ReactNode;
  /** Las cifras a la derecha; el texto, a la izquierda. */
  readonly numerica?: boolean;
  /**
   * En movil, esta columna es el titulo de la tarjeta y no lleva etiqueta.
   * Solo una por tabla.
   */
  readonly principal?: boolean;
}

export interface TablaProps<T> {
  readonly titulo: string;
  readonly columnas: readonly Columna<T>[];
  readonly filas: readonly T[];
  readonly claveDe: (fila: T) => string;
  /** Que sale cuando no hay filas. Siempre hay algo: nunca una tabla en blanco. */
  readonly cuandoNoHay: ReactNode;
  readonly alPulsar?: (fila: T) => void;
}

export function Tabla<T>({
  titulo,
  columnas,
  filas,
  claveDe,
  cuandoNoHay,
  alPulsar,
}: TablaProps<T>) {
  if (filas.length === 0) return <>{cuandoNoHay}</>;

  const principal = columnas.find((c) => c.principal === true) ?? columnas[0];

  return (
    <>
      {/* ── Escritorio: una tabla de verdad ───────────────────────────────── */}
      <table className="hidden w-full border-collapse text-cuerpo md:table">
        <caption className="sr-only">{titulo}</caption>
        <thead>
          <tr className="border-b border-borde">
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={clases(
                  'px-e3 py-e2 text-etiqueta font-medium uppercase tracking-wide',
                  'text-texto-suave',
                  columna.numerica === true ? 'text-right' : 'text-left',
                )}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr
              key={claveDe(fila)}
              className={clases(
                'border-b border-borde last:border-0',
                alPulsar !== undefined && 'cursor-pointer hover:bg-fondo',
              )}
              {...(alPulsar === undefined
                ? {}
                : {
                    onClick: () => {
                      alPulsar(fila);
                    },
                  })}
            >
              {columnas.map((columna) => (
                <td
                  key={columna.clave}
                  className={clases(
                    'px-e3 py-e3 align-middle',
                    columna.numerica === true && 'text-right',
                  )}
                >
                  {columna.celda(fila)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Movil: la misma tabla, en tarjetas ────────────────────────────── */}
      <ul className="flex flex-col gap-e2 md:hidden">
        {filas.map((fila) => (
          <li key={claveDe(fila)}>
            <ElementoDeTabla
              fila={fila}
              columnas={columnas}
              principal={principal}
              {...(alPulsar === undefined ? {} : { alPulsar })}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function ElementoDeTabla<T>({
  fila,
  columnas,
  principal,
  alPulsar,
}: {
  readonly fila: T;
  readonly columnas: readonly Columna<T>[];
  readonly principal: Columna<T> | undefined;
  readonly alPulsar?: (fila: T) => void;
}) {
  const contenido = (
    <>
      {principal !== undefined && (
        <p className="text-seccion font-semibold">{principal.celda(fila)}</p>
      )}
      <dl className="mt-e2 grid grid-cols-[auto_1fr] gap-x-e3 gap-y-e1">
        {columnas
          .filter((columna) => columna.clave !== principal?.clave)
          .map((columna) => (
            <div key={columna.clave} className="contents">
              <dt className="text-etiqueta uppercase tracking-wide text-texto-suave self-center">
                {columna.titulo}
              </dt>
              <dd className="text-cuerpo text-right">{columna.celda(fila)}</dd>
            </div>
          ))}
      </dl>
    </>
  );

  const pinta =
    'block w-full min-h-toque text-left bg-superficie border border-borde rounded-medio p-e3';

  return alPulsar === undefined ? (
    <div className={pinta}>{contenido}</div>
  ) : (
    <button
      type="button"
      className={clases(pinta, 'hover:bg-fondo')}
      onClick={() => {
        alPulsar(fila);
      }}
    >
      {contenido}
    </button>
  );
}

/**
 * La lista: lo mismo pero de una sola columna.
 *
 * Es lo que se usa cuando cada fila es una cosa con su nombre y su estado, y no
 * una fila de datos. Toque de 44 px, o 52 si se marca de cocina.
 */
export interface ElementoDeLista {
  readonly clave: string;
  readonly titulo: ReactNode;
  readonly detalle?: ReactNode;
  readonly derecha?: ReactNode;
  readonly delante?: ReactNode;
  readonly alPulsar?: () => void;
}

export interface ListaProps {
  readonly titulo: string;
  readonly elementos: readonly ElementoDeLista[];
  readonly cuandoNoHay: ReactNode;
  /** «En listas de cocina, 52 px» (B4). */
  readonly deCocina?: boolean;
}

export function Lista({ titulo, elementos, cuandoNoHay, deCocina = false }: ListaProps) {
  if (elementos.length === 0) return <>{cuandoNoHay}</>;

  return (
    <ul aria-label={titulo} className="flex flex-col">
      {elementos.map((elemento) => {
        const dentro = (
          <>
            {elemento.delante}
            <span className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate text-cuerpo">{elemento.titulo}</span>
              {elemento.detalle !== undefined && (
                <span className="truncate text-secundario text-texto-suave">
                  {elemento.detalle}
                </span>
              )}
            </span>
            {elemento.derecha}
          </>
        );

        const pinta = clases(
          'flex w-full items-center gap-e3 px-e3 border-b border-borde last:border-0',
          deCocina ? 'min-h-toque-cocina text-seccion' : 'min-h-toque',
        );

        return (
          <li key={elemento.clave}>
            {elemento.alPulsar === undefined ? (
              <div className={pinta}>{dentro}</div>
            ) : (
              <button
                type="button"
                className={clases(pinta, 'hover:bg-fondo')}
                onClick={elemento.alPulsar}
              >
                {dentro}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
