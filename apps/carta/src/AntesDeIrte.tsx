import { useEffect, useRef, useState } from 'react';
import { Boton } from '@estook/ui';

/**
 * **«Antes de irte»**, al acabar de reservar en la web (la Ampliación 5 · 3; Richi, 26-nov). Lo que más ayuda
 * al restaurante con los que no vienen es que avisen a tiempo: se dice en dos puntos (uno si el local no pide
 * que confirmen), con letra grande, y **no se cierra hasta pasados cuatro segundos**, para que se lea. Sin
 * cookies ni nada guardado: sale una vez, al reservar.
 */

export const SEGUNDOS_PARA_CERRAR = 4;

function elPlazoEnLetra(minutos: number): string {
  if (minutos === 60) return 'una hora';
  return `${String(minutos)} minutos`;
}

export function AntesDeIrte({
  nombre,
  confirmarAntesDe,
  minutosParaConfirmar,
  alCerrar,
}: {
  readonly nombre: string;
  /** La hora límite para confirmar, si el local lo pide y aún no está confirmada. */
  readonly confirmarAntesDe: string | null;
  readonly minutosParaConfirmar: number;
  readonly alCerrar: () => void;
}) {
  const [quedan, setQuedan] = useState(SEGUNDOS_PARA_CERRAR);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titulo.current?.focus();
    const reloj = window.setInterval(() => {
      setQuedan((antes) => (antes <= 1 ? 0 : antes - 1));
    }, 1000);
    return () => {
      window.clearInterval(reloj);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="antes-de-irte"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-e4 sm:items-center"
    >
      <div className="flex w-full max-w-[30rem] flex-col gap-e4 rounded-[24px] bg-superficie p-e5 [box-shadow:var(--sombra-tarjeta)]">
        <h2
          id="antes-de-irte"
          ref={titulo}
          tabIndex={-1}
          className="text-[1.45rem] font-bold leading-tight outline-none"
        >
          Gracias, {nombre}. Una cosa antes de irte
        </h2>
        <ol className="flex flex-col gap-e3 text-[1.1rem] leading-snug">
          <li className="flex gap-e3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-naranja font-bold text-sobre-naranja"
            >
              1
            </span>
            <span>
              Si al final no podéis venir, <strong>cancélala cuanto antes</strong> desde esta misma
              página. Así el restaurante puede dar la mesa a otras personas.
            </span>
          </li>
          {confirmarAntesDe !== null && (
            <li className="flex gap-e3">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-naranja font-bold text-sobre-naranja"
              >
                2
              </span>
              <span>
                <strong>Confírmala antes de las {confirmarAntesDe}</strong>, como muy tarde{' '}
                {elPlazoEnLetra(minutosParaConfirmar)} antes de la hora. Si no, se cancela sola. Así
                el restaurante puede organizarse bien y atenderos mejor.
              </span>
            </li>
          )}
        </ol>
        <Boton tono="principal" tamano="l" ancho disabled={quedan > 0} onClick={alCerrar}>
          {quedan > 0 ? `Entendido · ${String(quedan)}` : 'Entendido'}
        </Boton>
      </div>
    </div>
  );
}
