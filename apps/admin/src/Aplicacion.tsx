import { ProveedorDeDeshacer, Deshacer } from '@estook/ui';
import type { Entorno } from '@estook/utiles';
import { Catalogo } from './catalogo/Catalogo.tsx';

/**
 * El panel interno (M3).
 *
 * Hoy contiene el catálogo del sistema de diseño, que es la herramienta de dentro
 * que hacía falta al cerrar M3. Las cuentas, los planes, el uso y el soporte
 * llegan con M23, y entonces esto pasa a ser una sección más.
 *
 * El proveedor de deshacer está aquí y no dentro del catálogo porque la barra
 * vive en la raíz: si estuviera dentro de una pantalla, navegar se la llevaría.
 */
export interface AplicacionProps {
  readonly entorno: Entorno;
  readonly sesionId: string;
}

export function Aplicacion({ entorno, sesionId }: AplicacionProps) {
  return (
    <ProveedorDeDeshacer>
      <Catalogo entorno={entorno} sesionId={sesionId} />
      <Deshacer />
    </ProveedorDeDeshacer>
  );
}
