import { clases } from '../../clases.ts';

/**
 * El medidor (la experiencia, 0083): media luna que se llena hasta el valor, con
 * el objetivo marcado como una muesca. Es lo que se mira en un salpicadero: no
 * hace falta leer el número para saber si va bien.
 *
 * El color dice el estado —bien, cuidado, mal— y **nunca solo el color** (B8): debajo
 * va la palabra. La pista vacía es el mismo color, muy apagado, para que se lea el
 * medidor entero aunque esté casi vacío.
 */
export type EstadoDelMedidor = 'bien' | 'atencion' | 'mal' | 'neutro';

export interface MedidorProps {
  readonly nombre: string;
  /** De 0 a `tope`. */
  readonly valor: number | null;
  readonly tope: number;
  /** La muesca: dónde está el objetivo. */
  readonly objetivo?: number | null;
  /** Lo que se escribe en el centro. */
  readonly texto: string;
  readonly estado: EstadoDelMedidor;
  /** La palabra del estado: «En objetivo», «Se pasa». */
  readonly queDice: string;
  readonly tamano?: number;
}

const COLOR: Readonly<Record<EstadoDelMedidor, string>> = {
  bien: 'var(--color-bien)',
  atencion: 'var(--color-atencion)',
  mal: 'var(--color-mal)',
  neutro: 'var(--color-texto-tenue)',
};

const TEXTO: Readonly<Record<EstadoDelMedidor, string>> = {
  bien: 'text-bien',
  atencion: 'text-atencion',
  mal: 'text-mal',
  neutro: 'text-texto-suave',
};

export function Medidor({
  nombre,
  valor,
  tope,
  objetivo = null,
  texto,
  estado,
  queDice,
  tamano = 132,
}: MedidorProps) {
  const ancho = tamano;
  const alto = tamano * 0.62;
  const r = tamano * 0.4;
  const cx = ancho / 2;
  const cy = alto - 6;
  const grosor = Math.max(8, tamano * 0.085);
  // La media luna mide π·r; se llena con el trazo discontinuo, sin calcular arcos.
  const largo = Math.PI * r;
  const parte = valor === null || tope <= 0 ? 0 : Math.min(1, Math.max(0, valor / tope));
  const color = COLOR[estado];

  const muesca =
    objetivo === null || tope <= 0
      ? null
      : (() => {
          const angulo = Math.PI * (1 - Math.min(1, Math.max(0, objetivo / tope)));
          const dentro = r - grosor / 2 - 3;
          const fuera = r + grosor / 2 + 3;
          return {
            x1: cx + dentro * Math.cos(angulo),
            y1: cy - dentro * Math.sin(angulo),
            x2: cx + fuera * Math.cos(angulo),
            y2: cy - fuera * Math.sin(angulo),
          };
        })();

  const arco = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <figure
      className="m-0 flex min-w-0 flex-col items-center"
      aria-label={`${nombre}: ${texto}, ${queDice}`}
      role="img"
    >
      <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden>
        <path
          d={arco}
          fill="none"
          stroke={color}
          strokeOpacity={0.14}
          strokeWidth={grosor}
          strokeLinecap="round"
        />
        <path
          d={arco}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${largo * parte} ${largo}`}
          className="transition-[stroke-dasharray] duration-[--lento] ease-curva"
        />
        {muesca !== null && (
          <line
            {...muesca}
            stroke="var(--color-texto)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.7}
          />
        )}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-texto font-bold"
          // Lo largo («10.398,80 €») se encoge para caber entre los cuernos.
          style={{ fontSize: tamano * 0.17 * Math.min(1, 7 / Math.max(texto.length, 1)) }}
        >
          {texto}
        </text>
      </svg>
      <figcaption className="mt-e1 flex flex-col items-center text-center">
        <span className="text-secundario font-semibold text-texto">{nombre}</span>
        <span className={clases('text-etiqueta font-medium', TEXTO[estado])}>{queDice}</span>
      </figcaption>
    </figure>
  );
}
