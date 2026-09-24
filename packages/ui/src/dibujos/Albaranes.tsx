import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO, TENUE } from './trazos.ts';

/** La caja que llega con su albarán: todavía no ha llegado nada. */
export default function Albaranes() {
  return (
    <Lienzo>
      <path d="M34 56l8-10h42l8 10" className={OBJETO} />
      <rect x="34" y="56" width="58" height="44" rx="4" className={OBJETO} />
      <path d="M63 56v14" stroke="currentColor" strokeWidth={4} />
      <rect x="84" y="28" width="42" height="56" rx="5" className={OBJETO} />
      <path d="M92 40h26M92 48h20M92 56h24" className={TENUE} />
      <path d="M94 70l5 5 9-10" stroke="currentColor" strokeWidth={3} />
      <Brillo x={26} y={36} />
      <Brillo x={138} y={96} tenue />
    </Lienzo>
  );
}
