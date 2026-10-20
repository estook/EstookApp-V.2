import { z } from 'zod';
import {
  HASTA_CUANDO_AGOTADO,
  hastaCuandoEstaAgotado,
  type HastaCuandoAgotado,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { elRecordatorio } from '../agotados.ts';
import { tocarElCanal } from '../al-segundo.ts';
import { apuntarParaElMovil, asegurarLosCanales } from '../chat.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elRelojYElFisco } from '../desviacion.ts';
import { elLocalDeLaCarta } from '../consultas/mi-carta.ts';

/**
 * Marcar un plato agotado, y que vuelva (M10 · 1, decisión 0102; Auditoría de Flujos 2.4).
 *
 *   marcar_agotado   hasta el principio de la jornada siguiente, o sin fecha
 *   quitar_agotado   «ya hay»: vuelve a la carta
 *
 * Lo pueden sala y cocina (`accion.marcar_agotado`, Roles 1.12: «cocinero y jefe de
 * cocina son los primeros en saberlo»), y lo vuelve a mirar la política de la tabla.
 *
 * **No mueve el stock**: agotado no es merma. Al marcarlo, una tarjeta en «Todo el
 * equipo» que suena **solo a quien está fichado** (si en el local no ficha nadie, a
 * todos los que no lo tienen silenciado). Marcar lo que ya está agotado no avisa dos
 * veces. Cada cosa queda en el historial del plato.
 */

const elPlato = z.string().uuid();

async function elPlatoDelLocal(
  contexto: Contexto,
  localId: string,
  platoId: string,
): Promise<{ nombre: string }> {
  const filas = await contexto.sql<{ nombre: string; activo: boolean }[]>`
    select nombre, activo from estook.plato
     where id = ${platoId}::uuid and local_id = ${localId}::uuid
  `;
  const plato = filas[0];
  if (plato === undefined || !plato.activo) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese plato no está en la carta.' });
  }
  return plato;
}

async function anotar(
  contexto: Contexto,
  accion: 'agotar' | 'ya_hay',
  platoId: string,
  localId: string,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, 'plato', ${platoId},
      ${localId}::uuid, null, ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

/** El aviso en «Todo el equipo»: una tarjeta del plato, que se pone al día sola. */
async function avisarAlEquipo(
  contexto: Contexto,
  localId: string,
  platoId: string,
  nombre: string,
): Promise<void> {
  const personaId = contexto.personaId;
  if (personaId === null) return;
  await asegurarLosCanales(contexto, localId);
  const equipo = await contexto.sql<{ id: string }[]>`
    select id from estook.canal
     where local_id = ${localId} and tipo = 'equipo' and archivado_en is null
  `;
  const canalId = equipo[0]?.id;
  if (canalId === undefined) return;
  const puestos = await contexto.sql<{ id: string }[]>`
    insert into estook.mensaje (canal_id, local_id, autor_id, texto, tarjeta, creado_en)
    values (
      ${canalId}, ${localId}, ${personaId}, ${nombre},
      ${JSON.stringify({ tipo: 'plato', id: platoId })}::text::jsonb,
      ${contexto.ahora.toISOString()}::timestamptz
    )
    returning id::text as id
  `;
  const mensajeId = puestos[0]?.id;
  if (mensajeId === undefined) return;
  await contexto.sql`
    insert into estook.lectura_del_canal (canal_id, persona_id, entregado_hasta, leido_hasta)
    values (${canalId}, ${personaId}, ${mensajeId}::bigint, ${mensajeId}::bigint)
    on conflict (canal_id, persona_id) do update
       set entregado_hasta = greatest(estook.lectura_del_canal.entregado_hasta, excluded.entregado_hasta),
           leido_hasta = greatest(estook.lectura_del_canal.leido_hasta, excluded.leido_hasta),
           actualizado_en = now()
  `;
  // Quien está trabajando ahora: solo sus ids, que no salen del servidor (0078).
  const dentro = await contexto.sql<{ persona_id: string }[]>`
    select persona_id::text as persona_id from estook.quien_trabaja_ahora(${localId}::uuid) as persona_id
  `;
  await apuntarParaElMovil(contexto, {
    canalId,
    tipo: 'equipo',
    mensajeId,
    autorId: personaId,
    mencionados: [],
    ...(dentro.length > 0 ? { soloA: dentro.map((f) => f.persona_id) } : {}),
  });
  await tocarElCanal(contexto, canalId);
}

export const entradaMarcarAgotado = z
  .object({
    plato_id: elPlato,
    hasta: z.enum(HASTA_CUANDO_AGOTADO as unknown as [HastaCuandoAgotado, ...HastaCuandoAgotado[]]),
  })
  .strict();
export type EntradaMarcarAgotado = z.infer<typeof entradaMarcarAgotado>;

export const marcarAgotado = comando<
  EntradaMarcarAgotado,
  { platoId: string; hasta: string | null; recordatorio: string }
>({
  nombre: 'marcar_agotado',
  entrada: entradaMarcarAgotado,
  exige: 'accion.marcar_agotado',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const plato = await elPlatoDelLocal(contexto, localId, entrada.plato_id);
    const reloj = await elRelojYElFisco(contexto, localId);
    const hasta = hastaCuandoEstaAgotado(
      contexto.ahora,
      reloj.zonaHoraria,
      reloj.corte,
      entrada.hasta,
    );
    const hastaEnLaBase = hasta === null ? 'infinity' : hasta.toISOString();

    const yaLoEstaba = await contexto.sql<{ hasta: string }[]>`
      select hasta::text as hasta from estook.plato_agotado
       where plato_id = ${entrada.plato_id}::uuid
         and hasta > ${contexto.ahora.toISOString()}::timestamptz
    `;
    await contexto.sql`
      insert into estook.plato_agotado (plato_id, local_id, hasta, marcado_por, marcado_en)
      values (${entrada.plato_id}::uuid, ${localId}::uuid, ${hastaEnLaBase}::timestamptz,
              ${contexto.personaId}::uuid, ${contexto.ahora.toISOString()}::timestamptz)
      on conflict (plato_id) do update
         set hasta = excluded.hasta, marcado_por = excluded.marcado_por,
             marcado_en = excluded.marcado_en
    `;
    await anotar(contexto, 'agotar', entrada.plato_id, localId, {
      nombre: plato.nombre,
      hasta: hasta === null ? 'sin_fecha' : hastaEnLaBase,
    });
    // Lo que ya estaba agotado se pone al día sin avisar otra vez.
    if (yaLoEstaba.length === 0)
      await avisarAlEquipo(contexto, localId, entrada.plato_id, plato.nombre);

    return {
      platoId: entrada.plato_id,
      hasta: hasta === null ? null : hasta.toISOString(),
      recordatorio: await elRecordatorio(contexto, localId),
    };
  },
});

export const quitarAgotado = comando<{ plato_id: string }, { platoId: string; estaba: boolean }>({
  nombre: 'quitar_agotado',
  entrada: z.object({ plato_id: elPlato }).strict(),
  exige: 'accion.marcar_agotado',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const plato = await elPlatoDelLocal(contexto, localId, entrada.plato_id);
    const quitados = await contexto.sql<{ vigente: boolean }[]>`
      delete from estook.plato_agotado
       where plato_id = ${entrada.plato_id}::uuid and local_id = ${localId}::uuid
      returning hasta > ${contexto.ahora.toISOString()}::timestamptz as vigente
    `;
    const estaba = quitados.some((q) => q.vigente);
    if (estaba) {
      await anotar(contexto, 'ya_hay', entrada.plato_id, localId, { nombre: plato.nombre });
      // La tarjeta del chat cambia a «Ya hay»: que los abiertos la vuelvan a leer.
      const canal = await contexto.sql<{ id: string }[]>`
        select id from estook.canal
         where local_id = ${localId} and tipo = 'equipo' and archivado_en is null
      `;
      if (canal[0] !== undefined) await tocarElCanal(contexto, canal[0].id);
    }
    return { platoId: entrada.plato_id, estaba };
  },
});
