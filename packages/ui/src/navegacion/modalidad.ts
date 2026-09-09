/**
 * Con qué se está manejando la aplicación ahora mismo: teclado o dedo.
 *
 * ── Por qué hace falta esto, si el navegador ya lo sabe ──────────────────────
 *
 * Porque lo que el navegador sabe se llama `:focus-visible`, y **deja de saberlo
 * cuando el foco se pone desde el código**. Esa es exactamente la situación de la
 * rueda de apps: se abre con el dedo, y al abrirse la aplicación le da el foco al
 * lienzo para poder escuchar las flechas. En iOS eso pinta el anillo naranja de
 * foco, así que **al tocar la rueda salía un rectángulo naranja alrededor de un
 * círculo**. Lo vio Richi en su teléfono.
 *
 * Aquí se mira lo mismo que mira el navegador —cuál fue la última entrada— pero
 * sin depender de cómo llegó el foco. Dos escuchas pasivas en la fase de captura,
 * registradas una sola vez, y una pregunta.
 *
 * ── Y por qué no se apaga el anillo y ya ────────────────────────────────────
 *
 * Porque «foco visible siempre» es B8 y no se negocia. Quien recorre Estook con
 * el teclado tiene que ver dónde está, y en la rueda **lo que se ve es el sector
 * resaltado** —naranja suave, borde de acento, icono más grande—, que es lo que
 * manda el patrón `aria-activedescendant`. El anillo del lienzo hace falta
 * mientras no haya ningún sector resaltado, que es lo que pasa al abrirla desde
 * el Panel: si no, quien llega con el teclado no ve el foco en ninguna parte.
 */
let ultimaFueTeclado = false;

if (typeof document !== 'undefined') {
  // En captura, para enterarse aunque alguien pare la propagación por el camino.
  document.addEventListener(
    'keydown',
    () => {
      ultimaFueTeclado = true;
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    () => {
      ultimaFueTeclado = false;
    },
    true,
  );
}

export function seEstaUsandoElTeclado(): boolean {
  return ultimaFueTeclado;
}
