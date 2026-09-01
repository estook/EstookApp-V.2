import type { App } from '../apps.ts';

/**
 * La rueda, en rejilla · Parte B5 del Plan.
 *
 * «Con "reducir movimiento" activo, la rueda es una rejilla de tarjetas **con la
 * misma informacion**.»
 *
 * La misma de verdad: icono, acento, nombre, que hace y contador de pendientes.
 * No una version recortada. Quien tiene puesto «reducir movimiento» no lo tiene
 * por gusto, y darle menos aplicacion seria cobrarle la accesibilidad.
 */
export interface RuedaRejillaProps {
  readonly apps: readonly App[];
  readonly pendientes: Readonly<Record<string, number>>;
  readonly alElegir: (indice: number) => void;
}

export function RuedaRejilla({ apps, pendientes, alElegir }: RuedaRejillaProps) {
  return (
    <ul aria-label="Elige una app" className="grid w-full max-w-[28rem] grid-cols-2 gap-e3">
      {apps.map((app, i) => {
        const Icono = app.icono;
        const cuantos = pendientes[app.id] ?? 0;

        return (
          <li key={app.id}>
            <button
              type="button"
              onClick={() => {
                alElegir(i);
              }}
              className="flex h-full w-full min-h-toque-cocina flex-col gap-e1 rounded-grande border border-borde bg-superficie p-e3 text-left"
            >
              <span className="flex items-center gap-e2">
                <span style={{ color: app.acento }}>
                  <Icono size={24} />
                </span>
                <span className="min-w-0 flex-1 truncate text-cuerpo font-semibold">
                  {app.nombre}
                </span>
                {cuantos > 0 && (
                  <span
                    className="grid size-[22px] shrink-0 place-items-center rounded-redondo bg-charcoal text-etiqueta font-bold text-white"
                    style={{ outline: `2px solid ${app.acento}`, outlineOffset: '-2px' }}
                  >
                    {cuantos > 99 ? '99+' : cuantos}
                  </span>
                )}
              </span>
              <span className="text-secundario text-texto-suave">{app.queHace}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
