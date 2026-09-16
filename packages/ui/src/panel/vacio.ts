import { createContext } from 'react';

/**
 * Cómo avisa un widget de que ahora mismo no tiene nada que enseñar (M7, 0039).
 *
 * «Quitar cuadrados si están vacíos.» Quien sabe si un widget está vacío es **el
 * widget**: la rejilla no sabe qué hay dentro, y no debe saberlo —si lo supiera,
 * cada widget nuevo obligaría a tocarla—. Así que cada casilla le da a su widget
 * esta función, y el widget la llama con lo que sabe.
 *
 * Nulo fuera de una rejilla: el mismo widget se puede pintar suelto, y entonces
 * no hay a quién avisar.
 */
export const AvisoDeVacio = createContext<((vacio: boolean) => void) | null>(null);
