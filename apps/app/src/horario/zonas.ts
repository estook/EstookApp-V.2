import type { CSSProperties } from 'react';
import type { Zona } from './contrato.ts';

/**
 * Los colores de cada zona del horario (la Ampliación 4 · 1, 0153): la sala en verde, la cocina
 * en ámbar con su texto oscuro, el resto en violeta. Los degradados viven en `temas.css`.
 */
export const ZONA: Readonly<
  Record<Zona, { readonly fondo: string; readonly texto: string; readonly letra: string }>
> = {
  sala: { fondo: 'var(--degradado-sala)', texto: '#ffffff', letra: 'S' },
  cocina: { fondo: 'var(--degradado-cocina)', texto: 'var(--texto-sobre-cocina)', letra: 'C' },
  otros: { fondo: 'var(--degradado-resto)', texto: '#ffffff', letra: 'R' },
};

export function estiloDeLaZona(zona: Zona): CSSProperties {
  return { background: ZONA[zona].fondo, color: ZONA[zona].texto };
}
