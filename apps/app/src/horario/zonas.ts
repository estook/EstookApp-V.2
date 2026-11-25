import type { CSSProperties } from 'react';
import { fondoDegradado, type NombreDeDegradado } from '@estook/ui';
import type { Zona } from './contrato.ts';

/**
 * Los colores de cada zona del horario (la Ampliación 4 · 1, 0153): la sala en verde, la cocina
 * en ámbar con su texto oscuro, el resto en violeta. Los degradados viven en `temas.css`.
 */
export const ZONA: Readonly<
  Record<
    Zona,
    {
      readonly degradado: NombreDeDegradado;
      readonly fondo: string;
      readonly texto: string;
      readonly letra: string;
    }
  >
> = {
  sala: { degradado: 'sala', fondo: 'var(--degradado-sala)', texto: '#ffffff', letra: 'S' },
  cocina: {
    degradado: 'cocina',
    fondo: 'var(--degradado-cocina)',
    texto: 'var(--texto-sobre-cocina)',
    letra: 'C',
  },
  otros: { degradado: 'resto', fondo: 'var(--degradado-resto)', texto: '#ffffff', letra: 'R' },
};

/** El fondo de la zona, con su base debajo, y su color de texto: para lo que lleva texto. */
export function estiloDeLaZona(zona: Zona): CSSProperties {
  return { ...fondoDegradado(ZONA[zona].degradado), color: ZONA[zona].texto };
}
