import { useState } from 'react';
import { racionesRedondeadas } from '@estook/dominio';

/**
 * Para cuántas raciones se mira la ficha técnica (M9 · 3, 0092): el estado de
 * `ParaCuantasRaciones` y de «Lo que lleva».
 *
 * El estado es **cuántas raciones** se quieren; el factor sale de ahí. Así, tocar un
 * ingrediente deja un número de raciones que se puede leer («para 12,5 raciones»).
 */
export function usarEscala(escrita: number) {
  // Nulo es «como está escrita»: así, si la ficha llega después (o cambia su tanda), se
  // sigue leyendo bien en vez de quedarse con las raciones de antes.
  const [elegidas, setElegidas] = useState<number | null>(null);
  const raciones = elegidas ?? escrita;
  const poner = (n: number) => {
    const acotadas = Math.min(Math.max(n, 0.5), 1000);
    setElegidas(acotadas === escrita ? null : acotadas);
  };
  return {
    raciones,
    factor: raciones / Math.max(escrita, 1),
    ponerRaciones: poner,
    ponerFactor: (factor: number) => {
      poner(racionesRedondeadas(factor * escrita, 1));
    },
    comoEstaEscrita: elegidas === null,
    volver: () => {
      setElegidas(null);
    },
  };
}
