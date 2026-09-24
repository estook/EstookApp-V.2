import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO, TENUE } from './trazos.ts';

/** La caja de archivo: lo que se quitó de en medio y se puede traer de vuelta. */
export default function Archivo() {
  return (
    <Lienzo>
      <rect x="46" y="52" width="68" height="48" rx="5" className={OBJETO} />
      <rect x="40" y="36" width="80" height="18" rx="5" className={OBJETO} />
      <rect x="68" y="64" width="24" height="8" rx="4" stroke="currentColor" />
      <path d="M58 88h44" className={TENUE} />
      <Brillo x={30} y={44} tenue />
      <Brillo x={132} y={30} />
    </Lienzo>
  );
}
