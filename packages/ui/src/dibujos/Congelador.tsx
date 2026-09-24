import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO } from './trazos.ts';

/** El arcón con su copo: nada congelado. */
export default function Congelador() {
  return (
    <Lienzo>
      <rect x="44" y="50" width="72" height="50" rx="8" className={OBJETO} />
      <rect x="40" y="38" width="80" height="14" rx="5" className={OBJETO} />
      <path d="M80 60v32M66.1 68l27.8 16M66.1 84l27.8-16" stroke="currentColor" />
      <path d="M76 62l4 4 4-4M76 90l4-4 4 4" stroke="currentColor" strokeWidth={2} />
      <Brillo x={30} y={30} />
      <Brillo x={130} y={26} tenue />
      <circle cx="134" cy="60" r="2.5" className="fill-borde-fuerte" />
    </Lienzo>
  );
}
