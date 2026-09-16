import { useId } from 'react';
import { clases } from '../clases.ts';

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
 * ── Los días sin dato, como un hueco ────────────────────────────────────────
 *
 * Un día sin caja cerrada no vendió cero, así que **la línea se corta** y sigue
 * en el siguiente día con dato. Unirla por encima o bajarla a cero serían dos
 * formas distintas de inventarse ese día.
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
  const conDato = valores.filter((v): v is number => v !== null);
  if (valores.length < 2 || conDato.length === 0) return null;

  const ancho = 100;
  const menor = Math.min(...conDato, 0);
  const mayor = Math.max(...conDato);
  const rango = mayor - menor || 1;
  // Un margen arriba y abajo para que el trazo no se corte en el borde.
  const margen = 3;
  const x = (i: number) => (i / (valores.length - 1)) * ancho;
  const y = (v: number) => alto - margen - ((v - menor) / rango) * (alto - margen * 2);

  // Tramos seguidos con dato: cada uno es su línea y su área.
  const tramos: { i: number; v: number }[][] = [];
  valores.forEach((valor, i) => {
    if (valor === null) {
      if ((tramos.at(-1)?.length ?? 0) > 0) tramos.push([]);
      return;
    }
    if (tramos.length === 0) tramos.push([]);
    tramos.at(-1)?.push({ i, v: valor });
  });

  const ultimoConDato = [...valores.entries()].reverse().find(([, v]) => v !== null);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
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

        {tramos
          .filter((tramo) => tramo.length > 0)
          .map((tramo, t) => {
            const linea = tramo
              .map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(2)},${y(p.v).toFixed(2)}`)
              .join(' ');
            const primero = tramo[0];
            const ultimo = tramo.at(-1);
            if (primero === undefined || ultimo === undefined) return null;
            const area = `${linea} L${x(ultimo.i).toFixed(2)},${alto} L${x(primero.i).toFixed(2)},${alto} Z`;
            return (
              <g key={t}>
                <path d={area} fill={`url(#${degradado})`} />
                {tramo.length === 1 ? (
                  <circle cx={x(primero.i)} cy={y(primero.v)} r={1.6} fill={color} />
                ) : (
                  <path
                    d={linea}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>
            );
          })}
      </svg>

      <p className={clases('sr-only')}>
        {titulo}. {valores.length} días, {conDato.length} con dato. Lo más alto, {formato(mayor)}.
        {ultimoConDato === undefined ? '' : ` El último, ${formato(ultimoConDato[1] ?? 0)}.`}
      </p>
    </div>
  );
}
