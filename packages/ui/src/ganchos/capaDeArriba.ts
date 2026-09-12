import { useSyncExternalStore } from 'react';

/**
 * La capa de arriba · dónde se pinta lo que tiene que verse **por encima de todo**.
 *
 * ── El fallo que esto arregla, y cómo se encontró ───────────────────────────
 *
 * La barra de «Deshacer» se pinta al final de la página con `position: fixed` y
 * `z-50`. Y aun así **no se podía pulsar con una hoja o un panel abiertos**: la
 * prueba de pantalla intentó pulsarla veinte veces y el navegador contestó, cada
 * vez, «el diálogo intercepta los eventos del puntero».
 *
 * No es un problema de `z-index` y no se arregla subiéndolo. Un `<dialog>` abierto
 * con `showModal()` se pinta en **la capa superior** del navegador, que está por
 * encima de toda la página pase lo que pase, y su `::backdrop` se traga los
 * clics. Es exactamente lo que hace que un diálogo modal sea modal, y es bueno.
 *
 * Lo malo era lo otro: **el momento en que hace falta deshacer es justo ese**.
 * Se corrige la ficha de un producto en una hoja, se guarda, la hoja se cierra…
 * y el panel de la ficha sigue abierto. La barra aparecía debajo, se veía en la
 * captura y no se podía pulsar. Un deshacer que no se puede pulsar es peor que no
 * tenerlo, porque se ve.
 *
 * ── Cómo funciona ───────────────────────────────────────────────────────────
 *
 * Una pila: cada hoja o panel que se abre se apunta, y se borra al cerrarse. Lo
 * que quiera estar por encima de todo pregunta por el último y se pinta **dentro
 * de él**, que es la única forma de entrar en la capa superior sin ser uno mismo
 * un diálogo modal —y serlo bloquearía la pantalla, que es lo contrario de lo que
 * hace una barra que se va sola—.
 *
 * Sin nada abierto no hay pila, y se pinta donde siempre.
 */
const pila: HTMLElement[] = [];
const oyentes = new Set<() => void>();

function avisar() {
  for (const oyente of oyentes) oyente();
}

/** Apunta un diálogo recién abierto. Devuelve cómo borrarlo. */
export function entraEnLaCapaDeArriba(donde: HTMLElement): () => void {
  pila.push(donde);
  avisar();

  return () => {
    const cual = pila.lastIndexOf(donde);
    if (cual !== -1) pila.splice(cual, 1);
    avisar();
  };
}

function elDeArriba(): HTMLElement | null {
  return pila[pila.length - 1] ?? null;
}

/**
 * El último diálogo abierto, o nulo si no hay ninguno.
 *
 * Con `useSyncExternalStore` y no con un estado propio: la pila la mueven los
 * diálogos al abrirse y cerrarse, que es fuera de React, y esto es exactamente
 * para lo que existe ese gancho.
 */
export function usarLaCapaDeArriba(): HTMLElement | null {
  return useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
    elDeArriba,
    // En el servidor no hay diálogos, y este paquete se pinta también al generar
    // la web: sin esto, la primera pasada buscaría el DOM y no habría ninguno.
    () => null,
  );
}
