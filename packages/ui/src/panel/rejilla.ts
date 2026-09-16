import type { ReactNode } from 'react';
import type { TamanoDeWidget, WidgetPuesto } from './catalogo.ts';

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

/** Dos columnas en móvil, cuatro en un portátil y seis en un monitor grande. */
export const CLASES_DEL_TAMANO: Readonly<Record<TamanoDeWidget, string>> = {
  chico: 'col-span-1 row-span-1',
  ancho: 'col-span-2 row-span-1',
  // Doble alto, y por eso las filas de la rejilla llevan una altura mínima fija:
  // sin ella, «doble alto» no significa nada.
  grande: 'col-span-2 row-span-2',
};

export const COMO_SE_LLAMA_EL_TAMANO: Readonly<Record<TamanoDeWidget, string>> = {
  chico: 'Pequeño',
  ancho: 'Ancho',
  grande: 'Grande',
};

/**
 * Las clases de la rejilla.
 *
 * ── `dense`, que es la mitad de «quitar cuadrados vacíos» ────────────────────
 *
 * Con un widget ancho detrás de uno pequeño en una fila de dos, el navegador
 * dejaba **un hueco** y bajaba el ancho a la fila siguiente. Con el flujo denso
 * rellena el hueco con el siguiente widget que quepa, que es lo que hace la
 * pantalla de inicio de un móvil. El orden de lectura sigue siendo el de la
 * lista, que es el que se guarda.
 */
export const CLASES_DE_LA_REJILLA =
  'grid grid-flow-row-dense grid-cols-2 gap-e3 [grid-auto-rows:minmax(9.5rem,auto)] lg:grid-cols-4 2xl:grid-cols-6';
