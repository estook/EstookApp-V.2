import type { ReactNode } from 'react';
import { CUANTO_OCUPA, type TamanoDeWidget, type WidgetPuesto } from './catalogo.ts';

/**
 * Lo que comparten la rejilla del Panel y su versión en edición (0039): sus
 * propiedades y sus clases.
 *
 * Vive aparte para que las dos no se importen la una a la otra: la de edición se
 * carga sola, cuando hace falta, y un ciclo entre ellas lo impediría.
 */

export interface RejillaProps {
  readonly puestos: readonly WidgetPuesto[];
  /** Cómo se pinta cada uno. La rejilla no sabe qué hay dentro. */
  readonly pintar: (puesto: WidgetPuesto) => ReactNode;
  readonly editando: boolean;
  readonly alEditar: (editando: boolean) => void;
  readonly alReordenar: (puestos: readonly WidgetPuesto[]) => void;
  /**
   * Al soltar el widget que se estaba arrastrando.
   *
   * El arrastre es lo único del Panel que se guarda con retraso —son veinte
   * reordenaciones por gesto— y esto es lo que dice cuando el gesto ha acabado.
   */
  readonly alSoltar?: () => void;
  readonly alQuitar: (id: string) => void;
  readonly alCambiarTamano: (id: string, tamano: TamanoDeWidget) => void;
  /** Qué tamaños admite cada widget, para no ofrecer uno que no cabe. */
  readonly tamanosDe: (id: string) => readonly TamanoDeWidget[];
  readonly nombreDe: (id: string) => string;
  readonly alAnadir: () => void;
  /** Si hay algo que guardar y no se ha guardado todavía. */
  readonly guardando?: boolean;
}

export interface RejillaConVacios extends RejillaProps {
  readonly vacios: ReadonlySet<string>;
  readonly avisarDeVacio: (id: string, vacio: boolean) => void;
}

/**
 * Dos columnas en móvil, cuatro en un portátil y seis en un monitor grande.
 *
 * El tamaño decide **el ancho y cuánto enseña**, no el alto. Desde la entrega V el
 * alto lo pone lo que el widget tiene dentro (el mosaico, 0045): antes «grande»
 * era doble alto fijo y «pequeño» un alto mínimo, y un widget de tres líneas al
 * lado de uno de doce se estiraba hasta los doce con un hueco en medio.
 */
export const CLASES_DEL_TAMANO: Readonly<Record<TamanoDeWidget, string>> = {
  chico: 'col-span-1',
  ancho: 'col-span-2',
  grande: 'col-span-2',
};

export const COMO_SE_LLAMA_EL_TAMANO: Readonly<Record<TamanoDeWidget, string>> = {
  chico: 'Pequeño',
  ancho: 'Ancho',
  grande: 'Grande',
};

/**
 * Las columnas del Panel, por lo que mide el Panel y no la pantalla (0083): dos en el
 * móvil, tres desde 46 rem y **cuatro como mucho**, que es lo que deja cada widget del
 * ancho de una tarjeta de verdad. Con el menú a la izquierda, lo que importa es el
 * ancho que le queda al Panel, que cambia al plegar el menú.
 */
export function columnasParaElAncho(anchoEnRem: number): number {
  if (anchoEnRem >= 68) return 4;
  if (anchoEnRem >= 46) return 3;
  return 2;
}

/** Un widget ya colocado: cuántas columnas ocupa en su fila. */
export interface Colocado {
  readonly puesto: WidgetPuesto;
  readonly columnas: number;
}

/**
 * **Filas completas, sin huecos** (las bases firmes, 0084).
 *
 * «Dejan huecos entre ellos y están muy descolocados» (Richi, 14-oct). Era el mosaico
 * medido de la entrega V: filas de cuatro píxeles, cada casilla del alto de lo suyo y
 * el flujo denso rellenando. Con tarjetas de un solo ancho encajaba; con pequeños y
 * anchos mezclados, un pequeño detrás de un ancho se quedaba solo, con media fila en
 * blanco al lado (la merma en el móvil), y las alturas distintas dejaban escalones.
 *
 * Ahora cada fila **se llena entera**, como en la pantalla de inicio de un móvil:
 *
 *   1 · Se van poniendo en su orden. Si el siguiente no cabe en lo que queda de fila,
 *       se busca **más adelante el primero que sí quepa** (un pequeño para el hueco de
 *       un pequeño) y se sube: el orden guardado se respeta todo lo que se puede.
 *   2 · Si no queda ninguno que quepa, **los de la fila se estiran** hasta llenarla,
 *       primero los pequeños: un pequeño solo ocupa la fila entera.
 *   3 · Y las tarjetas de una misma fila **miden lo mismo de alto** (la rejilla las
 *       estira), así que no hay escalones.
 *
 * Es una función pura, aparte, para probarla sin navegador (`rejilla.prueba.ts`).
 */
export function colocarEnFilas(
  puestos: readonly WidgetPuesto[],
  columnas: number,
): readonly Colocado[] {
  const anchoDe = (puesto: WidgetPuesto) =>
    Math.min(CUANTO_OCUPA[puesto.tamano].columnas, columnas);
  const quedan = [...puestos];
  const colocados: Colocado[] = [];

  while (quedan.length > 0) {
    const fila: { puesto: WidgetPuesto; columnas: number }[] = [];
    let libre = columnas;
    for (let i = 0; i < quedan.length && libre > 0;) {
      const puesto = quedan[i];
      if (puesto !== undefined && anchoDe(puesto) <= libre) {
        fila.push({ puesto, columnas: anchoDe(puesto) });
        libre -= anchoDe(puesto);
        quedan.splice(i, 1);
        // Vuelve al principio: lo siguiente en orden es lo primero que se intenta.
        i = 0;
      } else {
        i += 1;
      }
    }
    // Lo que sobra de la fila se reparte, primero entre los pequeños y de uno en uno,
    // para que dos pequeños con tres columnas no queden uno de dos y otro de uno.
    const porOrdenDeEstirar = [...fila].sort((a, b) => a.columnas - b.columnas);
    for (let k = 0; libre > 0 && porOrdenDeEstirar.length > 0; k += 1) {
      const cual = porOrdenDeEstirar[k % porOrdenDeEstirar.length];
      if (cual === undefined) break;
      cual.columnas += 1;
      libre -= 1;
    }
    colocados.push(...fila);
  }
  return colocados;
}

/** Las clases de la rejilla: las columnas las pone su estilo, que las mide. */
export const CLASES_DE_LA_REJILLA = 'grid gap-e3 @min-[46rem]:gap-e4';
