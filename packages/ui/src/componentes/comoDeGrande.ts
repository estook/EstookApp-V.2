/**
 * Qué tamaño le toca a una cifra, por lo que ocupa escrita.
 *
 * Los cortes están donde dejan de caber dos cifras juntas en la mitad de un
 * widget de móvil, que es el sitio más estrecho donde vive una `Cifra`. No es una
 * escala nueva: son tres escalones del mismo uso de B2 (ver `fichas.css`).
 */
export function comoDeGrande(escrito: string): string {
  if (escrito.length <= 7) return 'text-cifra';
  if (escrito.length <= 11) return 'text-cifra-media';
  return 'text-cifra-larga';
}
