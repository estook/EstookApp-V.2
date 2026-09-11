/**
 * Tres utilidades de Compras que no pintan nada (M7).
 *
 * Viven aparte de los componentes para que el recargado en caliente de Vite siga
 * funcionando en `Comun.tsx`: un fichero que exporta componentes y funciones a la
 * vez obliga a recargar la página entera en cada cambio.
 */

/**
 * Imprime un texto suelto, en una hoja limpia.
 *
 * ── Por qué no `window.print()` de la pantalla ───────────────────────────────
 *
 * Porque el pedido está **dentro de una ficha**, que es un `<dialog>` modal, y lo
 * que sale al imprimir la página con un diálogo abierto depende del navegador:
 * en unos sale la lista de detrás, en otros una hoja en blanco. Una ventana nueva
 * con solo el texto sale igual en todos, y es lo que se le da al comercial que
 * pasa a por el pedido.
 *
 * Se construye con el DOM y `textContent`, no escribiendo HTML: así no hay nada
 * que escapar, y un producto que se llame «<b>» sale tal cual.
 *
 * Devuelve falso si el navegador no dejó abrir la ventana, para decirlo.
 */
export function imprimirTexto(titulo: string, texto: string): boolean {
  // Sin `noopener`: con él, `window.open` devuelve nulo y no se puede escribir
  // en la ventana. Es una hoja en blanco nuestra, no una página de fuera.
  const ventana = window.open('', '_blank', 'width=720,height=900');
  if (ventana === null) return false;

  const documento = ventana.document;
  documento.title = titulo;
  documento.documentElement.lang = 'es';

  const estilo = documento.createElement('style');
  estilo.textContent = [
    "body { font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 2.5rem; color: #1b1b1b; }",
    'h1 { font-size: 1.25rem; margin: 0 0 1.5rem; }',
    'pre { font: inherit; white-space: pre-wrap; margin: 0; }',
  ].join('\n');
  documento.head.append(estilo);

  const cabecera = documento.createElement('h1');
  cabecera.textContent = titulo;
  const cuerpo = documento.createElement('pre');
  cuerpo.textContent = texto;
  documento.body.append(cabecera, cuerpo);

  ventana.focus();
  ventana.print();
  return true;
}

/** Copia un texto. Devuelve falso si el navegador no deja. */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

/**
 * Un número escrito a mano, con coma o con punto.
 *
 * Nulo si no hay nada escrito o no es un número: el campo vacío es «no lo sé»,
 * que no es lo mismo que cero.
 */
export function numeroEscrito(escrito: string): number | null {
  const limpio = escrito.trim().replace(',', '.');
  if (limpio === '') return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}
