import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO, TENUE } from './trazos.ts';

/** La hoja de pedido con su lápiz: no hay pedidos. */
export default function Pedidos() {
  return (
    <Lienzo>
      <rect x="42" y="24" width="62" height="78" rx="8" className={OBJETO} />
      <rect x="59" y="17" width="28" height="13" rx="4.5" className={OBJETO} />
      <rect x="52" y="42" width="8" height="8" rx="2" className={TENUE} />
      <rect x="52" y="58" width="8" height="8" rx="2" className={TENUE} />
      <rect x="52" y="74" width="8" height="8" rx="2" className={TENUE} />
      <path d="M66 46h28M66 62h22M66 78h26" className={TENUE} />
      <g transform="rotate(24 118 76)">
        <rect x="113" y="48" width="10" height="42" rx="2.5" className={OBJETO} />
        <path d="M113 90l5 9 5-9" className={OBJETO} />
        <path d="M113 57h10" stroke="currentColor" />
      </g>
      <Brillo x={28} y={40} />
    </Lienzo>
  );
}
