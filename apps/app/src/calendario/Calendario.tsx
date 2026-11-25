import { Personal } from './Personal.tsx';
import { Propuestas } from './Propuestas.tsx';

/**
 * Calendario › Calendario (la Ampliación 4 · 2, 0153): **Personal** para cada uno, y **Propuestas**
 * para quien gestiona las vacaciones de su gente. **Equipo** (los recordatorios del equipo) llega con
 * la 4 · 3; hasta entonces, su pestaña sale apagada.
 */
export function Calendario({ vista }: { readonly vista: string }) {
  return vista === 'propuestas' ? <Propuestas /> : <Personal />;
}
