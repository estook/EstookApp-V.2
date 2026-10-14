import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { esPeriodoDelIndicador, type PeriodoDelIndicador } from '@estook/dominio';
import { usarSesion, type QuienSoy } from '../sesion/Sesion.tsx';

/**
 * El periodo de cada widget de cifra, dentro del widget (la experiencia, 0083).
 *
 * «No pongas 7-30 días para elegir el widget, sino que el propio widget tenga esa
 * opción.» De fábrica, 7 días.
 *
 * **Se recuerda en tu cuenta** desde las bases firmes (0084 · migración 0066): «que el
 * móvil y el ordenador lo recuerden igual». Viaja con `quien_soy`, así que al abrir la
 * app ya se sabe y las cifras se piden con sus días desde el principio. Al cambiarlo:
 *
 *   1 · se ve **al momento**: se escribe en la caché de `quien_soy`;
 *   2 · se guarda **en el aparato** también, por si la API todavía no lo sabe guardar
 *       o no hay señal: es lo que se usa mientras la cuenta no diga nada;
 *   3 · y se manda a la cuenta, sin esperar ni molestar si falla: es una preferencia,
 *       y la próxima vez que se toque se vuelve a mandar.
 */
const PREFIJO = 'estook.periodo.';

function delAparato(id: string): PeriodoDelIndicador | null {
  try {
    const guardado = Number(window.localStorage.getItem(`${PREFIJO}${id}`));
    return esPeriodoDelIndicador(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

export function usarElPeriodoDelWidget(
  id: string,
): readonly [PeriodoDelIndicador, (dias: PeriodoDelIndicador) => void] {
  const { yo, cliente } = usarSesion();
  const cache = useQueryClient();
  const deLaCuenta = yo?.preferencias?.periodos[id];
  const dias: PeriodoDelIndicador = deLaCuenta ?? delAparato(id) ?? 7;

  const poner = useCallback(
    (nuevo: PeriodoDelIndicador) => {
      cache.setQueryData<QuienSoy>(['quien_soy'], (antes) =>
        antes === undefined
          ? antes
          : {
              ...antes,
              preferencias: {
                recorridoVisto: antes.preferencias?.recorridoVisto ?? false,
                periodos: { ...(antes.preferencias?.periodos ?? {}), [id]: nuevo },
              },
            },
      );
      try {
        window.localStorage.setItem(`${PREFIJO}${id}`, String(nuevo));
      } catch {
        /* en navegación privada no se recuerda en el aparato, y no pasa nada */
      }
      void cliente.ejecutar('poner_el_periodo_del_widget', { widget: id, dias: nuevo });
    },
    [cache, cliente, id],
  );
  return [dias, poner] as const;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «14 oct», de una fecha operativa que ya viene hecha del servidor (regla 10). */
export function elDiaCorto(fecha: string): string {
  const [, mes, dia] = fecha.split('-');
  return `${Number(dia)} ${MESES[Number(mes) - 1] ?? ''}`.trim();
}
