import { useId, useState, type ReactNode } from 'react';
import { IconoInfo } from '@estook/iconos';
import { clases } from '../clases.ts';

/**
 * Una línea con su «i» pequeña al lado: lo esencial a la vista y el porqué, a un toque.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────────
 *
 * Richi, el 9-oct, con el pedido nuevo abierto en el móvil: «hay demasiado texto y
 * abruma. Solo lo necesario; si quieres meter más info, por una "i" en pequeño».
 * Cada línea del pedido llevaba tres renglones de cuenta («para unos 5 días a 0,2857 l
 * al día, con un 20 % de margen…») que nadie lee al pedir, y que quien duda sí quiere
 * poder leer. Es lo de la 0045 —el porqué, plegado— en una línea suelta, donde un
 * «Cómo sale» desplegable ocuparía más que lo que explica.
 *
 * La «i» es pequeña a la vista y del tamaño de un dedo al tocarla (B4): el círculo
 * mide 20 px y el botón, el toque entero, sin empujar la línea hacia abajo.
 */
export function ConMasInfo({
  children,
  info,
  queExplica = 'Más información',
  className,
}: {
  /** Lo que se ve siempre. */
  readonly children: ReactNode;
  /** Lo que se lee al tocar la «i». */
  readonly info: ReactNode;
  /** Para el lector de pantalla: qué explica la «i» («Por qué esta cantidad»). */
  readonly queExplica?: string;
  readonly className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();

  return (
    <div className={clases('flex flex-col', className)}>
      <div className="flex items-center gap-e1">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={id}
          aria-label={queExplica}
          title={queExplica}
          onClick={() => {
            setAbierto((antes) => !antes);
          }}
          className={clases(
            '-my-e2 grid min-h-toque min-w-toque shrink-0 place-items-center rounded-redondo',
            abierto ? 'text-texto' : 'text-texto-suave hover:text-texto',
          )}
        >
          <IconoInfo size={18} />
        </button>
      </div>
      {abierto && (
        <p id={id} className="anima-aparece text-secundario text-texto-suave">
          {info}
        </p>
      )}
    </div>
  );
}
