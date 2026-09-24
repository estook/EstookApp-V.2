import { Brillo, Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO, TENUE } from './trazos.ts';

/** El cubo, con algo que va de camino: lo que se va sin venderse. */
export default function Mermas() {
  return (
    <Lienzo>
      <path d="M54 46h52l-6 54H60z" className={OBJETO} />
      <path d="M70 56v34M80 56v34M90 56v34" className={TENUE} />
      {/* La tapa, abierta y sujeta por su bisagra de la izquierda. */}
      <g transform="rotate(-12 50 45)">
        <rect x="48" y="37" width="64" height="9" rx="3.5" className={OBJETO} />
        <path d="M70 37v-5h20v5" className={LINEA} />
      </g>
      <ellipse
        cx="100"
        cy="24"
        rx="7"
        ry="4"
        transform="rotate(-30 100 24)"
        fill="currentColor"
        fillOpacity={0.25}
        stroke="currentColor"
      />
      <Brillo x={126} y={62} />
      <Brillo x={32} y={62} tenue />
    </Lienzo>
  );
}
