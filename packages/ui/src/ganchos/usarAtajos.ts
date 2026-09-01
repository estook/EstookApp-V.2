import { useEffect } from 'react';

/**
 * Los atajos de escritorio · Parte B5 del Plan.
 *
 * «`⌘K` buscador universal · `⌘1`–`⌘8` apps · `⌘G` genera el PDF de la pantalla ·
 * `⌘J` Fogon · `Esc` cierra hoja o panel.»
 *
 * Se escuchan en la ventana y no en un componente, porque un atajo tiene que
 * funcionar con el foco donde sea. `Esc` no esta aqui: lo resuelve `<dialog>`
 * por su cuenta, que es una razon mas para haber usado `<dialog>` en las hojas,
 * los paneles, la rueda y el buscador.
 *
 * En Windows y Linux es `Ctrl`; en Mac, `⌘`. Se aceptan los dos sin preguntar
 * por el sistema: quien tenga las dos teclas puede usar cualquiera, y nadie se
 * queda fuera por una deteccion mal hecha.
 */
export interface Atajos {
  readonly alBuscar: () => void;
  /** Del 1 al 8, en el orden de la rueda. */
  readonly alIrAApp: (numero: number) => void;
  readonly alGenerarPdf?: () => void;
  readonly alAbrirFogon?: () => void;
}

export function usarAtajos({ alBuscar, alIrAApp, alGenerarPdf, alAbrirFogon }: Atajos): void {
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (!evento.ctrlKey && !evento.metaKey) return;
      if (evento.altKey) return;

      // Escribiendo no se roban las teclas: `Ctrl+A` dentro de un campo es
      // «seleccionar todo», y el numero es un numero.
      const donde = document.activeElement;
      const escribiendo =
        donde instanceof HTMLInputElement ||
        donde instanceof HTMLTextAreaElement ||
        (donde instanceof HTMLElement && donde.isContentEditable);

      // `Ctrl+K` si se roba aunque se este escribiendo: es como se sale de un
      // campo para buscar otra cosa, y es lo que hace todo el mundo.
      if (evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        alBuscar();
        return;
      }

      if (escribiendo) return;

      const numero = Number.parseInt(evento.key, 10);
      if (numero >= 1 && numero <= 8) {
        evento.preventDefault();
        alIrAApp(numero);
        return;
      }

      if (evento.key.toLowerCase() === 'g' && alGenerarPdf) {
        evento.preventDefault();
        alGenerarPdf();
        return;
      }

      if (evento.key.toLowerCase() === 'j' && alAbrirFogon) {
        evento.preventDefault();
        alAbrirFogon();
      }
    };

    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
    };
  }, [alBuscar, alIrAApp, alGenerarPdf, alAbrirFogon]);
}
