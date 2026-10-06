import { useEffect, useState } from 'react';
import { dondeVaElChat, type DondeVaElChat } from '../chat/conElTeclado.ts';

/**
 * El chat abierto: la página de debajo quieta y, con teclado, el sitio exacto
 * (`chat/conElTeclado.ts`). Solo en el móvil; en el ordenador no hay teclado que
 * empuje nada.
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

    mirar();
    visor.addEventListener('resize', mirar);
    visor.addEventListener('scroll', mirar);
    movil.addEventListener('change', mirar);
    return () => {
      raiz.removeAttribute('data-chat');
      visor.removeEventListener('resize', mirar);
      visor.removeEventListener('scroll', mirar);
      movil.removeEventListener('change', mirar);
    };
  }, []);

  return donde;
}
