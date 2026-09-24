import { useState } from 'react';
import { clases } from '../clases.ts';
import { colorDe, inicialesDe } from './iniciales.ts';

/**
 * La cara de un producto: su foto, o sus iniciales con el color de su categoría
 * (entrega V, punto 5).
 *
 * «Sin foto, la ficha sigue igual: la inicial y el color de su categoría.» Así una
 * lista con diez fotos y cuarenta productos sin ella no parece a medias: los que no
 * la tienen llevan su recuadro de color, y los de la misma categoría se parecen.
 *
 * ── Por qué es un componente del sistema, y no de Inventario ────────────────
 *
 * B4 pide justificar cada componente nuevo. Este lo pintan la lista de productos,
 * la ficha y el recuento, y mañana los escandallos (M9) y la carta (M10): si cada
 * uno hiciera su recuadro, habría cuatro tamaños, cuatro redondeos y cuatro formas
 * de fallar cuando la foto no llega.
 *
 * ── Los tres cuidados ───────────────────────────────────────────────────────
 *
 *   · **Se carga cuando se ve** (`loading="lazy"`), nunca la lista entera de golpe,
 *     y con su ancho y alto puestos, para que la fila no salte al llegar.
 *   · **Si el enlace no sirve** —ha caducado con la lista abierta toda la noche, o
 *     el almacén no contesta—, se pintan las iniciales en su sitio. Un icono de
 *     imagen rota en la lista de la cámara no le dice nada a nadie.
 *   · **Es decorativa**: el nombre del producto está siempre al lado, así que la
 *     imagen no repite nada a un lector de pantalla (`alt=""`).
 */
export interface FotoDeProductoProps {
  readonly nombre: string;
  /** Su categoría: da el color del recuadro. Sin categoría, el color sale del nombre. */
  readonly categoria: string | null;
  /** El enlace firmado. Nulo, o que no venga: sin foto. */
  readonly enlace?: string | null | undefined;
  /** El lado, en píxeles. 40 en una lista; más grande en la ficha. */
  readonly lado?: number;
}

export function FotoDeProducto({ nombre, categoria, enlace, lado = 40 }: FotoDeProductoProps) {
  // Qué enlace falló, y no un sí o un no: si llega otro (una foto nueva, o el mismo
  // firmado otra vez), se vuelve a intentar sin tener que remontar la fila.
  const [fallido, setFallido] = useState<string | null>(null);
  const redondeo = lado >= 64 ? 'rounded-grande' : 'rounded-medio';

  if (enlace !== undefined && enlace !== null && enlace !== fallido) {
    return (
      <img
        src={enlace}
        alt=""
        width={lado}
        height={lado}
        loading="lazy"
        decoding="async"
        onError={() => {
          setFallido(enlace);
        }}
        className={clases('shrink-0 border border-borde bg-fondo object-cover', redondeo)}
        style={{ width: lado, height: lado }}
      />
    );
  }

  const color = colorDe(categoria ?? nombre);
  return (
    <span
      aria-hidden
      className={clases(
        'inline-flex shrink-0 items-center justify-center font-semibold text-texto',
        redondeo,
      )}
      style={{
        width: lado,
        height: lado,
        fontSize: Math.trunc(lado * 0.36),
        // El color va en el fondo, muy rebajado, y en el aro; las letras, en el
        // color del texto. Con las letras en el acento no llegarían a 4,5:1 sobre
        // su propio tinte (lo mismo que decidió el avatar en M3).
        backgroundColor: `color-mix(in oklab, ${color} 16%, var(--color-superficie))`,
        boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${color} 45%, transparent)`,
      }}
    >
      {inicialesDe(nombre)}
    </span>
  );
}
