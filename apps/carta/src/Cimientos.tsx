import { estadoDeLasBanderas } from '@estook/utiles';
import type { Entorno } from '@estook/utiles';
import { Tarjeta, TodaviaNo } from '@estook/ui';

/**
 * La carta digital · todavia sin producto.
 *
 * Desde M3 usa el sistema de diseno en vez de su propio CSS: era una copia
 * identica del de las otras tres aplicaciones, que es justo lo que la Parte B
 * existe para que no pase.
 *
 * Lo que va aqui lo construye M14 · Carta digital.
 */
export interface CimientosProps {
  readonly aplicacion: string;
  readonly entorno: Entorno;
  readonly sesionId: string;
}

export function Cimientos({ aplicacion, entorno, sesionId }: CimientosProps) {
  const banderas = estadoDeLasBanderas(entorno, import.meta.env);

  return (
    <main className="mx-auto flex w-full max-w-[42rem] flex-col gap-e4 px-e4 py-e7">
      <header>
        <p className="text-etiqueta uppercase tracking-[0.18em] text-texto-suave">Estook</p>
        <h1 className="text-pantalla font-semibold">La carta digital</h1>
        <p className="text-secundario text-naranja">Tu cocina, bajo control.</p>
      </header>

      <Tarjeta>
        <TodaviaNo
          que="La carta digital"
          queHabra="La carta que ve el cliente al escanear el QR: platos, alergenos y traducciones, sin sesion y sin datos del local."
          modulo="M14 · Carta digital"
        />
      </Tarjeta>

      <Tarjeta titulo="Como ha arrancado" origen="Comprobacion de M0, que sigue en pie">
        <dl className="grid grid-cols-[7rem_1fr] gap-x-e4 gap-y-e2 text-secundario">
          <dt className="text-texto-suave">Aplicacion</dt>
          <dd>{aplicacion}</dd>
          <dt className="text-texto-suave">Entorno</dt>
          <dd>{entorno}</dd>
          <dt className="text-texto-suave">Sesion</dt>
          <dd className="break-all">{sesionId}</dd>
          <dt className="text-texto-suave">Base de datos</dt>
          <dd>{import.meta.env['VITE_SUPABASE_URL'] ? 'configurada' : 'sin configurar'}</dd>
          <dt className="text-texto-suave">Banderas</dt>
          <dd>
            {Object.entries(banderas)
              .map(([nombre, encendida]) => `${nombre}: ${encendida ? 'si' : 'no'}`)
              .join(' · ')}
          </dd>
        </dl>
      </Tarjeta>
    </main>
  );
}
