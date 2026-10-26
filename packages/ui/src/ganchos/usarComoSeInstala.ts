import { useSyncExternalStore } from 'react';
import { alCambiarComoSeInstala, comoSeInstalaAhora, type ComoSeInstala } from './instalar.ts';

/** Cómo se instala la app en este aparato, y se vuelve a pintar cuando cambia (0070). */
export function usarComoSeInstala(): ComoSeInstala {
  return useSyncExternalStore(alCambiarComoSeInstala, comoSeInstalaAhora, () => 'no');
}
