import { Canales } from './Canales.tsx';
import { LaCarta } from './LaCarta.tsx';

/**
 * La app Carta (M9 · 1, decisión 0086): la carta, por secciones o entera, y los
 * canales. Menús y Análisis siguen en M10 y caen a su cartel en `PantallaDeApp`.
 */
export function Carta({ destino, vista }: { readonly destino: string; readonly vista: string }) {
  if (destino === 'canales') return <Canales />;
  return <LaCarta vista={vista} />;
}
