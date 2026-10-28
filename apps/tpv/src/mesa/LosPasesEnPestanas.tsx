import type { LaMesa } from '../datos/tipos.ts';
import {
  PESTANAS_DE_LOS_PASES,
  comoVaElPase,
  elNombreDeLaPestana,
  type PestanaDelPase,
} from '../logica/losPases.ts';

/**
 * **Bebidas · 1.º · 2.º · 3.º · Postre**, encima de la cuenta (T2, maqueta 9; Anexo 11.10).
 * Lo que se toca va al pase marcado; cada pestaña dice cómo va el suyo: ✓ si ha salido,
 * «en marcha» o «en espera». Al cambiar de página de la carta se marca sola la de esa
 * página, así que casi nunca hay que tocarla.
 */
export function LosPasesEnPestanas({
  mesa,
  marcada,
  alMarcar,
}: {
  readonly mesa: LaMesa;
  readonly marcada: PestanaDelPase;
  readonly alMarcar: (p: PestanaDelPase) => void;
}) {
  return (
    <div className="flex flex-col gap-e1 border-b border-borde bg-superficie px-e3 py-e2">
      <div role="radiogroup" aria-label="Va en el pase" className="flex gap-e1">
        {PESTANAS_DE_LOS_PASES.map((p) => {
          const como = comoVaElPase(mesa, p);
          return (
            <button
              key={String(p)}
              type="button"
              role="radio"
              aria-checked={marcada === p}
              aria-label={`${elNombreDeLaPestana(p)}${como === 'salio' ? ', ha salido' : como === 'en_marcha' ? ', en marcha' : como === 'en_espera' ? ', en espera' : ''}`}
              onClick={() => {
                alMarcar(p);
              }}
              className={[
                'flex min-h-toque flex-1 flex-col items-center justify-center rounded-grande px-e2 leading-tight',
                marcada === p ? 'bg-texto font-bold text-fondo' : 'bg-fondo font-semibold',
              ].join(' ')}
            >
              <span>
                {elNombreDeLaPestana(p)}
                {como === 'salio' ? ' ✓' : ''}
              </span>
              {(como === 'en_marcha' || como === 'en_espera') && (
                <span className="text-etiqueta font-normal">
                  {como === 'en_marcha' ? 'en marcha' : 'en espera'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <span className="text-etiqueta text-texto-tenue">
        {marcada === 'bebidas'
          ? 'Lo de beber va a la barra al momento; la comida, al pase que toque.'
          : `Lo que toques va al ${elNombreDeLaPestana(marcada).toLowerCase()}. Para otro pase, toca su pestaña.`}
      </span>
    </div>
  );
}
