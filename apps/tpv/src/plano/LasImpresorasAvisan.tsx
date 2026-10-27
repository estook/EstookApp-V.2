import { useEffect, useMemo, useRef, useState } from 'react';
import { Boton } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';
import { usarAlSegundo, usarLasImpresoras } from '../ganchos/usarLaSala.ts';
import { tocar } from '../cocina/sonidos.ts';
import {
  DONDE_SE_DESCARGA,
  cerrarLaFranja,
  esUnPcConWindows,
  laCajaParaWindows,
  laFranjaSeCerro,
} from '../datos/laCajaParaWindows.ts';
import { irA } from '../navegar.ts';

/**
 * **Lo que dicen las impresoras, arriba de la sala** (T5 · 1, decisión 0119; Anexo 6.7, regla 5):
 * «Sin papel en Cocina», «Cocina no responde» o «2 papeles sin salir en Cocina», en todos los
 * aparatos, **antes de que nadie lo mire**. En la caja, además, suena una vez por aviso nuevo.
 * Siempre con texto: nunca solo con el color.
 */
export function LasImpresorasAvisan() {
  const { aparato } = usarSesion();
  const impresoras = usarLasImpresoras(usarAlSegundo());
  const avisos = useMemo(() => impresoras.data?.avisos ?? [], [impresoras.data]);
  const oidos = useRef(new Set<string>());

  useEffect(() => {
    const nuevos = avisos.filter((a) => !oidos.current.has(`${a.impresora}:${a.que}`));
    for (const a of avisos) oidos.current.add(`${a.impresora}:${a.que}`);
    if (nuevos.length > 0 && aparato.funcion === 'caja') tocar('aviso');
  }, [avisos, aparato.funcion]);

  if (avisos.length === 0) return null;
  return (
    <div className="flex flex-col gap-e2 px-e4 pt-e3 md:px-e5">
      {avisos.map((a) => (
        <div
          key={`${a.impresora}:${a.que}`}
          role="alert"
          className="flex flex-wrap items-center gap-e3 rounded-grande bg-mal-suave py-e2 pl-e4 pr-e2 font-bold text-mal"
        >
          <span className="flex-1">
            🖨{' '}
            {a.que === 'sin_papel'
              ? `Sin papel en ${a.impresora}`
              : a.que === 'no_responde'
                ? `${a.impresora} no responde: mira que esté encendida`
                : `${a.sinSalir === 1 ? '1 papel' : `${String(a.sinSalir)} papeles`} sin salir en ${a.impresora}`}
          </span>
          {aparato.funcion === 'caja' && (
            <Boton
              tono="secundario"
              tamano="s"
              onClick={() => {
                irA('ajustes/impresoras');
              }}
            >
              Ver
            </Boton>
          )}
        </div>
      ))}
    </div>
  );
}

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
