import { z } from 'zod';
import { ALERGENOS, telefonoLimpio } from '@estook/dominio';
import { tocarElServicio } from '../al-segundo.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';

/**
 * **Los clientes y la lista de espera** (la Ampliación 5 · 3, decisión 0153, sección 21; migración 0135).
 *
 *   guardar_al_cliente   VIP, sus alergias (solo con su sí: son datos de salud) y una nota corta
 *   borrar_al_cliente    el derecho de supresión: fuera su ficha, y sus reservas pasadas sin su
 *                        nombre ni su teléfono. Lo hace quien lleva los Ajustes del TPV, en Estook
 *   poner_en_espera      «En espera»: quien llega sin reservar, con cuántos son
 *   quitar_de_espera     se ha ido. Sentarle es abrir la mesa con él (`abrir_mesa` con `espera_id`)
 *
 * Crear al cliente no es un comando: lo hace la base al guardar cada reserva, por su teléfono.
 */

const id = z.string().uuid();

export const entradaGuardarAlCliente = z
  .object({
    cliente_id: id,
    vip: z.boolean(),
    /** La lista entera: lo que no está, se quita. */
    alergenos: z.array(z.enum(ALERGENOS)).max(ALERGENOS.length),
    nota: z.string().trim().max(80).nullable(),
  })
  .strict();
export type EntradaGuardarAlCliente = z.infer<typeof entradaGuardarAlCliente>;

export const guardarAlCliente = comando<EntradaGuardarAlCliente, { guardado: true }>({
  nombre: 'guardar_al_cliente',
  entrada: entradaGuardarAlCliente,
  exige: 'accion.tomar_nota',
  enElTpv: 'tambien',
  deEstookTpv: true,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const alergenos = ALERGENOS.filter((a) => entrada.alergenos.includes(a));
    const nota = entrada.nota === null || entrada.nota === '' ? null : entrada.nota;
    const hecho = await contexto.sql<{ id: string }[]>`
      update estook.cliente_del_local
         set vip = ${entrada.vip}, alergenos = ${`{${alergenos.join(',')}}`}::text[], nota = ${nota}
       where id = ${entrada.cliente_id}::uuid and local_id = ${localId}::uuid
      returning id::text as id
    `;
    if (hecho.length === 0) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese cliente no está en este local.' });
    }
    await tocarElServicio(contexto, localId);
    return { guardado: true };
  },
});

export const borrarAlCliente = comando<{ cliente_id: string }, { borrado: true }>({
  nombre: 'borrar_al_cliente',
  entrada: z.object({ cliente_id: id }).strict(),
  exige: 'accion.ajustes_del_tpv',
  // Sin `deEstookTpv` a propósito: es un derecho del cliente (RGPD, art. 17), y un local que deja Pro
  // tiene que poder cumplirlo.

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const [c] = await contexto.sql<{ vienen: number }[]>`
      select (select count(*) from estook.reserva r
               where r.cliente_id = c.id and r.estado = 'reservada'
                 and r.empieza >= ${contexto.ahora.toISOString()}::timestamptz)::int as vienen
        from estook.cliente_del_local c
       where c.id = ${entrada.cliente_id}::uuid and c.local_id = ${localId}::uuid
    `;
    if (c === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese cliente no está en este local.' });
    }
    if (c.vienen > 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque:
          'Tiene una reserva que aún no ha llegado. Cancélala en Estook TPV › Reservas y bórralo después.',
      });
    }
    // Sus reservas pasadas se quedan (cuentan como reservas del día), pero sin nada suyo.
    await contexto.sql`
      update estook.reserva
         set cliente_id = null, nombre = 'Cliente borrado', telefono = '000000', correo = null,
             nota = null
       where cliente_id = ${entrada.cliente_id}::uuid and local_id = ${localId}::uuid
    `;
    await contexto.sql`
      delete from estook.cliente_del_local
       where id = ${entrada.cliente_id}::uuid and local_id = ${localId}::uuid
    `;
    return { borrado: true };
  },
});

// ═══ «En espera» ══════════════════════════════════════════════════════════════

export const entradaPonerEnEspera = z
  .object({
    /** Nace en el aparato: tocar dos veces no apunta dos veces. */
    id,
    nombre: z.string().trim().min(1).max(40),
    comensales: z.number().int().min(1).max(99),
    telefono: z.string().trim().min(6).max(20).optional(),
    nota: z.string().trim().min(1).max(120).optional(),
  })
  .strict();
export type EntradaPonerEnEspera = z.infer<typeof entradaPonerEnEspera>;

export const ponerEnEspera = comando<EntradaPonerEnEspera, { id: string }>({
  nombre: 'poner_en_espera',
  entrada: entradaPonerEnEspera,
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const telefono = entrada.telefono === undefined ? null : telefonoLimpio(entrada.telefono);
    if (telefono !== null && telefono.replace(/\D/g, '').length < 6) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['telefono'],
        porque: 'Ese teléfono no tiene bastantes números. Puedes dejarlo en blanco.',
      });
    }
    await contexto.sql`
      insert into estook.espera (id, local_id, nombre, comensales, telefono, nota, llego_en, creada_por)
      values (${entrada.id}::uuid, ${localId}::uuid, ${entrada.nombre}, ${entrada.comensales},
              ${telefono}, ${entrada.nota ?? null}, ${contexto.ahora.toISOString()}::timestamptz,
              ${contexto.personaId ?? null}::uuid)
      on conflict (id) do nothing
    `;
    await tocarElServicio(contexto, localId);
    return { id: entrada.id };
  },
});

export const quitarDeEspera = comando<{ id: string }, { estado: string }>({
  nombre: 'quitar_de_espera',
  entrada: z.object({ id }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const [antes] = await contexto.sql<{ estado: string }[]>`
      select estado from estook.espera where id = ${entrada.id}::uuid and local_id = ${localId}::uuid
    `;
    if (antes === undefined) {
      throw new FalloDeAplicacion('no_existe', { porque: 'No está en la lista de espera.' });
    }
    // Ya sentado o ya ido: tocar dos veces no cambia nada.
    if (antes.estado !== 'esperando') return { estado: antes.estado };
    await contexto.sql`
      update estook.espera
         set estado = 'se_fue', resuelta_en = ${contexto.ahora.toISOString()}::timestamptz
       where id = ${entrada.id}::uuid
    `;
    await tocarElServicio(contexto, localId);
    return { estado: 'se_fue' };
  },
});
