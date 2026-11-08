import { useState } from 'react';
import {
  CUADRANTES,
  QUE_ES_CADA_CUADRANTE,
  centimos,
  conSimbolo,
  laCartaEnCuatro,
  type Cuadrante,
} from '@estook/dominio';
import { Etiqueta, clases } from '@estook/ui';
import type { PlatoVendido } from './contratoDeLoQueSeVende.ts';

/**
 * «Tu carta en cuatro» (la pausa del 8-nov, 0142): estrellas, caballos, puzzles y perros, la
 * ingeniería de menú que Richi pidió con M10 («no te olvides»). Cada plato es un punto: a la
 * derecha los que más se venden, arriba los que más dejan; las líneas de puntos son los cortes
 * del método (`laCartaEnCuatro`, en el dominio). Solo la comida, y solo con escandallo.
 */
const COLOR: Readonly<Record<Cuadrante, string>> = {
  estrella: 'var(--color-bien)',
  caballo: 'var(--color-info)',
  puzzle: 'var(--color-naranja)',
  perro: 'var(--color-texto-tenue)',
};

const TONO: Readonly<Record<Cuadrante, 'bien' | 'info' | 'marca' | 'neutro'>> = {
  estrella: 'bien',
  caballo: 'info',
  puzzle: 'marca',
  perro: 'neutro',
};

export function TuCartaEnCuatro({ platos }: { readonly platos: readonly PlatoVendido[] }) {
  const comida = platos.filter((p) => !p.bebida);
  const carta = laCartaEnCuatro(
    comida.map((p) => ({ id: p.id, uds: p.uds, margenPorUnidad: p.margenPorUnidad })),
  );
  const [encima, setEncima] = useState<string | null>(null);

  if (carta === null) {
    return (
      <p className="text-secundario text-texto-suave">
        Hacen falta al menos cuatro platos vendidos con su escandallo para compararlos entre sí.
      </p>
    );
  }

  const conSuCuadrante = comida.flatMap((p) => {
    const cual = carta.deCadaPlato.get(p.id);
    return cual === undefined || p.margenPorUnidad === null
      ? []
      : [{ ...p, cuadrante: cual, margenPorUnidad: p.margenPorUnidad }];
  });
  const maxUds = Math.max(...conSuCuadrante.map((p) => p.uds), carta.corteDeUnidades) * 1.1;
  const margenes = conSuCuadrante.map((p) => p.margenPorUnidad);
  const maxMargen = Math.max(...margenes, carta.corteDeMargen) * 1.1;
  const minMargen = Math.min(0, ...margenes);
  const W = 440;
  const H = 280;
  const m = { izq: 52, der: 12, arr: 12, aba: 32 };
  const x = (uds: number) => m.izq + (uds / maxUds) * (W - m.izq - m.der);
  const y = (margen: number) =>
    H - m.aba - ((margen - minMargen) / (maxMargen - minMargen)) * (H - m.arr - m.aba);
  const elDeEncima = conSuCuadrante.find((p) => p.id === encima);

  return (
    <div className="grid gap-e4 @[40rem]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="relative">
        <svg
          viewBox={`0 0 ${String(W)} ${String(H)}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Cada plato según las raciones vendidas y lo que deja cada una"
        >
          {[0, 0.5, 1].map((parte) => {
            const valor = minMargen + parte * (maxMargen - minMargen);
            return (
              <g key={parte}>
                <line
                  x1={m.izq}
                  x2={W - m.der}
                  y1={y(valor)}
                  y2={y(valor)}
                  stroke="var(--color-borde)"
                />
                <text
                  x={m.izq - 6}
                  y={y(valor) + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--color-texto-suave)"
                >
                  {conSimbolo(centimos(Math.round(valor)))}
                </text>
              </g>
            );
          })}
          <text
            x={(W + m.izq) / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-texto-suave)"
          >
            raciones vendidas →
          </text>
          <line
            x1={x(carta.corteDeUnidades)}
            x2={x(carta.corteDeUnidades)}
            y1={m.arr}
            y2={H - m.aba}
            stroke="var(--color-texto-tenue)"
            strokeDasharray="4 4"
          />
          <line
            x1={m.izq}
            x2={W - m.der}
            y1={y(carta.corteDeMargen)}
            y2={y(carta.corteDeMargen)}
            stroke="var(--color-texto-tenue)"
            strokeDasharray="4 4"
          />
          {conSuCuadrante.map((p) => (
            <circle
              key={p.id}
              cx={x(p.uds)}
              cy={y(p.margenPorUnidad)}
              r={encima === p.id ? 8 : 6}
              fill={COLOR[p.cuadrante]}
              stroke="var(--color-superficie)"
              strokeWidth={2}
              className="cursor-pointer"
              onMouseEnter={() => {
                setEncima(p.id);
              }}
              onMouseLeave={() => {
                setEncima(null);
              }}
              onClick={() => {
                setEncima(p.id);
              }}
            >
              <title>{`${p.nombre}: ${String(p.uds)} vendidos, deja ${conSimbolo(centimos(p.margenPorUnidad))} cada uno`}</title>
            </circle>
          ))}
        </svg>
        <p className="min-h-[1.5rem] text-secundario text-texto-suave" aria-live="polite">
          {elDeEncima === undefined
            ? 'Toca un punto para ver el plato.'
            : `${elDeEncima.nombre}: ${String(elDeEncima.uds)} vendidos, deja ${conSimbolo(centimos(elDeEncima.margenPorUnidad))} cada uno · ${QUE_ES_CADA_CUADRANTE[elDeEncima.cuadrante].nombre.toLowerCase()}`}
        </p>
      </div>
      <ul className="flex flex-col gap-e3">
        {CUADRANTES.map((cual) => {
          const suyos = conSuCuadrante.filter((p) => p.cuadrante === cual);
          return (
            <li key={cual} className="flex flex-col gap-e1">
              <span className="flex items-center gap-e2">
                <span
                  aria-hidden
                  className={clases('size-3 rounded-redondo')}
                  style={{ background: COLOR[cual] }}
                />
                <Etiqueta tono={TONO[cual]}>
                  {suyos.length} {QUE_ES_CADA_CUADRANTE[cual].nombre.toLowerCase()}
                </Etiqueta>
              </span>
              <span className="text-secundario">{QUE_ES_CADA_CUADRANTE[cual].queHacer}</span>
              {suyos.length > 0 && (
                <span className="text-etiqueta text-texto-suave">
                  {suyos.map((p) => p.nombre).join(' · ')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Los cuatro contadores, para el resumen plegado. */
export function CuantosDeCadaUno({ platos }: { readonly platos: readonly PlatoVendido[] }) {
  const carta = laCartaEnCuatro(
    platos
      .filter((p) => !p.bebida)
      .map((p) => ({ id: p.id, uds: p.uds, margenPorUnidad: p.margenPorUnidad })),
  );
  if (carta === null) return null;
  const cuantos = (cual: Cuadrante) =>
    [...carta.deCadaPlato.values()].filter((c) => c === cual).length;
  return (
    <span className="flex flex-wrap gap-e1">
      {CUADRANTES.map((cual) => (
        <Etiqueta key={cual} tono={TONO[cual]}>
          {cuantos(cual)} {QUE_ES_CADA_CUADRANTE[cual].nombre.toLowerCase()}
        </Etiqueta>
      ))}
    </span>
  );
}
