import { Children, isValidElement, type ReactNode } from 'react';
import { clases } from '../clases.ts';
import { usarFilasDelMosaico } from '../ganchos/usarFilasDelMosaico.ts';

/**
 * El mosaico · cada tarjeta ocupa lo que mide (entrega V, [0045](../../../../docs/decisiones/0045-el-aspecto-y-el-orden.md)).
 *
 * «Hay campos vacíos enormes que no tienen ningún tipo de sentido. Que si una
 *  ocupa más, que ocupe más; que si una ocupa menos, que ocupe menos, y que todas
 *  se vayan colocando.» Lo dijo Richi mirando Almacén · Hoy y el Panel.
 *
 * ── De dónde salían los huecos ───────────────────────────────────────────────
 *
 * Una rejilla CSS reparte **filas**, y una fila mide lo que su tarjeta más alta.
 * Con «Lo que necesita tu atención» a novecientos píxeles, las dos tarjetas de al
 * lado se estiraban hasta ahí: una tarjeta de tres líneas con ochocientos píxeles
 * de nada debajo. Y en el Panel, cada fila tenía además un alto mínimo.
 *
 * ── Cómo se arregla, sin librería ────────────────────────────────────────────
 *
 * Es lo que hacen Pinterest, Google Keep o los widgets del iPad: **columnas que se
 * llenan por la más corta**. Se hace con la misma rejilla de siempre, con filas de
 * cuatro píxeles: cada pieza mide su alto de verdad y dice cuántas de esas filas
 * ocupa. El flujo denso de CSS coloca cada una en el primer sitio donde cabe, que
 * es justo el hueco de debajo de la tarjeta más corta.
 *
 *   · **El orden de lectura no cambia**: es el de la lista, que es el que lee un
 *     lector de pantalla y el que recorre el tabulador.
 *   · **Una pieza que crece empuja a las de debajo sola**, porque se mide con un
 *     `ResizeObserver`: abrir un «¿Por qué?» o traer los datos no deja nada
 *     montado encima de nada.
 *   · **En el móvil es una columna**, y el mosaico no hace nada: no hay nada que
 *     encajar.
 *
 * La misma cuenta la usa la rejilla del Panel (`Casilla`), para que el Panel y las
 * apps se coloquen igual. Un solo sitio que sabe medir (regla 6).
 */

/**
 * Las clases que hacen de una rejilla un mosaico.
 *
 * Sin hueco vertical —lo pone la cuenta de filas, para que no se sume dos veces—
 * y con el mismo hueco horizontal de siempre.
 */
export const CLASES_DEL_MOSAICO = 'grid grid-flow-row-dense gap-x-e3 [grid-auto-rows:4px]';

export interface MosaicoProps {
  readonly children: ReactNode;
  /**
   * Cuántas columnas a cada ancho. Por defecto, una en el móvil, dos en una
   * tableta y tres en un portátil, que es lo que cabe con el menú lateral al lado.
   */
  readonly columnas?: string;
}

export function Mosaico({ children, columnas = 'md:grid-cols-2 xl:grid-cols-3' }: MosaicoProps) {
  return (
    <div className={clases(CLASES_DEL_MOSAICO, 'grid-cols-1', columnas)}>
      {Children.map(children, (hijo) => {
        if (hijo === null || hijo === undefined || typeof hijo === 'boolean') return null;
        if (isValidElement(hijo) && hijo.type === Pieza) return hijo;
        return <Pieza>{hijo}</Pieza>;
      })}
    </div>
  );
}

export interface PiezaProps {
  readonly children: ReactNode;
  /** A todo lo ancho del mosaico: un aviso, o una fila de cifras. */
  readonly entera?: boolean;
}

/**
 * Una pieza del mosaico. `Mosaico` envuelve solo a sus hijos en una; se escribe a
 * mano cuando una tiene que ir a todo lo ancho.
 */
export function Pieza({ children, entera = false }: PiezaProps) {
  const { medir, estilo } = usarFilasDelMosaico<HTMLDivElement>();
  return (
    <div className={clases('min-w-0', entera && 'col-span-full')} style={estilo}>
      <div ref={medir}>{children}</div>
    </div>
  );
}
