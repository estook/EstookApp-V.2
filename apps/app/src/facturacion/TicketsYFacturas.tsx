import { TicketsYFacturas as LaPantalla } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/** **Servicio › Ventas › Tickets y facturas**: la de `@estook/ui`, con la sesión de Estook (0137). */
export function TicketsYFacturas() {
  const { cliente } = usarSesion();
  return <LaPantalla cliente={cliente} />;
}
