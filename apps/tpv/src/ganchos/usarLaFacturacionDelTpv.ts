import { useQuery } from '@tanstack/react-query';
import type { ComoVaLaFacturacion, ModalidadDeFacturacion } from '@estook/dominio';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala } from './usarLaSala.ts';

/** Cómo va la facturación del local, para los Ajustes del TPV (0127): `mi_facturacion`. */
export interface LaFacturacionEnElTpv {
  readonly como: ComoVaLaFacturacion;
  readonly empresa: {
    readonly nombre: string;
    readonly enSii: boolean | null;
    readonly modalidad: ModalidadDeFacturacion;
    readonly entorno: 'pruebas' | 'real';
  } | null;
}

export function usarLaFacturacionDelTpv() {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['mi_facturacion', 'tpv'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<LaFacturacionEnElTpv>('mi_facturacion');
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
  });
}
