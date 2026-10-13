import { LogoDelLocal } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El saludo del Panel (la experiencia, 0083).
 *
 * «El logo que elijan o suban será más grande, sin círculos y sin fondo, y que
 * saluden al empleado», con el panel de referencia de Richi delante: «Bienvenido,
 * Ethan 👋». Hasta aquí era una tarjeta entera con un velo del color del local, el
 * logo en un cuadradito de 34 px y un desplegable con cuatro cifras que ya estaban
 * en los widgets.
 *
 * Ahora es una línea limpia, sin tarjeta: **el logo del local tal cual lo subieron**,
 * grande, y el saludo. Lo de debajo, «Hoy» y el Panel, es lo que se viene a mirar.
 *
 * El `h1` es el saludo: es por donde entra quien navega con lector de pantalla, y
 * las pruebas de acceso lo buscan («Hola»).
 */
export function CabeceraDelPanel() {
  const { yo } = usarSesion();
  const local = yo?.local ?? null;
  const donde = local?.nombre ?? yo?.organizacion?.nombre ?? '';
  const nombre = yo?.nombre.split(' ')[0] ?? '';

  return (
    <header className="flex items-center gap-e4">
      {local !== null && (
        <LogoDelLocal
          nombre={local.nombre}
          logo={local.logo}
          colorDeMarca={local.colorDeMarca}
          alto={56}
        />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[calc(26px*var(--escala))] font-bold leading-tight tracking-[-0.02em] lg:text-[calc(30px*var(--escala))]">
          Hola, {nombre} <span aria-hidden>👋</span>
        </h1>
        <p className="truncate text-secundario text-texto-suave">
          {donde === '' ? 'Esto es lo de hoy' : `Esto es lo de hoy en ${donde}`}
        </p>
      </div>
    </header>
  );
}
