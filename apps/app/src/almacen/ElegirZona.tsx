import { NOMBRE_DE_LA_ZONA, QUE_ES_CADA_ZONA, ZONAS, type Zona } from '@estook/dominio';
import { clases } from '@estook/ui';

/**
 * De dónde es un producto · cocina, sala o limpieza (M7, las apps conectadas).
 *
 * ── Por qué tres botones y no un desplegable ────────────────────────────────
 *
 * Porque son tres, y un desplegable de tres esconde dos para ahorrar una línea.
 * Es la misma decisión que los motivos de la merma: con pastillas se ve de un
 * vistazo lo que hay, y cada una dice lo que significa sin tener que abrirla.
 *
 * Y porque **esta pregunta decide otras dos**: si el producto lleva categoría
 * —limpieza no— y quién va a verlo. Una pregunta que manda sobre las siguientes
 * se hace a la vista, no dentro de un menú.
 */
export function ElegirZona({
  valor,
  alElegir,
  etiqueta = 'De dónde es',
}: {
  readonly valor: Zona;
  readonly alElegir: (zona: Zona) => void;
  readonly etiqueta?: string;
}) {
  return (
    <div>
      <p id="de-donde-es" className="text-secundario font-medium text-texto-suave">
        {etiqueta}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="de-donde-es"
        className="mt-e2 grid gap-e2 sm:grid-cols-3"
      >
        {ZONAS.map((zona) => {
          const puesta = zona === valor;
          return (
            <button
              key={zona}
              type="button"
              role="radio"
              aria-checked={puesta}
              onClick={() => {
                alElegir(zona);
              }}
              className={clases(
                'flex min-h-toque flex-col items-start gap-e1 rounded-medio border px-e3 py-e2 text-left transition-colors duration-rapido',
                puesta
                  ? 'border-naranja bg-naranja-suave'
                  : 'border-borde-fuerte bg-superficie hover:bg-fondo',
              )}
            >
              <span className="text-cuerpo font-medium">{NOMBRE_DE_LA_ZONA[zona]}</span>
              <span className="text-etiqueta text-texto-suave">{QUE_ES_CADA_ZONA[zona]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
