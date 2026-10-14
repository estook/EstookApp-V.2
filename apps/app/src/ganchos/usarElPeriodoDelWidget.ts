import { useCallback, useState } from 'react';
import { esPeriodoDelIndicador, type PeriodoDelIndicador } from '@estook/dominio';

/**
 * El periodo de cada widget de cifra, dentro del widget (la experiencia, 0083).
 *
 * «No pongas 7-30 días para elegir el widget, sino que el propio widget tenga esa
 * opción.» Se recuerda **en el aparato y por widget**, como el tema: el Panel del
 * móvil puede mirar la semana y el del ordenador el mes. De fábrica, 7 días.
 */
const PREFIJO = 'estook.periodo.';

function leer(id: string): PeriodoDelIndicador {
  try {
    const guardado = Number(window.localStorage.getItem(`${PREFIJO}${id}`));
    return esPeriodoDelIndicador(guardado) ? guardado : 7;
  } catch {
    return 7;
  }
}

export function usarElPeriodoDelWidget(
  id: string,
): readonly [PeriodoDelIndicador, (dias: PeriodoDelIndicador) => void] {
  const [dias, setDias] = useState<PeriodoDelIndicador>(() => leer(id));
  const poner = useCallback(
    (nuevo: PeriodoDelIndicador) => {
      setDias(nuevo);
      try {
        window.localStorage.setItem(`${PREFIJO}${id}`, String(nuevo));
      } catch {
        /* se usa igual, solo que no se recuerda */
      }
    },
    [id],
  );
  return [dias, poner] as const;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «14 oct», de una fecha operativa que ya viene hecha del servidor (regla 10). */
export function elDiaCorto(fecha: string): string {
  const [, mes, dia] = fecha.split('-');
  return `${Number(dia)} ${MESES[Number(mes) - 1] ?? ''}`.trim();
}
