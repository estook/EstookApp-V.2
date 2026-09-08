import type { Vista } from '../apps.ts';
import { clases } from '../clases.ts';

/**
 * Las vistas de un destino · el control segmentado.
 *
 * ── Que problema resuelve ────────────────────────────────────────────────────
 *
 * Hasta M6, «Mes», «Semana» y «Dia» eran tres **destinos** de Calendario, y
 * gastaban tres de las cuatro posiciones de la barra de abajo. No son tres
 * sitios: son el mismo calendario con otro aumento. Lo mismo pasaba, al reves,
 * en Inventario: los filtros de la lista de productos —lo que esta bajo minimo,
 * lo que no tiene precio, lo desactivado— vivian en un interruptor suelto en
 * mitad de la pantalla y en dos casillas, cuando son la misma lista mirada de
 * otra forma.
 *
 * Un destino contesta **una pregunta** y va abajo. Una vista es **la misma
 * pantalla de otra manera** y va aqui arriba, dentro del destino.
 *
 * ── Por que esto no gasta un nivel de profundidad ────────────────────────────
 *
 * «Maximo tres niveles: app -> vista -> ficha» (B5). Cambiar de vista **no es
 * entrar en ningun sitio**: la pantalla es la misma, el titulo es el mismo y el
 * boton de volver sigue llevando al mismo sitio que antes de tocarla. Es un
 * filtro con forma de control, no un piso mas.
 *
 * ── Y lo que todavia no esta, se dice ────────────────────────────────────────
 *
 * Una vista con `modulo` sale **apagada y con su modulo al lado**, no escondida.
 * Esconderla haria que la lista de vistas cambiara de tamano segun el modulo en
 * el que estemos, y quien la usa no sabria que va a llegar. Y no se puede pulsar:
 * un control que promete algo y no lo hace es el fallo que este proyecto lleva
 * persiguiendo desde M4.
 */
export interface VistasProps {
  readonly vistas: readonly Vista[];
  readonly activa: string;
  readonly acento: string;
  readonly alElegir: (id: string) => void;
  /** Para el lector de pantalla: «Vistas de Productos». */
  readonly de: string;
}

export function Vistas({ vistas, activa, acento, alElegir, de }: VistasProps) {
  if (vistas.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label={`Vistas de ${de}`}
      className={clases(
        'flex min-w-0 items-center gap-e1 overflow-x-auto rounded-medio bg-fondo p-[3px]',
        // La barra de desplazamiento dentro de un control de cuatro pastillas es
        // ruido; el gesto sigue funcionando con el dedo y con la rueda.
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
    >
      {vistas.map((vista) => {
        const esActiva = vista.id === activa;
        const falta = vista.modulo !== undefined;

        return (
          <button
            key={vista.id}
            type="button"
            role="tab"
            aria-selected={esActiva}
            disabled={falta}
            {...(falta ? { title: `Llega con ${vista.modulo}` } : {})}
            onClick={() => {
              alElegir(vista.id);
            }}
            className={clases(
              'inline-flex min-h-[36px] shrink-0 items-center gap-e1 whitespace-nowrap rounded-chico px-e3',
              'text-secundario font-medium transition-colors duration-[--rapido]',
              esActiva
                ? 'bg-superficie text-texto shadow-s1'
                : falta
                  ? 'cursor-not-allowed text-texto-tenue'
                  : 'text-texto-suave hover:text-texto',
            )}
            {...(esActiva ? { style: { color: acento } } : {})}
          >
            {vista.nombre}
            {falta && (
              <span className="text-etiqueta uppercase tracking-wide text-texto-tenue">
                {vista.modulo}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
