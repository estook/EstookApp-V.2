import type { ReactNode } from 'react';
import type { TamanoDeWidget, WidgetPuesto } from './catalogo.ts';
import { CLASES_DEL_MOSAICO } from '../componentes/Mosaico.tsx';

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
 * Las clases de la rejilla.
 *
 * ── `dense`, que es la mitad de «quitar cuadrados vacíos» ────────────────────
 *
 * Con un widget ancho detrás de uno pequeño en una fila de dos, el navegador
 * dejaba **un hueco** y bajaba el ancho a la fila siguiente. Con el flujo denso
 * rellena el hueco con el siguiente widget que quepa, que es lo que hace la
 * pantalla de inicio de un móvil. El orden de lectura sigue siendo el de la
 * lista, que es el que se guarda.
 *
 * ── Y el mosaico, que es la otra mitad (entrega V, 0045) ─────────────────────
 *
 * Las filas son de cuatro píxeles y cada casilla dice cuántas ocupa, medido. Con
 * el flujo denso, eso coloca cada widget debajo del más corto: el Panel se
 * encaja como un iPad y no por filas del alto del más alto.
 */
export const CLASES_DE_LA_REJILLA = `${CLASES_DEL_MOSAICO} grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6`;
