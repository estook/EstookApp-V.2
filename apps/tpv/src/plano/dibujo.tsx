import type { CSSProperties } from 'react';
import { enTantoPorCiento, type FormaDeMesa } from '@estook/dominio';
import type { CosaDibujada } from '../datos/tipos.ts';

/**
 * **Cómo se pinta lo dibujado** (T2, Anexo 11.9): lo mismo en el plano del servicio y en
 * el editor, para que una mesa no salga en otro sitio del que se puso. Todo en tanto por
 * ciento del plano (16:10), así que se ve igual en la caja, en la tablet y en una pantalla
 * de cocina; y el giro, alrededor de su centro.
 */

export interface Colocado {
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly fondo: number;
  readonly giro: number;
}

/** El sitio, el tamaño y el giro, para `style`. */
export function estiloEnElPlano(c: Colocado): CSSProperties {
  const sitio = enTantoPorCiento(c);
  return {
    left: `${String(sitio.izquierda)}%`,
    top: `${String(sitio.arriba)}%`,
    width: `${String(sitio.ancho)}%`,
    height: `${String(sitio.alto)}%`,
    transform: c.giro === 0 ? undefined : `rotate(${String(c.giro)}deg)`,
  };
}

/** Lo de dentro, derecho aunque la mesa esté girada: el número se lee siempre. */
export function enderezar(giro: number): CSSProperties | undefined {
  return giro === 0 ? undefined : { transform: `rotate(${String(-giro)}deg)` };
}

/** Redonda, ovalada y el taburete, con su curva; las demás, rectas con la esquina suave. */
export function redondeoDeLaForma(forma: FormaDeMesa): string {
  return forma === 'redonda' || forma === 'ovalada' || forma === 'taburete'
    ? 'rounded-redondo'
    : 'rounded-mayor';
}

/** Lo que hay en la sala y no se abre, pintado (sin tocarse en el plano del servicio). */
export function CosaEnElPlano({
  cosa,
  marcada = false,
}: {
  readonly cosa: CosaDibujada;
  readonly marcada?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      style={estiloEnElPlano(cosa)}
      className={[
        'pointer-events-none absolute flex items-center justify-center overflow-hidden',
        COMO_SE_VE_LA_COSA[cosa.tipo],
        marcada ? 'outline outline-[3px] outline-naranja' : '',
      ].join(' ')}
    >
      {(cosa.tipo === 'barra' || cosa.tipo === 'texto') && (
        <span
          style={enderezar(cosa.giro)}
          className="truncate px-e2 text-etiqueta font-bold uppercase tracking-[0.12em] text-texto-tenue"
        >
          {cosa.tipo === 'barra' ? 'Barra' : (cosa.texto ?? 'Texto')}
        </span>
      )}
    </div>
  );
}

const COMO_SE_VE_LA_COSA: Readonly<Record<CosaDibujada['tipo'], string>> = {
  barra: 'rounded-medio border-2 border-borde-fuerte bg-charcoal',
  pared: 'rounded-[2px] bg-borde-fuerte',
  columna: 'rounded-[3px] bg-borde-fuerte',
  puerta: 'rounded-t-redondo border-2 border-dashed border-borde-fuerte',
  planta: 'rounded-redondo bg-bien-suave border-2 border-bien',
  texto: 'bg-transparent',
};
