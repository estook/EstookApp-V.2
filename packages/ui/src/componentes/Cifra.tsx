import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clases } from '../clases.ts';

/**
 * La cifra · Partes B4 y B6 del Plan.
 *
 * «Cifra (con su comparacion, su objetivo y su origen debajo)» · «Las cifras
 * llevan su origen y su periodo» (E1).
 *
 * Las cuatro partes no son adorno: una cifra sola no dice nada. «12.400 €» no se
 * puede juzgar; «12.400 €, un 8 % mas que el mes pasado, objetivo 13.000, del TPV
 * y de ayer» si.
 *
 * «Cifra que cambia: cuenta desde el valor anterior, 400 ms» (B6). Y solo
 * entonces: la primera vez aparece puesta, porque contar desde cero al abrir la
 * pantalla no explica nada y hace esperar.
 */
export type SentidoDeLaComparacion = 'sube_es_bueno' | 'baja_es_bueno' | 'neutro';

export interface CifraProps {
  readonly etiqueta: string;
  /** El numero, para poder animarlo y compararlo. */
  readonly valor: number;
  /** Como se escribe. Aqui es donde entran `conSimbolo` o `comoPorcentaje`. */
  readonly formato: (valor: number) => string;
  /** Contra que se compara. Sin esto, la cifra no lleva comparacion. */
  readonly antes?: number;
  readonly sentido?: SentidoDeLaComparacion;
  readonly objetivo?: string;
  /** De donde sale y de cuando es. «TPV · ayer», «recuento del 3 de marzo». */
  readonly origen?: string;
  readonly icono?: ReactNode;
}

export function Cifra({
  etiqueta,
  valor,
  formato,
  antes,
  sentido = 'neutro',
  objetivo,
  origen,
  icono,
}: CifraProps) {
  const pintado = useCuenta(valor);

  return (
    <div className="flex flex-col gap-e1">
      <p className="flex items-center gap-e1 text-etiqueta uppercase tracking-wide text-texto-suave">
        {icono}
        {etiqueta}
      </p>

      {/*
        `aria-live="polite"` para que un lector de pantalla cante el valor nuevo
        cuando cambia, sin interrumpir. Y el valor de verdad va en `aria-label`,
        no el que se esta animando: quien escucha oye el final, no la cuenta.
      */}
      <p
        className="text-cifra font-bold leading-tight"
        aria-live="polite"
        aria-label={`${etiqueta}: ${formato(valor)}`}
      >
        <span aria-hidden>{formato(pintado)}</span>
      </p>

      {antes !== undefined && (
        <Comparacion valor={valor} antes={antes} sentido={sentido} formato={formato} />
      )}

      {objetivo !== undefined && (
        <p className="text-secundario text-texto-suave">Objetivo: {objetivo}</p>
      )}

      {origen !== undefined && (
        <p className="text-etiqueta uppercase tracking-wide text-texto-suave">{origen}</p>
      )}
    </div>
  );
}

function Comparacion({
  valor,
  antes,
  sentido,
  formato,
}: {
  readonly valor: number;
  readonly antes: number;
  readonly sentido: SentidoDeLaComparacion;
  readonly formato: (valor: number) => string;
}) {
  const diferencia = valor - antes;

  if (diferencia === 0) {
    return <p className="text-secundario text-texto-suave">Igual que antes</p>;
  }

  const sube = diferencia > 0;
  const bueno = sentido === 'neutro' ? null : sentido === 'sube_es_bueno' ? sube : !sube;

  // El color va en la flecha y las palabras en --texto: `bien` da 3,96:1 sobre
  // el fondo, que vale para un icono (3:1) pero no para texto (4,5:1). Y el
  // color nunca va solo de todas formas (B1): la flecha apunta y el texto lo
  // dice con palabras.
  const color = bueno === null ? 'text-texto-suave' : bueno ? 'text-bien' : 'text-mal';

  return (
    <p className="text-secundario text-texto">
      <span aria-hidden className={clases('font-bold', color)}>
        {sube ? '▲' : '▼'}{' '}
      </span>
      {sube ? 'Sube' : 'Baja'} {formato(Math.abs(diferencia))}
    </p>
  );
}

/**
 * Cuenta desde el valor anterior hasta el nuevo, en 400 ms (B6).
 *
 * Con `requestAnimationFrame` y no con un temporizador: asi va al ritmo de la
 * pantalla y se para sola cuando la pestana esta en segundo plano.
 *
 * Respeta `prefers-reduced-motion`, que aqui no se puede dejar a CSS porque es
 * un numero interpolado y no una transicion.
 */
function useCuenta(destino: number): number {
  const [pintado, setPintado] = useState(destino);
  const anterior = useRef(destino);
  const primera = useRef(true);

  useEffect(() => {
    const desde = anterior.current;
    anterior.current = destino;

    // La primera vez no se cuenta: aparece puesta.
    if (primera.current) {
      primera.current = false;
      setPintado(destino);
      return;
    }

    if (desde === destino) return;

    const quieto =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (quieto) {
      setPintado(destino);
      return;
    }

    const DURACION = 400;
    let arranque: number | null = null;
    let peticion = 0;

    const paso = (ahora: number) => {
      arranque ??= ahora;
      const avance = Math.min((ahora - arranque) / DURACION, 1);
      // La misma curva que el resto del movimiento, para que no desentone.
      const suave = 1 - (1 - avance) ** 3;
      setPintado(desde + (destino - desde) * suave);
      if (avance < 1) peticion = requestAnimationFrame(paso);
    };

    peticion = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(peticion);
    };
  }, [destino]);

  return pintado;
}
