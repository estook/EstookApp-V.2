import { TicketsYFacturas } from '@estook/ui';
import { LaBarraDeArriba } from '../inicio/LaBarraDeArriba.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * **Tickets y facturas en Estook TPV** (0137; Richi, 6-nov: «desde cualquier TPV autorizado»). La
 * misma de Estook, en cualquier aparato de sala. El camarero hace la factura delante del cliente y
 * se la imprime en el papel de ticket; la configuración fiscal sigue fuera de su alcance.
 */
export function TicketsYFacturasDelTpv() {
  const { cliente } = usarSesion();
  return (
    <div className="flex min-h-pantalla flex-col bg-fondo text-texto">
      <LaBarraDeArriba titulo="Tickets y facturas" />
      <main className="mx-auto w-full max-w-[64rem] flex-1 p-e4 md:p-e5">
        <TicketsYFacturas cliente={cliente} conLaImpresora />
      </main>
    </div>
  );
}
