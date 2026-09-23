import { useEffect } from 'react';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Cada cuánto avisa la app de que sigue abierta. El servidor da por «en línea» a
 * quien avisó hace menos de dos minutos (0042), así que un aviso que se pierda por
 * la cobertura no apaga a nadie.
 */
const CADA = 45_000;

/**
 * Cuánto espera el «ya no estoy» antes de salir. Si en ese rato la página se va
 * —una recarga, cerrar la pestaña—, no se manda: la petición se cortaría a medias,
 * y Safari lo apunta como un fallo de la página. Para eso ya están los dos minutos.
 */
const ESPERA_AL_ESCONDERSE = 1_000;

/**
 * «Sigo aquí»: de esto sale el «en línea» de Equipo (23-sep-2026).
 *
 * Richi: «que se marque solo con la app abierta, como en las apps profesionales».
 * Hasta hoy «en línea» era «tiene una sesión sin cerrar», y una sesión dura días.
 *
 * Mientras la app está **a la vista** avisa al entrar y cada 45 segundos. Al
 * esconderse —otra app, otra pestaña, la pantalla apagada— avisa una vez de que ya
 * no, y deja de avisar. Si el teléfono se queda sin cobertura o se cierra de golpe,
 * no hace falta que llegue nada: en dos minutos sin avisos, deja de salir.
 *
 * ── Lo que cazó Safari ───────────────────────────────────────────────────────
 *
 * Al recargar, la página primero se esconde y después se va. El «ya no estoy» salía
 * justo entre las dos cosas, y la petición se cortaba: en Safari eso es un fallo de
 * la página, y la prueba de las ocho apps lo vio una vez por app. Ahora ese aviso
 * espera un segundo, y si la página se va antes (\`pagehide\`), no sale.
 *
 * No avisa en una visita de demostración, que no escribe nada (M5), ni con la
 * sesión a medias, esperando el segundo factor. Y un aviso que falla no se enseña:
 * no es algo que la persona haya pedido.
 */
export function usarSigoAqui(): void {
  const { cliente, yo } = usarSesion();
  const tocaAvisar = yo !== null && !yo.esDemostracion && !yo.faltaDobleFactor;

  useEffect(() => {
    if (!tocaAvisar) return;

    let seVa = false;
    let alEsconderse: ReturnType<typeof setTimeout> | null = null;

    const avisar = (aLaVista: boolean) => {
      if (seVa) return;
      cliente.ejecutar('sigo_aqui', { a_la_vista: aLaVista }).catch(() => {
        // Sin red no hay nada que hacer: el siguiente aviso lo pondrá al día.
      });
    };
    const estaALaVista = () => document.visibilityState === 'visible';
    const olvidarElDeEsconderse = () => {
      if (alEsconderse !== null) clearTimeout(alEsconderse);
      alEsconderse = null;
    };

    if (estaALaVista()) avisar(true);
    const reloj = setInterval(() => {
      if (estaALaVista()) avisar(true);
    }, CADA);

    const alCambiar = () => {
      olvidarElDeEsconderse();
      if (estaALaVista()) {
        avisar(true);
        return;
      }
      alEsconderse = setTimeout(() => {
        alEsconderse = null;
        avisar(false);
      }, ESPERA_AL_ESCONDERSE);
    };
    const alIrse = () => {
      seVa = true;
      olvidarElDeEsconderse();
    };
    // Volver con el botón de atrás a una página guardada la trae viva otra vez.
    const alVolver = (evento: PageTransitionEvent) => {
      if (!evento.persisted) return;
      seVa = false;
      if (estaALaVista()) avisar(true);
    };

    document.addEventListener('visibilitychange', alCambiar);
    window.addEventListener('pagehide', alIrse);
    window.addEventListener('pageshow', alVolver);

    return () => {
      clearInterval(reloj);
      olvidarElDeEsconderse();
      document.removeEventListener('visibilitychange', alCambiar);
      window.removeEventListener('pagehide', alIrse);
      window.removeEventListener('pageshow', alVolver);
    };
  }, [cliente, tocaAvisar]);
}
