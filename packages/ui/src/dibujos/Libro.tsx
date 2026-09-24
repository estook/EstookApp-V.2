import { Brillo, Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO, TENUE } from './trazos.ts';

/** El libro abierto, con su flecha: movimientos y registros, todavía sin apuntes. */
export default function Libro() {
  return (
    <Lienzo>
      <path d="M80 36c-10-7-26-9-40-7v62c14-2 30 0 40 7z" className={OBJETO} />
      <path d="M80 36c10-7 26-9 40-7v62c-14-2-30 0-40 7z" className={OBJETO} />
      <path d="M80 36v62" className={LINEA} />
      <path d="M48 44c8-1 16 0 24 3M48 56c8-1 16 0 24 3M48 68c8-1 16 0 24 3" className={TENUE} />
      <path d="M100 76V50M93 57l7-7 7 7" stroke="currentColor" strokeWidth={3} />
      <Brillo x={28} y={32} />
      <Brillo x={134} y={24} tenue />
    </Lienzo>
  );
}
