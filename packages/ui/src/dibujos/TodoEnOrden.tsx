import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO, TENUE } from './trazos.ts';

/** La tablilla con su marca: un vacío que es buena noticia («nada bajo mínimo»). */
export default function TodoEnOrden() {
  return (
    <Lienzo>
      <rect x="48" y="24" width="64" height="78" rx="8" className={OBJETO} />
      <rect x="66" y="17" width="28" height="13" rx="4.5" className={OBJETO} />
      <circle cx="80" cy="61" r="18" fill="currentColor" fillOpacity={0.14} stroke="currentColor" />
      <path d="M71.5 61.5l6 6 11.5-12.5" stroke="currentColor" strokeWidth={3.5} />
      <path d="M62 90h36" className={TENUE} />
      <Brillo x={32} y={40} />
      <Brillo x={128} y={30} />
      <Brillo x={132} y={80} tenue />
    </Lienzo>
  );
}
