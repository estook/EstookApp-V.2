import { useEffect, useState, type RefObject } from 'react';
import { altoDeLaPagina } from '@estook/ui';
import { dondeVaElChat, type DondeVaElChat } from '../chat/conElTeclado.ts';

/**
 * El chat abierto: la página de debajo quieta y, con teclado, el sitio exacto
 * (`chat/conElTeclado.ts`). Solo en el móvil; en el ordenador no hay teclado que
 * empuje nada.
 *
 * ── Y se vuelve a mirar, como lo de abajo (9-oct) ────────────────────────────
 *
 * Richi, con el iPhone: «al escribir en el chat se tapa la caja de texto y se sube
 * hasta tapar incluso los mensajes». WebKit avisa a mitad de la animación del teclado
 * y corrige las medidas después, a veces sin volver a avisar. Por eso, con cada aviso,
 * se vuelve a mirar **en cada fotograma durante un segundo**, que es lo que tarda el
 * teclado en acabar de subir o bajar, y también al entrar y salir de un campo.
 *
 * ── Y lo que faltaba (10-oct) ────────────────────────────────────────────────
 *
 * Que el teclado no se veía nunca: se medía la página con `window.innerHeight`, que en
 * el iPhone encoge con él. Ahora se mide con `altoDeLaPagina`, y además, **mientras
 * el foco está en un campo del chat** —la caja de escribir o el buscador—, el chat va
 * a lo visible aunque las medidas digan otra cosa. `caja` es el chat entero: lo que
 * se escribe fuera de él (una hoja abierta encima) no lo mueve.
 */
export function usarElChatConElTeclado(caja: RefObject<HTMLElement | null>): DondeVaElChat | null {
  const [donde, setDonde] = useState<DondeVaElChat | null>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.setAttribute('data-chat', '');
    const visor = window.visualViewport;
    const movil = window.matchMedia('(max-width: 1023.98px)');
    if (!visor) {
      return () => {
        raiz.removeAttribute('data-chat');
      };
    }

    const esUnCampoDelChat = (elemento: EventTarget | Element | null) =>
      elemento instanceof HTMLElement &&
      caja.current?.contains(elemento) === true &&
      (elemento instanceof HTMLTextAreaElement ||
        (elemento instanceof HTMLInputElement && ['text', 'search'].includes(elemento.type)));
    const enUnCampo = () => esUnCampoDelChat(document.activeElement);
    // Al salir del campo **no se suelta enseguida**: el foco se va al apretar el dedo y
    // el toque acaba al levantarlo; si el chat se movía entre las dos cosas, el toque
    // caía en otro sitio y no pasaba nada (el botón de opciones de un mensaje, en las
    // pruebas). Un respiro de 400 ms, y luego ya a su sitio.
    let soltadoEn = Number.NEGATIVE_INFINITY;
    const escribiendo = () => enUnCampo() || performance.now() - soltadoEn < 400;

    let ultimo = '';
    const mirar = () => {
      const nuevo = movil.matches
        ? dondeVaElChat(
            { offsetTop: visor.offsetTop, height: visor.height, scale: visor.scale },
            altoDeLaPagina(window),
            escribiendo(),
          )
        : null;
      const clave = nuevo === null ? '' : `${String(nuevo.arriba)}|${String(nuevo.alto)}`;
      if (clave === ultimo) return;
      ultimo = clave;
      setDonde(nuevo);
    };

    // La animación del teclado del iPhone dura unos 250 ms, y el aviso a veces llega
    // tarde: un segundo entero, fotograma a fotograma, cubre las dos cosas.
    let fotograma = 0;
    let hasta = 0;
    const seguirMirando = () => {
      mirar();
      fotograma = performance.now() < hasta ? window.requestAnimationFrame(seguirMirando) : 0;
    };
    const mirarUnRato = () => {
      hasta = performance.now() + 1000;
      if (fotograma === 0) seguirMirando();
      else mirar();
    };

    const alSoltar = (evento: FocusEvent) => {
      if (esUnCampoDelChat(evento.target)) soltadoEn = performance.now();
      mirarUnRato();
    };

    mirar();
    visor.addEventListener('resize', mirarUnRato);
    visor.addEventListener('scroll', mirarUnRato);
    window.addEventListener('focusin', mirarUnRato);
    window.addEventListener('focusout', alSoltar);
    movil.addEventListener('change', mirar);
    return () => {
      raiz.removeAttribute('data-chat');
      visor.removeEventListener('resize', mirarUnRato);
      visor.removeEventListener('scroll', mirarUnRato);
      window.removeEventListener('focusin', mirarUnRato);
      window.removeEventListener('focusout', alSoltar);
      movil.removeEventListener('change', mirar);
      if (fotograma !== 0) window.cancelAnimationFrame(fotograma);
    };
  }, [caja]);

  return donde;
}
