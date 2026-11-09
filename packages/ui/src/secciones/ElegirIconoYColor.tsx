import {
  COLORES_DE_LA_BOTONERA,
  ICONOS_DE_LA_SECCION,
  type ColorDeLaBotonera,
  type IconoDeLaSeccion,
} from '@estook/dominio';
import { COMO_SE_VE_EL_COLOR } from './colores.ts';
import { EL_ICONO, NOMBRE_DEL_ICONO } from './iconos.ts';

/**
 * **Elegir el color y el icono de una sección** (R3, 0133; el repaso del 8-nov, 0143): los once
 * colores y los treinta iconos de Lucide. **El mismo en Estook › Carta y en Ajustes del TPV ›
 * Productos y precios**, porque la sección es una sola: lo que se elige aquí se ve en los dos.
 */
export function ElegirIconoYColor({
  color,
  icono,
  alCambiarElColor,
  alCambiarElIcono,
}: {
  readonly color: ColorDeLaBotonera | null;
  readonly icono: IconoDeLaSeccion;
  readonly alCambiarElColor: (color: ColorDeLaBotonera) => void;
  readonly alCambiarElIcono: (icono: IconoDeLaSeccion) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-e2">
        <span className="text-secundario font-bold text-texto-suave">Color</span>
        <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-e2">
          {COLORES_DE_LA_BOTONERA.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={COMO_SE_VE_EL_COLOR[c].nombre}
              title={COMO_SE_VE_EL_COLOR[c].nombre}
              onClick={() => {
                alCambiarElColor(c);
              }}
              className={[
                'size-toque rounded-redondo',
                COMO_SE_VE_EL_COLOR[c].punto,
                color === c ? 'outline outline-[3px] outline-offset-2 outline-texto' : '',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-e2">
        <span className="text-secundario font-bold text-texto-suave">Icono</span>
        <div
          role="radiogroup"
          aria-label="Icono"
          className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-e2"
        >
          {ICONOS_DE_LA_SECCION.map((i) => {
            const ElIcono = EL_ICONO[i];
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={icono === i}
                aria-label={NOMBRE_DEL_ICONO[i]}
                title={NOMBRE_DEL_ICONO[i]}
                onClick={() => {
                  alCambiarElIcono(i);
                }}
                className={[
                  'flex h-[3.25rem] items-center justify-center rounded-grande',
                  // Con fichas que se leen en Estook y en el TPV, en claro y en oscuro: en la
                  // app, `charcoal` es casi negro y el icono no se vería.
                  icono === i
                    ? 'bg-texto text-superficie'
                    : 'border border-borde bg-fondo text-texto',
                ].join(' ')}
              >
                <ElIcono size={24} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
