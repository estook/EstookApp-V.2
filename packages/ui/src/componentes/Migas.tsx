import type { ReactNode } from 'react';
import { IconoAtras, IconoFlechaDerecha, IconoFlechaIzquierda } from '@estook/iconos';
import { clases } from '../clases.ts';

/**
 * Las migas y el paginador · Partes B4 y B5 del Plan.
 *
 * «Migas» · «**Maximo tres niveles** (app -> vista -> ficha). Siempre hay una
 * forma de volver **que no es el boton del navegador**.»
 *
 * Las migas son esa forma de volver. Y el tipo lo obliga: `Camino` acepta como
 * mucho tres pasos. Si alguien intenta poner un cuarto nivel, no compila, y esa
 * es exactamente la conversacion que hay que tener antes de que la aplicacion se
 * llene de sitios de los que no se sabe salir.
 */
export interface Paso {
  readonly nombre: string;
  /** Sin destino, es el sitio donde se esta: el ultimo. */
  readonly ir?: () => void;
}

export type Camino = readonly [Paso] | readonly [Paso, Paso] | readonly [Paso, Paso, Paso];

export interface MigasProps {
  readonly camino: Camino;
}

export function Migas({ camino }: MigasProps) {
  /*
   * A donde vuelve la flecha de movil: al **ultimo paso que tenga destino**, no
   * al inmediatamente anterior.
   *
   * Con un camino como «Panel > Carta > Menus», el anterior es «Carta», que en
   * M3 todavia no es un sitio al que ir, asi que no tiene destino. Si se mirara
   * solo el anterior, no habria flecha, y en movil no quedaria ninguna forma de
   * volver dentro de la propia pantalla.
   */
  const volver = [...camino].reverse().find((paso) => paso.ir !== undefined);

  return (
    <nav aria-label="Donde estas" className="flex items-center gap-e2 min-w-0">
      {/* En movil no caben tres nombres: cabe una flecha de volver. */}
      {volver?.ir !== undefined && (
        <button
          type="button"
          onClick={volver.ir}
          aria-label={`Volver a ${volver.nombre}`}
          className="grid size-toque shrink-0 place-items-center -ml-e2 rounded-medio text-texto-suave hover:bg-fondo sm:hidden"
        >
          <IconoAtras size={20} />
        </button>
      )}

      <ol className="hidden min-w-0 items-center gap-e1 text-secundario sm:flex">
        {camino.map((paso, i) => (
          <li key={paso.nombre} className="flex min-w-0 items-center gap-e1">
            {i > 0 && <IconoFlechaDerecha size={14} className="shrink-0 text-texto-suave" />}
            {paso.ir === undefined ? (
              <span aria-current="page" className="truncate text-texto">
                {paso.nombre}
              </span>
            ) : (
              <button
                type="button"
                onClick={paso.ir}
                className="truncate text-texto-suave hover:text-texto hover:underline"
              >
                {paso.nombre}
              </button>
            )}
          </li>
        ))}
      </ol>

      {/* En movil, solo donde estas. */}
      <span className="truncate text-cuerpo font-semibold sm:hidden">
        {camino[camino.length - 1]?.nombre}
      </span>
    </nav>
  );
}

/**
 * El paginador.
 *
 * «Nada de scroll infinito en el Panel» (Manifiesto). Y en general: con el
 * desplazamiento infinito no se sabe cuanto queda, no se puede volver al mismo
 * sitio y no se llega nunca al pie. Paginas numeradas, y ya.
 */
export interface PaginadorProps {
  readonly pagina: number;
  readonly deCuantas: number;
  readonly alIr: (pagina: number) => void;
  /** Que se esta paginando, para el lector de pantalla: «productos». */
  readonly que: string;
}

export function Paginador({ pagina, deCuantas, alIr, que }: PaginadorProps) {
  if (deCuantas <= 1) return null;

  return (
    <nav aria-label={`Paginas de ${que}`} className="flex items-center justify-between gap-e3">
      <Salto
        hacia={pagina - 1}
        puede={pagina > 1}
        alIr={alIr}
        etiqueta="Pagina anterior"
        icono={<IconoFlechaIzquierda size={18} />}
      >
        Anterior
      </Salto>

      <p aria-live="polite" className="text-secundario text-texto-suave">
        Pagina {pagina} de {deCuantas}
      </p>

      <Salto
        hacia={pagina + 1}
        puede={pagina < deCuantas}
        alIr={alIr}
        etiqueta="Pagina siguiente"
        icono={<IconoFlechaDerecha size={18} />}
        alReves
      >
        Siguiente
      </Salto>
    </nav>
  );
}

function Salto({
  hacia,
  puede,
  alIr,
  etiqueta,
  icono,
  alReves = false,
  children,
}: {
  readonly hacia: number;
  readonly puede: boolean;
  readonly alIr: (pagina: number) => void;
  readonly etiqueta: string;
  readonly icono: ReactNode;
  readonly alReves?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={!puede}
      aria-label={etiqueta}
      onClick={() => {
        alIr(hacia);
      }}
      className={clases(
        'inline-flex min-h-toque items-center gap-e2 rounded-medio px-e3 text-cuerpo',
        'text-texto-suave hover:bg-fondo hover:text-texto',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        alReves && 'flex-row-reverse',
      )}
    >
      {icono}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}
