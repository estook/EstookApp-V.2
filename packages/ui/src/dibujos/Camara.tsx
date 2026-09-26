import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO, TENUE } from './trazos.ts';

/** La cámara, abierta y sin nada: Almacén y Productos antes del primer producto. */
export default function Camara() {
  return (
    <Lienzo>
      <rect x="50" y="22" width="56" height="80" rx="7" className={OBJETO} />
      <path d="M56 44h44M56 64h44M56 84h44" className={TENUE} />
      {/* El hueco de lo primero que entre, a trazos y con el acento. */}
      <rect
        x="66"
        y="50"
        width="18"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeDasharray="3 3.5"
      />
      <path d="M106 24l18 6v66l-18 6" className={OBJETO} />
      <path d="M118 56v12" stroke="currentColor" strokeWidth={3} />
      <Brillo x={34} y={36} />
      <Brillo x={134} y={22} tenue />
      <circle cx="30" cy="72" r="2.5" className="fill-borde-fuerte" />
    </Lienzo>
  );
}
