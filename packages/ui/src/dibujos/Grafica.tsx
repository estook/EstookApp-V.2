import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO, TENUE } from './trazos.ts';

/** La gráfica a trazos: todavía no hay datos que dibujar. */
export default function Grafica() {
  return (
    <Lienzo>
      <rect x="32" y="24" width="96" height="74" rx="9" className={OBJETO} />
      <path d="M44 38v46h72" className={TENUE} />
      <path d="M50 74l14-9 14 6 14-15 16 5" stroke="currentColor" strokeDasharray="4 5" />
      <Brillo x={20} y={46} />
      <Brillo x={140} y={30} tenue />
    </Lienzo>
  );
}
