import { createContext } from 'react';

/** Qué widget se está pintando: el marco saca de aquí su color y su icono. */
export const QuienSePinta = createContext<string | null>(null);
