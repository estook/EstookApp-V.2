import { useId, type SelectHTMLAttributes } from 'react';
import { IconoFlechaAbajo } from '@estook/iconos';
import { clases } from '../clases.ts';
import { CAJA, Envoltorio } from './Campo.tsx';

/**
 * El selector y el interruptor · Parte B4 del Plan.
 *
 * El selector es un `<select>` de verdad, no una lista pintada a mano. Es
 * deliberado: el nativo trae gratis el teclado, el lector de pantalla, la
 * busqueda escribiendo y, en movil, la rueda del sistema, que es la que la gente
 * ya sabe usar. Una lista propia es mas bonita en una captura y peor en la
 * cocina.
 *
 * Cuando la lista sea larga o haya que buscar dentro, eso no es un selector: es
 * el `Buscador`, y la Auditoria de flujos lo dice («toda lista larga tiene
 * buscador tolerante a erratas y sin acentos»).
 */
export interface Opcion {
  readonly valor: string;
  readonly texto: string;
  readonly deshabilitada?: boolean;
}

export interface SelectorProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'children'
> {
  readonly etiqueta: string;
  readonly opciones: readonly Opcion[];
  readonly ayuda?: string;
  readonly error?: string;
  readonly obligatorio?: boolean;
  /**
   * Que poner cuando no hay nada elegido. Si no se pasa, no hay opcion vacia: el
   * selector nace con la primera puesta.
   */
  readonly sinElegir?: string;
  /**
   * Que decir cuando **no hay opciones**. La Auditoria de flujos pide que cada
   * desplegable tenga su estado vacio, y esto es lo que evita el desplegable en
   * blanco que no explica nada.
   */
  readonly cuandoNoHay?: string;
}

export function Selector({
  etiqueta,
  opciones,
  ayuda,
  error,
  obligatorio,
  sinElegir,
  cuandoNoHay = 'Todavía no hay ninguna',
  id,
  disabled,
  ...resto
}: SelectorProps) {
  const generado = useId();
  const suyo = id ?? generado;
  const vacio = opciones.length === 0;
  const nota = error !== undefined || ayuda !== undefined ? `${suyo}-nota` : undefined;

  return (
    <Envoltorio
      id={suyo}
      etiqueta={etiqueta}
      {...(ayuda === undefined ? {} : { ayuda })}
      {...(error === undefined ? {} : { error })}
      {...(obligatorio === undefined ? {} : { obligatorio })}
    >
      <div className="relative flex items-center">
        <select
          id={suyo}
          disabled={disabled === true || vacio}
          required={obligatorio === true}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={nota}
          className={clases(
            CAJA,
            'appearance-none pr-e7 cursor-pointer',
            error !== undefined && 'border-mal',
          )}
          {...resto}
        >
          {vacio ? (
            <option value="">{cuandoNoHay}</option>
          ) : (
            <>
              {sinElegir !== undefined && <option value="">{sinElegir}</option>}
              {opciones.map((opcion) => (
                <option
                  key={opcion.valor}
                  value={opcion.valor}
                  disabled={opcion.deshabilitada === true}
                >
                  {opcion.texto}
                </option>
              ))}
            </>
          )}
        </select>
        <IconoFlechaAbajo
          size={18}
          className="absolute right-e3 pointer-events-none text-texto-suave"
        />
      </div>
    </Envoltorio>
  );
}

/**
 * El interruptor.
 *
 * Es una casilla por dentro, con aspecto de interruptor por fuera. Que sea un
 * `<input type="checkbox">` de verdad es lo que hace que funcione con teclado,
 * con lector de pantalla y con un formulario, sin escribir nada de eso.
 *
 * Un interruptor **surte efecto al momento**. Si hace falta darle a «Guardar»,
 * entonces no es un interruptor: es una casilla.
 */
export interface InterruptorProps {
  readonly etiqueta: string;
  readonly puesto: boolean;
  readonly alCambiar: (puesto: boolean) => void;
  readonly ayuda?: string;
  readonly disabled?: boolean;
  readonly id?: string;
}

export function Interruptor({
  etiqueta,
  puesto,
  alCambiar,
  ayuda,
  disabled = false,
  id,
}: InterruptorProps) {
  const generado = useId();
  const suyo = id ?? generado;

  return (
    <div className="flex items-start gap-e3">
      <label
        htmlFor={suyo}
        className={clases(
          'relative inline-flex shrink-0 items-center mt-e1',
          disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
        )}
      >
        <input
          id={suyo}
          type="checkbox"
          role="switch"
          checked={puesto}
          disabled={disabled}
          onChange={(evento) => {
            alCambiar(evento.target.checked);
          }}
          {...(ayuda === undefined ? {} : { 'aria-describedby': `${suyo}-ayuda` })}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={clases(
            'block h-[26px] w-[44px] rounded-redondo border transition-colors',
            'duration-[--rapido] ease-curva',
            'peer-checked:bg-naranja peer-checked:border-naranja',
            'bg-borde border-borde-fuerte',
            // El anillo de foco de B8, sobre el interruptor pintado, porque la
            // casilla de verdad esta escondida.
            'peer-focus-visible:outline peer-focus-visible:outline-2',
            'peer-focus-visible:outline-naranja peer-focus-visible:outline-offset-2',
          )}
        />
        <span
          aria-hidden
          className={clases(
            'absolute left-[3px] h-[20px] w-[20px] rounded-redondo bg-superficie shadow-s1',
            'transition-transform duration-[--rapido] ease-curva',
            'peer-checked:translate-x-[18px]',
          )}
        />
      </label>

      <div className="flex flex-col">
        <label htmlFor={suyo} className={clases('text-cuerpo', !disabled && 'cursor-pointer')}>
          {etiqueta}
        </label>
        {ayuda !== undefined && (
          <p id={`${suyo}-ayuda`} className="text-secundario text-texto-suave">
            {ayuda}
          </p>
        )}
      </div>
    </div>
  );
}
