import { z } from 'zod';
import { consulta, type Contexto } from '../contrato.ts';
import { losAgotadosDelLocal, elRecordatorio, type ElAgotado } from '../agotados.ts';
import { elLocalDeLaCarta } from './mi-carta.ts';

/**
 * Los platos para marcar agotados (M10 · 1, decisión 0102).
 *
 * La lee quien puede marcarlos —sala y cocina—, **también la cocina, que no tiene la
 * app Carta**: por eso es aparte de `mi_carta` y no lleva ni un precio. Los agotados,
 * primero.
 */

export interface PlatoParaAgotar {
  readonly id: string;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly agotado: ElAgotado | null;
}

export interface LosAgotados {
  readonly platos: readonly PlatoParaAgotar[];
  /** Lo que se recuerda al marcar uno: quitarlo también del TPV y de las plataformas. */
  readonly recordatorio: string;
}

export async function losPlatosParaAgotar(
  contexto: Contexto,
  localId: string,
): Promise<readonly PlatoParaAgotar[]> {
  const [filas, agotados] = await Promise.all([
    contexto.sql<{ id: string; nombre: string; seccion: string | null }[]>`
      select p.id, p.nombre, s.nombre as seccion
        from estook.plato p
        left join estook.seccion_de_carta s on s.id = p.seccion_id
       where p.local_id = ${localId}::uuid and p.activo
       order by s.orden nulls last, p.orden, p.nombre
    `,
    losAgotadosDelLocal(contexto, localId),
  ]);
  return filas.map((f) => ({ ...f, agotado: agotados.get(f.id) ?? null }));
}

export const losAgotados = consulta<Record<string, never>, LosAgotados>({
  nombre: 'los_agotados',
  entrada: z.object({}).strict(),
  exige: 'accion.marcar_agotado',
  enElTpv: 'tambien',

  async ejecutar(contexto) {
    const localId = elLocalDeLaCarta(contexto);
    const [platos, recordatorio] = await Promise.all([
      losPlatosParaAgotar(contexto, localId),
      elRecordatorio(contexto, localId),
    ]);
    return { platos, recordatorio };
  },
});
