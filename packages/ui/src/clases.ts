/**
 * Juntar clases sin traer una dependencia para ello.
 *
 * Es lo que hacen `clsx` o `classnames`, en ocho lineas. Traer un paquete para
 * esto seria una dependencia nueva sin justificar (E1).
 *
 * Lo falso se cae: `undefined`, `null`, `false` y la cadena vacia. Asi se puede
 * escribir `clases('boton', activo && 'boton-activo')` sin ternarios.
 */
export function clases(...partes: readonly (string | false | null | undefined)[]): string {
  return partes.filter(Boolean).join(' ');
}
