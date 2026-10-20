import { enumerar } from '@estook/dominio';
import type { Contexto } from './contrato.ts';
import { losCanalesDelLocal } from './canales-del-local.ts';

/**
 * Los agotados de un local (M10 · 1, decisión 0102), los que leen la Carta, la vista
 * Agotados y la tarjeta del chat.
 *
 * Un plato está agotado mientras su fila de `plato_agotado` diga un instante que aún no
 * ha llegado (o `infinity`, sin fecha). **Lo decide la hora del servidor**, nunca la del
 * móvil (regla 10): pasado el corte de la jornada, ya no lo está, sin que nadie lo quite.
 */

export interface ElAgotado {
  /** Hasta cuándo, en ISO; nulo es sin fecha. */
  readonly hasta: string | null;
  readonly quien: string | null;
  readonly marcadoEn: string;
}

export async function losAgotadosDelLocal(
  contexto: Contexto,
  localId: string,
): Promise<ReadonlyMap<string, ElAgotado>> {
  const filas = await contexto.sql<
    { plato_id: string; hasta: string | null; quien: string | null; marcado_en: string }[]
  >`
    select a.plato_id,
           case when a.hasta = 'infinity' then null
                else to_char(a.hasta at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end as hasta,
           pe.nombre as quien,
           to_char(a.marcado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as marcado_en
      from estook.plato_agotado a
      left join estook.persona pe on pe.id = a.marcado_por
     where a.local_id = ${localId}::uuid
       and a.hasta > ${contexto.ahora.toISOString()}::timestamptz
  `;
  return new Map(
    filas.map((f) => [f.plato_id, { hasta: f.hasta, quien: f.quien, marcadoEn: f.marcado_en }]),
  );
}

/**
 * Lo que se recuerda al marcarlo (Manifiesto, cap. 14): Estook todavía no está conectado
 * al TPV ni a las plataformas, así que allí hay que quitarlo a mano.
 */
export async function elRecordatorio(contexto: Contexto, localId: string): Promise<string> {
  const canales = await losCanalesDelLocal(contexto, localId, false);
  const plataformas = canales
    .filter((c) => c.activo && c.tipo === 'plataforma')
    .map((c) => c.nombre);
  return `Quítalo también de tu TPV${plataformas.length === 0 ? '' : ` y de ${enumerar(plataformas)}`}.`;
}
