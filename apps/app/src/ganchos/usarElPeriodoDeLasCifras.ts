import { useState } from 'react';
import { esPeriodoDelIndicador, type PeriodoDelIndicador } from '@estook/dominio';

const CLAVE_DEL_PERIODO = 'estook.cifras.dias';

/**
 * La semana o el mes, recordado **en este aparato** para todas las apps: quien
 * mira el mes en Inventario quiere el mes en Servicio. Es una comodidad, así que
 * si el navegador no deja guardar —ventana privada, almacenamiento bloqueado— se
 * sigue con la semana y no pasa nada.
 */
export function usarElPeriodoDeLasCifras(): readonly [
  PeriodoDelIndicador,
  (dias: PeriodoDelIndicador) => void,
] {
  const [dias, setDias] = useState<PeriodoDelIndicador>(() => {
    try {
      const guardado = Number(window.localStorage.getItem(CLAVE_DEL_PERIODO));
      return esPeriodoDelIndicador(guardado) ? guardado : 7;
    } catch {
      return 7;
    }
  });

  const poner = (nuevo: PeriodoDelIndicador) => {
    setDias(nuevo);
    try {
      window.localStorage.setItem(CLAVE_DEL_PERIODO, String(nuevo));
    } catch {
      // Sin almacenamiento, se recuerda hasta que se cierre la pantalla.
    }
  };

  return [dias, poner] as const;
}
