import { useState } from 'react';
import { IconoInfo } from '@estook/iconos';
import { LAS_MODALIDADES, type ModalidadDeFacturacion } from '@estook/dominio';

/**
 * **Cómo factura el local** (0127): con VERI*FACTU (la recomendada), sin envío (la modalidad «NO
 * VERI*FACTU») o fuera de VERI*FACTU, por el SII. La misma pieza en Estook (el paso 2 del alta) y en
 * los Ajustes de Estook TPV, con su «i» que explica cada una en llano.
 *
 * Lo que dice cada una, y si se puede elegir ya, sale de `@estook/dominio` (`LAS_MODALIDADES`): un
 * solo sitio. **La base vuelve a mirarlo**: elegir aquí lo que no se puede, se rechaza allí.
 */

function LaInfo({
  lineas,
  titulo,
}: {
  readonly lineas: readonly string[];
  readonly titulo: string;
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className="flex flex-col gap-e2">
      <button
        type="button"
        aria-expanded={abierta}
        aria-label={`Qué es «${titulo}»`}
        onClick={() => {
          setAbierta((a) => !a);
        }}
        className="inline-flex min-h-toque w-fit items-center gap-e1 rounded-redondo px-e2 text-secundario text-texto-suave hover:bg-fondo"
      >
        <IconoInfo size={18} />
        {abierta ? 'Cerrar' : 'Qué es'}
      </button>
      {abierta && (
        <ul className="flex list-disc flex-col gap-e1 pl-e5 text-secundario text-texto-suave">
          {lineas.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ComoFactura({
  elegida,
  enSii,
  alElegir,
  ocupado = false,
}: {
  readonly elegida: ModalidadDeFacturacion;
  /** Con el SII, va fuera de VERI*FACTU y no hay nada que elegir. */
  readonly enSii: boolean;
  readonly alElegir?: (modalidad: ModalidadDeFacturacion) => void;
  readonly ocupado?: boolean;
}) {
  if (enSii) {
    const fuera = LAS_MODALIDADES.fuera_sii;
    return (
      <fieldset className="flex flex-col gap-e2 rounded-grande border border-borde p-e4">
        <legend className="px-e1 text-cuerpo font-medium">Cómo factura</legend>
        <p className="text-cuerpo font-semibold">{fuera.nombre}</p>
        <p className="text-secundario text-texto-suave">{fuera.corto}</p>
        <LaInfo titulo={fuera.nombre} lineas={fuera.queEs} />
      </fieldset>
    );
  }

  const opciones = [LAS_MODALIDADES.verifactu, LAS_MODALIDADES.sin_envio];
  return (
    <fieldset className="flex flex-col gap-e3">
      <legend className="mb-e2 text-cuerpo font-medium">Cómo factura</legend>
      {opciones.map((m) => {
        const esLaSuya = m.modalidad === elegida;
        const sePuede = m.todaviaNo === null;
        return (
          <div
            key={m.modalidad}
            className={
              'flex flex-col gap-e1 rounded-grande border p-e4 ' +
              (esLaSuya ? 'border-naranja bg-naranja-suave' : 'border-borde bg-superficie')
            }
          >
            <label className="flex items-start gap-e3">
              <input
                type="radio"
                name="como-factura"
                className="mt-[3px] h-5 w-5 shrink-0 accent-naranja"
                checked={esLaSuya}
                disabled={!sePuede || ocupado || alElegir === undefined}
                onChange={() => {
                  alElegir?.(m.modalidad);
                }}
              />
              <span className="flex min-w-0 flex-col gap-[2px]">
                <span className="text-cuerpo font-semibold">
                  {m.nombre}
                  {m.modalidad === 'verifactu' && (
                    <span className="ml-e2 rounded-redondo bg-bien-suave px-e2 text-etiqueta font-medium text-bien">
                      Recomendada
                    </span>
                  )}
                </span>
                <span className="text-secundario text-texto-suave">{m.corto}</span>
                {!sePuede && (
                  <span className="text-secundario font-medium text-atencion">{m.todaviaNo}</span>
                )}
              </span>
            </label>
            <LaInfo titulo={m.nombre} lineas={m.queEs} />
          </div>
        );
      })}
    </fieldset>
  );
}
