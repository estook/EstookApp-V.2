import { useEffect, useState } from 'react';
import { dondeVaElChat, type DondeVaElChat } from '../chat/conElTeclado.ts';

/**
 * El chat abierto: la página de debajo quieta y, con teclado, el sitio exacto
 * (`chat/conElTeclado.ts`). Solo en el móvil; en el ordenador no hay teclado que
 * empuje nada.
 *
 * ── Y se vuelve a mirar, como lo de abajo (9-oct) ────────────────────────────
 *
 * Richi, con el iPhone: «al escribir en el chat se tapa la caja de texto y se sube
 * hasta tapar incluso los mensajes». Esto miraba el visor **una vez por aviso**, y
 * WebKit avisa a mitad de la animación del teclado y corrige las medidas después,
 * a veces sin volver a avisar. Se quedaba con un alto de antes de que el teclado
 * acabara de subir: la caja de escribir, debajo del teclado, y la cabecera, debajo
 * de la hora.
 *
 * `usarAnclaAbajo` (la barra de abajo) ya lo hacía bien desde el 25-sep: **vuelve a
 * mirar a los 50, 150 y 300 ms**. Aquí se hace lo mismo, y también al entrar y
 * salir de un campo, que es cuando el teclado sube y baja.
 */
export function usarElChatConElTeclado(): DondeVaElChat | null {
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

    let ultimo = '';
    const mirar = () => {
      const nuevo = movil.matches
        ? dondeVaElChat(
            { offsetTop: visor.offsetTop, height: visor.height, scale: visor.scale },
            window.innerHeight,
          )
        : null;
      const clave = nuevo === null ? '' : `${String(nuevo.arriba)}|${String(nuevo.alto)}`;
      if (clave === ultimo) return;
      ultimo = clave;
      setDonde(nuevo);
    };

    // La animación del teclado del iPhone dura unos 250 ms: lo de los 600 es por si
    // el aviso llega tarde, que también pasa.
    let esperas: number[] = [];
    const mirarYVolverAMirar = () => {
      for (const espera of esperas) window.clearTimeout(espera);
      mirar();
      esperas = [50, 150, 300, 600].map((ms) => window.setTimeout(mirar, ms));
    };

    mirar();
    visor.addEventListener('resize', mirarYVolverAMirar);
    visor.addEventListener('scroll', mirarYVolverAMirar);
    window.addEventListener('focusin', mirarYVolverAMirar);
    window.addEventListener('focusout', mirarYVolverAMirar);
    movil.addEventListener('change', mirar);
    return () => {
      raiz.removeAttribute('data-chat');
      visor.removeEventListener('resize', mirarYVolverAMirar);
      visor.removeEventListener('scroll', mirarYVolverAMirar);
      window.removeEventListener('focusin', mirarYVolverAMirar);
      window.removeEventListener('focusout', mirarYVolverAMirar);
      movil.removeEventListener('change', mirar);
      for (const espera of esperas) window.clearTimeout(espera);
    };
  }, []);

  return donde;
}
