import type { ReactNode } from 'react';
import { Logo, clases } from '@estook/ui';

/**
 * Las piezas que comparten entrar y crear cuenta (0042).
 *
 * Viven juntas porque son **la misma puerta** vista desde dos lados, y si cada
 * pantalla pintara su botón de Google o su separador, a los dos meses serían dos
 * botones distintos.
 */

/** Lo que devuelve `como_se_entra`. */
export interface ComoSeEntra {
  readonly google: { readonly clienteId: string } | null;
  readonly conCorreo: boolean;
  readonly oferta: { readonly activa: boolean; readonly dias: number };
}

/** El marco de las dos pantallas: la marca arriba, centrado, y ancho de formulario. */
export function MarcoDeLaPuerta({
  titulo,
  frase,
  children,
}: {
  readonly titulo: string;
  readonly frase?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-fondo px-e4 py-e6 pt-[calc(env(safe-area-inset-top)+var(--spacing-e6))]">
      <div className="w-full max-w-[26rem]">
        <div className="mb-e5 flex justify-center">
          <a href="../" aria-label="Estook, la portada">
            <Logo alto={40} />
          </a>
        </div>
        <h1 className="mb-e2 text-center text-pantalla font-semibold">{titulo}</h1>
        {frase !== undefined && (
          <p className="mb-e5 text-center text-secundario text-texto-suave">{frase}</p>
        )}
        {children}
      </div>
    </main>
  );
}

/**
 * «Continuar con Google», con su G de colores.
 *
 * Se pinta como pide Google en su guía de marca —fondo claro, borde, la G a la
 * izquierda y el texto «Continuar con Google»—, que es además lo que la gente
 * reconoce sin leer. La G es un SVG nuestro en el código, no un script de Google.
 */
export function BotonDeGoogle({
  alPulsar,
  cargando = false,
  disabled = false,
}: {
  readonly alPulsar: () => void;
  readonly cargando?: boolean;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={disabled || cargando}
      className={clases(
        'flex w-full min-h-toque items-center justify-center gap-e3 rounded-medio border px-e4',
        'border-borde-fuerte bg-superficie text-cuerpo font-medium text-texto',
        'hover:bg-fondo disabled:cursor-not-allowed disabled:opacity-60',
      )}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
        />
      </svg>
      {cargando ? 'Abriendo Google…' : 'Continuar con Google'}
    </button>
  );
}

/** «o», entre dos formas de hacer lo mismo. */
export function Separador({ texto = 'o' }: { readonly texto?: string }) {
  return (
    <div className="my-e4 flex items-center gap-e3" role="separator" aria-label={texto}>
      <span className="h-px flex-1 bg-borde" />
      <span className="text-secundario text-texto-suave">{texto}</span>
      <span className="h-px flex-1 bg-borde" />
    </div>
  );
}

/** Las condiciones y la privacidad, en la web pública. */
export const DIRECCION_DE_LAS_CONDICIONES = '../condiciones/';
export const DIRECCION_DE_LA_PRIVACIDAD = '../privacidad/';
