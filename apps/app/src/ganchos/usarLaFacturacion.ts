import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DatosDeLaDeclaracion } from '@estook/ui';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { FalloDeLaApi } from '../datos/FalloDeLaApi.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Lo de la facturación (T6 · 1, decisión 0126): un paso del alta llama a su comando, dice el
 * error y vuelve a leer cómo va; y la declaración responsable de Estook.
 */
export function usarUnPasoDelAlta() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [haciendo, setHaciendo] = useState(false);
  const [error, setError] = useState<ErrorDeLaApi | null>(null);

  async function hacer<T>(nombre: string, entrada: Record<string, unknown>): Promise<T | null> {
    setHaciendo(true);
    setError(null);
    const respuesta = await cliente.ejecutar<T>(nombre, entrada);
    setHaciendo(false);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return null;
    }
    await cache.invalidateQueries({ queryKey: ['mi_facturacion'] });
    return respuesta.datos;
  }

  return { hacer, haciendo, error };
}

export function usarLaDeclaracion() {
  const { cliente } = usarSesion();
  return useQuery({
    queryKey: ['la_declaracion_responsable'],
    queryFn: async () => {
      const respuesta = await cliente.consultar<DatosDeLaDeclaracion>('la_declaracion_responsable');
      if (!respuesta.ok) throw new FalloDeLaApi(respuesta.error);
      return respuesta.datos;
    },
  });
}
