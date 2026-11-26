import { z } from 'zod';
import {
  cuantoDura,
  esUnServicio,
  fechaEnElLocal,
  laMejorMesa,
  telefonoLimpio,
} from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { tocarElServicio } from '../al-segundo.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';
import {
  cuandoEmpieza,
  lasDuraciones,
  lasMesasDelLocal,
  laZonaHoraria,
  liberarLasDeQuienNoLlega,
  loOcupado,
  losAjustesDeReservas,
  queEstenEncendidas,
} from '../reservas.ts';

/**
 * Las reservas, en Estook TPV (la Ampliación 5 · 1, decisión 0153, sección 6; migración 0132).
 *
 *   poner_reserva                  una reserva nueva, o cambiar una (día, hora, cuántos, mesa…)
 *   cancelar_reserva               cancelarla, o «No han venido»: la mesa queda libre
 *   guardar_ajustes_de_reservas    encenderlas, los servicios, lo que dura una mesa, el tope…
 *   juntar_mesas_para_reservas     en el editor de la sala: qué dos mesas se pueden juntar
 *
 * **Nunca dos reservas en la misma mesa y tramo**: lo impide la base (0132), también si dos aparatos
 * reservan a la vez; aquí solo se traduce su fallo. El id nace en el aparato: repetir no duplica. Y
 * **en servicio no se bloquea al camarero**: el tope de comensales por cuarto de hora avisa, no impide.
 * «Sentar» es abrir la mesa con la reserva (`abrir_mesa` con `reserva_id`).
 */

const id = z.string().uuid();
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const cuarto = z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/);

/** El fallo de la base cuando dos reservas se pisan en una mesa (la restricción de exclusión). */
function esQueSePisan(error: unknown): boolean {
  return (error as { code?: string }).code === '23P01';
}

async function laReserva(
  contexto: Contexto,
  localId: string,
  reservaId: string,
): Promise<{ estado: string } | null> {
  const filas = await contexto.sql<{ estado: string }[]>`
    select estado from estook.reserva where id = ${reservaId}::uuid and local_id = ${localId}::uuid
  `;
  return filas[0] ?? null;
}

// ═══ Poner ════════════════════════════════════════════════════════════════════

export const entradaPonerReserva = z
  .object({
    /** Nace en el aparato. Si ya existe y sigue reservada, se cambia. */
    id,
    dia: fecha,
    hora: cuarto,
    comensales: z.number().int().min(1).max(99),
    nombre: z.string().trim().min(1).max(60),
    telefono: z.string().trim().min(6).max(20),
    nota: z.string().trim().min(1).max(200).optional(),
    /** La mesa elegida a mano (o las dos que se juntan). Sin esto, la pone Estook. */
    mesas: z.array(id).min(1).max(2).optional(),
  })
  .strict();
export type EntradaPonerReserva = z.infer<typeof entradaPonerReserva>;

export const ponerReserva = comando<
  EntradaPonerReserva,
  { reservaId: string; mesas: readonly string[]; yaEstaba: boolean }
>({
  nombre: 'poner_reserva',
  entrada: entradaPonerReserva,
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDelServicio(contexto);
    const ajustes = await losAjustesDeReservas(contexto, localId);
    queEstenEncendidas(ajustes);
    const telefono = telefonoLimpio(entrada.telefono);
    if (telefono.replace(/\D/g, '').length < 6) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['telefono'],
        porque: 'Ese teléfono no tiene bastantes números.',
      });
    }

    const antes = await laReserva(contexto, localId, entrada.id);
    if (antes !== null && antes.estado !== 'reservada') {
      // Ya sentada o cancelada: tocar dos veces no la cambia.
      const mesas = await contexto.sql<{ mesa_id: string }[]>`
        select mesa_id::text as mesa_id from estook.reserva_de_mesa where reserva_id = ${entrada.id}::uuid
      `;
      return { reservaId: entrada.id, mesas: mesas.map((m) => m.mesa_id), yaEstaba: true };
    }

    const zona = await laZonaHoraria(contexto, localId);
    const empieza = cuandoEmpieza(entrada.dia, entrada.hora, zona);
    if (empieza.getTime() < contexto.ahora.getTime() - 30 * 60_000) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['hora'],
        porque: 'Esa hora ya ha pasado.',
      });
    }
    if (entrada.dia > fechaEnElLocal(new Date(contexto.ahora.getTime() + 365 * 86_400_000), zona)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['dia'],
        porque: 'Se reserva como mucho con un año.',
      });
    }
    const { duraciones } = await lasDuraciones(contexto, localId, ajustes.duraciones);
    const acaba = new Date(empieza.getTime() + cuantoDura(entrada.comensales, duraciones) * 60_000);
    const { mesas, juntables } = await lasMesasDelLocal(contexto, localId);

    let lasMesas: readonly string[];
    if (entrada.mesas !== undefined) {
      const delLocal = new Set(mesas.map((m) => m.id));
      if (!entrada.mesas.every((m) => delLocal.has(m))) {
        throw new FalloDeAplicacion('no_existe', { porque: 'Esa mesa no está en el plano.' });
      }
      lasMesas = [...new Set(entrada.mesas)];
    } else {
      const ocupados = await loOcupado(
        contexto,
        localId,
        empieza,
        acaba,
        duraciones,
        entrada.id,
        ajustes.liberarTras,
      );
      const mejor = laMejorMesa({
        mesas,
        juntables,
        ocupados,
        comensales: entrada.comensales,
        desde: empieza.getTime(),
        hasta: acaba.getTime(),
      });
      if (mejor === null) {
        throw new FalloDeAplicacion('faltan_datos', {
          campos: ['hora'],
          porque: `A las ${entrada.hora} no queda mesa para ${String(entrada.comensales)}. Elige otra hora.`,
        });
      }
      lasMesas = mejor.map((m) => m.id);
    }

    // Las mesas de quien no ha llegado a tiempo se sueltan ya: si no, la base no dejaría ocuparlas.
    await liberarLasDeQuienNoLlega(contexto, localId, ajustes.liberarTras);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    if (antes === null) {
      await contexto.sql`
        insert into estook.reserva
          (id, organizacion_id, local_id, dia, hora, empieza, acaba, comensales, nombre, telefono,
           nota, origen, creada_por)
        values (${entrada.id}::uuid, ${organizacionId}::uuid, ${localId}::uuid, ${entrada.dia}::date,
                ${entrada.hora}::time, ${empieza.toISOString()}::timestamptz,
                ${acaba.toISOString()}::timestamptz, ${entrada.comensales}, ${entrada.nombre},
                ${telefono}, ${entrada.nota ?? null}, 'tpv', ${contexto.personaId}::uuid)
      `;
    } else {
      await contexto.sql`
        update estook.reserva
           set dia = ${entrada.dia}::date, hora = ${entrada.hora}::time,
               empieza = ${empieza.toISOString()}::timestamptz, acaba = ${acaba.toISOString()}::timestamptz,
               comensales = ${entrada.comensales}, nombre = ${entrada.nombre}, telefono = ${telefono},
               nota = ${entrada.nota ?? null}
         where id = ${entrada.id}::uuid
      `;
      await contexto.sql`delete from estook.reserva_de_mesa where reserva_id = ${entrada.id}::uuid`;
    }
    try {
      for (const mesaId of lasMesas) {
        await contexto.sql`
          insert into estook.reserva_de_mesa (reserva_id, mesa_id, local_id, tramo)
          values (${entrada.id}::uuid, ${mesaId}::uuid, ${localId}::uuid,
                  tstzrange(${empieza.toISOString()}::timestamptz, ${acaba.toISOString()}::timestamptz))
        `;
      }
    } catch (error) {
      if (esQueSePisan(error)) {
        throw new FalloDeAplicacion('ya_hecho', {
          porque:
            'Esa mesa acaba de reservarse a esa hora desde otro sitio. Elige otra hora o mesa.',
        });
      }
      throw error;
    }
    await tocarElServicio(contexto, localId);
    return { reservaId: entrada.id, mesas: lasMesas, yaEstaba: false };
  },
});

// ═══ Cancelar ═════════════════════════════════════════════════════════════════

export const cancelarReserva = comando<
  { reserva_id: string; no_vino?: boolean | undefined },
  { estado: string }
>({
  nombre: 'cancelar_reserva',
  entrada: z.object({ reserva_id: id, no_vino: z.boolean().optional() }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const antes = await laReserva(contexto, localId, entrada.reserva_id);
    if (antes === null) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Esa reserva no está.' });
    }
    const estado = entrada.no_vino === true ? 'no_vino' : 'cancelada';
    if (antes.estado !== 'reservada') return { estado: antes.estado };
    await contexto.sql`
      update estook.reserva
         set estado = ${estado}, cancelada_en = ${contexto.ahora.toISOString()}::timestamptz
       where id = ${entrada.reserva_id}::uuid
    `;
    await contexto.sql`delete from estook.reserva_de_mesa where reserva_id = ${entrada.reserva_id}::uuid`;
    await tocarElServicio(contexto, localId);
    return { estado };
  },
});

// ═══ Los ajustes ══════════════════════════════════════════════════════════════

const servicio = z
  .object({ nombre: z.string().trim().min(1).max(20), desde: cuarto, hasta: cuarto })
  .strict();

export const entradaAjustesDeReservas = z
  .object({
    encendidas: z.boolean(),
    servicios: z.array(servicio).min(1).max(4),
    duraciones: z.array(z.number().int().min(30).max(360)).length(4),
    tope_por_cuarto: z.number().int().min(1).max(500).nullable(),
    liberar_tras: z.number().int().min(5).max(120),
  })
  .strict();
export type EntradaAjustesDeReservas = z.infer<typeof entradaAjustesDeReservas>;

export const guardarAjustesDeReservas = comando<EntradaAjustesDeReservas, { guardado: true }>({
  nombre: 'guardar_ajustes_de_reservas',
  entrada: entradaAjustesDeReservas,
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    if (!entrada.servicios.every(esUnServicio)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['servicios'],
        porque: 'Cada servicio empieza antes de acabar, en cuartos de hora.',
      });
    }
    await contexto.sql`
      insert into estook.ajuste_de_reservas
        (local_id, encendidas, servicios, duraciones, tope_por_cuarto, liberar_tras)
      values (${localId}::uuid, ${entrada.encendidas}, ${JSON.stringify(entrada.servicios)}::text::jsonb,
              ${`{${entrada.duraciones.join(',')}}`}::smallint[], ${entrada.tope_por_cuarto},
              ${entrada.liberar_tras})
      on conflict (local_id) do update
         set encendidas = excluded.encendidas, servicios = excluded.servicios,
             duraciones = excluded.duraciones, tope_por_cuarto = excluded.tope_por_cuarto,
             liberar_tras = excluded.liberar_tras
    `;
    await tocarElServicio(contexto, localId);
    return { guardado: true };
  },
});

// ═══ Las mesas que se juntan (en el editor de la sala) ════════════════════════

export const juntarMesasParaReservas = comando<
  { mesa_a: string; mesa_b: string; juntas: boolean },
  { juntas: boolean }
>({
  nombre: 'juntar_mesas_para_reservas',
  entrada: z.object({ mesa_a: id, mesa_b: id, juntas: z.boolean() }).strict(),
  exige: 'accion.ajustes_del_tpv',
  enElTpv: 'solo',
  enLosAparatos: ['caja'],

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    if (entrada.mesa_a === entrada.mesa_b) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Una mesa no se junta consigo misma.',
      });
    }
    const [a, b] = [entrada.mesa_a, entrada.mesa_b].sort();
    const delLocal = await contexto.sql<{ id: string }[]>`
      select id::text as id from estook.mesa
       where local_id = ${localId}::uuid and archivada_en is null
         and id = any (${`{${String(a)},${String(b)}}`}::uuid[])
    `;
    if (delLocal.length !== 2) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Esas mesas no están en el plano.' });
    }
    if (entrada.juntas) {
      await contexto.sql`
        insert into estook.mesas_que_se_juntan (local_id, mesa_a, mesa_b)
        values (${localId}::uuid, ${a ?? ''}::uuid, ${b ?? ''}::uuid)
        on conflict do nothing
      `;
    } else {
      await contexto.sql`
        delete from estook.mesas_que_se_juntan where mesa_a = ${a ?? ''}::uuid and mesa_b = ${b ?? ''}::uuid
      `;
    }
    return { juntas: entrada.juntas };
  },
});
