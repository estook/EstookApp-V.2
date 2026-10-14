import { createContext } from 'react';

/**
 * Dentro de una hoja, las tarjetas van **sin marco** (las bases firmes, 0084): la hoja
 * ya es el marco y dice el título. Lo que lleva es el título de la hoja, para no
 * repetirlo; las demás tarjetas de dentro conservan el suyo, como subtítulo.
 *
 * Es lo que deja abrir cualquier ajuste en su hoja (Ajustes, 0084) sin reescribir la
 * tarjeta de cada uno: la misma pieza sirve suelta y dentro.
 */
export const DentroDeUnaHoja = createContext<string | null>(null);
