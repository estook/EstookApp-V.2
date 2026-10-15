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

/**
 * **La forma de lo que va a llegar** (0085).
 *
 * Tres rayas grises iguales valían para todo, y por eso no decían nada: una gráfica,
 * un anillo y una lista de proveedores cargaban igual. Richi: «siluetas de carga con
 * la forma real de cada widget y de cada lista». Ahora cada cosa reserva **su hueco y
 * su dibujo**: la cifra con su gráfica, la lista con sus caras o sus fotos, los
 * medidores en redondo. Cuando llegan los datos no salta nada: el sitio ya era ese.
 *
 *   lineas       un párrafo, para lo que es texto suelto
 *   cifra        el número grande, su comparación y su gráfica
 *   anillo       el anillo de la jornada, con su hora y su botón
 *   medidores    los medidores en redondo (los objetivos)
 *   niveles      filas con su barra de nivel (bajo mínimo)
 *   dias         casillas con el día dentro (lo que caduca)
 *   caras        cuántos hay, las caras apiladas y quién (el equipo ahora)
 *   tiempo       una línea del tiempo con sus puntos (lo que viene)
 *   lista        filas de una lista, con su valor a la derecha
 *   lista-cara   filas que empiezan por una cara (personas, proveedores, el chat)
 *   lista-foto   filas que empiezan por una foto cuadrada (productos, mermas)
 *   tarjetas     un mosaico de tarjetas (Ajustes, el resumen de una app)
 */
export type FormaDeCarga =
  | 'lineas'
  | 'cifra'
  | 'anillo'
  | 'medidores'
  | 'niveles'
  | 'dias'
  | 'caras'
  | 'tiempo'
  | 'lista'
  | 'lista-cara'
  | 'lista-foto'
  | 'tarjetas';

export interface CargandoProps {
  /** Que se esta cargando, para quien no ve el esqueleto. */
  readonly que: string;
  /** Cuantas lineas (o filas, o casillas) dibujar. Que se parezcan a lo que va a venir. */
  readonly lineas?: number;
  /** Su forma (0085). Sin decirla, unas lineas de texto. */
  readonly forma?: FormaDeCarga;
  /** En una cifra: la grafica alta, la de un widget ancho. */
  readonly alto?: boolean;
}

/**
 * El bloque de carga completo, con su aviso para lectores de pantalla.
 *
 * `aria-busy` en la region y un texto solo para lectores: sin eso, quien navega
 * escuchando se encuentra una zona muda y no sabe si esta rota o cargando.
 */
export function Cargando({ que, lineas, forma = 'lineas', alto = false }: CargandoProps) {
  return (
    <div aria-busy="true" aria-live="polite" data-silueta={forma} className="flex flex-col gap-e2">
      <span className="sr-only">Cargando {que}</span>
      <Silueta forma={forma} cuantas={lineas} alto={alto} />
    </div>
  );
}

/** Un ancho que no se repite fila a fila: una lista de verdad no tiene todo igual. */
const ANCHOS = ['72%', '55%', '64%', '48%', '68%', '58%'] as const;
function anchoDe(i: number): string {
  return ANCHOS[i % ANCHOS.length] ?? '60%';
}

/** La línea de una gráfica, recortada en el esqueleto: se lee «aquí va una gráfica». */
const PERFIL_DE_GRAFICA =
  'polygon(0 72%, 14% 56%, 28% 64%, 42% 40%, 56% 50%, 70% 24%, 85% 36%, 100% 16%, 100% 100%, 0 100%)';

function Silueta({
  forma,
  cuantas,
  alto,
}: {
  readonly forma: FormaDeCarga;
  readonly cuantas: number | undefined;
  readonly alto: boolean;
}) {
  switch (forma) {
    case 'cifra':
      return (
        <>
          <Esqueleto alto={30} ancho="46%" />
          <Esqueleto alto={11} ancho="30%" />
          <span
            aria-hidden
            className="mt-e1 block esqueleto rounded-medio"
            style={{ height: alto ? 96 : 58, clipPath: PERFIL_DE_GRAFICA }}
          />
        </>
      );
    case 'anillo':
      return (
        <>
          <span className="flex items-center gap-e3">
            <span aria-hidden className="block size-[76px] shrink-0 esqueleto rounded-redondo" />
            <span className="flex flex-1 flex-col gap-e2">
              <Esqueleto alto={11} ancho="40%" />
              <Esqueleto alto={20} ancho="55%" />
            </span>
          </span>
          <Esqueleto alto={44} />
        </>
      );
    case 'medidores':
      return (
        <span className="flex justify-around gap-e3 py-e1">
          {Array.from({ length: cuantas ?? 3 }, (_, i) => (
            <span key={i} className="flex flex-col items-center gap-e2">
              <span aria-hidden className="block size-[92px] esqueleto rounded-redondo" />
              <Esqueleto alto={10} ancho="64px" />
            </span>
          ))}
        </span>
      );
    case 'niveles':
      return (
        <>
          {Array.from({ length: cuantas ?? 3 }, (_, i) => (
            <span key={i} className="flex flex-col gap-[6px] py-e1">
              <span className="flex justify-between gap-e3">
                <Esqueleto alto={13} ancho={anchoDe(i)} />
                <Esqueleto alto={13} ancho="18%" />
              </span>
              <Esqueleto alto={6} redondo />
            </span>
          ))}
        </>
      );
    case 'dias':
      return (
        <span className="grid gap-e2 @min-[26rem]:grid-cols-2">
          {Array.from({ length: cuantas ?? 4 }, (_, i) => (
            <span
              key={i}
              className="flex items-center gap-e3 rounded-grande border border-borde p-e2"
            >
              <span aria-hidden className="block size-11 shrink-0 esqueleto rounded-medio" />
              <Esqueleto alto={13} ancho={anchoDe(i)} />
            </span>
          ))}
        </span>
      );
    case 'caras':
      return (
        <>
          <span className="flex items-center gap-e3">
            <Esqueleto alto={30} ancho="28px" />
            <span className="flex flex-1 flex-col gap-e1">
              <Esqueleto alto={13} ancho="50%" />
              <Esqueleto alto={10} ancho="35%" />
            </span>
            <span className="flex -space-x-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden
                  className="block size-8 esqueleto rounded-[11px] ring-2 ring-superficie"
                />
              ))}
            </span>
          </span>
          <FilasDeLista cuantas={cuantas ?? 2} />
        </>
      );
    case 'tiempo':
      return (
        <span className="flex flex-col gap-e2 border-l border-borde pl-e3">
          {Array.from({ length: cuantas ?? 3 }, (_, i) => (
            <span key={i} className="relative flex items-center gap-e2 py-e1">
              <span
                aria-hidden
                className="absolute -left-[calc(var(--spacing-e3)+4.5px)] block size-2 esqueleto rounded-redondo"
              />
              <Esqueleto alto={11} ancho="36px" />
              <Esqueleto alto={13} ancho={anchoDe(i)} />
            </span>
          ))}
        </span>
      );
    case 'lista':
      return <FilasDeLista cuantas={cuantas ?? 4} />;
    case 'lista-cara':
      return <FilasDeLista cuantas={cuantas ?? 4} inicio="cara" />;
    case 'lista-foto':
      return <FilasDeLista cuantas={cuantas ?? 4} inicio="foto" />;
    case 'tarjetas':
      return (
        <span className="grid gap-e3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cuantas ?? 6 }, (_, i) => (
            <span
              key={i}
              className="flex items-center gap-e3 rounded-grande border border-borde bg-superficie p-e3"
            >
              <span aria-hidden className="block size-9 shrink-0 esqueleto rounded-medio" />
              <span className="flex flex-1 flex-col gap-e1">
                <Esqueleto alto={13} ancho={anchoDe(i)} />
                <Esqueleto alto={10} ancho="40%" />
              </span>
            </span>
          ))}
        </span>
      );
    case 'lineas': {
      const n = cuantas ?? 3;
      return (
        <>
          {Array.from({ length: n }, (_, i) => (
            <Esqueleto key={i} ancho={i === n - 1 ? '60%' : '100%'} />
          ))}
        </>
      );
    }
  }
}

/** Filas de una lista: lo de delante (cara o foto), el nombre, su detalle y un valor. */
function FilasDeLista({
  cuantas,
  inicio,
}: {
  readonly cuantas: number;
  readonly inicio?: 'cara' | 'foto';
}) {
  return (
    <span className="flex flex-col">
      {Array.from({ length: cuantas }, (_, i) => (
        <span
          key={i}
          className="flex min-h-[48px] items-center gap-e3 border-b border-borde/60 py-e2 last:border-b-0"
        >
          {inicio !== undefined && (
            <span
              aria-hidden
              className={clases(
                'block size-9 shrink-0 esqueleto',
                inicio === 'cara' ? 'rounded-redondo' : 'rounded-medio',
              )}
            />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <Esqueleto alto={13} ancho={anchoDe(i)} />
            <Esqueleto alto={10} ancho="34%" />
          </span>
          <Esqueleto alto={13} ancho="52px" />
        </span>
      ))}
    </span>
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
