import { Brillo, Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO } from './trazos.ts';

/** El candado: esto lo lleva otra persona, y tu acceso no llega. */
export default function Candado() {
  return (
    <Lienzo>
      <path d="M63 56V44a17 17 0 0 1 34 0v12" className={LINEA} strokeWidth={5} />
      <rect x="50" y="54" width="60" height="46" rx="9" className={OBJETO} />
      <circle cx="80" cy="72" r="5.5" fill="currentColor" />
      <path d="M80 76v9" stroke="currentColor" strokeWidth={4} />
      <Brillo x={34} y={34} tenue />
      <Brillo x={128} y={40} />
    </Lienzo>
  );
}
