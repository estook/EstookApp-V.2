import type { ColorDeLaBotonera, IconoDeLaSeccion } from '@estook/dominio';
import { elAcentoDelColor, laBaldosa } from './colores.ts';
import { EL_ICONO } from './iconos.ts';

/**
 * **La baldosa de una sección**: su icono en oscuro sobre su color, como en la maqueta
 * aprobada. La misma en el comandero, en la caja, en Productos y precios y en Estook › Carta
 * (0143); cambia el lado.
 *
 * **Suave** (0143): el icono en su color sobre un fondo tintado, como el icono de una tarjeta.
 * Es la de cada plato sin foto en una lista, donde diez baldosas macizas seguidas pesan.
 */
export function LaBaldosaDeLaSeccion({
  icono,
  color,
  lado,
  suave = false,
}: {
  readonly icono: IconoDeLaSeccion;
  readonly color: ColorDeLaBotonera | null;
  readonly lado: number;
  readonly suave?: boolean;
}) {
  const ElIcono = EL_ICONO[icono];
  const esquina = lado >= 56 ? 'rounded-grande' : 'rounded-medio';
  if (suave) {
    const acento = elAcentoDelColor(color);
    return (
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center ${esquina}`}
        style={{
          width: lado,
          height: lado,
          color: acento,
          background: `color-mix(in srgb, ${acento} 14%, transparent)`,
        }}
      >
        <ElIcono size={Math.floor(lado * 0.5)} strokeWidth={2.2} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${esquina} ${laBaldosa(color)}`}
      style={{ width: lado, height: lado }}
    >
      <ElIcono size={Math.floor(lado * 0.52)} strokeWidth={2.2} />
    </span>
  );
}
