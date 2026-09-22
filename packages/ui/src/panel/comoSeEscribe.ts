import {
  COMO_ES_EL_INDICADOR,
  centimos,
  comoSeLeenLasHoras,
  conSimbolo,
  type Indicador,
  type PeriodoDelIndicador,
} from '@estook/dominio';

/** Cómo se escribe una cifra de cada unidad. `dias` es el largo del periodo. */
export function comoSeEscribe(
  indicador: Indicador,
  valor: number,
  dias?: PeriodoDelIndicador,
): string {
  switch (COMO_ES_EL_INDICADOR[indicador].unidad) {
    case 'dinero':
      return conSimbolo(centimos(Math.trunc(valor)));
    case 'porcentaje':
      return `${valor.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
    case 'minutos':
      return comoSeLeenLasHoras(valor);
    case 'cuenta':
      return valor.toLocaleString('es-ES', { maximumFractionDigits: 0 });
    case 'dias':
      return dias === undefined ? String(valor) : `${valor} de ${dias}`;
  }
}
