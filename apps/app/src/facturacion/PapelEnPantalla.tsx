import { useEffect, useState } from 'react';
import type { PapelCompuesto, PiezaDelPapel } from '@estook/dominio';
import { clases } from '@estook/ui';

/**
 * **El papel, como sale de la impresora**, para verlo en la pantalla (T6 · 2 · 1, decisión 0136;
 * maqueta de T6: «Como se imprimió»). Pinta el mismo formato intermedio que traduce la caja para
 * Windows (Anexo 6.5), pieza a pieza, así que lo que se ve aquí es lo que salió en el papel. El
 * QR se dibuja con su contenido y la corrección M, como lo imprime la impresora.
 */
export function PapelEnPantalla({ papel }: { readonly papel: PapelCompuesto }) {
  return (
    <div
      aria-label="El papel, como salió"
      className="mx-auto w-full max-w-[22rem] rounded-medio border border-borde bg-white px-e3 py-e3 font-mono text-[12px] leading-snug text-black shadow-s1"
    >
      {papel.piezas.map((pieza, i) => (
        <LaPieza key={i} pieza={pieza} />
      ))}
    </div>
  );
}

const ALINEAR = { izquierda: 'text-left', centro: 'text-center', derecha: 'text-right' } as const;
const TAMANO = {
  normal: '',
  doble: 'text-[16px] font-bold',
  grande: 'text-[22px] font-bold',
} as const;

function LaPieza({ pieza }: { readonly pieza: PiezaDelPapel }) {
  switch (pieza.tipo) {
    case 'texto':
      return (
        <p
          className={clases(
            ALINEAR[pieza.alinear ?? 'izquierda'],
            TAMANO[pieza.tamano ?? 'normal'],
            pieza.negrita === true && 'font-bold',
          )}
        >
          <span className={clases(pieza.negativo === true && 'bg-black px-1 text-white')}>
            {pieza.texto}
          </span>
        </p>
      );
    case 'dos_columnas':
      return (
        <p className={clases('flex justify-between gap-e2', pieza.negrita === true && 'font-bold')}>
          <span className="min-w-0">{pieza.izquierda}</span>
          <span className="shrink-0 tabular-nums">{pieza.derecha}</span>
        </p>
      );
    case 'raya':
      return <hr className="my-1 border-dashed border-black/50" />;
    case 'hueco':
      return <div style={{ height: `${String(pieza.lineas * 1.2)}em` }} />;
    case 'cortar':
      return (
        <p aria-hidden className="mt-e2 border-t border-dashed border-black/40 pt-1 text-center">
          ✂
        </p>
      );
    case 'cajon':
      return null;
    case 'qr':
      return <ElQr contenido={pieza.contenido} />;
  }
}

/** El QR, con la librería de los de la carta, cargada solo al verlo. */
function ElQr({ contenido }: { readonly contenido: string }) {
  const [camino, setCamino] = useState<{ d: string; lado: number } | null>(null);
  useEffect(() => {
    let vivo = true;
    void import('@estook/ui/qr').then(async ({ laMatriz, elCaminoDelQr }) => {
      const matriz = await laMatriz(contenido, 'M');
      if (vivo) setCamino({ d: elCaminoDelQr(matriz, 2), lado: matriz.length + 4 });
    });
    return () => {
      vivo = false;
    };
  }, [contenido]);
  return (
    <div className="my-1 flex justify-center">
      {camino === null ? (
        <div className="size-[140px] animate-pulse bg-black/10" />
      ) : (
        <svg
          role="img"
          aria-label="QR tributario"
          viewBox={`0 0 ${String(camino.lado)} ${String(camino.lado)}`}
          className="size-[140px]"
          shapeRendering="crispEdges"
        >
          <rect width={camino.lado} height={camino.lado} fill="white" />
          <path d={camino.d} fill="black" />
        </svg>
      )}
    </div>
  );
}
