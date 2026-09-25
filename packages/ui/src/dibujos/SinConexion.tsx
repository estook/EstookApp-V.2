import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO } from './trazos.ts';

/** La nube cortada: el servidor no contesta, y no es culpa de quien mira. */
export default function SinConexion() {
  return (
    <Lienzo>
      <path d="M54 86h54a17 17 0 0 0 2-34 25 25 0 0 0-47-6 20 20 0 0 0-9 40z" className={OBJETO} />
      {/* La raya, en el acento: es lo que cuenta el dibujo, como la aguja del reloj. */}
      <path d="M58 34l46 60" stroke="currentColor" strokeWidth={3} />
      <Brillo x={32} y={42} />
      <Brillo x={134} y={80} tenue />
    </Lienzo>
  );
}
