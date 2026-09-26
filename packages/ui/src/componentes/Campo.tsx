import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { enEuros, type Centimos } from '@estook/dominio';
import { IconoFlechaAbajo } from '@estook/iconos';
import { clases } from '../clases.ts';
import { aCentimos } from './aCentimos.ts';

/**
 * El campo · Parte B4 del Plan.
 *
 * «Campo (texto, numero, moneda, fecha, hora, seleccion, busqueda)».
 *
 * Lo que este componente impone, y que por eso no puede olvidarse ninguna
 * pantalla:
 *
 *   · **Etiqueta siempre.** «Etiquetas en todos los campos, nunca solo un texto
 *     de ejemplo dentro» (B8). La etiqueta no es opcional en los tipos: sin ella
 *     no compila. Un `placeholder` desaparece al escribir, y quien vuelve al
 *     formulario a los diez minutos ya no sabe que iba ahi.
 *   · **El error, atado al campo.** Con `aria-describedby` y `aria-invalid`, para
 *     que un lector de pantalla lo lea al entrar, no despues.
 *   · **44 px de alto.** El mismo toque minimo que los botones.
 */
export type TipoDeCampo =
  | 'texto'
  | 'numero'
  | 'fecha'
  | 'hora'
  | 'correo'
  | 'telefono'
  /**
   * M4. Entra aquí y no en la pantalla de entrar porque «nadie escribe un
   * componente nuevo sin justificarlo» (B4) vale también al revés: un campo de
   * contraseña suelto en una pantalla acabaría siendo otro campo de contraseña
   * suelto en otra, y dos formas distintas de pintar lo mismo.
   */
  | 'contrasena'
  /**
   * M4. Es un campo de texto con teclado numérico, no un `number`: un
   * `<input type="number">` trae flechitas de subir y bajar, se puede poner en
   * notación científica y en algunos móviles se come los ceros de la izquierda.
   * Un PIN que empieza por cero no es un número, es una clave.
   */
  | 'pin';

const TIPOS_HTML: Record<TipoDeCampo, string> = {
  texto: 'text',
  numero: 'number',
  fecha: 'date',
  hora: 'time',
  correo: 'email',
  telefono: 'tel',
  contrasena: 'password',
  pin: 'text',
};

interface Comunes {
  readonly etiqueta: string;
  /** Debajo del campo, en gris. Para lo que ayuda pero no es un error. */
  readonly ayuda?: string;
  /** Si hay error, manda sobre la ayuda: no se ensenan los dos. */
  readonly error?: string;
  readonly obligatorio?: boolean;
  /** Delante del valor: un simbolo, una unidad. */
  readonly delante?: ReactNode;
  readonly detras?: ReactNode;
}

/**
 * La unidad de detrás, **que se elige tocándola** (repaso del 25-sep): «kg ▾».
 *
 * Richi: «si pones por peso pone gramos; estaría bien poder elegir kg o g dando
 * click a la g y que se abra un desplegable». Es el desplegable del sistema —en el
 * móvil, su rueda—, puesto encima de la unidad sin que se vea la caja: se lee
 * «kg ▾» y se toca donde está la unidad, que es donde se mira.
 */
export interface UnidadQueSeElige {
  readonly valor: string;
  /** «kg» y «kilos»: la corta se ve en el campo, la larga en el desplegable. */
  readonly opciones: readonly { readonly valor: string; readonly larga: string }[];
  readonly alElegir: (valor: string) => void;
}

export interface CampoProps
  extends Comunes, Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  readonly tipo?: TipoDeCampo;
  /** En vez de `detras`: una unidad que se cambia tocándola. */
  readonly unidad?: UnidadQueSeElige;
}

/** El armazon: etiqueta arriba, campo, y ayuda o error debajo. Lo comparten todos. */
export function Envoltorio({
  id,
  etiqueta,
  ayuda,
  error,
  obligatorio,
  children,
}: Comunes & { readonly id: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-e1">
      <label htmlFor={id} className="text-secundario font-medium text-texto-suave">
        {etiqueta}
        {obligatorio === true && (
          // El asterisco solo no dice nada a quien no ve. La palabra si.
          <span className="text-mal"> *</span>
        )}
      </label>

      {children}

      {error !== undefined ? (
        <p id={`${id}-nota`} className="text-secundario text-mal">
          {error}
        </p>
      ) : (
        ayuda !== undefined && (
          <p id={`${id}-nota`} className="text-secundario text-texto-suave">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}

/** Las clases de la caja, compartidas por todos los campos para que sean iguales. */
export const CAJA =
  'w-full min-h-toque px-e3 bg-superficie text-texto text-cuerpo rounded-medio border ' +
  'border-borde-fuerte placeholder:text-texto-tenue ' +
  'disabled:bg-fondo disabled:text-texto-tenue disabled:cursor-not-allowed ' +
  'transition-colors duration-[--rapido] ease-curva';

export function Campo({
  tipo = 'texto',
  etiqueta,
  ayuda,
  error,
  obligatorio,
  delante,
  detras,
  unidad,
  id,
  ...resto
}: CampoProps) {
  const generado = useId();
  const suyo = id ?? generado;
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
        {delante !== undefined && (
          <span className="absolute left-e3 text-texto-suave text-secundario">{delante}</span>
        )}
        <input
          id={suyo}
          type={TIPOS_HTML[tipo]}
          // El teclado numérico del móvil, sin las pegas de `type="number"`. Y
          // `one-time-code` para que el gestor de contraseñas no se empeñe en
          // guardar el PIN como si fuera la contraseña de la cuenta.
          {...(tipo === 'pin'
            ? { inputMode: 'numeric' as const, autoComplete: 'one-time-code' }
            : {})}
          required={obligatorio === true}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={nota}
          className={clases(
            CAJA,
            delante !== undefined && 'pl-e7',
            detras !== undefined && 'pr-e7',
            unidad !== undefined && 'pr-[4.5rem]',
            error !== undefined && 'border-mal',
          )}
          {...resto}
        />
        {detras !== undefined && unidad === undefined && (
          <span className="absolute right-e3 text-texto-suave text-secundario">{detras}</span>
        )}
        {unidad !== undefined && (
          <span className="absolute right-e1 flex min-h-toque items-center">
            <span
              aria-hidden
              className="pointer-events-none flex items-center gap-[2px] rounded-medio px-e2 text-secundario font-semibold text-texto"
            >
              {unidad.valor}
              <IconoFlechaAbajo size={14} />
            </span>
            <select
              aria-label={`Unidad de «${etiqueta}»`}
              value={unidad.valor}
              onChange={(e) => {
                unidad.alElegir(e.currentTarget.value);
              }}
              // Encima de la unidad y sin verse: se toca «kg ▾» y se abre el del
              // sistema, con su rueda en el móvil.
              className="absolute inset-0 min-h-toque w-full cursor-pointer opacity-0"
            >
              {unidad.opciones.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.valor} ({opcion.larga})
                </option>
              ))}
            </select>
          </span>
        )}
      </div>
    </Envoltorio>
  );
}

/**
 * El campo de moneda.
 *
 * Trabaja en **centimos enteros** y ensena euros (regla 9). El valor que entra y
 * el que sale son `Centimos`; los euros solo existen mientras se escribe. Asi
 * una coma mal puesta no puede convertir 12,30 € en 12,299999999999999.
 *
 * Se escribe con `inputMode="decimal"` y no con `type="number"`: en un movil eso
 * abre el teclado numerico con coma, que es lo que espera quien mete precios, y
 * evita que la rueda del raton cambie el importe sin querer.
 */
export interface CampoMonedaProps extends Comunes {
  readonly valor: Centimos | null;
  readonly alCambiar: (valor: Centimos | null) => void;
  readonly id?: string;
  readonly disabled?: boolean;
  readonly name?: string;
}

export function CampoMoneda({
  valor,
  alCambiar,
  etiqueta,
  ayuda,
  error,
  obligatorio,
  id,
  ...resto
}: CampoMonedaProps) {
  const generado = useId();
  const suyo = id ?? generado;
  const nota = error !== undefined || ayuda !== undefined ? `${suyo}-nota` : undefined;

  /*
   * Lo que se esta tecleando se guarda tal cual, y solo se ordena al salir del
   * campo.
   *
   * Sin esto, escribir «12,35» seria imposible: al teclear la coma el valor ya
   * seria 1200, el campo se repintaria como «12,00» y el cursor saltaria al
   * final. Es el fallo clasico de los campos de dinero controlados, y se nota a
   * la primera tecla.
   *
   * Mientras el campo tiene el foco manda lo tecleado; cuando lo pierde, manda
   * el valor de verdad, ya con sus dos decimales y sus miles.
   */
  const [tecleando, setTecleando] = useState<string | null>(null);
  const enPantalla = tecleando ?? (valor === null ? '' : enEuros(valor));

  return (
    <Envoltorio
      id={suyo}
      etiqueta={etiqueta}
      {...(ayuda === undefined ? {} : { ayuda })}
      {...(error === undefined ? {} : { error })}
      {...(obligatorio === undefined ? {} : { obligatorio })}
    >
      <div className="relative flex items-center">
        <input
          id={suyo}
          inputMode="decimal"
          value={enPantalla}
          onChange={(evento) => {
            setTecleando(evento.target.value);
            alCambiar(aCentimos(evento.target.value));
          }}
          onBlur={() => {
            // Al salir, lo que se ve es el importe de verdad, bien escrito.
            setTecleando(null);
          }}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={nota}
          className={clases(CAJA, 'pr-e7 text-right', error !== undefined && 'border-mal')}
          {...resto}
        />
        <span aria-hidden className="absolute right-e3 text-texto-suave">
          €
        </span>
      </div>
    </Envoltorio>
  );
}
