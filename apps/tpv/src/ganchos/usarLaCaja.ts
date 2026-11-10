import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';
import { FalloDeLaSala } from './usarLaSala.ts';
import type { LaCajaDelAparato } from '../caja/tipos.ts';

/**
 * **La caja de este aparato** (0144): si está abierta, lo que se propone al abrir, los ajustes y lo
 * que puede hacer quien está. Se relee al cambiar algo de la caja, y cada medio minuto por si la
 * abrió o la cerró otro aparato con el mismo cajón.
 */
export function usarLaCaja() {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['caja', 'la_caja'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<LaCajaDelAparato>('la_caja', {});
      if (!respuesta.ok) throw new FalloDeLaSala(respuesta.error);
      return respuesta.datos;
    },
    refetchInterval: 30_000,
  });
}

/** Lo de la caja y la sala, otra vez: después de abrir, cobrar, mover dinero o cerrar. */
export function usarRecargarLaCaja(): () => Promise<void> {
  const cache = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['caja'] }),
      cache.invalidateQueries({ queryKey: ['sala'] }),
    ]);
  }, [cache]);
}

/** Si el fallo pide el PIN de un encargado (`lo_aprueba_un_encargado`). */
export function pideEncargado(error: ErrorDeLaApi | null): boolean {
  return error?.codigo === 'lo_aprueba_un_encargado';
}

/** Un id para lo que nace en el aparato: repetir el mismo toque no hace dos cosas (0121). */
export function idNuevo(): string {
  return crypto.randomUUID();
}
