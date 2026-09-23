import { useEffect } from 'react';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Cada cuánto avisa la app de que sigue abierta. El servidor da por «en línea» a
 * quien avisó hace menos de dos minutos (0042), así que un aviso que se pierda por
 * la cobertura no apaga a nadie.
 */
const CADA = 45_000;

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
 * No avisa en una visita de demostración, que no escribe nada (M5), ni con la
 * sesión a medias, esperando el segundo factor. Y un aviso que falla no se enseña:
 * no es algo que la persona haya pedido.
 */
export function usarSigoAqui(): void {
  const { cliente, yo } = usarSesion();
  const tocaAvisar = yo !== null && !yo.esDemostracion && !yo.faltaDobleFactor;

  useEffect(() => {
    if (!tocaAvisar) return;

    const avisar = (aLaVista: boolean) => {
      cliente.ejecutar('sigo_aqui', { a_la_vista: aLaVista }).catch(() => {
        // Sin red no hay nada que hacer: el siguiente aviso lo pondrá al día.
      });
    };
    const estaALaVista = () => document.visibilityState === 'visible';

    if (estaALaVista()) avisar(true);
    const reloj = setInterval(() => {
      if (estaALaVista()) avisar(true);
    }, CADA);
    const alCambiar = () => {
      avisar(estaALaVista());
    };
    document.addEventListener('visibilitychange', alCambiar);

    return () => {
      clearInterval(reloj);
      document.removeEventListener('visibilitychange', alCambiar);
    };
  }, [cliente, tocaAvisar]);
}
