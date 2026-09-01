import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GraficaProps } from './grafica-tipos.ts';

/**
 * El dibujo de la grafica, con Recharts.
 *
 * **Este fichero no se importa nunca directamente.** Se llega a el por el `lazy`
 * de `Grafica.tsx`, y esa es la unica forma: importarlo a mano mete Recharts en
 * el paquete inicial y revienta el presupuesto de B7.
 *
 * Todo lo visual sale de las fichas de B1, con los mismos tamanos de letra y los
 * mismos grises que el resto. Una grafica con su propia tipografia y sus propios
 * grises se ve pegada, aunque nadie sepa decir por que.
 */
type Props = Omit<GraficaProps, 'cuandoNoHay'>;

const GRIS = 'var(--color-texto-suave)';
const LINEA = 'var(--color-borde)';

export function GraficaDibujo({
  titulo,
  datos,
  eje,
  series,
  forma = 'lineas',
  alto = 220,
  formato,
}: Props) {
  const ejes = (
    <>
      <CartesianGrid stroke={LINEA} strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey={eje}
        stroke={LINEA}
        tick={{ fill: GRIS, fontSize: 11 }}
        tickLine={false}
        axisLine={{ stroke: LINEA }}
      />
      <YAxis
        stroke={LINEA}
        tick={{ fill: GRIS, fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={56}
        {...(formato ? { tickFormatter: formato } : {})}
      />
      <Tooltip
        cursor={{ fill: 'var(--color-fondo)' }}
        contentStyle={{
          background: 'var(--color-superficie)',
          border: `1px solid ${LINEA}`,
          borderRadius: 'var(--radius-medio)',
          boxShadow: 'var(--shadow-s2)',
          fontSize: 13,
        }}
        {...(formato ? { formatter: (valor: number) => formato(valor) } : {})}
      />
    </>
  );

  return (
    // La grafica es una imagen para quien la ve, y una tabla para quien no.
    // Recharts pinta SVG sin nombrarlo, asi que el nombre se pone aqui.
    <figure role="img" aria-label={titulo} className="m-0">
      <ResponsiveContainer width="100%" height={alto}>
        {forma === 'barras' ? (
          <BarChart data={[...datos]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {ejes}
            {series.map((serie) => (
              <Bar
                key={serie.clave}
                dataKey={serie.clave}
                name={serie.nombre}
                fill={serie.color}
                radius={[4, 4, 0, 0]}
                // «Nada rebota mas de una vez» (B6). No rebota ninguna.
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart data={[...datos]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {ejes}
            {series.map((serie) => (
              <Line
                key={serie.clave}
                type="monotone"
                dataKey={serie.clave}
                name={serie.nombre}
                stroke={serie.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </figure>
  );
}
