import { createContext, useContext } from 'react';

/**
 * Abrir la rueda de apps desde dentro de una pantalla (auditoría del 26-sep · 0051).
 *
 * La rueda vive en el esqueleto. En el móvil se abre desde la barra de abajo; pero
 * en una app con cinco destinos (Almacén, con sus Mermas) la barra no lleva «Apps»
 * —sus cinco nombres no cabían—, y el botón se muda a la cabecera de la pantalla.
 * Esto es lo que le deja abrirla.
 */
export const AbrirLaRueda = createContext<(() => void) | null>(null);

export function usarAbrirLaRueda(): (() => void) | null {
  return useContext(AbrirLaRueda);
}
