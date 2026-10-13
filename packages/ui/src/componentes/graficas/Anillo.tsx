import type { ReactNode } from 'react';

/**
 * El anillo (la experiencia, 0083): cuánto se lleva de algo, dando la vuelta. Lo
 * lleva «Tu jornada» con las horas de hoy frente a las de tu turno. En el centro,
 * lo que se quiera: la cifra o un icono.
 */
export interface AnilloProps {
  /** De 0 a 1. Más de 1 se queda lleno. */
  readonly parte: number;
  readonly color: string;
  readonly tamano?: number;
  readonly grosor?: number;
  readonly titulo: string;
  readonly children?: ReactNode;
}

export function Anillo({ parte, color, tamano = 96, grosor = 9, titulo, children }: AnilloProps) {
  const r = (tamano - grosor) / 2;
  const largo = 2 * Math.PI * r;
  const lleno = Math.min(1, Math.max(0, parte));
  return (
    <div
      role="img"
      aria-label={titulo}
      className="relative grid shrink-0 place-items-center"
      style={{ width: tamano, height: tamano }}
    >
      <svg width={tamano} height={tamano} className="-rotate-90" aria-hidden>
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={0.14}
          strokeWidth={grosor}
        />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${largo * lleno} ${largo}`}
          className="transition-[stroke-dasharray] duration-[--lento] ease-curva"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
