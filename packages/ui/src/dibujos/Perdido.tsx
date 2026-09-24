import { Brillo, Lienzo } from './Lienzo.tsx';
import { OBJETO, TENUE } from './trazos.ts';

/** El poste con dos carteles: una dirección que no lleva a ningún sitio. */
export default function Perdido() {
  return (
    <Lienzo>
      <path d="M84 32h32l9 10-9 10H84z" className={OBJETO} />
      <path
        d="M76 58H44l-9 10 9 10h32z"
        fill="currentColor"
        fillOpacity={0.16}
        stroke="currentColor"
      />
      <rect x="76" y="26" width="8" height="76" rx="2" className={OBJETO} />
      <path d="M92 42h16" className={TENUE} />
      <path d="M48 68h18" stroke="currentColor" />
      <Brillo x={34} y={34} />
      <Brillo x={132} y={78} tenue />
    </Lienzo>
  );
}
