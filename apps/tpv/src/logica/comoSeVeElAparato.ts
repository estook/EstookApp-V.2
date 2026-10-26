import type { FuncionDelAparato } from '@estook/dominio';
import type { Dibujo, Tono } from '../iconos.tsx';

/**
 * **Cada aparato con su dibujo y su color, para no confundirlos** (maqueta 3): el mismo en la
 * lista, al añadir y arriba en cada aparato. La caja, naranja; el comandero, azul; la pantalla
 * de cocina, verde; la de barra, ámbar.
 */
export const COMO_SE_VE_LA_FUNCION: Readonly<
  Record<FuncionDelAparato, { readonly dibujo: Dibujo; readonly tono: Tono }>
> = {
  caja: { dibujo: 'caja', tono: 'naranja' },
  comandero: { dibujo: 'movil', tono: 'azul' },
  cocina: { dibujo: 'pantalla', tono: 'verde' },
  barra: { dibujo: 'pantalla', tono: 'ambar' },
  fichar: { dibujo: 'reloj', tono: 'gris' },
};
