/**
 * Los códigos de barras, sin navegador (entrega L · el lector, adelantada el 25-sep).
 *
 * Dos preguntas que se hacen en cada lectura, y que se pueden probar sin cámara:
 *
 *   · **¿Es un código de producto de tienda?** Un EAN-13, EAN-8, UPC-A o UPC-E, con
 *     su dígito de control bien. Solo esos se preguntan a Open Food Facts: los
 *     códigos internos de un distribuidor no están, y preguntar por ellos es gastar.
 *   · **¿Lo ha escrito una persona o un lector de mano?** Los lectores USB o
 *     Bluetooth (15–30 €) escriben el código como un teclado, **muy deprisa** y con
 *     un Intro al final. Así se reconocen en cualquier pantalla, sin configurar nada.
 */

/** Lo que se acepta como código: de 4 a 32 cifras o letras, como el campo del producto. */
export function limpiarElCodigo(texto: string): string | null {
  const limpio = texto.trim().replace(/\s+/g, '');
  return /^[0-9A-Za-z-]{4,32}$/.test(limpio) ? limpio : null;
}

/**
 * Si es un EAN-13, EAN-8, UPC-A (12) o UPC-E en su forma de 8, con el dígito de
 * control bien: la suma ponderada 3-1 de derecha a izquierda cierra en múltiplo de
 * diez.
 */
export function esDeTienda(codigo: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(codigo)) return false;
  const cifras = Array.from(codigo, Number);
  const control = cifras.pop() ?? 0;
  const suma = cifras
    .reverse()
    .reduce((total, cifra, i) => total + cifra * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === control;
}

/** Lo más lento que teclea un lector de mano entre dos teclas, en ms. Una persona no baja de ~80. */
export const LO_QUE_TARDA_UN_LECTOR = 45;

/**
 * Si unas teclas, con el instante de cada una, son de un lector de mano: al menos
 * seis caracteres y todas seguidas a menos de {@link LO_QUE_TARDA_UN_LECTOR} ms.
 */
export function esDeUnLector(teclas: readonly { readonly en: number }[]): boolean {
  if (teclas.length < 6) return false;
  for (let i = 1; i < teclas.length; i++) {
    const antes = teclas[i - 1];
    const ahora = teclas[i];
    if (antes === undefined || ahora === undefined) return false;
    if (ahora.en - antes.en > LO_QUE_TARDA_UN_LECTOR) return false;
  }
  return true;
}
