import { z } from 'zod';
import { publicar } from '../../eventos/bandeja.ts';
import { ponerPinNuevo } from '../pines.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Reactivar a quien se fue (M4).
 *
 * «Quien se va y vuelve **se reactiva**: recupera su ficha, su historial y sus
 *  fichas aprendidas» (Manifiesto 15).
 *
 * Esto solo es posible porque nada se borro cuando se fue: la persona sigue, sus
 * fichajes siguen, y su membresia esta ahi con fecha de fin. Reactivar es abrir
 * una membresia nueva y darle un PIN nuevo.
 *
 * ── Por que membresia nueva y no revivir la vieja ────────────────────────────
 *
 * Porque quien estuvo de camarera en 2024, se fue, y vuelve en 2026 de jefa de
 * sala, **no estuvo de jefa de sala en 2024**. Reabrir la vieja reescribiria el
 * pasado, que es lo que este proyecto no hace en ningun sitio. Se abre otra, y las
 * dos quedan, cada una con sus fechas.
 *
 * ── Y por que el PIN es nuevo ────────────────────────────────────────────────
 *
 * Porque el viejo se borro al retirarle el acceso, que es lo que hizo que muriera
 * al instante. Si se pudiera recuperar, no habria muerto.
 */
export const entradaReactivar = z
  .object({
    persona_id: z.string().uuid(),
    organizacion_id: z.string().uuid(),
    rol: z.string().min(1).max(48),
    local_id: z.string().uuid().optional(),
    area_id: z.string().uuid().optional(),
  })
  .strict();

export type EntradaReactivar = z.infer<typeof entradaReactivar>;

export interface SalidaReactivar {
  readonly personaId: string;
  readonly pin: string | null;
  /** Lo que se recupera con ella. Se ensena, porque es la gracia de reactivar. */
  readonly recupera: { readonly fichajes: number; readonly membresiasPasadas: number };
}

export const reactivarPersona = comando<EntradaReactivar, SalidaReactivar>({
  nombre: 'reactivar_persona',
  entrada: entradaReactivar,
  exige: 'accion.invitar_personas',

  async ejecutar({ sql, sesion, correlacionId }, entrada) {
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    // El rol dice en que alcance se concede, y la base de datos lo comprueba con
    // el disparador `membresia_coherente` de la 0002. Aqui solo se traduce.
    const roles = await sql<{ alcance: string }[]>`
      select alcance::text as alcance from estook.rol where codigo = ${entrada.rol}
    `;
    const alcance = roles[0]?.alcance;
    if (alcance === undefined) throw new FalloDeAplicacion('no_existe');

    const personas = await sql<{ id: string; activa: boolean }[]>`
      select id, activa from estook.persona where id = ${entrada.persona_id}
    `;
    if (!personas[0]) throw new FalloDeAplicacion('no_existe');

    // Lo que recupera. Se cuenta antes de tocar nada, para poder ensenarlo.
    const pasadas = await sql<{ cuantas: number }[]>`
      select count(*)::int as cuantas from estook.membresia
       where persona_id = ${entrada.persona_id} and hasta is not null
    `;

    await sql`update estook.persona set activa = true where id = ${entrada.persona_id}`;

    await sql`
      insert into estook.membresia
        (persona_id, organizacion_id, area_id, local_id, alcance, rol, desde)
      values (
        ${entrada.persona_id}, ${entrada.organizacion_id},
        ${entrada.area_id ?? null}, ${entrada.local_id ?? null},
        ${alcance}, ${entrada.rol}, current_date
      )
      on conflict do nothing
    `;

    // Si ya tenia esa misma membresia y solo estaba revocada, se reabre: el
    // `on conflict do nothing` de arriba no la habria tocado y volveria a entrar
    // sin acceso, que es el fallo mas fastidioso de todos porque parece que va.
    await sql`
      update estook.membresia
         set hasta = null, revocada_en = null
       where persona_id = ${entrada.persona_id}
         and organizacion_id = ${entrada.organizacion_id}
         and rol = ${entrada.rol}
         and local_id is not distinct from ${entrada.local_id ?? null}
         and area_id is not distinct from ${entrada.area_id ?? null}
    `;

    const pin =
      entrada.local_id === undefined
        ? null
        : await ponerPinNuevo(sql, entrada.persona_id, entrada.local_id);

    await sql`
      select estook.anotar(
        ${entrada.organizacion_id}::uuid, 'reactivar', 'persona', ${entrada.persona_id},
        ${entrada.local_id ?? null}::uuid, null,
        ${JSON.stringify({ rol: entrada.rol })}::jsonb, null
      )
    `;

    await publicar(sql, {
      tipo: 'membresia.creada',
      organizacionId: entrada.organizacion_id,
      localId: entrada.local_id ?? null,
      datos: { persona_id: entrada.persona_id, rol: entrada.rol, reactivada: true },
      correlacionId,
    });

    return {
      personaId: entrada.persona_id,
      pin,
      // Los fichajes son de M14. Hasta entonces se dice cero, que es la verdad,
      // en vez de inventarse un numero que quede bonito en la pantalla.
      recupera: { fichajes: 0, membresiasPasadas: pasadas[0]?.cuantas ?? 0 },
    };
  },
});
