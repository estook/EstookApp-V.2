import { accionPorId, puedoHacer, type Accion } from '../acciones/catalogo.tsx';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * Una acción del catálogo, **si esta persona puede hacerla** (entrega V, punto 4).
 *
 * Es lo que usan los vacíos para ganar su botón: «todavía no hay cajas cerradas»
 * ofrece «Cerrar la caja» a quien la cierra, y a un cocinero le dice quién lo hace.
 * Devolver nulo en vez de un botón apagado es a propósito: un botón que dice que no
 * al pulsarlo es peor que una frase que lo explica.
 */
export function usarAccion(id: string): Accion | null {
  const { permisos } = usarSesion();
  const accion = accionPorId(id);
  if (accion === undefined || !puedoHacer(permisos, accion)) return null;
  return accion;
}
