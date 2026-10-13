import { PERIODOS_DEL_INDICADOR, type PeriodoDelIndicador } from '@estook/dominio';
import { clases } from '../clases.ts';

/**
 * «7 días · 30 días» · el periodo de las cifras (M7, 0039; aquí desde V).
 *
 * Nació dentro de «Añadir los nuestros» del Panel, y la fila de cifras de cada app
 * necesita el mismo: dos sitios con su propio selector acabarían ofreciendo
 * periodos distintos. Los periodos son los del dominio, que son los que el
 * servidor acepta.
 *
 * **Un control segmentado** desde la experiencia (0083): la opción elegida es una
 * pastilla que sobresale de su carril, como en el móvil. Y **corto**, «7 d · 30 d»,
 * para ir dentro de cada widget, que es donde Richi lo quiere: «que el propio widget
 * tenga esa opción», no elegirlo al añadirlo.
 */
export interface ElegirPeriodoProps {
  readonly periodo: PeriodoDelIndicador;
  readonly alElegir: (periodo: PeriodoDelIndicador) => void;
  /** Para el lector de pantalla: «De cuántos días». */
  readonly etiqueta?: string;
  /** El de dentro de un widget: pequeño y con «7 d». */
  readonly corto?: boolean;
}

export function ElegirPeriodo({
  periodo,
  alElegir,
  etiqueta = 'De cuántos días',
  corto = false,
}: ElegirPeriodoProps) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={clases(
        'inline-flex shrink-0 items-center rounded-redondo bg-fondo p-[3px]',
        'shadow-[inset_0_0_0_1px_var(--color-borde)]',
      )}
    >
      {PERIODOS_DEL_INDICADOR.map((cuantos) => (
        <button
          key={cuantos}
          type="button"
          role="radio"
          aria-checked={cuantos === periodo}
          aria-label={`${cuantos} días`}
          onClick={(evento) => {
            // Dentro de un widget que se abre al tocarlo: elegir el periodo no lo abre.
            evento.stopPropagation();
            alElegir(cuantos);
          }}
          className={clases(
            'relative rounded-redondo font-semibold transition-[background,color,box-shadow] duration-[--rapido]',
            // El blanco se queda en 44 px aunque el botón se vea pequeño (B4).
            corto
              ? 'h-7 px-e2 text-etiqueta before:absolute before:-inset-y-[8px] before:inset-x-0 before:content-[""]'
              : 'min-h-[38px] px-e3 text-secundario',
            cuantos === periodo
              ? 'bg-superficie text-texto [box-shadow:var(--sombra-tarjeta)]'
              : 'text-texto-suave hover:text-texto',
          )}
        >
          {corto ? `${cuantos} d` : `${cuantos} días`}
        </button>
      ))}
    </div>
  );
}
