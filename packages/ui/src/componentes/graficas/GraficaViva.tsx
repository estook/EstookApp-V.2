import { Suspense, lazy } from 'react';
import type { GraficaVivaProps } from './tipos.ts';

/**
 * La gráfica viva (la experiencia, 0083): la que se toca.
 *
 * «Que las gráficas sean interactuables», con las de referencia que trajo Richi. Es
 * la que llevan los widgets del Panel, pequeña y sin ejes, y la del detalle que se
 * abre al tocarla, grande y con ellos. Las dos se leen igual: al pasar el ratón o
 * deslizar el dedo, una línea marca el día y un bocadillo dice cuánto.
 *
 * El dibujo (Recharts) se trae aparte y solo cuando hace falta: mientras llega se
 * ve su hueco, del mismo alto, para que nada salte al aparecer.
 */
const Dibujo = lazy(async () => {
  const modulo = await import('./GraficaVivaDibujo.tsx');
  return { default: modulo.GraficaVivaDibujo };
});

export function GraficaViva(props: GraficaVivaProps) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden
          className="w-full animate-pulse rounded-medio bg-fondo/60"
          style={{ height: props.alto }}
        />
      }
    >
      <Dibujo {...props} />
    </Suspense>
  );
}
