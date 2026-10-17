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

/*
 * ── Y la misma marca, en la página (repaso del 16-oct, punto 8) ─────────────
 *
 * Lo de la rueda pasaba en todas partes: al abrir una ficha, `showModal()` da el
 * foco a la «X» de cerrar, y el iPhone —y el ordenador, al hacer clic— lo pinta como
 * si se hubiera llegado con el teclado. «Un cuadrado naranja que sale al tocar con el
 * dedo», dijo Richi. Con el dedo, `<html data-con-el-dedo>`, y `base.css` no pinta el
 * anillo; con la primera tecla se quita y el anillo vuelve, que es B8.
 */
function marcar(conElDedo: boolean) {
  if (conElDedo) document.documentElement.dataset['conElDedo'] = '';
  else delete document.documentElement.dataset['conElDedo'];
}

if (typeof document !== 'undefined') {
  // En captura, para enterarse aunque alguien pare la propagación por el camino.
  document.addEventListener(
    'keydown',
    (evento) => {
      // Escribir en un campo no es recorrer la app con el teclado: el móvil manda teclas.
      const donde = evento.target;
      if (
        evento.key !== 'Tab' &&
        donde instanceof HTMLElement &&
        (donde.isContentEditable || donde.matches('input, textarea, select'))
      ) {
        return;
      }
      ultimaFueTeclado = true;
      marcar(false);
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    () => {
      ultimaFueTeclado = false;
      marcar(true);
    },
    true,
  );
}

export function seEstaUsandoElTeclado(): boolean {
  return ultimaFueTeclado;
}
