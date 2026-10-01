import { useQuery } from '@tanstack/react-query';
import type { CuandoSuena } from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';

/** Este móvil y cuándo suena (I · 0070): lo de `mi_movil`. */
export interface MiMovil {
  readonly encendido: boolean;
  readonly clavePublica: string | null;
  readonly moviles: readonly {
    readonly id: string;
    readonly aparato: string | null;
    readonly desde: string;
    readonly ultimoUso: string | null;
  }[];
  readonly cuandoSuena: {
    readonly modo: CuandoSuena;
    readonly desde: string;
    readonly hasta: string;
    readonly deFabrica: boolean;
    readonly tieneHorario: boolean;
  };
}

export const CLAVE_DE_MI_MOVIL = ['mi_movil'] as const;

export function usarMiMovil() {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: CLAVE_DE_MI_MOVIL,
    queryFn: async (): Promise<MiMovil> => {
      const respuesta = await cliente.consultar<MiMovil>('mi_movil', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}
