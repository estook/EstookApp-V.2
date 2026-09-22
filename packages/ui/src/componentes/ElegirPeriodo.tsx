import { PERIODOS_DEL_INDICADOR, type PeriodoDelIndicador } from '@estook/dominio';
import { clases } from '../clases.ts';

/**
 * «7 días · 30 días» · el periodo de las cifras (M7, 0039; aquí desde V).
 *
 * Nació dentro de «Añadir los nuestros» del Panel, y la fila de cifras de cada app
 * necesita el mismo: dos sitios con su propio selector acabarían ofreciendo
 * periodos distintos. Los periodos son los del dominio, que son los que el
 * servidor acepta.
 */
export interface ElegirPeriodoProps {
  readonly periodo: PeriodoDelIndicador;
  readonly alElegir: (periodo: PeriodoDelIndicador) => void;
  /** Para el lector de pantalla: «De cuántos días». */
  readonly etiqueta?: string;
}

export function ElegirPeriodo({
  periodo,
  alElegir,
  etiqueta = 'De cuántos días',
}: ElegirPeriodoProps) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="inline-flex overflow-hidden rounded-redondo border border-borde-fuerte"
    >
      {PERIODOS_DEL_INDICADOR.map((cuantos) => (
        <button
          key={cuantos}
          type="button"
          role="radio"
          aria-checked={cuantos === periodo}
          onClick={() => {
            alElegir(cuantos);
          }}
          className={clases(
            'min-h-toque px-e3 text-secundario font-medium',
            cuantos === periodo ? 'bg-charcoal text-superficie' : 'bg-superficie hover:bg-fondo',
          )}
        >
          {cuantos} días
        </button>
      ))}
    </div>
  );
}
