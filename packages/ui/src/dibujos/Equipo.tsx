import { Lienzo } from './Lienzo.tsx';
import { OBJETO } from './trazos.ts';

/** Dos personas y un «más»: el equipo, todavía por invitar. */
export default function Equipo() {
  return (
    <Lienzo>
      <circle cx="62" cy="56" r="11" className={OBJETO} />
      <path d="M40 96a22 22 0 0 1 44 0z" className={OBJETO} />
      <circle cx="96" cy="60" r="12" className={OBJETO} />
      <path d="M72 102a24 24 0 0 1 48 0z" className={OBJETO} />
      <circle cx="124" cy="40" r="10" fill="currentColor" />
      <path d="M124 35v10M119 40h10" className="stroke-superficie" />
    </Lienzo>
  );
}
