import { useState } from 'react';
import { inicialesDe } from '../componentes/iniciales.ts';

/**
 * El logo del local, **tal cual lo subieron** (la experiencia, 0083).
 *
 * «El logo que elijan o suban será más grande, sin círculos naranjas y sin fondo: lo
 * que suban es como se verá.» Hasta ahora iba metido en un círculo de su color de
 * marca, a 24 px, y un logo apaisado se quedaba en un sello ilegible. Aquí se pinta
 * entero, encajado en su caja sin recortarse (`object-contain`) y sin nada detrás.
 *
 * Sin logo —o si la imagen no carga—, las iniciales del local en un cuadrado de
 * esquinas redondeadas, del color de su marca si tiene, como las caras del equipo.
 */
export interface LogoDelLocalProps {
  readonly nombre: string;
  readonly logo: string | null;
  readonly colorDeMarca?: string | null;
  /** El alto de la caja. El ancho, hasta el doble: un logo apaisado no se encoge. */
  readonly alto?: number;
  /** Si cabe apaisado. En el menú plegado, la caja es cuadrada. */
  readonly cuadrado?: boolean;
}

export function LogoDelLocal({
  nombre,
  logo,
  colorDeMarca = null,
  alto = 36,
  cuadrado = false,
}: LogoDelLocalProps) {
  const [roto, setRoto] = useState<string | null>(null);
  const conLogo = logo !== null && logo !== '' && logo !== roto;

  if (conLogo) {
    return (
      <img
        src={logo}
        alt={`Logo de ${nombre}`}
        onError={() => {
          setRoto(logo);
        }}
        className="shrink-0 object-contain"
        style={{ height: alto, width: 'auto', maxWidth: cuadrado ? alto : alto * 2.6 }}
        draggable={false}
      />
    );
  }

  const color = colorDeMarca ?? 'var(--color-naranja)';
  return (
    <span
      role="img"
      aria-label={nombre}
      className="inline-grid shrink-0 place-items-center font-bold text-white"
      style={{
        width: alto,
        height: alto,
        borderRadius: Math.trunc(alto * 0.3),
        background: `linear-gradient(140deg, color-mix(in srgb, ${color} 92%, white), color-mix(in srgb, ${color} 70%, black))`,
        fontSize: Math.trunc(alto * 0.36),
      }}
    >
      <span aria-hidden>{inicialesDe(nombre)}</span>
    </span>
  );
}
