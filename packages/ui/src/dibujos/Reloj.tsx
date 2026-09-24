import { Brillo, Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO, TENUE } from './trazos.ts';

/** El reloj de fichar: nadie ha fichado. */
export default function Reloj() {
  return (
    <Lienzo>
      <circle cx="80" cy="62" r="36" className={OBJETO} />
      <path d="M80 32v5M80 87v5M50 62h5M105 62h5" className={TENUE} />
      <path d="M80 62V44" className={LINEA} strokeWidth={3} />
      <path d="M80 62l13 8" stroke="currentColor" strokeWidth={3} />
      <circle cx="80" cy="62" r="3" fill="currentColor" />
      <Brillo x={28} y={40} />
      <Brillo x={134} y={72} tenue />
    </Lienzo>
  );
}
