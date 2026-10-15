import { CANALES_DE_VENTA, type CanalDeVenta } from '@estook/dominio';
import type { Contexto } from './contrato.ts';

/**
 * Los canales de venta de un local (M9 · 1, 0086), con su comisión y su envase.
 *
 * Aparte de la Carta porque los leen dos: la Carta, que los pone, y el escandallo
 * (0087), que con ellos saca lo que deja cada plato en cada canal.
 */

export interface UnCanal {
  readonly canal: CanalDeVenta;
  readonly nombre: string;
  readonly tipo: 'propio' | 'plataforma';
  /** Si hoy se puede activar (el catálogo de la app, 0086). */
  readonly disponible: boolean;
  readonly activo: boolean;
  /** Solo a quien edita la carta o ve los costes; a los demás, nulo. */
  readonly comisionPorcentaje: number | null;
  readonly envaseCentimos: number | null;
  readonly comisionHabitual: number | null;
}

export async function losCanalesDelLocal(
  contexto: Contexto,
  localId: string,
  conComisiones: boolean,
): Promise<readonly UnCanal[]> {
  const filas = await contexto.sql<
    {
      canal: CanalDeVenta;
      activo: boolean;
      comision_porcentaje: string | null;
      envase_centimos: number | null;
    }[]
  >`
    select canal::text as canal, activo, comision_porcentaje::text as comision_porcentaje,
           envase_centimos
      from estook.canal_de_venta_del_local
     where local_id = ${localId}::uuid
  `;
  const delLocal = new Map(filas.map((f) => [f.canal, f]));
  return CANALES_DE_VENTA.map((como) => {
    const suyo = delLocal.get(como.canal);
    // Sala está siempre; los demás, si se activaron y hoy se pueden tener.
    const activo = como.canal === 'sala' || (como.disponible && suyo?.activo === true);
    return {
      canal: como.canal,
      nombre: como.nombre,
      tipo: como.tipo,
      disponible: como.disponible,
      activo,
      comisionPorcentaje:
        conComisiones && suyo?.comision_porcentaje != null
          ? Number(suyo.comision_porcentaje)
          : null,
      envaseCentimos: conComisiones ? (suyo?.envase_centimos ?? null) : null,
      comisionHabitual: como.comisionHabitual,
    };
  });
}
