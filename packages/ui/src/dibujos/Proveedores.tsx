import { Lienzo } from './Lienzo.tsx';
import { OBJETO } from './trazos.ts';

/** El camión del reparto: todavía no hay proveedores. */
export default function Proveedores() {
  return (
    <Lienzo>
      <rect x="26" y="40" width="64" height="46" rx="6" className={OBJETO} />
      <path d="M90 54h17l14 15v17H90z" className={OBJETO} />
      <path
        d="M96 60h9l8 9H96z"
        fill="currentColor"
        fillOpacity={0.18}
        stroke="currentColor"
        strokeWidth={2}
      />
      <circle cx="58" cy="63" r="9" stroke="currentColor" />
      <circle cx="46" cy="90" r="9" className={OBJETO} />
      <circle cx="106" cy="90" r="9" className={OBJETO} />
      <path d="M10 52h10M6 62h14M12 72h8" stroke="currentColor" />
    </Lienzo>
  );
}
