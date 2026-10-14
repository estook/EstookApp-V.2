import { useEffect, useState, type ComponentType } from 'react';
import type { GraficaVivaProps } from './tipos.ts';

/**
 * La gráfica viva (la experiencia, 0083): la que se toca.
 *
 * «Que las gráficas sean interactuables», con las de referencia que trajo Richi. Es
 * la que llevan los widgets del Panel, pequeña y sin ejes, y la del detalle que se
 * abre al tocarla, grande y con ellos. Las dos se leen igual: al pasar el ratón o
 * deslizar el dedo, una línea marca el día y un bocadillo dice cuánto.
 *
 * ── Por qué no es un `lazy` ──────────────────────────────────────────────────
 *
 * El dibujo (Recharts) se trae aparte, solo cuando hace falta. Con `lazy`, si ese
 * trozo **no llega** —sin señal, que es justo cuando se ficha desde el móvil—, el
 * fallo sube a la red de la pantalla, que recarga la página entera para traerlo: se
 * llevaba por delante la hoja de fichar a mitad de fichar (lo cazó la prueba de la
 * app instalable en GitHub). Así, si no llega, **lo dice en su hueco** y el resto de
 * la pantalla ni se entera. Se vuelve a intentar al recuperar la señal, aunque
 * Chrome recuerda el trozo que falló hasta recargar: por eso lo dice así.
 */
type Dibujo = ComponentType<GraficaVivaProps>;

let elDibujo: Dibujo | null = null;
let trayendolo: Promise<Dibujo> | null = null;

function traerElDibujo(): Promise<Dibujo> {
  trayendolo ??= import('./GraficaVivaDibujo.tsx').then(
    (modulo) => {
      elDibujo = modulo.GraficaVivaDibujo;
      return elDibujo;
    },
    (fallo: unknown) => {
      // Que el siguiente intento vuelva a pedirlo, en vez de quedarse con el fallo.
      trayendolo = null;
      throw fallo;
    },
  );
  return trayendolo;
}

export function GraficaViva(props: GraficaVivaProps) {
  const [Dibujo, setDibujo] = useState<Dibujo | null>(() => elDibujo);
  const [noLlega, setNoLlega] = useState(false);

  useEffect(() => {
    if (Dibujo !== null) return;
    let sigue = true;
    const intentar = () => {
      traerElDibujo().then(
        (llegado) => {
          if (sigue) setDibujo(() => llegado);
        },
        () => {
          if (sigue) setNoLlega(true);
        },
      );
    };
    intentar();
    window.addEventListener('online', intentar);
    return () => {
      sigue = false;
      window.removeEventListener('online', intentar);
    };
  }, [Dibujo]);

  if (Dibujo === null) {
    return noLlega ? (
      <p
        className="grid w-full place-items-center rounded-medio bg-fondo/50 px-e3 text-center text-etiqueta text-texto-tenue"
        style={{ height: props.alto }}
      >
        Sin conexión: la gráfica sale al volver a cargar.
      </p>
    ) : (
      <div
        aria-hidden
        className="w-full animate-pulse rounded-medio bg-fondo/60"
        style={{ height: props.alto }}
      />
    );
  }
  return <Dibujo {...props} />;
}
