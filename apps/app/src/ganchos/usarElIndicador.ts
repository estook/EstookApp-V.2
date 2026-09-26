import type { Indicador, PeriodoDelIndicador } from '@estook/dominio';
import { puedeTenerElIndicador, puedeVer } from '@estook/permisos';
import type { DatosDelIndicador } from '@estook/ui';
import { usarLectura } from './usarLectura.ts';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Dónde se mira el detalle de cada uno.
 *
 * Nulo si no tiene pantalla aparte: las horas propias no la tienen todavía —el
 * cuadrante es de Horarios, entrega H—.
 */
export const DONDE_SE_MIRA: Readonly<Record<Indicador, string | null>> = {
  ventas: '/servicio/jornada/cierre',
  'ticket-medio': '/servicio/jornada/cierre',
  'food-cost': '/servicio/jornada/cierre',
  merma: '/almacen/movimientos/mermas',
  compras: '/almacen/compras/albaranes',
  'mis-horas': null,
  'valor-camara': '/almacen/productos',
  'bajo-minimo': '/almacen/productos/bajo-minimo',
  cierres: '/servicio/jornada/cierre',
  // Las tres de Equipo se miran persona a persona en el Resumen, que es donde
  // están sus horas, su coste y sus retrasos contados igual.
  'horas-equipo': '/equipo/fichajes',
  'coste-personal': '/equipo/fichajes',
  retrasos: '/equipo/fichajes',
};

/**
 * Si esta persona puede tener el indicador aquí, y sus datos.
 *
 * Con un local elegido y con lo que pide el indicador: lo mismo que el servidor
 * vuelve a comprobar (regla 26). Sin permiso no se pregunta, y no se pinta.
 */
export function usarElIndicador(indicador: Indicador, dias: PeriodoDelIndicador) {
  const { permisos, yo } = usarSesion();
  const puede =
    yo?.local !== null &&
    yo?.local !== undefined &&
    puedeTenerElIndicador((permiso) => puedeVer(permisos, permiso), indicador);

  const consulta = usarLectura<DatosDelIndicador>(
    'un_indicador',
    { indicador, dias: String(dias) },
    puede,
  );
  return { puede, datos: consulta.data, fallo: consulta.isError };
}
