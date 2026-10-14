import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { GraficaVivaProps } from './tipos.ts';

/**
 * El dibujo de la gráfica viva, con Recharts.
 *
 * **No se importa nunca directamente**: se llega por el `lazy` de `GraficaViva.tsx`,
 * para que Recharts no entre en lo que se descarga al abrir la app.
 *
 * Las medidas son las de una gráfica de ahora (guía de visualización): línea de 2 px,
 * el área como un velo del color de la serie que se apaga hacia abajo, barras de
 * como mucho 24 px con la punta redondeada y el pie recto, rejilla de un píxel y
 * casi invisible, y **el dato al pasar el dedo o el ratón**: una línea vertical que
 * marca el día y un bocadillo con el valor. El texto nunca lleva el color de la
 * serie, que en un acento claro no se lee: lleva el de siempre.
 */
const TINTA_SUAVE = 'var(--color-texto-suave)';
const REJILLA = 'var(--color-borde)';

export function GraficaVivaDibujo({
  titulo,
  puntos,
  forma,
  color,
  formato,
  alto,
  conEjes = false,
  referencia = null,
  resaltarElUltimo = false,
}: GraficaVivaProps) {
  const id = useId().replace(/:/g, '');
  const [encima, setEncima] = useState<number | null>(null);
  const datos = puntos.map((p, i) => ({ ...p, i }));
  const ultimo = datos.length - 1;

  const margen = conEjes
    ? { top: 12, right: 8, bottom: 0, left: 0 }
    : { top: 6, right: 4, bottom: 2, left: 4 };

  const ejes = conEjes ? (
    <>
      <CartesianGrid stroke={REJILLA} vertical={false} strokeOpacity={0.7} />
      <XAxis
        dataKey="etiqueta"
        tick={{ fill: TINTA_SUAVE, fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        interval="preserveStartEnd"
        minTickGap={18}
        dy={6}
      />
      <YAxis
        tick={{ fill: TINTA_SUAVE, fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        width={60}
        tickFormatter={(v: number) => formato(v)}
        tickCount={4}
      />
    </>
  ) : (
    <>
      <XAxis dataKey="etiqueta" hide />
      <YAxis hide domain={forma === 'barras' ? [0, 'auto'] : ['auto', 'auto']} />
    </>
  );

  const bocadillo = (
    <Tooltip
      cursor={
        forma === 'barras' ? false : { stroke: TINTA_SUAVE, strokeWidth: 1, strokeOpacity: 0.5 }
      }
      content={<Bocadillo formato={formato} />}
      wrapperStyle={{ outline: 'none', zIndex: 20 }}
      allowEscapeViewBox={{ x: false, y: true }}
      isAnimationActive={false}
    />
  );

  const linea =
    referencia === null ? null : (
      <ReferenceLine
        y={referencia.valor}
        stroke={TINTA_SUAVE}
        strokeOpacity={0.55}
        strokeDasharray="4 4"
        ifOverflow="extendDomain"
        {...(conEjes
          ? {
              label: {
                value: referencia.nombre,
                position: 'insideTopRight',
                fill: TINTA_SUAVE,
                fontSize: 11,
              },
            }
          : {})}
      />
    );

  return (
    // La gráfica es una imagen para quien la ve, y una tabla para quien no.
    <figure role="img" aria-label={titulo} className="relative m-0 select-none">
      <ResponsiveContainer width="100%" height={alto}>
        {forma === 'barras' ? (
          <BarChart
            data={datos}
            margin={margen}
            barCategoryGap={conEjes ? '22%' : '18%'}
            onMouseMove={(estado) => {
              setEncima(
                typeof estado.activeTooltipIndex === 'number' ? estado.activeTooltipIndex : null,
              );
            }}
            onMouseLeave={() => {
              setEncima(null);
            }}
          >
            {ejes}
            {linea}
            {bocadillo}
            <Bar dataKey="valor" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {datos.map((d) => {
                const vivo = encima === null ? !resaltarElUltimo || d.i === ultimo : d.i === encima;
                return (
                  <Cell
                    key={d.i}
                    fill={color}
                    fillOpacity={vivo ? 1 : 0.35}
                    className="transition-[fill-opacity] duration-150"
                  />
                );
              })}
            </Bar>
          </BarChart>
        ) : (
          <AreaChart data={datos} margin={margen}>
            <defs>
              <linearGradient id={`velo-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.26} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {ejes}
            {linea}
            {bocadillo}
            <Area
              type="monotone"
              dataKey="valor"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={`url(#velo-${id})`}
              // Pequeña, la línea sigue de un día con dato al siguiente: es una tendencia.
              // Grande, se corta donde no hay dato, que es lo que pasó.
              connectNulls={!conEjes}
              isAnimationActive={false}
              activeDot={{ r: 5, fill: color, stroke: 'var(--color-superficie)', strokeWidth: 2 }}
              dot={(props: { cx?: number; cy?: number; index?: number; value?: unknown }) => {
                const { cx, cy, index } = props;
                if (!resaltarElUltimo || index !== ultimo || cx === undefined || cy === undefined) {
                  return <g key={`p-${String(index)}`} />;
                }
                return (
                  <circle
                    key={`p-${String(index)}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke="var(--color-superficie)"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>

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

/** El bocadillo: el día, el valor en grande y su línea de más. */
function Bocadillo({
  active,
  payload,
  formato,
}: TooltipProps<number, string> & { readonly formato: (valor: number) => string }) {
  const punto = payload?.[0]?.payload as
    | { readonly etiqueta: string; readonly valor: number | null; readonly detalle?: string }
    | undefined;
  if (active !== true || punto === undefined) return null;
  return (
    <div className="pointer-events-none min-w-[7rem] rounded-medio border border-borde bg-superficie px-e3 py-e2 shadow-s3">
      <p className="text-etiqueta font-medium text-texto-suave">{punto.etiqueta}</p>
      <p className="text-cuerpo font-bold text-texto">
        {punto.valor === null ? 'Sin dato' : formato(punto.valor)}
      </p>
      {punto.detalle !== undefined && (
        <p className="text-etiqueta text-texto-tenue">{punto.detalle}</p>
      )}
    </div>
  );
}
