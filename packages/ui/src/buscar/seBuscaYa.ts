/**
 * Si lo escrito se pregunta al servidor: con sus letras, o un número suelto («7» es el
 * pedido 7, 0085). Lo mismo que acepta la API (`sePuedeBuscar`).
 */
export function seBuscaYa(escrito: string, minimoDeLetras = 2): boolean {
  const texto = escrito.trim();
  return texto.length >= minimoDeLetras || /^[0-9]$/.test(texto);
}
