import { useId } from 'react';
import { clases } from '../clases.ts';
import { ANCHO, formasDeLaTendencia } from './formasDeLaTendencia.ts';

/**
 * La tendencia · una línea con su área, de las que caben en un widget (M7, 0039).
 *
 * ── Por qué una línea y no la tira ──────────────────────────────────────────
 *
 * La `Tira` contesta «¿qué día fue el peor?», y para eso las barras son lo mejor.
 * Esto contesta **«¿hacia dónde va?»**, que es lo que pedía Richi con «gráficas y
 * flechas de subida y bajada», y para una dirección la forma que se lee de un
 * vistazo es una línea. Es la que ponen Stripe, Shopify o la app Salud del iPhone
 * en sus tarjetas, y por la misma razón.
 *
 * Tampoco es `Grafica`: Recharts pesa más de cien kilobytes, y esto es un camino
 * de SVG.
 *
 * ── Los días sin dato, en discontinuo ───────────────────────────────────────
 *
 * Un día sin caja cerrada no vendió cero, así que la línea **no baja a cero**. Hasta
 * el 25-sep además se cortaba, y un día suelto entre dos huecos salía como una raya
 * corta y achatada a la derecha de la tarjeta, que en el móvil de Richi parecía un
 * fallo (lo era: un círculo dentro de un SVG que se estira sale como una raya). Ahora
 * se hace como la app Salud del iPhone: los días seguidos, en trazo entero; **el
 * hueco, en discontinuo y más tenue**, que dice «aquí no hay dato» sin romper la
 * forma; y un punto de verdad en cada día suelto y en el último. El pie ya dice
 * cuántos días tienen dato.
 *
 * ── Y se lee sin verla ───────────────────────────────────────────────────────
 *
 * El SVG es decoración: la cifra y su comparación viven fuera, escritas. Aquí va
 * el resumen en palabras para quien usa un lector de pantalla (B8).
 */
export interface TendenciaProps {
  /** De viejo a nuevo. Nulo = ese día no hay dato. */
  readonly valores: readonly (number | null)[];
  /** Qué cuenta, para quien no la ve. */
  readonly titulo: string;
  readonly color?: string;
  readonly alto?: number;
  /** Cómo se escribe un valor al leerlo. */
  readonly formato?: (valor: number) => string;
}

export function Tendencia({
  valores,
  titulo,
  color = 'var(--color-naranja)',
  alto = 48,
  formato = (valor) => String(valor),
}: TendenciaProps) {
  const degradado = useId();
  const formas = formasDeLaTendencia(valores, alto);
  if (formas === null) return null;

  const conDato = valores.filter((v) => v !== null).length;
  const ultimoConDato = [...valores.entries()].reverse().find(([, v]) => v !== null);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${ANCHO} ${alto}`}
        preserveAspectRatio="none"
        // Se dibuja de izquierda a derecha recortando la caja entera, y no con
        // `stroke-dasharray`: con un trazo que no escala, Chrome calcula los
        // guiones en píxeles de pantalla y la línea salía a trozos.
        className="anima-trazo block w-full overflow-visible"
        style={{ height: `${alto}px` }}
        aria-hidden
      >
        <defs>
          <linearGradient id={degradado} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {formas.area !== null && <path d={formas.area} fill={`url(#${degradado})`} />}
        {formas.puentes.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={color}
            strokeOpacity={0.5}
            strokeWidth={1.5}
            // Los guiones en píxeles de pantalla, que es lo que se quiere aquí:
            // iguales en una tarjeta estrecha y en una ancha.
            strokeDasharray="3 4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {formas.tramos.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Los puntos, fuera del SVG estirado: ahí serían rayas. */}
      {formas.puntos.map((p) => (
        <span
          key={p.i}
          aria-hidden
          className="pointer-events-none absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-redondo ring-2 ring-superficie"
          style={{ left: `${String(p.x)}%`, top: `${String(p.y)}px`, background: color }}
        />
      ))}

      <p className={clases('sr-only')}>
        {titulo}. {valores.length} días, {conDato} con dato. Lo más alto, {formato(formas.mayor)}.
        {ultimoConDato === undefined ? '' : ` El último, ${formato(ultimoConDato[1] ?? 0)}.`}
      </p>
    </div>
  );
}
