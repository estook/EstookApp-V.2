import { useEffect, useState } from 'react';
import { Boton, Hoja, clases } from '@estook/ui';
import type { Accion } from './catalogo.tsx';

/**
 * Elegir tus atajos: los del botón «+» y los de las acciones rápidas, que son los
 * mismos (entrega O · 0047).
 *
 * Se marcan y se desmarcan, y el orden es el del catálogo: no se arrastran. Un
 * arrastre dentro de una hoja, dentro de un widget que ya se arrastra en el Panel,
 * son dos arrastres anidados y ninguno de los dos se entendería.
 */
export function ElegirAtajos({
  abierta,
  alCerrar,
  puedo,
  elegidas,
  alCambiar,
  alVolverALosDeMiPuesto,
}: {
  readonly abierta: boolean;
  readonly alCerrar: () => void;
  readonly puedo: readonly Accion[];
  readonly elegidas: readonly string[];
  readonly alCambiar: (nuevas: readonly string[]) => void;
  /** Deja los de su puesto, borrando lo elegido. */
  readonly alVolverALosDeMiPuesto: () => void;
}) {
  const [enCurso, setEnCurso] = useState<readonly string[]>(elegidas);

  // Al abrirse se parte de lo que hay puesto, y no de lo que hubiera la última vez
  // que se abrió.
  useEffect(() => {
    if (abierta) setEnCurso(elegidas);
  }, [abierta, elegidas]);

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Tus atajos"
      pie={
        <div className="flex flex-wrap gap-e2">
          <Boton tono="texto" onClick={alCerrar}>
            Dejarlo
          </Boton>
          <Boton
            tono="texto"
            onClick={() => {
              alVolverALosDeMiPuesto();
              alCerrar();
            }}
          >
            Los de mi puesto
          </Boton>
          <Boton
            tono="principal"
            onClick={() => {
              alCambiar(enCurso);
              alCerrar();
            }}
          >
            Guardar
          </Boton>
        </div>
      }
    >
      <div className="flex flex-col gap-e3">
        <p className="text-secundario text-texto-suave">
          Los que uses de verdad. Salen en el botón <strong>+</strong> y en las acciones rápidas, y
          se guardan <strong>en este aparato</strong>.
        </p>

        <ul className="flex flex-col gap-e1">
          {puedo.map((accion) => {
            const puesta = enCurso.includes(accion.id);
            return (
              <li key={accion.id}>
                <label
                  className={clases(
                    'flex min-h-toque cursor-pointer items-start gap-e3 rounded-medio p-e2',
                    puesta ? 'bg-naranja-suave' : 'hover:bg-fondo',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={puesta}
                    onChange={() => {
                      setEnCurso(
                        puesta ? enCurso.filter((id) => id !== accion.id) : [...enCurso, accion.id],
                      );
                    }}
                    className="mt-[3px] size-[18px] shrink-0 accent-naranja"
                  />
                  <span className="mt-[2px] shrink-0 text-texto-suave">
                    <accion.icono size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-cuerpo font-medium">{accion.nombre}</span>
                    <span className="block text-secundario text-texto-suave">{accion.queHace}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Hoja>
  );
}
