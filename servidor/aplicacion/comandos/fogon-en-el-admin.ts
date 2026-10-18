import { z } from 'zod';
import { anotarEnElAdmin } from '../admin.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Los dos interruptores de Fogón, en el admin (decisión 0097, respuesta 3).
 *
 * «Así controlamos si apagamos o encendemos a todos por si hay que cambiar cosas…
 * por si estamos cambiando IA o haciendo mantenimiento» (Richi, 18-oct).
 *
 *   admin_encender_fogon              el general: apaga o enciende a todos a la vez
 *   admin_encender_fogon_del_cliente  el de un cliente
 *
 * Los dos, del admin total, y cada cambio a la auditoría del admin. Encender no espera
 * a tener el coste medido: lo mira Richi con el piloto (cambia la regla 11 del Plan).
 */

export const entradaEncenderFogon = z.object({ encendido: z.boolean() }).strict();

export const encenderFogon = comando<z.infer<typeof entradaEncenderFogon>, { encendido: boolean }>({
  nombre: 'admin_encender_fogon',
  entrada: entradaEncenderFogon,
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    const { sql, sesion } = contexto;
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');
    const antes = await sql<{ encendido: boolean }[]>`
      select encendido from plataforma.fogon where unica
    `;
    await sql`
      update plataforma.fogon
         set encendido = ${entrada.encendido}, cambiado_en = now(),
             cambiado_por = ${sesion.personaId}::uuid
       where unica
    `;
    await anotarEnElAdmin(contexto, {
      accion: entrada.encendido ? 'encender_fogon' : 'apagar_fogon',
      entidad: 'fogon',
      entidadId: null,
      antes: antes[0] === undefined ? null : { encendido: antes[0].encendido },
      despues: { encendido: entrada.encendido },
    });
    return { encendido: entrada.encendido };
  },
});

export const entradaEncenderFogonDelCliente = z
  .object({ organizacion_id: z.string().uuid(), encendido: z.boolean() })
  .strict();

export const encenderFogonDelCliente = comando<
  z.infer<typeof entradaEncenderFogonDelCliente>,
  { encendido: boolean }
>({
  nombre: 'admin_encender_fogon_del_cliente',
  entrada: entradaEncenderFogonDelCliente,
  soloAdmin: true,
  nivelDeAdmin: 'total',

  async ejecutar(contexto, entrada) {
    const { sql, sesion } = contexto;
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');
    // Por la lista de clientes del admin: la organización la lee el admin por ahí.
    const existe = await sql<{ id: string }[]>`
      select organizacion_id as id from estook.los_clientes()
       where organizacion_id = ${entrada.organizacion_id}::uuid
    `;
    if (existe[0] === undefined) throw new FalloDeAplicacion('no_existe');
    const antes = await sql<{ encendido: boolean }[]>`
      select encendido from plataforma.fogon_del_cliente
       where organizacion_id = ${entrada.organizacion_id}::uuid
    `;
    await sql`
      insert into plataforma.fogon_del_cliente (organizacion_id, encendido, cambiado_en, cambiado_por)
      values (${entrada.organizacion_id}::uuid, ${entrada.encendido}, now(), ${sesion.personaId}::uuid)
      on conflict (organizacion_id) do update
         set encendido = excluded.encendido, cambiado_en = excluded.cambiado_en,
             cambiado_por = excluded.cambiado_por
    `;
    await anotarEnElAdmin(contexto, {
      accion: entrada.encendido ? 'encender_fogon' : 'apagar_fogon',
      entidad: 'cliente',
      entidadId: entrada.organizacion_id,
      antes: { encendido: antes[0]?.encendido ?? false },
      despues: { encendido: entrada.encendido },
    });
    return { encendido: entrada.encendido };
  },
});
