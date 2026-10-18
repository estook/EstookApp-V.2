import { useState } from 'react';
import { ConMasInfo, clases } from '@estook/ui';

/**
 * Escalar la ficha técnica (M9 · 3, decisiones 0092 y 0093).
 *
 * Richi: la ficha técnica enseña a hacer una ración, «pero algunas recetas de la casa sin
 * raciones, tipo pucheros, vienen ya con una cantidad definida»; que se puedan hacer las
 * dos cosas, **bien explicado con una "i"**. Como lo hacen los mejores (meez,
 * kitchenCUT): la receta dice para cuántas está escrita, y desde ahí se escala **solo en
 * pantalla y en el PDF**, sin cambiar la receta guardada.
 *
 *   · **«Para [ 1 ] raciones»**, con − y +, y se puede escribir el número.
 *   · Si está escrita por tanda, se dice, y se cuenta en tandas también.
 *   · Tocando la cantidad de un ingrediente se escala por lo que tienes («3 kg de
 *     carrillera»): eso vive en `LoQueLleva`, que avisa aquí con el factor.
 *
 * El estado vive en `usarEscala` (los ganchos van en `ganchos/`).
 */
function comoNumero(n: number): string {
  return String(Number(n.toFixed(1))).replace('.', ',');
}

export function ParaCuantasRaciones({
  escrita,
  raciones,
  alCambiar,
  alVolver,
}: {
  /** Para cuántas raciones está escrita la receta: 1, o una tanda. */
  readonly escrita: number;
  readonly raciones: number;
  readonly alCambiar: (raciones: number) => void;
  readonly alVolver: () => void;
}) {
  const [escribiendo, setEscribiendo] = useState<string | null>(null);
  const esTanda = escrita > 1;
  const tandas = raciones / escrita;
  const paso = (hacia: 1 | -1) => {
    const entera = hacia === 1 ? Math.floor(raciones) + 1 : Math.ceil(raciones) - 1;
    alCambiar(Math.max(entera, 1));
  };

  return (
    <ConMasInfo
      queExplica="Cómo se escala"
      info={
        <>
          Escalar no cambia la receta: solo esta pantalla y lo que imprimas.{' '}
          {esTanda
            ? `Está escrita para una tanda de ${String(escrita)} raciones.`
            : 'Está escrita para una ración.'}{' '}
          También puedes tocar la cantidad de un ingrediente y poner lo que tienes. La sal, las
          especias y el picante, ajústalos probando. El tiempo no cambia.
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-x-e3 gap-y-e1 rounded-grande bg-fondo px-e3 py-e2">
        <span className="text-secundario text-texto-suave">Para</span>
        <div className="flex items-center rounded-redondo bg-superficie shadow-s1">
          <button
            type="button"
            aria-label="Una ración menos"
            disabled={raciones <= 1}
            onClick={() => {
              paso(-1);
            }}
            className="grid size-toque place-items-center rounded-redondo text-titulo font-semibold disabled:text-texto-tenue"
          >
            −
          </button>
          <input
            aria-label="Raciones"
            inputMode="decimal"
            value={escribiendo ?? comoNumero(raciones)}
            onFocus={(e) => {
              setEscribiendo(comoNumero(raciones));
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setEscribiendo(e.currentTarget.value);
            }}
            onBlur={() => {
              const numero = Number((escribiendo ?? '').replace(',', '.'));
              if (Number.isFinite(numero) && numero > 0) alCambiar(numero);
              setEscribiendo(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-[3.5ch] bg-transparent text-center text-cuerpo font-semibold tabular-nums outline-none"
          />
          <button
            type="button"
            aria-label="Una ración más"
            onClick={() => {
              paso(1);
            }}
            className="grid size-toque place-items-center rounded-redondo text-titulo font-semibold"
          >
            +
          </button>
        </div>
        <span className="text-secundario text-texto-suave">
          {raciones === 1 ? 'ración' : 'raciones'}
          {esTanda && (
            <span className="tabular-nums">
              {' · '}
              {tandas === 1 ? '1 tanda' : `${comoNumero(tandas)} tandas`}
            </span>
          )}
        </span>
        {raciones !== escrita && (
          <button
            type="button"
            onClick={alVolver}
            className={clases(
              'text-secundario font-semibold text-texto-suave underline decoration-borde-fuerte underline-offset-4 hover:text-texto',
            )}
          >
            Como está escrita
          </button>
        )}
      </div>
    </ConMasInfo>
  );
}
