import { crearRegistro } from '@estook/utiles';
import type { Sql } from '../infraestructura/postgres.ts';
import { limpiarCaducadas } from '../infraestructura/idempotencia.ts';
import { marcarFallido, marcarPublicado, pendientes } from '../eventos/bandeja.ts';

/**
 * servidor/trabajos · los workers (M2).
 *
 * En Edge Functions no hay proceso largo (decision 0002), asi que no hay un
 * bucle esperando: hay una funcion que hace una pasada y termina, y un reloj
 * externo (`pg_cron`) que la llama cada poco.
 *
 * El reintento va con espera creciente: 1, 2, 4, 8 y 16 minutos. Si algo falla
 * cinco veces seguidas, deja de intentarse y queda marcado, porque a la sexta ya
 * no es un problema de red.
 */

/** Cuanto esperar antes del siguiente intento, en minutos. */
export function esperaTrasFallar(intentos: number): number {
  return Math.min(2 ** intentos, 16);
}

export interface Pasada {
  readonly eventosPublicados: number;
  readonly eventosFallidos: number;
  readonly trabajosHechos: number;
  readonly clavesLimpiadas: number;
}

/** Una pasada del publicador de la bandeja de salida. */
export async function publicarPendientes(
  sql: Sql,
  entregar: (evento: { tipo: string; datos: unknown }) => Promise<void>,
): Promise<{ publicados: number; fallidos: number }> {
  const registro = crearRegistro({ base: { capa: 'trabajos' } });
  const cola = await pendientes(sql);

  let publicados = 0;
  let fallidos = 0;

  for (const evento of cola) {
    try {
      await entregar({ tipo: String(evento['tipo']), datos: evento['datos'] });
      await marcarPublicado(sql, Number(evento['id']));
      publicados += 1;
    } catch (fallo) {
      const porque = fallo instanceof Error ? fallo.message : String(fallo);
      await marcarFallido(sql, Number(evento['id']), porque);
      registro.aviso('evento sin publicar', { id: evento['id'], porque });
      fallidos += 1;
    }
  }

  return { publicados, fallidos };
}

/** Coge un trabajo de la cola, respetando el orden y sin pisarse con otro worker. */
export async function siguienteTrabajo(sql: Sql) {
  const filas = await sql`
    update estook.trabajo
       set estado = 'en_curso', intentos = intentos + 1
     where id = (
       select id from estook.trabajo
        where estado = 'pendiente' and no_antes_de <= now()
        order by id
        limit 1
        for update skip locked
     )
    returning id, tipo, cola, datos, intentos, max_intentos, correlacion_id
  `;
  return filas[0] ?? null;
}

export async function trabajoHecho(sql: Sql, id: number): Promise<void> {
  await sql`
    update estook.trabajo set estado = 'hecho', terminado_en = now() where id = ${id}
  `;
}

export async function trabajoFallido(
  sql: Sql,
  id: number,
  intentos: number,
  maxIntentos: number,
  porque: string,
): Promise<void> {
  const seRinde = intentos >= maxIntentos;
  await sql`
    update estook.trabajo
       set estado = ${seRinde ? 'fallido' : 'pendiente'},
           ultimo_fallo = ${porque},
           no_antes_de = now() + (${esperaTrasFallar(intentos)} || ' minutes')::interval
     where id = ${id}
  `;
}

export { limpiarCaducadas };
