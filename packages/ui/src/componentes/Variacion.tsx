import { clases } from '../clases.ts';

/**
 * La variación · «▲ 12 %» en una píldora (M7, 0039).
 *
 * «Flechas de subida y bajada.» Es la pieza que lleva cualquier resumen de
 * negocio moderno al lado de una cifra, y aquí con dos reglas que no son de
 * estilo:
 *
 *   · **El color dice si es buena noticia, no hacia dónde va.** Que la merma baje
 *     es verde; que las ventas bajen es rojo. Eso lo decide el dominio
 *     (`comoCambia`), no la pantalla.
 *   · **El color nunca va solo** (B1): lleva la flecha, y para quien no ve, la
 *     frase entera —«Sube un 12 % frente a los 7 días anteriores»—.
 */
export interface VariacionProps {
  /** Verdadero si sube, falso si baja, nulo si está igual. */
  readonly sube: boolean | null;
  /** Cuánto, en positivo. */
  readonly cuanto: number;
  /** En puntos, para lo que ya es un porcentaje. */
  readonly enPuntos?: boolean;
  /** Si es buena noticia. Nulo = ni buena ni mala. */
  readonly bueno: boolean | null;
  /** «frente a los 7 días anteriores». Va en la frase para quien no ve. */
  readonly frenteA: string;
}

export function Variacion({ sube, cuanto, enPuntos = false, bueno, frenteA }: VariacionProps) {
  const numero = cuanto.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  const unidad = enPuntos ? (cuanto === 1 ? ' punto' : ' puntos') : ' %';
  const frase =
    sube === null
      ? `Igual ${frenteA}`
      : `${sube ? 'Sube' : 'Baja'} ${enPuntos ? '' : 'un '}${numero}${unidad} ${frenteA}`;

  const tono =
    bueno === null
      ? 'bg-fondo text-texto-suave'
      : bueno
        ? 'bg-bien-suave text-bien'
        : 'bg-mal-suave text-mal';

  return (
    <span
      className={clases(
        'inline-flex items-center gap-[3px] rounded-redondo px-e2 py-[2px]',
        'text-etiqueta font-semibold tabular-nums whitespace-nowrap',
        tono,
      )}
    >
      <span aria-hidden>{sube === null ? '=' : sube ? '▲' : '▼'}</span>
      <span aria-hidden>{sube === null ? 'Igual' : `${numero}${enPuntos ? ' pt' : ' %'}`}</span>
      <span className="sr-only">{frase}</span>
    </span>
  );
}
