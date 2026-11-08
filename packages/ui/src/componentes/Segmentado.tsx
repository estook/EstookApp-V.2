import { clases } from '../clases.ts';

/**
 * «Semana · Mes · 3 meses» · elegir una opción de pocas, a la vista (la pausa del 8-nov, 0142).
 *
 * Es el control de `ElegirPeriodo` para cualquier lista corta: la elegida es una pastilla que
 * sobresale de su carril, como en el móvil. Sustituye a un desplegable cuando las opciones caben
 * en una fila: lo que se elige a menudo no se esconde detrás de un toque más (0045).
 *
 * Con más de cuatro o cinco opciones, o con textos largos, **va mejor un `Selector`**: en el
 * móvil la fila se partiría.
 */
export interface OpcionDeSegmentado<V extends string> {
  readonly valor: V;
  readonly texto: string;
}

export interface SegmentadoProps<V extends string> {
  readonly opciones: readonly OpcionDeSegmentado<V>[];
  readonly valor: V;
  readonly alElegir: (valor: V) => void;
  /** Para el lector de pantalla y para las pruebas: «Hasta dónde miro». */
  readonly etiqueta: string;
  /** Que ocupe todo el ancho, con las opciones repartidas a partes iguales. */
  readonly ancho?: boolean;
}

export function Segmentado<V extends string>({
  opciones,
  valor,
  alElegir,
  etiqueta,
  ancho = false,
}: SegmentadoProps<V>) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={clases(
        'max-w-full items-center rounded-redondo bg-fondo p-[3px]',
        'shadow-[inset_0_0_0_1px_var(--color-borde)]',
        ancho ? 'grid auto-cols-fr grid-flow-col' : 'inline-flex overflow-x-auto',
      )}
    >
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          role="radio"
          aria-checked={opcion.valor === valor}
          onClick={() => {
            alElegir(opcion.valor);
          }}
          className={clases(
            'min-h-[38px] shrink-0 whitespace-nowrap rounded-redondo px-e3 text-secundario font-semibold',
            'transition-[background,color,box-shadow] duration-[--rapido]',
            opcion.valor === valor
              ? 'bg-superficie text-texto [box-shadow:var(--sombra-tarjeta)]'
              : 'text-texto-suave hover:text-texto',
          )}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  );
}
