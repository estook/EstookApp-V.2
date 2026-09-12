import { useEffect, useState } from 'react';

/**
 * Lo que se teclea, pero esperando a que se deje de teclear (M7, repaso).
 *
 * ── Para qué ────────────────────────────────────────────────────────────────
 *
 * Desde el repaso, buscar en el libro de movimientos **pregunta al servidor**, que
 * es lo que hace que encuentre lo de hace tres meses y no solo lo que ya estaba en
 * pantalla. Sin esto sería un viaje por cada letra: siete peticiones para escribir
 * «aceite», y las siete llegando desordenadas.
 *
 * Trescientas milésimas es el tiempo que se tarda en dejar de teclear sin que se
 * note la espera. Va como parámetro porque una lista corta puede permitirse menos.
 */
export function usarQueEspere<T>(valor: T, milisegundos = 300): T {
  const [esperado, setEsperado] = useState(valor);

  useEffect(() => {
    const reloj = setTimeout(() => {
      setEsperado(valor);
    }, milisegundos);
    return () => {
      clearTimeout(reloj);
    };
  }, [valor, milisegundos]);

  return esperado;
}
