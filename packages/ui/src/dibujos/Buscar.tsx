import { Brillo, Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO, TENUE } from './trazos.ts';

/** La lupa sobre una lista: lo que se busca o se filtra no ha dado nada. */
export default function Buscar() {
  return (
    <Lienzo>
      <rect x="36" y="24" width="72" height="72" rx="9" className={OBJETO} />
      <path d="M48 42h40M48 54h30M48 66h36M48 78h22" className={TENUE} />
      <circle cx="102" cy="72" r="19" className={OBJETO} />
      <path d="M92.5 67a11 11 0 0 1 10-7.5" stroke="currentColor" />
      <path d="M116 86l12 12" className={LINEA} strokeWidth={6} />
      <Brillo x={130} y={36} />
      <Brillo x={24} y={58} tenue />
    </Lienzo>
  );
}
