import type { CifraDelSemaforo, ClaveDeObjetivo, CosaDeHoy } from '@estook/dominio';

/**
 * Lo que devuelven `mis_objetivos` y `lo_de_hoy` (entrega O · 0047). La forma la
 * da el servidor (`consultas/objetivos.ts` y `consultas/hoy.ts`); aquí se repite
 * lo que la pantalla lee, como el resto de contratos de la app.
 */
export interface ObjetivoPuesto {
  readonly clave: ClaveDeObjetivo;
  readonly valor: number | null;
  readonly importeCentimos: number | null;
  readonly dePartida: boolean;
  readonly desde: string;
}

export interface MisObjetivos {
  readonly desde: string;
  readonly hasta: string;
  readonly cifras: readonly CifraDelSemaforo[];
  readonly puestos: readonly ObjetivoPuesto[] | null;
  readonly puedeCambiarlos: boolean;
  readonly propuestaDeVentas: number | null;
  readonly loNormal: Readonly<Partial<Record<ClaveDeObjetivo, string>>>;
}

export interface LoDeHoy {
  readonly hoy: string;
  readonly cosas: readonly CosaDeHoy[];
}
