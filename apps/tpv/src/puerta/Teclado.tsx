import type { ReactNode } from 'react';

/**
 * El teclado de cifras de Estook TPV: el del PIN, el del código para vincular y el del
 * encargado que aprueba. Grande, para el dedo con prisa (toques de 48 px o más en la caja,
 * Anexo 11.12), y también con el teclado de un ordenador.
 */
export function Teclado({
  alTeclear,
  alBorrar,
  extra,
  ocupado = false,
  redondo = true,
}: {
  readonly alTeclear: (cifra: string) => void;
  readonly alBorrar: () => void;
  /** Lo que va a la izquierda del 0: escanear el QR, o nada. */
  readonly extra?: ReactNode;
  readonly ocupado?: boolean;
  readonly redondo?: boolean;
}) {
  const forma = redondo ? 'rounded-redondo' : 'rounded-grande';
  const tecla = (cifra: string) => (
    <button
      key={cifra}
      type="button"
      disabled={ocupado}
      onClick={() => {
        alTeclear(cifra);
      }}
      className={`min-h-toque-cocina ${forma} bg-superficie text-cifra-media font-bold text-texto active:bg-charcoal disabled:opacity-60`}
    >
      {cifra}
    </button>
  );
  return (
    <div className="grid w-full grid-cols-3 gap-e3">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(tecla)}
      {extra ?? <span />}
      {tecla('0')}
      <button
        type="button"
        aria-label="Borrar"
        disabled={ocupado}
        onClick={alBorrar}
        className={`flex min-h-toque-cocina items-center justify-center ${forma} text-texto-tenue active:bg-charcoal disabled:opacity-60`}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 5H9l-6 7 6 7h12V5z" />
          <path d="M17 9l-6 6M11 9l6 6" />
        </svg>
      </button>
    </div>
  );
}

/** Los puntos de lo tecleado: «2 de 6 cifras», sin enseñar ninguna. */
export function Puntos({ tecleadas, de }: { readonly tecleadas: number; readonly de: number }) {
  return (
    <div
      className="flex gap-e4"
      role="img"
      aria-label={`${String(tecleadas)} de ${String(de)} cifras`}
    >
      {Array.from({ length: de }, (_, i) => (
        <span
          key={i}
          className={[
            'size-4 rounded-redondo',
            i < tecleadas ? 'bg-naranja' : 'border-2 border-borde-fuerte',
          ].join(' ')}
        />
      ))}
    </div>
  );
}
