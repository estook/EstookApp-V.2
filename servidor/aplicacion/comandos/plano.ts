import { z } from 'zod';
import { tocarElServicio } from '../al-segundo.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';

/**
 * El plano del local (M20A · 1, decisión 0106): sus zonas y sus mesas. Lo dibuja quien
 * toca los ajustes del local, una vez, en Ajustes › Sala (la pantalla llega en 1 · 2).
 *
 *   crear_zona_de_sala     salón, terraza, barra
 *   cambiar_zona_de_sala   su nombre y su orden
 *   archivar_zona_de_sala  con sus mesas; no si alguna está abierta
 *   crear_mesa             en su zona, con plazas, forma y sitio en el plano
 *   cambiar_mesa           lo mismo, o moverla de zona
 *   archivar_mesa          no si está abierta
 *
 * Nada se borra: una cuenta vieja sigue diciendo en qué mesa estuvo.
 */

const id = z.string().uuid();
const nombreDeZona = z.string().trim().min(1).max(40);
const nombreDeMesa = z.string().trim().min(1).max(20);
const enElPlano = z.number().int().min(0).max(1000);
const forma = z.enum(['cuadrada', 'redonda', 'alargada']);

async function anotar(
  contexto: Contexto,
  accion: string,
  entidad: 'zona_de_sala' | 'mesa',
  entidadId: string,
  localId: string,
  despues: unknown,
): Promise<void> {
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${accion}, ${entidad}, ${entidadId},
      ${localId}::uuid, null, ${JSON.stringify(despues)}::text::jsonb, null
    )
  `;
}

/** El nombre ya lo lleva otra zona o mesa sin archivar del local. */
function yaExiste(error: unknown, que: string): never {
  if ((error as { code?: string }).code === '23505') {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: `Ya hay ${que} con ese nombre: ponle otro.`,
    });
  }
  throw error;
}

async function laZona(
  contexto: Contexto,
  localId: string,
  zonaId: string,
): Promise<{ id: string; nombre: string }> {
  const filas = await contexto.sql<{ id: string; nombre: string }[]>`
    select id::text as id, nombre from estook.zona_de_sala
     where id = ${zonaId}::uuid and local_id = ${localId}::uuid and archivada_en is null
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Esa zona no está en este local.' });
  }
  return filas[0];
}

async function laMesaDelPlano(
  contexto: Contexto,
  localId: string,
  mesaId: string,
): Promise<{ id: string; nombre: string; version: number }> {
  const filas = await contexto.sql<{ id: string; nombre: string; version: number }[]>`
    select id::text as id, nombre, version from estook.mesa
     where id = ${mesaId}::uuid and local_id = ${localId}::uuid and archivada_en is null
  `;
  if (filas[0] === undefined) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Esa mesa no está en el plano de este local.',
    });
  }
  return filas[0];
}

// ═══ Las zonas ════════════════════════════════════════════════════════════════

export const crearZonaDeSala = comando<{ nombre: string }, { zonaId: string }>({
  nombre: 'crear_zona_de_sala',
  entrada: z.object({ nombre: nombreDeZona }).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.zona_de_sala (local_id, nombre, orden)
      select ${localId}::uuid, ${entrada.nombre}, coalesce(max(orden), -1) + 1
        from estook.zona_de_sala where local_id = ${localId}::uuid
      returning id::text as id
    `.catch((e: unknown) => yaExiste(e, 'una zona'));
    const zonaId = (filas[0] as { id: string }).id;
    await anotar(contexto, 'crear', 'zona_de_sala', zonaId, localId, { nombre: entrada.nombre });
    await tocarElServicio(contexto, localId);
    return { zonaId };
  },
});

export const cambiarZonaDeSala = comando<
  { zona_id: string; nombre?: string | undefined; orden?: number | undefined },
  { zonaId: string }
>({
  nombre: 'cambiar_zona_de_sala',
  entrada: z
    .object({
      zona_id: id,
      nombre: nombreDeZona.optional(),
      orden: z.number().int().min(0).max(99).optional(),
    })
    .strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const zona = await laZona(contexto, localId, entrada.zona_id);
    await contexto.sql`
      update estook.zona_de_sala
         set nombre = ${entrada.nombre ?? zona.nombre},
             orden = coalesce(${entrada.orden ?? null}::integer, orden)
       where id = ${zona.id}::uuid
    `.catch((e: unknown) => yaExiste(e, 'una zona'));
    await anotar(contexto, 'cambiar', 'zona_de_sala', zona.id, localId, {
      ...(entrada.nombre === undefined ? {} : { nombre: entrada.nombre }),
      ...(entrada.orden === undefined ? {} : { orden: entrada.orden }),
    });
    await tocarElServicio(contexto, localId);
    return { zonaId: zona.id };
  },
});

async function ningunaAbierta(
  contexto: Contexto,
  mesas: { zona_id?: string; mesa_id?: string },
): Promise<void> {
  const abiertas = await contexto.sql<{ nombre: string }[]>`
    select m.nombre from estook.cuenta c join estook.mesa m on m.id = c.mesa_id
     where c.liberada_en is null and c.anulada_en is null
       and (m.zona_id = ${mesas.zona_id ?? null}::uuid or m.id = ${mesas.mesa_id ?? null}::uuid)
     order by m.nombre
  `;
  if (abiertas.length > 0) {
    throw new FalloDeAplicacion('ya_hecho', {
      porque: `La mesa ${abiertas.map((m) => m.nombre).join(', ')} está abierta: libérala antes.`,
    });
  }
}

export const archivarZonaDeSala = comando<{ zona_id: string }, { zonaId: string }>({
  nombre: 'archivar_zona_de_sala',
  entrada: z.object({ zona_id: id }).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const zona = await laZona(contexto, localId, entrada.zona_id);
    await ningunaAbierta(contexto, { zona_id: zona.id });
    const ahora = contexto.ahora.toISOString();
    await contexto.sql`
      update estook.mesa set archivada_en = ${ahora}::timestamptz
       where zona_id = ${zona.id}::uuid and archivada_en is null
    `;
    await contexto.sql`
      update estook.zona_de_sala set archivada_en = ${ahora}::timestamptz where id = ${zona.id}::uuid
    `;
    await anotar(contexto, 'archivar', 'zona_de_sala', zona.id, localId, { nombre: zona.nombre });
    await tocarElServicio(contexto, localId);
    return { zonaId: zona.id };
  },
});

// ═══ Las mesas ════════════════════════════════════════════════════════════════

export const entradaCrearMesa = z
  .object({
    zona_id: id,
    nombre: nombreDeMesa,
    plazas: z.number().int().min(1).max(50).optional(),
    forma: forma.optional(),
    x: enElPlano.optional(),
    y: enElPlano.optional(),
  })
  .strict();
export type EntradaCrearMesa = z.infer<typeof entradaCrearMesa>;

export const crearMesa = comando<EntradaCrearMesa, { mesaId: string }>({
  nombre: 'crear_mesa',
  entrada: entradaCrearMesa,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const zona = await laZona(contexto, localId, entrada.zona_id);
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.mesa (local_id, zona_id, nombre, plazas, forma, x, y)
      values (
        ${localId}::uuid, ${zona.id}::uuid, ${entrada.nombre}, ${entrada.plazas ?? 4},
        ${entrada.forma ?? 'cuadrada'}, ${entrada.x ?? 0}, ${entrada.y ?? 0}
      )
      returning id::text as id
    `.catch((e: unknown) => yaExiste(e, 'una mesa'));
    const mesaId = (filas[0] as { id: string }).id;
    await anotar(contexto, 'crear', 'mesa', mesaId, localId, {
      nombre: entrada.nombre,
      zona: zona.nombre,
    });
    await tocarElServicio(contexto, localId);
    return { mesaId };
  },
});

export const entradaCambiarMesa = z
  .object({
    mesa_id: id,
    zona_id: id.optional(),
    nombre: nombreDeMesa.optional(),
    plazas: z.number().int().min(1).max(50).optional(),
    forma: forma.optional(),
    x: enElPlano.optional(),
    y: enElPlano.optional(),
  })
  .strict();
export type EntradaCambiarMesa = z.infer<typeof entradaCambiarMesa>;

export const cambiarMesa = comando<EntradaCambiarMesa, { mesaId: string }>({
  nombre: 'cambiar_mesa',
  entrada: entradaCambiarMesa,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const mesa = await laMesaDelPlano(contexto, localId, entrada.mesa_id);
    if (entrada.zona_id !== undefined) await laZona(contexto, localId, entrada.zona_id);
    await contexto.sql`
      update estook.mesa
         set zona_id = coalesce(${entrada.zona_id ?? null}::uuid, zona_id),
             nombre = coalesce(${entrada.nombre ?? null}, nombre),
             plazas = coalesce(${entrada.plazas ?? null}::smallint, plazas),
             forma = coalesce(${entrada.forma ?? null}, forma),
             x = coalesce(${entrada.x ?? null}::integer, x),
             y = coalesce(${entrada.y ?? null}::integer, y)
       where id = ${mesa.id}::uuid
    `.catch((e: unknown) => yaExiste(e, 'una mesa'));
    await anotar(contexto, 'cambiar', 'mesa', mesa.id, localId, {
      ...entrada,
      mesa: mesa.nombre,
    });
    await tocarElServicio(contexto, localId);
    return { mesaId: mesa.id };
  },
});

export const archivarMesa = comando<{ mesa_id: string }, { mesaId: string }>({
  nombre: 'archivar_mesa',
  entrada: z.object({ mesa_id: id }).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const mesa = await laMesaDelPlano(contexto, localId, entrada.mesa_id);
    await ningunaAbierta(contexto, { mesa_id: mesa.id });
    await contexto.sql`
      update estook.mesa set archivada_en = ${contexto.ahora.toISOString()}::timestamptz
       where id = ${mesa.id}::uuid
    `;
    await anotar(contexto, 'archivar', 'mesa', mesa.id, localId, { nombre: mesa.nombre });
    await tocarElServicio(contexto, localId);
    return { mesaId: mesa.id };
  },
});
