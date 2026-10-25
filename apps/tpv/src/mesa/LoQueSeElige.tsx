import { useState } from 'react';
import {
  PESO_DE_UNA_RACION,
  centimos,
  conUnToqueBasta,
  cuantasSeEligen,
  elPrecioAPeso,
  elPrecioConLasOpciones,
  loQueFaltaPorElegir,
} from '@estook/dominio';
import { Boton, Hoja } from '@estook/ui';
import type { PlatoDeLaSala } from '../datos/tipos.ts';
import { euros } from '../logica/texto.ts';

/**
 * **Lo que se elige al pedir un plato** (T3 · 2, maqueta 5; Anexo 10.3 y 11.10): sus grupos
 * de opciones, una pregunta y un toque cada una, y lo que pesa si se vende a peso.
 *
 *   · **«¿Con qué?» de una copa**: un solo grupo obligatorio de una, y el toque en la opción ya
 *     la apunta. Dos toques en total (10.13)
 *   · con más de una pregunta, **«Añadir» se enciende cuando lo obligatorio está contestado**,
 *     y si no, dice qué falta
 *   · **a peso**: se escribe lo que pesa (la balanza, cuando haya una conectada) y el precio
 *     sale solo
 */
export function LoQueSeElige({
  plato,
  alCerrar,
  alElegir,
}: {
  readonly plato: PlatoDeLaSala;
  readonly alCerrar: () => void;
  readonly alElegir: (elegido: {
    readonly opciones: readonly { readonly id: string; readonly nombre: string }[];
    readonly pesoGramos: number | null;
    readonly precioCentimos: number;
  }) => void;
}) {
  const grupos = plato.grupos ?? [];
  const aPeso = plato.aPeso === true;
  const [elegidas, setElegidas] = useState<readonly string[]>([]);
  const [gramos, setGramos] = useState('');
  const pesa = Number.parseInt(gramos, 10);
  const pesoBien =
    !aPeso ||
    (Number.isInteger(pesa) &&
      pesa >= PESO_DE_UNA_RACION.minimo &&
      pesa <= PESO_DE_UNA_RACION.maximo);
  const deUnToque = conUnToqueBasta(grupos) && !aPeso;

  const todas = grupos.flatMap((g) => g.opciones);
  const lasElegidas = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const o = todas.find((x) => x.id === id);
      return o === undefined ? [] : [o];
    });
  const precioDe = (ids: readonly string[]) => {
    const base =
      aPeso && pesoBien
        ? elPrecioAPeso(centimos(plato.precioCentimos), pesa)
        : centimos(plato.precioCentimos);
    return elPrecioConLasOpciones(base, lasElegidas(ids));
  };
  const falta = loQueFaltaPorElegir(grupos, elegidas);

  function terminar(ids: readonly string[]) {
    alElegir({
      opciones: lasElegidas(ids).map((o) => ({ id: o.id, nombre: o.nombre })),
      pesoGramos: aPeso ? pesa : null,
      precioCentimos: precioDe(ids),
    });
  }

  function tocar(grupo: (typeof grupos)[number], opcionId: string) {
    const deEste = new Set(grupo.opciones.map((o) => o.id));
    const yaEsta = elegidas.includes(opcionId);
    let nuevas: readonly string[];
    if (grupo.maximo === 1) {
      // Una sola: tocar otra la cambia; tocar la misma, en una opcional, la quita.
      nuevas = [
        ...elegidas.filter((id) => !deEste.has(id)),
        ...(yaEsta && grupo.minimo === 0 ? [] : [opcionId]),
      ];
    } else if (yaEsta) {
      nuevas = elegidas.filter((id) => id !== opcionId);
    } else if (elegidas.filter((id) => deEste.has(id)).length >= grupo.maximo) {
      return;
    } else {
      nuevas = [...elegidas, opcionId];
    }
    setElegidas(nuevas);
    if (deUnToque) terminar(nuevas);
  }

  return (
    <Hoja
      abierta
      titulo={plato.nombre}
      alCerrar={alCerrar}
      pie={
        deUnToque ? undefined : (
          <div className="flex flex-col gap-e2">
            {falta !== null && falta.porque === 'falta' && (
              <p className="text-secundario font-semibold text-atencion">
                Falta: {falta.grupo.toLocaleLowerCase('es')}
              </p>
            )}
            {aPeso && !pesoBien && gramos !== '' && (
              <p className="text-secundario font-semibold text-atencion">
                Escribe lo que pesa, en gramos.
              </p>
            )}
            <Boton
              tono="principal"
              disabled={falta !== null || !pesoBien || (aPeso && gramos === '')}
              onClick={() => {
                terminar(elegidas);
              }}
            >
              Añadir · {euros(precioDe(elegidas))}
            </Boton>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-e4 pt-e2">
        <p className="text-secundario text-texto-suave">
          {aPeso ? `${euros(plato.precioCentimos)} € el kilo` : `${euros(plato.precioCentimos)} €`}
        </p>
        {aPeso && (
          <label className="flex flex-col gap-e1">
            <span className="text-etiqueta font-bold uppercase tracking-wide text-texto-tenue">
              ¿Cuánto pesa?
            </span>
            <span className="flex items-baseline gap-e3">
              <input
                inputMode="numeric"
                aria-label="Lo que pesa, en gramos"
                value={gramos}
                onChange={(e) => {
                  setGramos(e.target.value.replace(/\D/g, '').slice(0, 6));
                }}
                className="min-h-toque w-[8rem] rounded-grande border border-borde bg-fondo px-e3 text-right text-cifra-media font-bold tabular-nums"
              />
              <span className="text-seccion font-bold">g</span>
              {pesoBien && gramos !== '' && (
                <span className="text-secundario text-texto-suave">
                  = {euros(elPrecioAPeso(centimos(plato.precioCentimos), pesa))} €
                </span>
              )}
            </span>
          </label>
        )}
        {grupos.map((g) => {
          const deEste = g.opciones.filter((o) => elegidas.includes(o.id)).length;
          return (
            <div key={g.id} className="flex flex-col gap-e2">
              <span className="text-etiqueta font-bold uppercase tracking-wide text-texto-tenue">
                {g.nombre} · {cuantasSeEligen(g)}
              </span>
              <div
                role={g.maximo === 1 ? 'radiogroup' : 'group'}
                aria-label={g.nombre}
                className="flex flex-wrap gap-e2"
              >
                {g.opciones.map((o) => {
                  const puesta = elegidas.includes(o.id);
                  const llena = !puesta && g.maximo > 1 && deEste >= g.maximo;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={llena}
                      {...(g.maximo === 1
                        ? { role: 'radio', 'aria-checked': puesta }
                        : { 'aria-pressed': puesta })}
                      onClick={() => {
                        tocar(g, o.id);
                      }}
                      className={[
                        'min-h-toque rounded-grande px-e4 font-semibold disabled:opacity-40',
                        puesta ? 'bg-texto text-fondo' : 'border-2 border-borde',
                      ].join(' ')}
                    >
                      {o.nombre}
                      {o.precioCentimos !== 0 && (
                        <span className={puesta ? '' : 'text-texto-suave'}>
                          {' '}
                          {o.precioCentimos > 0 ? '+' : '−'}
                          {euros(Math.abs(o.precioCentimos))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Hoja>
  );
}
