import type { CSSProperties } from 'react';
import type { NombreDeDegradado } from './Plegable.tsx';

/**
 * El fondo de un degradado, **con su color base debajo** (la Ampliación, 0153).
 *
 * El degradado es una imagen; el color base, su tono más claro, que es donde va el texto. Con
 * los dos, el texto se mide contra su fondo de verdad (`contraste-de-los-temas.spec.ts`) y se
 * sigue leyendo si un navegador no pinta el degradado. Se usa en todo lo que lleva texto encima;
 * un icono suelto puede ir solo con el degradado.
 */
export function fondoDegradado(nombre: NombreDeDegradado): CSSProperties {
  return {
    backgroundColor: `var(--base-${nombre})`,
    backgroundImage: `var(--degradado-${nombre})`,
  };
}
