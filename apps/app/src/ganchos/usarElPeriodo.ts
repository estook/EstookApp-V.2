import { useSearchParams } from 'react-router-dom';
import { esPeriodoDelServicio, type PeriodoDelServicio } from '@estook/dominio';

/**
 * El día, la semana o el mes, con flechas para ir atrás (la pausa del 8-nov, 0142): lo comparten
 * Servicio › Jornadas › Información, Negocio › Informes y Servicio › Empleados.
 *
 * Va en la dirección (`?periodo=semana&del=2026-11-02`), como Informes desde R2: el enlace del
 * correo del lunes, abierto el jueves, sigue enseñando esa semana.
 */
export function usarElPeriodo(deFabrica: PeriodoDelServicio): {
  readonly periodo: PeriodoDelServicio;
  readonly del: string | null;
  readonly parametros: Readonly<Record<string, string>>;
  readonly elegir: (periodo: PeriodoDelServicio) => void;
  readonly irA: (del: string | null) => void;
} {
  const [busqueda, ponerBusqueda] = useSearchParams();
  const pedido = busqueda.get('periodo');
  const periodo = esPeriodoDelServicio(pedido) ? pedido : deFabrica;
  const del = busqueda.get('del');
  return {
    periodo,
    del,
    parametros: { periodo, ...(del === null ? {} : { del }) },
    elegir(nuevo) {
      const nuevos = new URLSearchParams(busqueda);
      nuevos.set('periodo', nuevo);
      nuevos.delete('del');
      ponerBusqueda(nuevos, { replace: true });
    },
    irA(fecha) {
      const nuevos = new URLSearchParams(busqueda);
      if (fecha === null) nuevos.delete('del');
      else nuevos.set('del', fecha);
      ponerBusqueda(nuevos, { replace: true });
    },
  };
}
