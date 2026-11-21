import type { ReactNode } from 'react';
import { LogoDelLocal } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La cabecera del Panel (el rediseño, entrega 3 · la maqueta aprobada, pestaña «El Panel»).
 *
 * «Buenas tardes, Ricardo» y debajo «Miércoles, 18 de noviembre · IKATZ · Gerente»; a la derecha,
 * sus botones. **Nada a lo ancho para decir poco** (Richi, 21-nov): lo que antes eran franjas
 * encima del Panel —lo de hoy, poner en marcha el local— son ahora botones con su número aquí, y
 * cada uno abre su hoja.
 *
 * El logo del local se queda, tal cual lo subieron (la experiencia, 0083: «el logo que elijan será
 * más grande, sin círculos y sin fondo»). El `h1` lleva el saludo **y dónde estás**: por ahí entra
 * quien navega con lector de pantalla, y al cambiar de local cambia con él.
 */
export function CabeceraDelPanel({
  puesto,
  acciones,
}: {
  /** «Gerente», «Jefe de cocina»… */
  readonly puesto: string;
  readonly acciones?: ReactNode;
}) {
  const { yo } = usarSesion();
  const local = yo?.local ?? null;
  const donde = local?.nombre ?? yo?.organizacion?.nombre ?? '';
  const nombre = yo?.nombre.split(' ')[0] ?? '';
  // El saludo y la fecha que se leen, del reloj del aparato: no deciden nada del día operativo
  // (regla 10), que es del servidor. Las cifras de debajo van con la jornada del local.
  const ahora = new Date(Date.now());

  return (
    <header className="flex flex-wrap items-center gap-x-e4 gap-y-e3">
      {local !== null && (
        <LogoDelLocal
          nombre={local.nombre}
          logo={local.logo}
          colorDeMarca={local.colorDeMarca}
          alto={48}
        />
      )}
      <h1 className="min-w-[12rem] flex-1">
        <span className="block truncate text-[calc(24px*var(--escala))] font-extrabold leading-tight tracking-[-0.01em] lg:text-[calc(26px*var(--escala))]">
          {elSaludo(ahora.getHours())}, {nombre}
        </span>
        <span className="block truncate text-secundario font-semibold text-texto-tenue">
          {[laFecha(ahora), donde, puesto].filter((parte) => parte !== '').join(' · ')}
        </span>
      </h1>
      {acciones !== undefined && (
        <div className="flex w-full flex-wrap items-center gap-e2 sm:w-auto">{acciones}</div>
      )}
    </header>
  );
}

/** «Buenos días» hasta las dos, «Buenas tardes» hasta las nueve y «Buenas noches» después. */
export function elSaludo(hora: number): string {
  if (hora >= 6 && hora < 14) return 'Buenos días';
  if (hora >= 14 && hora < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

const FECHA = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

/** «Miércoles, 18 de noviembre». */
function laFecha(dia: Date): string {
  const texto = FECHA.format(dia);
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;
}
