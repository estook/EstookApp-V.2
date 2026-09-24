import { Brillo, Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO, PAPEL, TENUE } from './trazos.ts';

/** El tique y las monedas: todavía no hay cajas cerradas. */
export default function Caja() {
  return (
    <Lienzo>
      <path d="M52 18h48v72l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4z" className={OBJETO} />
      <path d="M62 32h28M62 42h20M62 52h24" className={TENUE} />
      <path d="M62 68h28" stroke="currentColor" strokeWidth={3} />
      <ellipse cx="116" cy="94" rx="14" ry="5" className={OBJETO} />
      <path d="M102 86v8M130 86v8" className={LINEA} />
      <ellipse cx="116" cy="86" rx="14" ry="5" className={PAPEL} />
      <ellipse
        cx="116"
        cy="86"
        rx="14"
        ry="5"
        fill="currentColor"
        fillOpacity={0.2}
        stroke="currentColor"
      />
      <Brillo x={34} y={40} />
    </Lienzo>
  );
}
