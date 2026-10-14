import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clases } from '../../clases.ts';
import type { PuntoDeGrafica } from './tipos.ts';
import { ANCHO, elDiaMasCerca, formasDeLaLineaViva } from './formasDeLaLineaViva.ts';

/**
 * La línea viva · la gráfica pequeña de cada widget (las bases firmes, 0084).
 *
 * Hasta el 14-oct las gráficas pequeñas eran Recharts, y eso tenía dos costes que Richi
 * vio sin saber de dónde venían:
 *
 *   · **«La app carga más lenta».** Cada widget esperaba a un trozo de 380 KB (sin
 *     comprimir) que no se guarda al instalar, para dibujar una raya de 60 px.
 *   · **«El valor no se ve porque sale del widget».** El bocadillo de Recharts se
 *     pintaba debajo del punto, y en un punto bajo caía fuera de la tarjeta.
 *
 * Esta se dibuja a mano, como `Tendencia`: unos cientos de bytes, al momento. Y **no
 * lleva bocadillo**: al pasar el dedo o el ratón dice qué día es a quien la pinta
 * (`alSenalar`), y el widget cambia su número grande por el de ese día. Es lo que
 * hacen las apps de bolsa y de banca: el número está siempre en el mismo sitio y
 * nunca se sale de nada.
 *
 * **La línea gris** es el periodo anterior, del mismo largo y alineado día a día:
 * «comparar sin leer números». Recharts se queda para la gráfica grande del detalle,
 * con sus ejes, que sí se carga aparte y solo al abrirla.
 */
export interface LineaVivaProps {
  /** Lo que dice un lector de pantalla, y el título de la tabla escondida. */
  readonly titulo: string;
  readonly puntos: readonly PuntoDeGrafica[];
  /** El periodo anterior, alineado con `puntos`: la línea gris. */
  readonly anteriores?: readonly (number | null)[] | undefined;
  readonly forma: 'area' | 'barras';
  /** El color de la serie: el acento de su app. */
  readonly color: string;
  readonly alto: number;
  /** El último punto resaltado: es «hoy», el que más se mira. */
  readonly resaltarElUltimo?: boolean;
  /** Qué día señala el dedo o el ratón; nulo al soltar. */
  readonly alSenalar?: (indice: number | null) => void;
  /** Para la tabla escondida y el lector: cómo se escribe un valor. */
  readonly formato: (valor: number) => string;
}

export function LineaViva({
  titulo,
  puntos,
  anteriores,
  forma,
  color,
  alto,
  resaltarElUltimo = false,
  alSenalar,
  formato,
}: LineaVivaProps) {
  const id = useId().replace(/:/g, '');
  const [senalado, setSenalado] = useState<number | null>(null);
  const formas = useMemo(
    () =>
      formasDeLaLineaViva(
        puntos.map((p) => p.valor),
        anteriores,
        alto,
        forma,
      ),
    [puntos, anteriores, alto, forma],
  );

  const senalar = (indice: number | null) => {
    setSenalado(indice);
    alSenalar?.(indice);
  };

  const alMoverse = (evento: PointerEvent<HTMLDivElement>) => {
    const caja = evento.currentTarget.getBoundingClientRect();
    if (caja.width === 0) return;
    const indice = elDiaMasCerca(formas.xDeCadaDia, (evento.clientX - caja.left) / caja.width);
    if (indice !== senalado) senalar(indice);
  };

  // Con el teclado también: las flechas recorren los días y Escape suelta.
  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight' && evento.key !== 'Escape') {
      return;
    }
    evento.preventDefault();
    if (evento.key === 'Escape') {
      senalar(null);
      return;
    }
    const ultimo = puntos.length - 1;
    const desde = senalado ?? ultimo;
    senalar(Math.min(Math.max(desde + (evento.key === 'ArrowRight' ? 1 : -1), 0), ultimo));
  };

  const elSenalado = senalado === null ? null : (formas.puntos[senalado] ?? null);
  const xSenalado = senalado === null ? null : (formas.xDeCadaDia[senalado] ?? null);
  const ultimoConDato = [...formas.puntos].reverse().find((p) => p !== null) ?? null;
  const puntoVisible = elSenalado ?? (resaltarElUltimo && forma === 'area' ? ultimoConDato : null);

  return (
    <figure className="relative m-0 select-none">
      <div
        role="img"
        aria-label={titulo}
        tabIndex={0}
        onPointerMove={alMoverse}
        onPointerDown={alMoverse}
        onPointerLeave={() => {
          if (senalado !== null) senalar(null);
        }}
        onPointerCancel={() => {
          if (senalado !== null) senalar(null);
        }}
        onBlur={() => {
          if (senalado !== null) senalar(null);
        }}
        onKeyDown={alTeclear}
        // Deslizar de lado señala; de arriba abajo sigue bajando la pantalla.
        className="relative touch-pan-y rounded-medio outline-none focus-visible:ring-2 focus-visible:ring-naranja"
        style={{ height: alto }}
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${String(ANCHO)} ${String(alto)}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <linearGradient id={`velo-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* El periodo anterior, gris y discontinuo, debajo de todo. */}
          {formas.anterior !== null && (
            <path
              d={formas.anterior}
              fill="none"
              stroke="var(--color-texto-tenue)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {formas.area !== null && <path d={formas.area} fill={`url(#velo-${id})`} />}
          {formas.linea !== null && (
            <path
              d={formas.linea}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {formas.barras.map((barra) => {
            const viva =
              senalado === null
                ? !resaltarElUltimo || barra.i === puntos.length - 1
                : barra.i === senalado;
            return (
              <path
                key={barra.i}
                d={barra.d}
                fill={color}
                fillOpacity={viva ? 1 : 0.35}
                className="transition-[fill-opacity] duration-150"
              />
            );
          })}
        </svg>

        {/* La raya del día señalado, fuera del SVG para que no se estire. */}
        {xSenalado !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-px bg-texto-suave/50"
            style={{ left: `${String((xSenalado / ANCHO) * 100)}%` }}
          />
        )}
        {/*
          Sin nadie que enseñe el valor fuera, lo dice ella **dentro de su hueco**:
          arriba, y al lado contrario del día señalado para no taparlo.
        */}
        {alSenalar === undefined && senalado !== null && xSenalado !== null && (
          <span
            aria-hidden
            className={clases(
              'pointer-events-none absolute top-0 z-[1] whitespace-nowrap rounded-chico border border-borde bg-superficie px-e2 py-[1px] text-etiqueta shadow-s1',
              xSenalado > ANCHO / 2 ? 'left-0' : 'right-0',
            )}
          >
            <span className="text-texto-suave">{puntos[senalado]?.etiqueta}</span>{' '}
            <span className="font-semibold text-texto">
              {(() => {
                const valor = puntos[senalado]?.valor ?? null;
                return valor === null ? 'sin dato' : formato(valor);
              })()}
            </span>
          </span>
        )}
        {puntoVisible !== null && forma === 'area' && (
          <span
            aria-hidden
            className={clases(
              'pointer-events-none absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-redondo border-2 border-superficie',
              elSenalado !== null && 'size-[11px]',
            )}
            style={{
              left: `${String((puntoVisible.x / ANCHO) * 100)}%`,
              top: `${String(puntoVisible.yEnPorcentaje)}%`,
              background: color,
            }}
          />
        )}
      </div>

      <table className="sr-only">
        <caption>{titulo}</caption>
        <tbody>
          {puntos.map((p, i) => (
            <tr key={`${p.etiqueta}-${String(i)}`}>
              <th scope="row">{p.etiqueta}</th>
              <td>{p.valor === null ? 'sin dato' : formato(p.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
