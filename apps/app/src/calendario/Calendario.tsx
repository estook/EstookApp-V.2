import { Equipo } from './Equipo.tsx';
import { Personal } from './Personal.tsx';
import { Propuestas } from './Propuestas.tsx';

/**
 * Calendario › Calendario (la Ampliación 4, 0153): **Equipo**, los recordatorios del equipo (4 · 3);
 * **Personal**, lo de cada uno con sus vacaciones y sus notas; y **Propuestas**, para quien gestiona
 * las vacaciones de su gente (4 · 2). Se abre en Equipo para quien lo edita y en Personal para el
 * resto.
 */
export function Calendario({ vista }: { readonly vista: string }) {
  if (vista === 'equipo') return <Equipo />;
  return vista === 'propuestas' ? <Propuestas /> : <Personal />;
}
