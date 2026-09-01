import { clases } from '../clases.ts';

/**
 * Cargando · Partes B4 y B6 del Plan.
 *
 * «`Cargando` (**esqueletos, nunca ruedas girando**)» · «Esqueleto con brillo
 * lento, ciclo de 1,4 s» · «nada gira, nada parpadea».
 *
 * Un esqueleto y una rueda no dicen lo mismo. La rueda dice «espera» y no dice
 * cuanto ni a que. El esqueleto dice «va a haber una tabla de seis filas aqui»,
 * y ademas evita que la pantalla salte cuando llegan los datos, porque el hueco
 * ya estaba reservado.
 *
 * Por eso no hay un componente `Rueda` en ningun sitio de Estook, y no es un
 * descuido.
 */
export interface EsqueletoProps {
  /** Alto en pixeles. Por defecto, el de una linea de texto. */
  readonly alto?: number;
  /** Ancho en CSS: `'100%'`, `'8rem'`. */
  readonly ancho?: string;
  readonly redondo?: boolean;
}

export function Esqueleto({ alto = 16, ancho = '100%', redondo = false }: EsqueletoProps) {
  return (
    <span
      aria-hidden
      className={clases('block esqueleto', redondo ? 'rounded-redondo' : 'rounded-chico')}
      style={{ height: alto, width: ancho }}
    />
  );
}

export interface CargandoProps {
  /** Que se esta cargando, para quien no ve el esqueleto. */
  readonly que: string;
  /** Cuantas lineas dibujar. Que se parezcan a lo que va a venir. */
  readonly lineas?: number;
}

/**
 * El bloque de carga completo, con su aviso para lectores de pantalla.
 *
 * `aria-busy` en la region y un texto solo para lectores: sin eso, quien navega
 * escuchando se encuentra una zona muda y no sabe si esta rota o cargando.
 */
export function Cargando({ que, lineas = 3 }: CargandoProps) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-e2">
      <span className="sr-only">Cargando {que}</span>
      {Array.from({ length: lineas }, (_, i) => (
        <Esqueleto key={i} ancho={i === lineas - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

/** Un esqueleto con forma de tarjeta, para el Panel. */
export function TarjetaCargando({ que }: { readonly que: string }) {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-e3 rounded-grande border border-borde bg-superficie p-e4 shadow-s1"
    >
      <span className="sr-only">Cargando {que}</span>
      <Esqueleto alto={11} ancho="40%" />
      <Esqueleto alto={34} ancho="55%" />
      <Esqueleto alto={13} ancho="70%" />
    </div>
  );
}
