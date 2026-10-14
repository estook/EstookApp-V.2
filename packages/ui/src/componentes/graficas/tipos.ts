/**
 * Lo que entra en una gráfica viva (la experiencia, 0083).
 *
 * Un punto por día (o por lo que sea el eje): su nombre corto, su valor y, si se
 * quiere, una línea más para el bocadillo. `null` es «ese día no hay dato», que no
 * es lo mismo que cero: la línea se corta en vez de caer al suelo.
 */
export interface PuntoDeGrafica {
  /** Lo que se lee en el eje y en el bocadillo: «14 oct». */
  readonly etiqueta: string;
  readonly valor: number | null;
  /** Una línea más en el bocadillo: «3 tickets», «sin cerrar». */
  readonly detalle?: string;
}

export type FormaDeLaGraficaViva = 'area' | 'barras';

export interface GraficaVivaProps {
  /** Lo que dice un lector de pantalla, y el título de la tabla escondida. */
  readonly titulo: string;
  readonly puntos: readonly PuntoDeGrafica[];
  readonly forma: FormaDeLaGraficaViva;
  /** El color de la serie: el acento de su app. */
  readonly color: string;
  readonly formato: (valor: number) => string;
  readonly alto: number;
  /**
   * Con ejes y rejilla: la grande, la del detalle. Sin ellos, la del widget, que es
   * una línea con su dato al pasar por encima y nada más.
   */
  readonly conEjes?: boolean;
  /** Una línea de referencia: la media del periodo, o el objetivo. */
  readonly referencia?: { readonly valor: number; readonly nombre: string } | null;
  /** El último punto resaltado: es «hoy», el que más se mira. */
  readonly resaltarElUltimo?: boolean;
  /**
   * El periodo anterior, alineado con `puntos` (0084): la línea gris discontinua, para
   * comparar sin leer números.
   */
  readonly anteriores?: readonly (number | null)[] | undefined;
  /**
   * Qué día señala el dedo o el ratón (la pequeña, 0084). Si se da, quien la pinta
   * enseña el valor (el widget cambia su número grande); si no, lo dice la propia
   * gráfica dentro de su hueco.
   */
  readonly alSenalar?: (indice: number | null) => void;
}
