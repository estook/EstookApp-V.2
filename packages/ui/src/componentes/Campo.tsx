import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { centimos, enEuros, type Centimos } from '@estook/dominio';
import { clases } from '../clases.ts';

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

export interface CampoProps
  extends Comunes, Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  readonly tipo?: TipoDeCampo;
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
      <label htmlFor={id} className="text-etiqueta text-texto-suave uppercase tracking-wide">
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
            error !== undefined && 'border-mal',
          )}
          {...resto}
        />
        {detras !== undefined && (
          <span className="absolute right-e3 text-texto-suave text-secundario">{detras}</span>
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

/**
 * De lo que se teclea a centimos.
 *
 * Se hace con cadenas hasta el ultimo paso para no pasar por coma flotante: se
 * parte por la coma, se rellenan los decimales a dos y se junta. `'12,3'` da
 * 1230, no 1229,9999.
 *
 * ── El punto es ambiguo, y hay que resolverlo ────────────────────────────────
 *
 * En Espana el punto separa los miles y la coma los decimales: `10.000,50`. Pero
 * en un teclado numerico de movil muchas veces solo hay punto, y quien escribe
 * `12.30` quiere decir doce euros con treinta. Las dos cosas tienen que
 * funcionar, asi que se decide mirando el numero entero:
 *
 *   · Si hay coma, **la coma manda**: los puntos son miles y se tiran.
 *   · Si no hay coma, un punto con uno o dos digitos detras es decimal
 *     (`12.3`, `12.30`); con tres, es de miles (`10.000`).
 *
 * Sin esto, un campo que ensena `10.000,00` no se podria volver a leer, y editar
 * un precio de mas de mil euros lo dejaria vacio. Lo caza la prueba de ida y
 * vuelta.
 */
export function aCentimos(escrito: string): Centimos | null {
  let limpio = escrito.replace(/[\s€]/g, '');
  if (limpio === '' || limpio === '-') return null;

  if (limpio.includes(',')) {
    // La coma manda: fuera los puntos de miles.
    limpio = limpio.replace(/\./g, '');
  } else {
    // Sin coma: un punto seguido de tres digitos es separador de miles.
    limpio = limpio.replace(/\.(?=\d{3}(\D|$))/g, '');
    limpio = limpio.replace('.', ',');
  }

  if (!/^-?\d*,?\d{0,2}$/.test(limpio)) return null;

  const negativo = limpio.startsWith('-');
  const [entera = '0', decimal = ''] = limpio.replace('-', '').split(',');
  const juntos = `${entera === '' ? '0' : entera}${decimal.padEnd(2, '0')}`;

  const valor = Number.parseInt(juntos, 10);
  if (Number.isNaN(valor)) return null;
  return centimos(negativo ? -valor : valor);
}
