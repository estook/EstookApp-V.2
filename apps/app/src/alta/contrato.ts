import type { ClaveDeObjetivo, PasoDelAlta, Progreso, TipoDeLocal } from '@estook/dominio';
import type { ClienteApi, ErrorDeLaApi } from '@estook/cliente-api';

/**
 * Lo que los ocho pasos comparten (M5).
 *
 * Vive aparte para que cada paso sea un fichero que pinta y llama, sin repetir
 * ocho veces la misma firma. Es el espejo de `servidor/aplicacion/alta.ts`, que
 * hace lo mismo del otro lado.
 */

/** Lo que devuelve la consulta `el_alta`. */
export interface ElAltaDelLocal {
  readonly localId: string;
  readonly nombre: string;
  readonly esEjemplo: boolean;

  readonly paso: number;
  readonly saltados: readonly PasoDelAlta[];
  readonly terminado: boolean;
  readonly progreso: Progreso;

  readonly ficha: {
    readonly tipo: TipoDeLocal | null;
    readonly direccion: string | null;
    readonly codigoPostal: string | null;
    readonly poblacion: string | null;
    readonly provincia: string | null;
    readonly telefono: string | null;
    readonly zonaHoraria: string;
    readonly horaDeCorte: string;
    readonly territorio: string;
    readonly regimen: string;
    readonly actividad: string | null;
    readonly epigrafeIae: string | null;
    readonly colorDeMarca: string | null;
    readonly tieneLogo: boolean;
  };

  readonly objetivos: readonly {
    readonly clave: ClaveDeObjetivo;
    readonly valor: number;
    readonly dePartida: boolean;
  }[];

  readonly dePartida: readonly { readonly clave: ClaveDeObjetivo; readonly valor: number }[];

  readonly cuantosLocales: number;
  readonly paraDuplicar: readonly { readonly id: string; readonly nombre: string }[];
  readonly ejemplos: number;
}

/** Lo que recibe cada paso. Ni uno más: un paso pinta y llama (regla 5). */
export interface PropsDeUnPaso {
  readonly alta: ElAltaDelLocal;
  readonly cliente: ClienteApi;
  /** Guardado y a la siguiente. Lo decide el marco, no el paso. */
  readonly alGuardar: () => Promise<void>;
  readonly alFallar: (error: ErrorDeLaApi) => void;
}
