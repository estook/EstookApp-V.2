import type { ColorDeLaBotonera, IconoDeLaSeccion } from '@estook/dominio';
import { laBaldosa } from './colores.ts';
import { EL_ICONO } from './iconosDeLaSeccion.ts';

/**
 * **La baldosa de una sección**:su icono en oscuro sobre su color, como en la maqueta
 * aprobada. La misma en el comandero, en la caja y en Productos y precios; cambia el lado.
 */
export function LaBaldosaDeLaSeccion({
  icono,
  color,
  lado,
}: {
  readonly icono: IconoDeLaSeccion;
  readonly color: ColorDeLaBotonera | null;
  readonly lado: number;
}) {
  const ElIcono = EL_ICONO[icono];
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${lado >= 56 ? 'rounded-grande' : 'rounded-medio'} ${laBaldosa(color)}`}
      style={{ width: lado, height: lado }}
    >
      <ElIcono size={Math.floor(lado * 0.52)} strokeWidth={2.2} />
    </span>
  );
}
