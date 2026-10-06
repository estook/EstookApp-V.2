import { useSyncExternalStore } from 'react';
import { laCola, suscribirseALaCola, type PorMandar } from '../chat/porMandar.ts';

/** Lo escrito en un canal que todavía va de camino (`chat/porMandar.ts`), en orden. */
export function usarPorMandar(canalId: string): readonly PorMandar[] {
  const todos = useSyncExternalStore(suscribirseALaCola, laCola);
  return todos.filter((p) => p.canalId === canalId);
}
