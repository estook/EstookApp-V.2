import { derivarConSalDelLocal, pinNuevo } from '../dominio/secretos.ts';
import type { Sql } from '../infraestructura/postgres.ts';
import { FalloDeAplicacion } from './contrato.ts';

/**
 * Generar un PIN para una persona en un local (M4).
 *
 * Lo usan invitar, reactivar y regenerar, asi que vive aqui: un calculo, un
 * unico dueno (regla 6).
 *
 * ── Como se cumple «PIN unico por local» ─────────────────────────────────────
 *
 * **Lo garantiza el indice unico `pin_unico_en_su_local` de la migracion 0018**, y
 * eso no cambia: si dos personas del mismo local acabaran con el mismo PIN, la
 * base de datos lo rechaza. Funciona porque la sal es del local, asi que el mismo
 * PIN da siempre la misma huella.
 *
 * Lo de aqui es solo para **no llegar a chocar**: se tira un PIN, se mira si ya
 * esta cogido en ese local y, si lo esta, se tira otro. Con un millon de PIN y un
 * local de cuarenta personas eso pasa una vez de cada veinticinco mil.
 *
 * Se comprueba antes de insertar, y no se atrapa el choque, por una razon de
 * Postgres: **una sentencia que falla aborta la transaccion entera**. Atrapar el
 * error y volver a intentarlo dentro del mismo `begin` no funcionaria; haria falta
 * un punto de guardado por intento, que es maquinaria para un caso de uno entre
 * veinticinco mil.
 *
 * Queda un hueco de carrera: dos invitaciones a la vez, en el mismo local, con el
 * mismo PIN. Ahi el indice unico salta y el comando falla con «ese PIN ya lo
 * tiene otra persona», que es un mensaje honesto y se resuelve repitiendo. Lo que
 * **no** puede pasar es que dos personas acaben compartiendo PIN.
 *
 * ── Cuantas veces se reintenta ───────────────────────────────────────────────
 *
 * Diez, y **no es un bucle infinito a proposito**: si un dia un local llegara a
 * tener tantas personas que no cupieran, hay que enterarse, no dar vueltas.
 */
const INTENTOS = 10;

export async function ponerPinNuevo(sql: Sql, personaId: string, localId: string): Promise<string> {
  const locales = await sql<{ sal_del_pin: string }[]>`
    select sal_del_pin from estook.local
     where id = ${localId} and id in (select local_id from estook.locales_visibles())
  `;

  const sal = locales[0]?.sal_del_pin;
  // Si las politicas no devuelven el local, no es suyo. La misma respuesta para
  // «no existe» y para «no es tuyo», igual que en `un_local`.
  if (sal === undefined) throw new FalloDeAplicacion('local_ajeno');

  for (let intento = 0; intento < INTENTOS; intento++) {
    const pin = pinNuevo();
    const huella = await derivarConSalDelLocal(pin, sal);

    const cogido = await sql<{ persona_id: string }[]>`
      select persona_id from estook.pin
       where local_id = ${localId} and huella = ${huella} and persona_id <> ${personaId}
    `;
    if (cogido.length > 0) continue;

    await sql`
      insert into estook.pin (persona_id, local_id, huella)
      values (${personaId}, ${localId}, ${huella})
      on conflict (persona_id, local_id) do update
        set huella = excluded.huella,
            intentos_fallidos = 0,
            bloqueado_hasta = null
    `;
    return pin;
  }

  throw new FalloDeAplicacion('pin_ocupado', {
    porque:
      'No se ha encontrado un PIN libre en este local después de diez intentos. Avísanos: es algo que no debería pasar.',
  });
}
