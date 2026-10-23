import { useState } from 'react';
import type { ErrorDeLaApi } from '@estook/cliente-api';
import { Boton, CAJA, Envoltorio, ErrorEnCristiano, Hoja } from '@estook/ui';
import { usarAcciones } from '../ganchos/usarLaSala.ts';
import { cambiarLinea, quitarLinea, type Borrador } from '../logica/comanda.ts';
import { elPase, type GrupoDeLaCuenta, type LineaALaVista } from '../logica/laCuenta.ts';
import { euros } from '../logica/texto.ts';

/**
 * La cuenta de la mesa, por grupos (`laCuenta.ts`): bebidas, menús, el 1.º y el 2.º con
 * cómo van, y lo nuevo. Tocar un plato abre lo que se puede hacer con él (0106, «Nota»):
 *
 *   · **sin mandar**: cuántos, la nota, en qué pase sale, o quitarlo sin más
 *   · **ya en cocina**: cambiar la nota (la cocina ve CAMBIO), devolverlo si salió (VUELVE)
 *     o quitarlo con su motivo, que lo aprueba un jefe (la cocina ve ANULADO)
 */
export function LaCuenta({
  grupos,
  borrador,
  alCambiarElBorrador,
  porPases,
  pases,
  alMarchar,
}: {
  readonly grupos: readonly GrupoDeLaCuenta[];
  readonly borrador: Borrador;
  readonly alCambiarElBorrador: (b: Borrador) => void;
  readonly porPases: boolean;
  readonly pases: readonly number[];
  /**
   * Marchar un pase que espera, cuando el camarero quiera: la cocina no ve si la mesa va
   * acabando, y a veces se marcha antes de que salga todo lo de antes (0106).
   */
  readonly alMarchar: (pase: number) => void;
}) {
  const [tocada, setTocada] = useState<LineaALaVista | null>(null);

  if (grupos.length === 0) {
    return (
      <p className="py-e6 text-center text-texto-suave">Aún no han pedido. Primero, las bebidas.</p>
    );
  }

  return (
    <div className="flex flex-col gap-e4 py-e4">
      {grupos.map((g) => (
        <div key={g.clave} className="flex flex-col gap-e1">
          <div className="flex items-center justify-between gap-e2">
            <h2
              className={[
                'text-etiqueta font-bold uppercase tracking-wide',
                g.como === 'ha_salido'
                  ? 'text-bien'
                  : g.como === 'en_marcha'
                    ? 'text-info'
                    : g.como === 'en_espera'
                      ? 'text-atencion'
                      : g.clave === 'nuevo'
                        ? 'text-naranja'
                        : 'text-texto-suave',
              ].join(' ')}
            >
              {g.titulo}
            </h2>
            {g.como === 'en_espera' && (
              <Boton
                tono="secundario"
                tamano="s"
                onClick={() => {
                  alMarchar(Number(g.clave.replace('pase-', '')));
                }}
              >
                Marchar ya
              </Boton>
            )}
          </div>
          {g.lineas.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setTocada(l);
              }}
              className={[
                'flex min-h-toque items-start justify-between gap-e3 rounded-medio px-e2 py-e1 text-left',
                l.nueva ? 'bg-naranja-suave' : 'hover:bg-fondo',
                l.quitada !== null ? 'text-texto-tenue line-through' : '',
              ].join(' ')}
            >
              <span className="flex min-w-0 flex-col">
                <span>
                  <b>{l.cantidad}</b> {l.nombre}
                  {l.delMenu && (
                    <span className="text-secundario text-texto-suave"> · del menú</span>
                  )}
                  {l.nueva && l.pase !== null && g.clave === 'nuevo' && (
                    <span className="text-secundario text-texto-suave"> · {elPase(l.pase)}</span>
                  )}
                </span>
                {l.nota !== null && (
                  <span className="text-secundario text-atencion no-underline">{l.nota}</span>
                )}
                {l.vuelve !== null && l.quitada === null && (
                  <span className="text-secundario font-semibold text-mal">Vuelve: {l.vuelve}</span>
                )}
                {l.quitada !== null && (
                  <span className="text-secundario">
                    Quitado{l.quitada === '' ? '' : `: ${l.quitada}`}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums">
                {l.salio && l.quitada === null && <span className="mr-e2 text-bien">✓</span>}
                {l.importeCentimos === null ? '' : euros(l.importeCentimos)}
              </span>
            </button>
          ))}
        </div>
      ))}

      {tocada !== null && (
        <ElPlato
          linea={tocada}
          borrador={borrador}
          alCambiarElBorrador={alCambiarElBorrador}
          porPases={porPases}
          pases={pases}
          alCerrar={() => {
            setTocada(null);
          }}
        />
      )}
    </div>
  );
}

const EJEMPLO_DE_NOTA = 'Lo que necesite la cocina: sin cebolla, poco hecho, el pan aparte…';

function ElPlato({
  linea,
  borrador,
  alCambiarElBorrador,
  porPases,
  pases,
  alCerrar,
}: {
  readonly linea: LineaALaVista;
  readonly borrador: Borrador;
  readonly alCambiarElBorrador: (b: Borrador) => void;
  readonly porPases: boolean;
  readonly pases: readonly number[];
  readonly alCerrar: () => void;
}) {
  const ejecutar = usarAcciones();
  const enElBorrador = borrador.find((l) => l.id === linea.id);
  const [cantidad, setCantidad] = useState(linea.cantidad);
  const [nota, setNota] = useState(linea.nota ?? '');
  const [pase, setPase] = useState(linea.pase);
  const [motivo, setMotivo] = useState('');
  const [modo, setModo] = useState<'cambiar' | 'quitar' | 'devolver'>('cambiar');
  const [haciendo, setHaciendo] = useState(false);
  const [fallo, setFallo] = useState<ErrorDeLaApi | null>(null);
  const esMenu = enElBorrador?.menuId != null;
  const opcionesDePase = [...new Set([...pases, 1, 2, 3, linea.pase ?? 1])].sort((a, b) => a - b);

  async function hacer(nombre: string, entrada: unknown) {
    setHaciendo(true);
    setFallo(null);
    const hecho = await ejecutar(nombre, entrada);
    setHaciendo(false);
    if (hecho.ok) alCerrar();
    else setFallo(hecho.error);
  }

  if (linea.quitada !== null) {
    return (
      <Hoja abierta alCerrar={alCerrar} titulo={linea.nombre}>
        <p className="pb-e4">Quitado{linea.quitada === '' ? '.' : `: «${linea.quitada}».`}</p>
      </Hoja>
    );
  }

  // Lo nuevo, aún en la tablet: se cambia todo sin preguntar a nadie.
  if (enElBorrador !== undefined) {
    return (
      <Hoja
        abierta
        alCerrar={alCerrar}
        titulo={linea.nombre}
        pie={
          <div className="flex gap-e2">
            <Boton
              tono="peligro"
              onClick={() => {
                alCambiarElBorrador(quitarLinea(borrador, linea.id));
                alCerrar();
              }}
            >
              Quitar
            </Boton>
            <div className="flex-1">
              <Boton
                tono="principal"
                ancho
                onClick={() => {
                  alCambiarElBorrador(
                    cambiarLinea(borrador, linea.id, {
                      cantidad,
                      nota,
                      ...(pase === null ? {} : { pase }),
                    }),
                  );
                  alCerrar();
                }}
              >
                Guardar
              </Boton>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-e5 pt-e2">
          {!esMenu && !linea.delMenu && <Contador valor={cantidad} alCambiar={setCantidad} />}
          {!esMenu && (
            <Envoltorio id="nota-del-plato" etiqueta="Nota para cocina">
              <textarea
                id="nota-del-plato"
                rows={2}
                maxLength={200}
                className={[CAJA, 'min-h-[5rem] py-e2'].join(' ')}
                placeholder={EJEMPLO_DE_NOTA}
                value={nota}
                onChange={(e) => {
                  setNota(e.target.value);
                }}
              />
            </Envoltorio>
          )}
          {porPases && linea.pase !== null && (
            <ElegirPase opciones={opcionesDePase} elegido={pase ?? 1} alElegir={setPase} />
          )}
        </div>
      </Hoja>
    );
  }

  // Ya en la API: guardado sin mandar, o en cocina.
  const enCocina = !linea.guardada;
  return (
    <Hoja abierta alCerrar={alCerrar} titulo={`${linea.cantidad} ${linea.nombre}`}>
      <div className="flex flex-col gap-e4 pt-e2 pb-e4">
        <div className="flex gap-e2" role="tablist" aria-label="Qué hacer con el plato">
          <Pestana
            puesta={modo === 'cambiar'}
            onClick={() => {
              setModo('cambiar');
            }}
          >
            La nota
          </Pestana>
          {linea.salio && (
            <Pestana
              puesta={modo === 'devolver'}
              onClick={() => {
                setModo('devolver');
              }}
            >
              Devolver
            </Pestana>
          )}
          <Pestana
            puesta={modo === 'quitar'}
            onClick={() => {
              setModo('quitar');
            }}
          >
            Quitar
          </Pestana>
        </div>

        {modo === 'cambiar' && (
          <>
            <Envoltorio
              id="nota-en-cocina"
              etiqueta="Nota para cocina"
              {...(enCocina ? { ayuda: 'La cocina lo verá marcado como CAMBIO.' } : {})}
            >
              <textarea
                id="nota-en-cocina"
                rows={2}
                maxLength={200}
                className={[CAJA, 'min-h-[5rem] py-e2'].join(' ')}
                placeholder={EJEMPLO_DE_NOTA}
                value={nota}
                onChange={(e) => {
                  setNota(e.target.value);
                }}
              />
            </Envoltorio>
            <Boton
              tono="principal"
              cargando={haciendo}
              onClick={() => {
                void hacer('cambiar_plato_de_la_mesa', {
                  linea_id: linea.id,
                  nota: nota.trim() === '' ? null : nota.trim(),
                });
              }}
            >
              Guardar la nota
            </Boton>
          </>
        )}

        {modo === 'devolver' && (
          <>
            <Envoltorio
              id="motivo-de-vuelve"
              etiqueta="¿Qué le pasa?"
              ayuda="Vuelve a cocina arriba del todo, marcado VUELVE."
            >
              <input
                id="motivo-de-vuelve"
                className={CAJA}
                maxLength={200}
                placeholder="Más hecho, está frío…"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                }}
              />
            </Envoltorio>
            <Boton
              tono="principal"
              disabled={motivo.trim() === ''}
              cargando={haciendo}
              onClick={() => {
                void hacer('devolver_a_cocina', { linea_id: linea.id, motivo: motivo.trim() });
              }}
            >
              Devolver a cocina
            </Boton>
          </>
        )}

        {modo === 'quitar' &&
          (enCocina ? (
            <>
              <Envoltorio
                id="motivo-de-quitar"
                etiqueta="¿Por qué se quita?"
                ayuda="Ya está en cocina: lo quita un jefe de sala, y la cocina lo ve ANULADO."
              >
                <input
                  id="motivo-de-quitar"
                  className={CAJA}
                  maxLength={300}
                  placeholder="No lo pidieron, se equivocó de mesa…"
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value);
                  }}
                />
              </Envoltorio>
              <Boton
                tono="peligro"
                disabled={motivo.trim().length < 3}
                cargando={haciendo}
                onClick={() => {
                  void hacer('quitar_plato', { linea_id: linea.id, motivo: motivo.trim() });
                }}
              >
                Quitar de cocina
              </Boton>
            </>
          ) : (
            <Boton
              tono="peligro"
              cargando={haciendo}
              onClick={() => {
                void hacer('quitar_plato', { linea_id: linea.id });
              }}
            >
              Quitar
            </Boton>
          ))}

        {fallo !== null && <ErrorEnCristiano error={fallo} />}
      </div>
    </Hoja>
  );
}

function Pestana({
  puesta,
  onClick,
  children,
}: {
  readonly puesta: boolean;
  readonly onClick: () => void;
  readonly children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={puesta}
      onClick={onClick}
      className={[
        'min-h-toque flex-1 rounded-medio px-e3 font-semibold',
        puesta ? 'bg-charcoal text-white' : 'border border-borde bg-superficie',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function Contador({
  valor,
  alCambiar,
  etiqueta = 'Cuántos',
  minimo = 1,
}: {
  readonly valor: number;
  readonly alCambiar: (n: number) => void;
  readonly etiqueta?: string;
  readonly minimo?: number;
}) {
  return (
    <div className="flex items-center gap-e4">
      <span className="font-semibold">{etiqueta}</span>
      <div className="flex items-center gap-e2">
        <button
          type="button"
          aria-label="Uno menos"
          disabled={valor <= minimo}
          onClick={() => {
            alCambiar(Math.max(minimo, valor - 1));
          }}
          className="size-toque-cocina rounded-grande border border-borde bg-superficie text-seccion font-bold disabled:opacity-40"
        >
          −
        </button>
        <span
          className="min-w-[2ch] text-center text-seccion font-bold tabular-nums"
          aria-live="polite"
        >
          {valor}
        </span>
        <button
          type="button"
          aria-label="Uno más"
          onClick={() => {
            alCambiar(valor + 1);
          }}
          className="size-toque-cocina rounded-grande border border-borde bg-superficie text-seccion font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ElegirPase({
  opciones,
  elegido,
  alElegir,
  etiqueta = 'Sale en el',
}: {
  readonly opciones: readonly number[];
  readonly elegido: number;
  readonly alElegir: (n: number) => void;
  readonly etiqueta?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-e2" role="group" aria-label={etiqueta}>
      <span className="font-semibold">{etiqueta}</span>
      {opciones.map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={elegido === n}
          onClick={() => {
            alElegir(n);
          }}
          className={[
            'min-h-toque min-w-[3.5rem] rounded-medio px-e3 font-bold',
            elegido === n ? 'bg-charcoal text-white' : 'border border-borde bg-superficie',
          ].join(' ')}
        >
          {elPase(n)}
        </button>
      ))}
    </div>
  );
}
