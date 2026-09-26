import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El Tablón del local (repaso del 25-sep · decisión 0049): las notas del equipo de
 * hoy y de la semana que viene, cada una con si ya la has leído.
 */
export interface NotaDelTablon {
  readonly id: string;
  readonly texto: string;
  readonly zona: 'cocina' | 'sala' | null;
  readonly dia: string;
  readonly cuando: string;
  readonly hora: string | null;
  readonly autor: string;
  readonly esMia: boolean;
  readonly leida: boolean;
  readonly puedeQuitarla: boolean;
  readonly lectura: {
    readonly leidas: number;
    readonly quien: readonly string[];
    readonly faltan: readonly string[] | null;
  } | null;
}

export interface ElTablon {
  readonly hoy: string;
  readonly notas: readonly NotaDelTablon[];
}

export const CLAVE_DEL_TABLON = ['el_tablon'] as const;

export function usarElTablon(): UseQueryResult<ElTablon> {
  const { cliente, yo } = usarSesion();
  return useQuery({
    queryKey: CLAVE_DEL_TABLON,
    enabled: yo?.local !== null && yo?.local !== undefined,
    queryFn: async (): Promise<ElTablon> => {
      const respuesta = await cliente.consultar<ElTablon>('el_tablon', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}
