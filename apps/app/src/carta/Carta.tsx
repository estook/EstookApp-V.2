import { Agotados } from './Agotados.tsx';
import { Canales } from './Canales.tsx';
import { Equilibrio } from './Equilibrio.tsx';
import { LaCarta } from './LaCarta.tsx';
import { Menus } from './Menus.tsx';
import { TuZona } from './TuZona.tsx';

/**
 * La app Carta (M9 · 1, decisión 0086): la carta, por secciones o entera, y los
 * canales. M10 · 1 (0102): los agotados, como vista de la carta, y el equilibrio, en
 * Análisis. M10 · 2 (0104): los menús, y tu zona en Análisis. Lo que deja cada plato
 * (con Estook TPV) cae a su cartel en `PantallaDeApp`.
 */
export function Carta({ destino, vista }: { readonly destino: string; readonly vista: string }) {
  if (destino === 'canales') return <Canales />;
  if (destino === 'menus') return <Menus />;
  if (destino === 'analisis') return vista === 'tu-zona' ? <TuZona /> : <Equilibrio />;
  if (vista === 'agotados') return <Agotados />;
  return <LaCarta vista={vista} />;
}
