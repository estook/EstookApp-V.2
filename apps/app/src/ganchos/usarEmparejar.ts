import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Emparejar una línea de la caja con un producto, descartarla o quitar lo dicho
 * (M8 · 0079). Lo comparten la hoja de emparejar y la lista de lo ya dicho, y las dos
 * refrescan la desviación al acabar.
 */
export function usarEmparejar() {
  const { cliente } = usarSesion();
  const cache = useQueryClient();
  const [error, setError] = useState<ErrorDeLaApi | null>(null);
  const [haciendo, setHaciendo] = useState<string | null>(null);

  async function hacer(cual: string, entrada: Record<string, unknown>): Promise<boolean> {
    setHaciendo(cual);
    setError(null);
    const respuesta = await cliente.ejecutar('emparejar_concepto', entrada);
    setHaciendo(null);
    if (!respuesta.ok) {
      setError(respuesta.error);
      return false;
    }
    await cache.invalidateQueries({ queryKey: ['la_desviacion'] });
    return true;
  }

  return { hacer, error, haciendo };
}
