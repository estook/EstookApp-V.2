import type {
  ComoVaLaFacturacion,
  EstadoDeLaAutorizacion,
  HaciendaForal,
  NifEnHacienda,
  TerritorioDelLocal,
  TipoDeSerie,
} from '@estook/dominio';

/**
 * Lo que cuenta el servidor de la facturación del local (T6 · 1, decisión 0126): la consulta
 * `mi_facturacion` y lo que devuelven sus comandos. La forma la decide el servidor
 * (`servidor/aplicacion/comandos/facturacion.ts`); aquí solo se lee.
 */

export interface MiFacturacion {
  readonly localId: string;
  readonly nombreDelLocal: string;
  readonly territorio: TerritorioDelLocal;
  readonly conectada: boolean;
  readonly soyElTitular: boolean;
  readonly como: ComoVaLaFacturacion;
  readonly empresa: {
    readonly id: string;
    readonly nif: string;
    readonly nombre: string;
    readonly nombreComercial: string | null;
    readonly persona: 'fisica' | 'juridica';
    readonly calle: string;
    readonly numero: string;
    readonly codigoPostal: string;
    readonly municipio: string;
    readonly provincia: string;
    readonly enSii: boolean | null;
    readonly foral: HaciendaForal | 'no' | null;
    readonly dePruebas: boolean;
    readonly entorno: 'pruebas' | 'real';
    readonly enVerifacti: boolean;
    readonly titular: { readonly id: string; readonly nombre: string } | null;
    readonly autorizacion: {
      readonly estado: EstadoDeLaAutorizacion;
      readonly forma: 'en_linea' | 'con_certificado' | null;
      readonly firmante: string | null;
      readonly empezadaEn: string | null;
      readonly caducaEn: string | null;
      readonly correctaEn: string | null;
      readonly error: string | null;
      readonly miradaEn: string | null;
    };
  } | null;
  readonly series: Readonly<Record<TipoDeSerie, string | null>>;
  readonly propuestas: Readonly<Record<TipoDeSerie, string>>;
  readonly otroPrograma: boolean | null;
  readonly pideTuFactura: boolean;
  readonly otrasEmpresas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly nif: string;
  }[];
  readonly puedenSerTitular: readonly { readonly id: string; readonly nombre: string }[];
  readonly ano: number;
}

export interface ElNifComprobado {
  readonly nif: string;
  readonly persona: 'fisica' | 'juridica';
  readonly enHacienda: NifEnHacienda;
  readonly nombreEnHacienda: string | null;
}

export interface LaAutorizacion {
  readonly estado: EstadoDeLaAutorizacion;
  readonly enlace: string | null;
  readonly caduca: string | null;
  readonly error: string | null;
}
