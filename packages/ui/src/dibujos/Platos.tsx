import { Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO, TENUE } from './trazos.ts';

/** El plato con sus cubiertos: todavía no hay platos en la carta. */
export default function Platos() {
  return (
    <Lienzo>
      <circle cx="80" cy="64" r="30" className={OBJETO} />
      <circle cx="80" cy="64" r="19" className={TENUE} />
      <path d="M36 38v13a5 5 0 0 0 10 0V38M41 38v13M41 56v42" className={LINEA} />
      <path d="M124 98V38c-6 4-8 14-8 26h8" className={LINEA} />
      <path
        d="M74 62c2-6 8-8 12-6-1 6-6 9-12 6z"
        fill="currentColor"
        fillOpacity={0.2}
        stroke="currentColor"
        strokeWidth={2}
      />
    </Lienzo>
  );
}
