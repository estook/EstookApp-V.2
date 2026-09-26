import { useEffect, useRef } from 'react';
import { esDeUnLector, limpiarElCodigo } from '../lector/codigos.ts';

/**
 * Los lectores de mano, USB o Bluetooth (entrega L).
 *
 * Escriben el código como un teclado —muy deprisa y con un Intro al final—, así que
 * **no hace falta configurar nada**: esta pantalla escucha las teclas, y si llegan
 * seis o más seguidas a velocidad de lector (`esDeUnLector`) y un Intro, es un
 * código. Lo que teclea una persona no llega nunca a esa velocidad.
 *
 * Solo cuando **no se está escribiendo en un campo**: ahí el lector escribe el código
 * dentro, que es lo que se quiere en el buscador o en el campo del código de barras.
 */
export function usarLectorDeMano(alLeer: (codigo: string) => void, activo = true): void {
  const alLeerAhora = useRef(alLeer);
  alLeerAhora.current = alLeer;

  useEffect(() => {
    if (!activo) return;
    let teclas: { tecla: string; en: number }[] = [];

    const alTeclear = (evento: KeyboardEvent) => {
      const donde = evento.target;
      if (
        donde instanceof HTMLInputElement ||
        donde instanceof HTMLTextAreaElement ||
        donde instanceof HTMLSelectElement ||
        (donde instanceof HTMLElement && donde.isContentEditable)
      ) {
        teclas = [];
        return;
      }
      const ahora = performance.now();
      if (evento.key === 'Enter') {
        const codigo = limpiarElCodigo(teclas.map((t) => t.tecla).join(''));
        if (codigo !== null && esDeUnLector(teclas)) {
          evento.preventDefault();
          alLeerAhora.current(codigo);
        }
        teclas = [];
        return;
      }
      if (evento.key.length !== 1 || evento.ctrlKey || evento.metaKey || evento.altKey) {
        teclas = [];
        return;
      }
      // Una pausa larga empieza otra lectura: lo de antes era una persona.
      const ultima = teclas[teclas.length - 1];
      if (ultima !== undefined && ahora - ultima.en > 300) teclas = [];
      teclas.push({ tecla: evento.key, en: ahora });
    };

    window.addEventListener('keydown', alTeclear);
    return () => {
      window.removeEventListener('keydown', alTeclear);
    };
  }, [activo]);
}
