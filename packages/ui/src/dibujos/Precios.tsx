import { Brillo, Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO, TENUE } from './trazos.ts';

/** Dos etiquetas de precio, una junto a otra: todavía no hay nada que comparar. */
export default function Precios() {
  return (
    <Lienzo>
      <g transform="rotate(-12 70 60)">
        <path
          d="M44 44h34l14 16-14 16H44z"
          fill="currentColor"
          fillOpacity={0.16}
          stroke="currentColor"
        />
      </g>
      <g transform="rotate(8 88 70)">
        <path d="M60 52h36l15 18-15 18H60z" className={OBJETO} />
        <circle cx="96" cy="70" r="3.5" className={LINEA} />
        <path d="M70 64h16M70 76h10" className={TENUE} />
      </g>
      <Brillo x={32} y={32} />
      <Brillo x={132} y={34} tenue />
    </Lienzo>
  );
}
