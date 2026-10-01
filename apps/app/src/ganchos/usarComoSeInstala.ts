import { useSyncExternalStore } from 'react';
import {
  alCambiarComoSeInstala,
  comoSeInstalaAhora,
  type ComoSeInstala,
} from '../sinConexion/instalar.ts';

/** Cómo se instala Estook en este aparato, y se vuelve a pintar cuando cambia (0070). */
export function usarComoSeInstala(): ComoSeInstala {
  return useSyncExternalStore(alCambiarComoSeInstala, comoSeInstalaAhora, () => 'no');
}
