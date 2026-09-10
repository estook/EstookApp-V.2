import { clases } from '../clases.ts';

/**
 * La tira · una gráfica pequeña, de las que caben dentro de una tarjeta.
 *
 * ── Por qué no es `Grafica` ─────────────────────────────────────────────────
 *
 * Porque `Grafica` es Recharts, y Recharts pesa más de 100 KB comprimido: entra
 * detrás de un `lazy` justamente para que no lo pague quien no ve gráficas. Bajar
 * cien kilobytes para pintar catorce barras de doce píxeles dentro de un widget
 * es exactamente lo que el presupuesto de velocidad de B7 viene a impedir.
 *
 * Esto son cuarenta líneas de SVG. No tiene ejes, ni leyenda, ni tooltip, y **no
 * los quiere**: una tira contesta una sola pregunta —«¿va peor que los días de
 * antes?»— y para eso la forma es toda la respuesta. Cuando hace falta el detalle,
 * hay un botón que lleva a la pantalla donde está.
 *
 * ── Y por qué se puede leer sin verla ───────────────────────────────────────
 *
 * «Nada se dice solo con color» (B8), y una gráfica es el caso extremo: para quien
 * usa un lector de pantalla, un SVG de barras no dice nada. Así que la tira lleva
 * su resumen escrito —«catorce días, lo más alto el jueves»— y las barras van
 * marcadas como decoración. La cifra de verdad vive fuera, en la tarjeta.
 */
export interface PuntoDeLaTira {
  /** Lo que se pinta. Nunca negativo: una tira no tiene eje. */
  readonly valor: number;
  /** Cómo se llama ese punto al leerlo: «jueves», «12 de septiembre». */
  readonly cuando: string;
}

export interface TiraProps {
  readonly puntos: readonly PuntoDeLaTira[];
  /** Qué cuenta la tira, para quien no la ve. Obligatorio. */
  readonly titulo: string;
  /** Cómo se escribe un valor al leerlo. Aquí entra el dinero. */
  readonly formato?: (valor: number) => string;
  /** El color de las barras. Lo normal es el acento de la app. */
  readonly color?: string;
  /** Si la última se resalta: es «hoy», y es lo que se viene a mirar. */
  readonly destacarLaUltima?: boolean;
  readonly alto?: number;
}

export function Tira({
  puntos,
  titulo,
  formato = (valor) => String(valor),
  color = 'var(--color-texto-suave)',
  destacarLaUltima = true,
  alto = 40,
}: TiraProps) {
  if (puntos.length === 0) return null;

  const mayor = Math.max(...puntos.map((punto) => punto.valor), 0);
  // Con todo a cero no se pinta una fila de barras de altura mínima, que se leería
  // como «todos los días algo»: se pinta la línea de base y ya.
  const nada = mayor === 0;

  const ancho = 100;
  // El hueco entre barras es un quinto del sitio de cada una: se ven separadas y
  // no se convierten en rayas cuando son catorce.
  const paso = ancho / puntos.length;
  const grueso = paso * 0.72;

  const elMasAlto = puntos.reduce(
    (peor, punto) => (punto.valor > peor.valor ? punto : peor),
    puntos[0] ?? { valor: 0, cuando: '' },
  );

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: `${alto}px` }}
        aria-hidden
      >
        {/* La línea de base, que es lo que hace que un día a cero se vea como un
            día a cero y no como un hueco. */}
        <line
          x1={0}
          y1={alto - 0.5}
          x2={ancho}
          y2={alto - 0.5}
          stroke="var(--color-borde)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {puntos.map((punto, indice) => {
          const altura = nada ? 0 : Math.max(1.5, (punto.valor / mayor) * (alto - 3));
          const ultima = indice === puntos.length - 1;
          return (
            <rect
              key={`${punto.cuando}-${indice}`}
              x={indice * paso + (paso - grueso) / 2}
              y={alto - 1 - altura}
              width={grueso}
              height={altura}
              rx={0.8}
              fill={color}
              opacity={destacarLaUltima && !ultima ? 0.45 : 1}
            />
          );
        })}
      </svg>

      {/*
        Lo mismo, en palabras. No es un `aria-label` en el SVG: un párrafo se lee
        de corrido y se puede navegar, y además sirve para quien mira la pantalla
        de lejos y no distingue catorce barras.
      */}
      <p className={clases('sr-only')}>
        {titulo}. {puntos.length} días. Lo más alto, {elMasAlto.cuando}, con{' '}
        {formato(elMasAlto.valor)}. El último, {puntos[puntos.length - 1]?.cuando}, con{' '}
        {formato(puntos[puntos.length - 1]?.valor ?? 0)}.
      </p>
    </div>
  );
}
