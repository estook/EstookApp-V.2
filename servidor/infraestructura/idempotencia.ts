import { createHash } from 'node:crypto';
import type { Sql } from './postgres.ts';

/**
 * Idempotencia por cabecera (M2).
 *
 * El criterio de terminado del modulo, literal: **«el mismo comando tres veces
 * con la misma clave produce un solo efecto»**. Y el principio 9 del Manifiesto:
 * «importar dos veces el mismo dia no descuenta el genero dos veces».
 *
 * El caso real no es un cliente malicioso: es un movil en una camara frigorifica
 * que pierde la cobertura justo despues de enviar. La persona vuelve a pulsar, y
 * no puede pasar que la merma se apunte dos veces.
 *
 * Como funciona:
 *
 *   1. Quien llama manda `x-idempotencia` con una clave suya.
 *   2. Si esa clave ya se uso **con la misma peticion**, se devuelve la respuesta
 *      de la primera vez sin ejecutar nada.
 *   3. Si se uso **con otra peticion distinta**, es un error de quien llama: la
 *      misma clave no puede significar dos cosas. Se avisa en vez de devolver
 *      una respuesta que no corresponde, que seria mucho peor.
 *   4. La clave se guarda dentro de la MISMA transaccion que el comando, asi que
 *      o se guardan las dos cosas o no se guarda ninguna.
 */

export const CABECERA_IDEMPOTENCIA = 'x-idempotencia';

export type Recuerdo =
  | { readonly estado: 'nueva' }
  | { readonly estado: 'repetida'; readonly respuesta: unknown; readonly estadoHttp: number }
  | { readonly estado: 'clave_reutilizada' };

/** La huella de lo que se pidio, para distinguir una repeticion de una confusion. */
export function huellaDe(comando: string, entrada: unknown): string {
  return createHash('sha256')
    .update(`${comando}:${JSON.stringify(entrada ?? null)}`, 'utf8')
    .digest('hex');
}

export async function recordar(
  sql: Sql,
  clave: string,
  comando: string,
  entrada: unknown,
): Promise<Recuerdo> {
  const huella = huellaDe(comando, entrada);

  const filas = await sql<{ huella: string; respuesta: unknown; estado_http: number }[]>`
    select huella, respuesta, estado_http
      from estook.clave_de_idempotencia
     where clave = ${clave} and caduca_en > now()
  `;

  const anterior = filas[0];
  if (!anterior) return { estado: 'nueva' };

  if (anterior.huella !== huella) return { estado: 'clave_reutilizada' };

  return {
    estado: 'repetida',
    respuesta: anterior.respuesta,
    estadoHttp: anterior.estado_http,
  };
}

/**
 * Guarda el resultado. Va en la misma transaccion que el comando: si el comando
 * se cae, esto se cae con el y la clave queda libre para el reintento.
 */
export async function anotar(
  sql: Sql,
  clave: string,
  comando: string,
  entrada: unknown,
  organizacionId: string,
  personaId: string | null,
  respuesta: unknown,
  estadoHttp: number,
): Promise<void> {
  await sql`
    insert into estook.clave_de_idempotencia
      (clave, huella, organizacion_id, persona_id, comando, respuesta, estado_http)
    values (
      ${clave}, ${huellaDe(comando, entrada)}, ${organizacionId}, ${personaId},
      ${comando}, ${JSON.stringify(respuesta ?? null)}::jsonb, ${estadoHttp}
    )
    on conflict (clave) do nothing
  `;
}

/** Las claves caducadas se tiran. Lo llama un trabajo nocturno. */
export async function limpiarCaducadas(sql: Sql): Promise<number> {
  const filas = await sql<{ cuantas: number }[]>`
    with borradas as (
      delete from estook.clave_de_idempotencia where caduca_en <= now() returning 1
    )
    select count(*)::int as cuantas from borradas
  `;
  return filas[0]?.cuantas ?? 0;
}
