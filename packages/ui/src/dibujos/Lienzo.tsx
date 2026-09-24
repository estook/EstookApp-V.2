import type { ReactNode } from 'react';

/**
 * El marco común de los dibujos de los vacíos (entrega V, punto 4).
 *
 * Todos comparten lo que los hace familia: el mismo tamaño (160 × 120), el mismo
 * trazo redondo, un **halo** del color del acento detrás y **el suelo** debajo. Así
 * un dibujo nuevo sale de la familia sin que quien lo haga tenga que acordarse de
 * nada: dibuja su objeto y poco más.
 *
 * Es decorativo, y se dice: `aria-hidden`. Lo que cuenta un vacío lo cuentan su
 * título y su frase; un lector de pantalla no gana nada con «un frigorífico».
 */
export function Lienzo({ children }: { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 120"
      width="100%"
      height="100%"
      fill="none"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="80" cy="60" r="46" fill="currentColor" fillOpacity={0.1} />
      <ellipse cx="80" cy="103" rx="46" ry="4.5" className="fill-borde" />
      {children}
    </svg>
  );
}

/**
 * Un destello: dos trazos cruzados. Con el acento, llama la atención; tenue,
 * acompaña. Uno o dos por dibujo, nunca una lluvia: lo que se mira es el objeto.
 */
export function Brillo({
  x,
  y,
  tenue = false,
}: {
  readonly x: number;
  readonly y: number;
  readonly tenue?: boolean;
}) {
  return (
    <path
      d={`M${x} ${y - 5}v10M${x - 5} ${y}h10`}
      strokeWidth={2}
      {...(tenue ? { className: 'stroke-borde-fuerte' } : { stroke: 'currentColor' })}
    />
  );
}
