import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Quién manda sobre quién (M7, repaso).
 *
 * «Que los gerentes, o gente del mismo nivel, no se puedan echar ni retirar el
 *  acceso entre ellos.» La regla es la que ya tenía la retribución desde M6½, y
 * aquí vive en un sitio para que la usen todas las puertas de la gestión de
 * personas: **solo se toca a quien está por debajo de ti**.
 *
 * El número es `rol.amplitud`, que la base tiene desde M1 para ordenar los doce
 * roles: dirección 100, gerente 70, jefe de cocina 50, cocinero 30… Se compara el
 * rol más alto de cada uno **dentro de la misma organización**, que es donde una
 * jerarquía significa algo.
 *
 * ── Y la única excepción, que es a propósito ─────────────────────────────────
 *
 * **Dirección puede con dirección.** Si dos socios llevan el negocio y uno se va,
 * alguien tiene que poder retirarle el acceso, y por encima de dirección no hay
 * nadie. Lo que protege de quedarse sin nadie es el guardián de siempre —«no se
 * va el último que puede administrar»—, no esta regla.
 */

export const AMPLITUD_DE_DIRECCION = 100;

type Sql = Contexto['sql'];

/** El rol más alto de alguien en una organización, con sus membresías vivas. 0 si ninguna. */
export async function suAmplitud(
  sql: Sql,
  organizacionId: string,
  personaId: string,
): Promise<number> {
  const filas = await sql<{ amplitud: number | null }[]>`
    select max(r.amplitud)::int as amplitud
      from estook.membresia m
      join estook.rol r on r.codigo = m.rol
     where m.persona_id = ${personaId}
       and m.organizacion_id = ${organizacionId}
       and m.revocada_en is null
       and (m.hasta is null or m.hasta >= current_date)
  `;
  return filas[0]?.amplitud ?? 0;
}

/** Si quien actúa está por encima de la otra persona. Uno mismo no está por encima de sí. */
export function estaPorEncima(mia: number, suya: number): boolean {
  return mia >= AMPLITUD_DE_DIRECCION || mia > suya;
}

/**
 * Para aquí si la otra persona está a tu nivel o por encima.
 *
 * `que` es lo que se iba a hacer, para decirlo en la frase: «Retirar el acceso a
 * alguien de tu nivel lo hace quien está por encima de los dos».
 */
export async function exigirQueMandeMas(
  sql: Sql,
  organizacionId: string,
  yoId: string,
  otraId: string,
  que: string,
): Promise<void> {
  if (yoId === otraId) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: `${que} a ti mismo no se puede desde aquí. Lo hace quien está por encima de ti.`,
    });
  }
  const mia = await suAmplitud(sql, organizacionId, yoId);
  const suya = await suAmplitud(sql, organizacionId, otraId);
  if (!estaPorEncima(mia, suya)) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: `${que} a alguien de tu mismo nivel, o de más arriba, lo hace quien está por encima de los dos.`,
    });
  }
}

/**
 * Para aquí si el rol que se va a dar es el tuyo o está por encima.
 *
 * **El tuyo tampoco**, y es lo que hace que la regla cierre: si un gerente
 * pudiera nombrar a otro gerente, crearía a alguien a quien después no puede ni
 * darle la contraseña ni retirarle el acceso. A alguien de tu nivel lo nombra, lo
 * gestiona y lo echa quien está por encima de los dos (0034).
 */
export async function exigirQueNoDeMasDeLoQueTiene(
  sql: Sql,
  organizacionId: string,
  yoId: string,
  rol: string,
): Promise<void> {
  const filas = await sql<{ amplitud: number; nombre: string }[]>`
    select amplitud::int as amplitud, nombre from estook.rol where codigo = ${rol}
  `;
  const suyo = filas[0];
  if (suyo === undefined) throw new FalloDeAplicacion('no_existe');
  const mia = await suAmplitud(sql, organizacionId, yoId);
  if (!estaPorEncima(mia, suyo.amplitud)) {
    throw new FalloDeAplicacion('sin_permiso', {
      porque: `No puedes dar el rol de ${suyo.nombre.toLowerCase()}: es el tuyo o está por encima. Lo da quien está por encima de los dos.`,
    });
  }
}

/** Los roles que alguien puede dar en una organización: los que quedan por debajo del suyo. */
export async function rolesQuePuedeDar(
  sql: Sql,
  organizacionId: string,
  yoId: string,
): Promise<readonly string[]> {
  const mia = await suAmplitud(sql, organizacionId, yoId);
  const filas = await sql<{ codigo: string; amplitud: number }[]>`
    select codigo, amplitud::int as amplitud from estook.rol order by amplitud desc
  `;
  return filas.filter((r) => estaPorEncima(mia, r.amplitud)).map((r) => r.codigo);
}
