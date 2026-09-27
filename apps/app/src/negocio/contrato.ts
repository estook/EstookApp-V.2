import type {
  CifraDelSemaforo,
  Indicador,
  LasTresFrases,
  PeriodoDelInforme,
  TipoDeInforme,
} from '@estook/dominio';

/**
 * Lo que devuelven `mi_informe` y `mi_nota_en_google` (R2 · 0053). La forma la da
 * el servidor (`consultas/informes.ts` y `consultas/local-en-google.ts`); aquí se
 * repite lo que la pantalla lee, como el resto de contratos de la app.
 */
export interface CifraDelInforme {
  readonly indicador: Indicador;
  readonly total: number | null;
  readonly anterior: number | null;
  readonly diasConDato: number;
  readonly serie: readonly { readonly fecha: string; readonly valor: number | null }[];
}

export interface ElInforme {
  readonly tipo: TipoDeInforme;
  readonly titulo: string;
  readonly periodo: PeriodoDelInforme;
  readonly anteriorDel: string | null;
  readonly siguienteDel: string | null;
  readonly cifras: readonly CifraDelInforme[];
  readonly frases: LasTresFrases;
  readonly semaforo: readonly CifraDelSemaforo[] | null;
}

export interface MiNotaEnGoogle {
  readonly conectado: boolean;
  readonly nota: {
    readonly nombre: string | null;
    readonly valoracion: number | null;
    readonly resenas: number | null;
    readonly mapa: string | null;
    readonly leidaEn: string;
  } | null;
  readonly evolucion: readonly {
    readonly dia: string;
    readonly valoracion: number;
    readonly resenas: number | null;
  }[];
  readonly puedeEnlazarlo: boolean;
}
