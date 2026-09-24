import { Brillo, Lienzo } from './Lienzo.tsx';
import { LINEA, OBJETO, TENUE } from './trazos.ts';

/** El local con su toldo: todavía no tienes ninguno. */
export default function Local() {
  return (
    <Lienzo>
      <rect x="40" y="46" width="80" height="54" rx="3" className={OBJETO} />
      <path d="M36 32h88l-4 16H40z" fill="currentColor" fillOpacity={0.18} stroke="currentColor" />
      <path d="M58 32l-2 16M80 32v16M102 32l2 16" stroke="currentColor" strokeWidth={2} />
      <rect x="70" y="66" width="20" height="34" rx="2" className={LINEA} />
      <rect x="48" y="60" width="16" height="14" rx="2" className={TENUE} />
      <rect x="96" y="60" width="16" height="14" rx="2" className={TENUE} />
      <Brillo x={26} y={30} />
      <Brillo x={136} y={24} tenue />
    </Lienzo>
  );
}
