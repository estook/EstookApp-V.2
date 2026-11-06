import { MINUTOS_PARA_LA_CUENTA } from '@estook/dominio';
import type { Contexto } from './contrato.ts';
import { loDelLocalParaImprimir } from './impresion.ts';

/**
 * **Quién marca lo servido en un local** (R2 · 2, decisión 0132; la pausa del 5-nov, punto 1.2).
 *
 * De fábrica tacha la cocina, como siempre. Con «Los camareros también marcan lo servido»
 * (Ajustes del TPV › Cocina y barra), la sala también. Y **donde solo hay papel la sala lo
 * marca siempre**: nadie tacha, y es la única forma de que el plano sepa qué ha salido.
 */
export interface LoServidoDelLocal {
  /** La opción del local: los camareros también marcan lo servido. */
  readonly camarerosMarcan: boolean;
  /** Los minutos de «¿Cuenta?» del local. */
  readonly minutosParaLaCuenta: number;
  /** Lo de la cocina y lo de la barra solo en papel: nadie lo tacha. */
  readonly cocinaSoloEnPapel: boolean;
  readonly barraSoloEnPapel: boolean;
}

export async function loServidoDelLocal(
  contexto: Contexto,
  localId: string,
): Promise<LoServidoDelLocal> {
  const [filas, papel] = await Promise.all([
    contexto.sql<{ camareros_marcan: boolean; minutos_para_la_cuenta: number }[]>`
      select camareros_marcan, minutos_para_la_cuenta
        from estook.la_cocina_del_local(${localId}::uuid)
    `,
    loDelLocalParaImprimir(contexto, localId),
  ]);
  const fila = filas[0];
  return {
    camarerosMarcan: fila?.camareros_marcan ?? false,
    minutosParaLaCuenta: fila?.minutos_para_la_cuenta ?? MINUTOS_PARA_LA_CUENTA,
    cocinaSoloEnPapel: papel?.cocinaSaleEn === 'papel',
    barraSoloEnPapel: papel?.barraSaleEn === 'papel',
  };
}

/** Si la sala puede marcar servido lo de la cocina o lo de la barra. */
export function laSalaMarca(lo: LoServidoDelLocal, destino: 'cocina' | 'barra'): boolean {
  return lo.camarerosMarcan || (destino === 'cocina' ? lo.cocinaSoloEnPapel : lo.barraSoloEnPapel);
}

/** Si la sala puede marcar algo servido en este local (el botón «Servido» de la mesa). */
export function laSalaMarcaAlgo(lo: LoServidoDelLocal): boolean {
  return lo.camarerosMarcan || lo.cocinaSoloEnPapel || lo.barraSoloEnPapel;
}
