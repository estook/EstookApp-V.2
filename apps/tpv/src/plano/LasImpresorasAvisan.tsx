import { useState } from 'react';
import { Boton } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import {
  DONDE_SE_DESCARGA,
  cerrarLaFranja,
  esUnPcConWindows,
  laCajaParaWindows,
  laFranjaSeCerro,
} from '../datos/laCajaParaWindows.ts';

/**
 * **En la caja web de un PC con Windows, descargar la caja para Windows** (0119, maquetas de T5,
 * 1). Fuera del programa no se imprime; «Ahora no» la quita una semana en este aparato.
 */
export function DescargaLaCajaParaWindows() {
  const { aparato } = usarSesion();
  const [cerrada, setCerrada] = useState(() => laFranjaSeCerro());
  if (
    aparato.funcion !== 'caja' ||
    laCajaParaWindows() !== null ||
    !esUnPcConWindows() ||
    cerrada
  ) {
    return null;
  }
  return (
    <div className="mx-e4 mt-e3 flex flex-wrap items-center gap-e3 rounded-grande bg-info-suave py-e2 pl-e4 pr-e2 md:mx-e5">
      <span className="flex-1 font-bold text-info">
        🖨 Descarga la caja para Windows: imprime, abre el cajón y sigue sin internet.
      </span>
      <a
        href={DONDE_SE_DESCARGA}
        className="inline-flex min-h-toque items-center rounded-medio bg-naranja px-e4 font-bold text-sobre-naranja"
      >
        Descargar
      </a>
      <Boton
        tono="texto"
        tamano="s"
        onClick={() => {
          cerrarLaFranja();
          setCerrada(true);
        }}
      >
        Ahora no
      </Boton>
    </div>
  );
}
