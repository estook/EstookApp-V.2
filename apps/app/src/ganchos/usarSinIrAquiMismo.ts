import { useLocation } from 'react-router-dom';

/**
 * **Nunca se ofrece ir a donde ya estás.** Devuelve si una dirección lleva a otra
 * pantalla, sin contar el ancla (`#objetivos`).
 *
 * Sin cifra de ventas, el semáforo propone «Poner tus objetivos», que en el Panel
 * lleva a Ajustes; en Ajustes, en la tarjeta de los objetivos, era un botón que no
 * iba a ningún sitio (25-sep).
 */
export function usarSinIrAquiMismo(): (ir: string) => boolean {
  const { pathname } = useLocation();
  return (ir) => ir.split('#')[0] !== pathname;
}
