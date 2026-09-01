import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clases } from '../clases.ts';

/**
 * El boton · Parte B4 del Plan.
 *
 * «Boton (principal, secundario, texto, peligro · tamanos m y l · estado
 * cargando)».
 *
 * Las tres reglas de B4 que le tocan, y que este componente hace cumplir sin que
 * la pantalla tenga que acordarse:
 *
 *   · **Toque minimo 44 px.** En listas de cocina, 52. No es un minimo teorico:
 *     se usa con prisa y con las manos mojadas.
 *   · **Un boton principal por pantalla.** Eso no lo puede imponer un componente
 *     (no sabe que mas hay en la pantalla), pero si lo puede poner facil: el
 *     `tono` por defecto es `secundario`, asi que el principal hay que pedirlo a
 *     proposito.
 *   · **Cargando no es una rueda girando.** El boton se queda quieto, se
 *     deshabilita y lo dice. Y conserva su ancho, para que la pantalla no salte.
 */
export type TonoDeBoton = 'principal' | 'secundario' | 'texto' | 'peligro';
export type TamanoDeBoton = 'm' | 'l';

export interface BotonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly tono?: TonoDeBoton;
  readonly tamano?: TamanoDeBoton;
  /**
   * Mientras esta puesto el boton no se puede pulsar, y lo dice con palabras.
   * Es lo que evita el doble envio, junto con la idempotencia del servidor.
   */
  readonly cargando?: boolean;
  readonly textoCargando?: string;
  readonly icono?: ReactNode;
  /** Ocupa todo el ancho. En movil, lo normal dentro de una hoja. */
  readonly ancho?: boolean;
}

const TONOS: Record<TonoDeBoton, string> = {
  principal:
    'bg-naranja text-charcoal border border-naranja hover:brightness-95 active:brightness-90 shadow-s1',
  secundario:
    'bg-superficie text-texto border border-borde-fuerte hover:bg-fondo active:bg-borde/40',
  texto:
    'bg-transparent text-texto-suave border border-transparent hover:bg-borde/40 hover:text-texto',
  peligro: 'bg-superficie text-mal border border-mal/40 hover:bg-mal-suave active:bg-mal-suave',
};

const TAMANOS: Record<TamanoDeBoton, string> = {
  // 44 px de alto minimo, y el padding por dentro. `min-h` y no `h`, para que un
  // boton con dos lineas de texto crezca en vez de cortarlas.
  m: 'min-h-toque px-e4 gap-e2 text-cuerpo rounded-medio',
  l: 'min-h-toque-cocina px-e5 gap-e2 text-seccion rounded-grande',
};

export function Boton({
  tono = 'secundario',
  tamano = 'm',
  cargando = false,
  textoCargando = 'Guardando',
  icono,
  ancho = false,
  disabled,
  children,
  type = 'button',
  ...resto
}: BotonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || cargando}
      // Un lector de pantalla tiene que enterarse de que esta ocupado sin que se
      // le mueva el foco a ningun sitio.
      aria-busy={cargando || undefined}
      className={clases(
        'inline-flex items-center justify-center font-medium select-none',
        'transition-[background-color,box-shadow,filter] duration-[--rapido] ease-curva',
        'disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none',
        TONOS[tono],
        TAMANOS[tamano],
        ancho && 'w-full',
      )}
      {...resto}
    >
      {cargando ? (
        textoCargando
      ) : (
        <>
          {icono}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * Los botones de una pantalla o de una hoja, colocados.
 *
 * «El boton que ejecuta va **abajo a la derecha**; cancelar a su izquierda.»
 * (B4). Se pone aqui para que ninguna pantalla tenga que acordarse, y para que
 * no acaben unas con el aceptar a la izquierda y otras a la derecha.
 *
 * En movil se apilan y el que ejecuta queda **arriba**, que es donde llega el
 * pulgar: en una columna, «abajo a la derecha» deja de significar nada.
 */
export function Botones({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-e2 sm:flex-row sm:justify-end sm:gap-e3">
      {children}
    </div>
  );
}
