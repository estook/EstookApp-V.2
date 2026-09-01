import type { Sql } from '../infraestructura/postgres.ts';
import type { TipoDeEvento } from './catalogo.ts';

/**
 * La bandeja de salida (M2).
 *
 * Se escribe DENTRO de la transaccion del cambio. No hay forma de publicar un
 * evento fuera de ella, y es a proposito: es lo unico que garantiza que el
 * evento y el cambio pasen juntos o no pasen ninguno.
 */
export interface EventoAPublicar {
  readonly tipo: TipoDeEvento;
  readonly organizacionId: string;
  readonly localId?: string | null;
  readonly datos: Record<string, unknown>;
  readonly correlacionId: string;
}

export async function publicar(sql: Sql, evento: EventoAPublicar): Promise<void> {
  await sql`
    insert into estook.bandeja_de_salida
      (organizacion_id, local_id, tipo, datos, correlacion_id)
    values (
      ${evento.organizacionId},
      ${evento.localId ?? null},
      ${evento.tipo},
      ${JSON.stringify(evento.datos)}::jsonb,
      ${evento.correlacionId}
    )
  `;
}

/** Lo que queda por publicar, para que lo recoja el worker. */
export async function pendientes(sql: Sql, cuantos = 100) {
  return sql`
    select id, tipo, datos, organizacion_id, local_id, correlacion_id
      from estook.bandeja_de_salida
     where estado = 'pendiente'
     order by ocurrido_en
     limit ${cuantos}
     for update skip locked
  `;
}

export async function marcarPublicado(sql: Sql, id: number): Promise<void> {
  await sql`
    update estook.bandeja_de_salida
       set estado = 'publicado', publicado_en = now(), intentos = intentos + 1
     where id = ${id}
  `;
}

export async function marcarFallido(sql: Sql, id: number, porque: string): Promise<void> {
  await sql`
    update estook.bandeja_de_salida
       set estado = 'fallido', intentos = intentos + 1, ultimo_fallo = ${porque}
     where id = ${id}
  `;
}
