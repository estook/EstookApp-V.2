import { useState } from 'react';
import {
  COMO_ES_EL_INDICADOR,
  idDelIndicador,
  type Indicador,
  type PeriodoDelIndicador,
} from '@estook/dominio';
import type { Permiso } from '@estook/permisos';
import { Boton, ElegirPeriodo, Etiqueta, clases, losIndicadoresQueSePuedenTener } from '@estook/ui';
import { IconoAnadir } from '@estook/iconos';

/**
 * «Añadir los nuestros»: tu propia cifra, con su gráfica (M7, decisión 0039).
 *
 * Dos preguntas y un botón, que es lo que hacen los paneles que se montan bien —
 * Shopify o Square—: **qué quieres mirar** y **de cuánto tiempo**. Nada de elegir
 * tipo de gráfica, colores o ejes: la tarjeta sabe pintarse, y lo que tiene que
 * decidir quien la pone es la pregunta, no el dibujo.
 *
 * Solo salen los indicadores que esta persona puede ver, con la misma regla que
 * comprueba el servidor. Un cocinero ve «Mis horas» y nada más, y no es un castigo:
 * es que el resto son cifras de dinero del local.
 */
export function ElegirIndicador({
  puestos,
  tienePermiso,
  alAnadir,
}: {
  readonly puestos: readonly { readonly id: string }[];
  readonly tienePermiso: (permiso: Permiso) => boolean;
  readonly alAnadir: (id: string) => void;
}) {
  const posibles = losIndicadoresQueSePuedenTener(tienePermiso);
  const [indicador, setIndicador] = useState<Indicador | null>(posibles[0] ?? null);
  const [dias, setDias] = useState<PeriodoDelIndicador>(7);

  if (indicador === null) return null;
  const id = idDelIndicador(indicador, dias);
  const yaEsta = puestos.some((p) => p.id === id);

  return (
    <section aria-label="Tus cifras, con su gráfica" className="flex flex-col gap-e3">
      <div>
        <p className="text-secundario font-medium text-texto-suave">Tus cifras, con su gráfica</p>
        <p className="mt-e1 text-secundario text-texto-suave">
          Elige qué quieres seguir y de cuántos días. Sale con su flecha frente a los días de antes.
        </p>
      </div>

      <div role="radiogroup" aria-label="Qué quieres seguir" className="grid gap-e2 sm:grid-cols-2">
        {posibles.map((cual) => {
          const puesto = cual === indicador;
          return (
            <button
              key={cual}
              type="button"
              role="radio"
              aria-checked={puesto}
              onClick={() => {
                setIndicador(cual);
              }}
              className={clases(
                'flex min-h-toque flex-col items-start gap-e1 rounded-medio border px-e3 py-e2 text-left transition-colors duration-rapido',
                puesto
                  ? 'border-naranja bg-naranja-suave'
                  : 'border-borde-fuerte bg-superficie hover:bg-fondo',
              )}
            >
              <span className="text-cuerpo font-medium">{COMO_ES_EL_INDICADOR[cual].nombre}</span>
              <span className="text-etiqueta text-texto-suave">
                {COMO_ES_EL_INDICADOR[cual].queEnsena}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-e3">
        <ElegirPeriodo periodo={dias} alElegir={setDias} />

        {yaEsta ? (
          <Etiqueta tono="bien">Ya está en tu panel</Etiqueta>
        ) : (
          <Boton
            tono="principal"
            icono={<IconoAnadir size={18} />}
            onClick={() => {
              alAnadir(id);
            }}
          >
            Añadir al panel
          </Boton>
        )}
      </div>
    </section>
  );
}
