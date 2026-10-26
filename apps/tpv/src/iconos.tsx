import type { ReactNode } from 'react';

/**
 * **Los dibujos de Estook TPV** (la entrada nueva, maquetas del 26-oct): el engranaje de los
 * Ajustes y el de cada cosa que se ajusta o se vincula, a trazo, del color del texto. Cada uno
 * va **además** de su nombre, nunca en su lugar (B8).
 */

function Trazo({ lado, children }: { readonly lado: number; readonly children: ReactNode }) {
  return (
    <svg
      width={lado}
      height={lado}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export type Dibujo =
  | 'ajustes'
  | 'sala'
  | 'agotado'
  | 'producto'
  | 'cocina'
  | 'aparatos'
  | 'candado'
  | 'caja'
  | 'movil'
  | 'pantalla'
  | 'reloj';

const TRAZOS: Readonly<Record<Dibujo, ReactNode>> = {
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  sala: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <circle cx="17.5" cy="17.5" r="3.5" />
    </>
  ),
  agotado: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  producto: (
    <>
      <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  cocina: (
    <>
      <path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.6.7-2.7 1.5-3.5.2 1.4.9 2.3 1.8 2.6C11 8.5 11 5.5 12 3z" />
      <path d="M6 21h12" />
    </>
  ),
  aparatos: (
    <>
      <rect x="2" y="4" width="14" height="10" rx="1.5" />
      <path d="M6 18h6M9 14v4" />
      <rect x="17" y="8" width="5" height="12" rx="1.2" />
    </>
  ),
  candado: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  caja: (
    <>
      <rect x="3" y="12" width="18" height="8" rx="1.5" />
      <path d="M6 12V5h9v7M8 8h5" />
    </>
  ),
  movil: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </>
  ),
  pantalla: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M6 8h5M6 11h8M14 8h4" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export function Icono({ dibujo, lado = 24 }: { readonly dibujo: Dibujo; readonly lado?: number }) {
  return <Trazo lado={lado}>{TRAZOS[dibujo]}</Trazo>;
}

/** Los colores de cada cosa: el fondo suave y el trazo, de las fichas del TPV. */
export type Tono = 'rojo' | 'verde' | 'naranja' | 'ambar' | 'azul' | 'gris';

const DEL_TONO: Readonly<Record<Tono, string>> = {
  rojo: 'bg-mal-suave text-mal',
  verde: 'bg-bien-suave text-bien',
  naranja: 'bg-naranja-suave text-naranja',
  ambar: 'bg-atencion-suave text-atencion',
  azul: 'bg-info-suave text-info',
  gris: 'bg-charcoal text-texto-suave',
};

/** El dibujo en su cuadro de color: el de cada baldosa de Ajustes y de cada aparato. */
export function IconoEnSuColor({
  dibujo,
  tono,
  lado = 46,
}: {
  readonly dibujo: Dibujo;
  readonly tono: Tono;
  readonly lado?: number;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-grande ${DEL_TONO[tono]}`}
      style={{ width: lado, height: lado }}
    >
      <Icono dibujo={dibujo} lado={Math.floor(lado * 0.52)} />
    </span>
  );
}
