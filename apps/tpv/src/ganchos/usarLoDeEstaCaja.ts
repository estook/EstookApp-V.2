import { useQuery } from '@tanstack/react-query';
import type { ComoEstaElCentro } from '@estook/impresion';
import { laCajaParaWindows } from '../datos/laCajaParaWindows.ts';

/**
 * **La caja de centro, vista desde su propia pantalla** (T5 · 2 · 2 · 2, 0124): si escucha, si
 * espera a que la pantalla avise antes de que Windows pregunte, y lo que dice Windows. Fuera de
 * la caja para Windows, nulo.
 */
export function usarLoDeEstaCaja(): ComoEstaElCentro | null {
  const caja = laCajaParaWindows();
  const lo = useQuery({
    queryKey: ['la_caja_de_centro'],
    queryFn: async () => (await caja?.elCentro?.()) ?? null,
    enabled: caja?.elCentro !== undefined,
    refetchInterval: 30_000,
    // Al volver de cambiarlo en Windows, se actualiza solo.
    refetchOnWindowFocus: true,
  });
  return lo.data ?? null;
}
