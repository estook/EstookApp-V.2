import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO, TENUE } from './trazos.ts';

/** La factura con su euro: todavía no se ha apuntado ninguna. */
export default function Facturas() {
  return (
    <Lienzo>
      <path d="M50 20h60v76l-7.5-5-7.5 5-7.5-5-7.5 5-7.5-5-7.5 5-7.5-5-7.5 5z" className={OBJETO} />
      <path d="M60 34h30M60 44h22" className={TENUE} />
      <path
        d="M91 58.5a13 13 0 1 0 0 19M66 64.5h19M66 71.5h19"
        stroke="currentColor"
        strokeWidth={3}
      />
      <Brillo x={34} y={34} />
      <Brillo x={128} y={62} tenue />
    </Lienzo>
  );
}
