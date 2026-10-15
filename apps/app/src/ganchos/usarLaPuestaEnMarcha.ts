import { useQuery } from '@tanstack/react-query';
import { puedeVer } from '@estook/permisos';
import { usarSesion } from '../sesion/Sesion.tsx';

/** La puesta en marcha del local (0085): lo que pinta `panel/PuestaEnMarcha.tsx`. */
export type PasoDeLaPuestaEnMarcha = 'logo' | 'producto' | 'proveedor' | 'horario' | 'equipo';

export interface LaPuestaEnMarcha {
  readonly pasos: readonly { readonly paso: PasoDeLaPuestaEnMarcha; readonly hecho: boolean }[];
  readonly oculta: boolean;
}

/**
 * La consulta, para quien la necesite: «Termina de configurar» se aparta mientras sale.
 *
 * **Se vuelve a preguntar cada vez que se vuelve al Panel**: se sale de él a dar un
 * paso —crear el producto, invitar a alguien— y al volver tiene que estar marcado. Con
 * el minuto de siempre, el paso recién dado seguía pendiente (lo cazó su prueba).
 */
export function usarLaPuestaEnMarcha() {
  const { cliente, permisos, yo } = usarSesion();
  return useQuery({
    queryKey: ['la_puesta_en_marcha', {}],
    enabled: puedeVer(permisos, 'app.ajustes') && yo?.local !== null && yo?.local !== undefined,
    refetchOnMount: 'always',
    queryFn: async (): Promise<LaPuestaEnMarcha> => {
      const respuesta = await cliente.consultar<LaPuestaEnMarcha>('la_puesta_en_marcha', {});
      if (!respuesta.ok) throw new Error(respuesta.error.codigo);
      return respuesta.datos;
    },
  });
}

/** Si está a la vista: con algo que hacer, y sin apagar. */
export function seEnsena(puesta: LaPuestaEnMarcha | undefined): boolean {
  return puesta !== undefined && !puesta.oculta && puesta.pasos.some((p) => !p.hecho);
}
