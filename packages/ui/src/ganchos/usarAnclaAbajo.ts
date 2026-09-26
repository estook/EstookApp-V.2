import { useEffect } from 'react';
import { comoQuedaAbajo } from '../navegacion/anclaAbajo.ts';

/**
 * Mantiene lo pegado abajo en el borde de la pantalla aunque el iPhone se líe con
 * su visor (repaso del 25-sep). El porqué, en `anclaAbajo.ts`.
 *
 * Deja en el `<html>` dos cosas que lee el CSS de lo pegado abajo:
 *
 *   · `--desfase-abajo`: cuánto hay que bajarlo (casi siempre `0px`).
 *   · `data-teclado`: presente mientras hay un teclado abierto.
 *
 * Se mira con cada cambio del visor visible, al soltar un campo, al volver a la app
 * y al girar. **Y otra vez a los 50, 150 y 300 ms**: WebKit publica las medidas
 * antes de tiempo y las corrige después, y con una sola lectura se quedaba la mala.
 * Al soltar un campo, además, se le da un empujón de nada (`scrollTo` al mismo
 * sitio), que es lo que hace que Safari vuelva a colocar el visor.
 *
 * Se llama una vez, en la raíz de la app.
 */
export function usarAnclaAbajo(): void {
  useEffect(() => {
    const visor = window.visualViewport;
    const raiz = document.documentElement;
    if (!visor) return;

    let ultimo = '';
    const mirar = () => {
      const { desfase, teclado } = comoQuedaAbajo(
        { offsetTop: visor.offsetTop, height: visor.height, scale: visor.scale },
        window.innerHeight,
      );
      const ahora = `${String(desfase)}|${String(teclado)}`;
      if (ahora === ultimo) return;
      ultimo = ahora;
      raiz.style.setProperty('--desfase-abajo', `${String(desfase)}px`);
      if (teclado) raiz.setAttribute('data-teclado', '');
      else raiz.removeAttribute('data-teclado');
    };

    let esperas: number[] = [];
    const mirarYVolverAMirar = () => {
      for (const espera of esperas) window.clearTimeout(espera);
      mirar();
      esperas = [50, 150, 300].map((ms) => window.setTimeout(mirar, ms));
    };
    const alSoltarUnCampo = () => {
      window.setTimeout(() => {
        window.scrollTo(window.scrollX, window.scrollY);
        mirarYVolverAMirar();
      }, 0);
    };
    const alVolver = () => {
      if (document.visibilityState === 'visible') mirarYVolverAMirar();
    };

    mirar();
    visor.addEventListener('resize', mirarYVolverAMirar);
    visor.addEventListener('scroll', mirar);
    window.addEventListener('focusout', alSoltarUnCampo);
    window.addEventListener('pageshow', mirarYVolverAMirar);
    window.addEventListener('orientationchange', mirarYVolverAMirar);
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      visor.removeEventListener('resize', mirarYVolverAMirar);
      visor.removeEventListener('scroll', mirar);
      window.removeEventListener('focusout', alSoltarUnCampo);
      window.removeEventListener('pageshow', mirarYVolverAMirar);
      window.removeEventListener('orientationchange', mirarYVolverAMirar);
      document.removeEventListener('visibilitychange', alVolver);
      for (const espera of esperas) window.clearTimeout(espera);
      raiz.style.removeProperty('--desfase-abajo');
      raiz.removeAttribute('data-teclado');
    };
  }, []);
}
