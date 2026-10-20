import { Agotados } from './Agotados.tsx';
import { Canales } from './Canales.tsx';
import { Equilibrio } from './Equilibrio.tsx';
import { LaCarta } from './LaCarta.tsx';

/**
 * La app Carta (M9 · 1, decisión 0086): la carta, por secciones o entera, y los
 * canales. M10 · 1 (0102): los agotados, como vista de la carta, y el equilibrio, en
 * Análisis. Los menús y lo que deja cada plato (M10 · 2) caen a su cartel en
 * `PantallaDeApp`.
 */
export function Carta({ destino, vista }: { readonly destino: string; readonly vista: string }) {
  if (destino === 'canales') return <Canales />;
  if (destino === 'analisis') return <Equilibrio />;
  if (vista === 'agotados') return <Agotados />;
  return <LaCarta vista={vista} />;
}
