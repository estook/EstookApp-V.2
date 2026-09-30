import { Tarjeta } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { HistorialDeFichajes } from './ListaDeFichajes.tsx';

/**
 * Mis fichajes (H1 · decisiones 0062 y 0068).
 *
 * «El trabajador ve sus propios registros al momento» y «ve cualquier cambio en lo
 * suyo y recibe un aviso» (0062). Hasta H1 eso era verdad solo para quien tenía la
 * app Equipo: un cocinero veía sus horas en el Panel, pero **no tenía dónde ver sus
 * fichajes ni una corrección**. Esta es esa pantalla, para todos, y es a donde lleva
 * el aviso de «te han corregido un fichaje».
 *
 * Se llega desde la tarjeta de Fichar del Panel y desde Equipo › Resumen.
 */
export function MisFichajes() {
  const { yo } = usarSesion();
  if (yo === null) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-e4">
      <header>
        <h1 className="text-pantalla font-semibold">Mis fichajes</h1>
        <p className="mt-e1 text-secundario text-texto-suave">
          Tu registro de jornada: cuándo entraste y saliste, tus pausas y desde dónde fichaste. Si
          alguien corrige uno, lo de antes no se borra: lo ves aquí, con quién lo cambió y por qué.
        </p>
      </header>
      <Tarjeta>
        <div className="p-e4 @min-[22rem]:p-e5">
          <HistorialDeFichajes personaId={yo.personaId} puedeCorregir={false} />
        </div>
      </Tarjeta>
    </div>
  );
}
